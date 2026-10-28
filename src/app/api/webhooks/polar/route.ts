import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { recordOrderPaid } from '@/lib/visitor-tracking'
import { readSecret, safeEqual } from '@/lib/secrets'
import { decideCancel, isPaidNow, paidUntil } from '@/lib/polar-subscription'

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Verify Polar.sh webhook signature (Standard Webhooks / svix spec).
// Headers: webhook-id, webhook-timestamp, webhook-signature. The signed content
// is "{id}.{timestamp}.{body}", HMAC-SHA256'd with the endpoint secret, base64,
// prefixed "v1,". Polar's secret is normally base64 (with optional whsec_ prefix),
// but we've been getting 401s — so we try BOTH the base64-decoded key AND the raw
// UTF-8 secret as key, and sanitize hidden BOM/whitespace (this project has hit
// BOM-in-env before). Any candidate matching a supplied signature passes.
async function verifyPolarSignature(req: NextRequest, body: string): Promise<boolean> {
  // No signing secret means no way to tell Polar from anyone else: refuse (the POST handler answers 503 before this).
  const rawSecret = readSecret('POLAR_WEBHOOK_SECRET')
  if (!rawSecret) return false

  const msgId = req.headers.get('webhook-id') ?? ''
  const msgTimestamp = req.headers.get('webhook-timestamp') ?? ''
  const msgSignature = req.headers.get('webhook-signature') ?? ''

  if (!msgId || !msgTimestamp || !msgSignature) {
    console.warn('[polar-webhook] missing signature headers id=%s ts=%s sig=%s', !!msgId, !!msgTimestamp, !!msgSignature)
    return false
  }

  // Verify timestamp within 5 minutes
  const now = Math.floor(Date.now() / 1000)
  const ts = parseInt(msgTimestamp)
  if (Number.isFinite(ts) && Math.abs(now - ts) > 300) {
    console.warn('[polar-webhook] timestamp skew too large now=%s ts=%s', now, ts)
    return false
  }

  const sanitizedFull = rawSecret.replace(/[﻿​]/g, '').trim() // keeps the whsec_ prefix
  const secret = sanitizedFull.replace(/^whsec_/, '')          // prefix stripped
  const toSign = `${msgId}.${msgTimestamp}.${body}`

  // Candidate HMAC keys, tried in turn:
  //  1. base64-decode(stripped)  — textbook Standard Webhooks / svix
  //  2. utf-8(stripped)          — secret used raw, prefix removed
  //  3. utf-8(FULL whsec_...)    — Polar's own validateEvent uses the entire
  //     secret string (prefix included) as the key, which is why 1 & 2 fail.
  const keys = [
    Buffer.from(secret, 'base64'),
    Buffer.from(secret, 'utf8'),
    Buffer.from(sanitizedFull, 'utf8'),
  ]
  const expected = keys.map(k =>
    'v1,' + crypto.createHmac('sha256', k).update(toSign).digest('base64'),
  )

  // webhook-signature may carry multiple space-separated "v1,<sig>" entries
  const received = msgSignature.split(' ')
  const ok = expected.some(e => received.some(r => safeEqual(r, e)))
  if (!ok) {
    // Sizes only: never the signatures we expected, never any part of the secret (not even a hash).
    console.warn('[polar-webhook] SIGNATURE MISMATCH secretLen=%d idLen=%d tsLen=%d sigLen=%d bodyLen=%d',
      rawSecret.length, msgId.length, msgTimestamp.length, msgSignature.length, body.length)
  }
  return ok
}

// Resolve which Tutafy tutor a Polar subscription belongs to. We match in order
// of reliability: (1) customer_external_id / metadata.user_id — set from the
// checkout link so it survives an email mismatch; (2) the customer email,
// case-insensitively, against the tutors table. We query `tutors` directly by
// email instead of scanning auth.admin.listUsers() (which only returns the first
// page of 50 users — beyond that, paying tutors would silently never upgrade).
async function resolveTutorId(
  supabase: ReturnType<typeof createAdminClient>,
  sub: { customer?: { email?: string; external_id?: string }; metadata?: Record<string, unknown> },
): Promise<string | null> {
  const extId = sub.customer?.external_id ?? (sub.metadata?.user_id as string | undefined)
  if (extId) {
    const { data } = await supabase.from('tutors').select('id').eq('id', extId).maybeSingle()
    if (data?.id) return data.id
  }
  const email = sub.customer?.email?.trim()
  if (email) {
    const { data } = await supabase.from('tutors').select('id').ilike('email', email).limit(1)
    if (data && data.length > 0) return data[0].id
  }
  return null
}

// True when `subId` is the subscription this tutor is on now, or when no subscription is recorded for them yet
// (rows made before polar_subscription_id was kept). A different recorded id means an older subscription.
async function ownsSubscription(
  supabase: ReturnType<typeof createAdminClient>,
  tutorId: string,
  subId: string,
): Promise<boolean> {
  const { data } = await supabase.from('tutors').select('polar_subscription_id').eq('id', tutorId).maybeSingle()
  const current = (data as { polar_subscription_id?: string | null } | null)?.polar_subscription_id
  return !current || current === subId
}

export async function POST(req: NextRequest) {
  // Closed when the signing secret is missing: a 5xx, so Polar tries again once it is set, and nothing is processed.
  if (!readSecret('POLAR_WEBHOOK_SECRET')) return NextResponse.json({ error: 'Unavailable' }, { status: 503 })

  const body = await req.text()

  const valid = await verifyPolarSignature(req, body)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: { type: string; data: Record<string, unknown> }
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Lightweight audit line — enough to trace a delivery without dumping PII.
  console.log('[polar-webhook] received type=%s', event.type)

  if (event.type === 'subscription.created' || event.type === 'subscription.updated') {
    const sub = event.data as {
      id: string; status: string;
      customer?: { email?: string; external_id?: string }
      metadata?: Record<string, unknown>
      current_period_end?: string
      ends_at?: string | null
      product?: { name?: string }
    }

    const tutorId = await resolveTutorId(supabase, sub)
    if (!tutorId) {
      console.warn('[polar-webhook] NO TUTOR MATCHED — email=%s external_id=%s metadata=%s',
        sub.customer?.email, sub.customer?.external_id, JSON.stringify(sub.metadata))
      return NextResponse.json({ ok: true })
    }

    // Paid now: active or trialing, or canceled with the paid period not over yet (T-1052).
    const isActive = isPaidNow(sub, Date.now())

    // An old subscription of the same tutor ending (they bought another since) must not take the plan away: only the
    // subscription the tutor is on now can set them back to Free.
    if (!isActive && !(await ownsSubscription(supabase, tutorId, sub.id))) {
      console.log('[polar-webhook] IGNORED non-current subscription tutor=%s status=%s', tutorId, sub.status)
      return NextResponse.json({ ok: true })
    }

    // Detect plan from product name
    const productName = (sub.product?.name ?? '').toLowerCase()
    let plan = 'free'
    if (isActive) {
      if (productName.includes('academy')) plan = 'academy'
      else plan = 'pro'
    }

    const { error: updErr } = await supabase.from('tutors').update({
      subscription_status: plan,
      polar_subscription_id: sub.id,
      // A canceled subscription still inside its paid period keeps the plan and records when it ends.
      subscription_expires_at: sub.status === 'canceled' && isActive
        ? new Date(paidUntil(sub)!).toISOString()
        : sub.current_period_end ?? null,
    }).eq('id', tutorId)
    console.log('[polar-webhook] UPGRADED tutor=%s plan=%s product=%s status=%s err=%s',
      tutorId, plan, productName, sub.status, updErr?.message ?? 'none')

    // Visitor journey (only exists for tutors who accepted cookies). Never lets a tracking
    // problem change the answer Polar gets.
    if (!updErr && plan !== 'free') {
      try {
        await recordOrderPaid(supabase, tutorId, plan)
      } catch {
        console.warn('[polar-webhook] journey not recorded')
      }
    }
  }

  if (event.type === 'subscription.canceled' || event.type === 'subscription.revoked') {
    const sub = event.data as {
      id: string
      customer?: { email?: string; external_id?: string }
      metadata?: Record<string, unknown>
      current_period_end?: string
      ends_at?: string | null
    }

    const tutorId = await resolveTutorId(supabase, sub)
    if (!tutorId) return NextResponse.json({ ok: true })

    // Only the subscription the tutor is on now can change their plan (an older one ending is not a cancellation).
    if (!(await ownsSubscription(supabase, tutorId, sub.id))) {
      console.log('[polar-webhook] IGNORED %s for a non-current subscription tutor=%s', event.type, tutorId)
      return NextResponse.json({ ok: true })
    }

    // `revoked` takes the plan away. `canceled` only does when the paid period is over: while time is left the tutor
    // keeps Pro or Academy until `subscription_expires_at`, and Polar's `revoked` ends it (T-1052).
    const decision = event.type === 'subscription.revoked' ? { action: 'drop' as const } : decideCancel(sub, Date.now())
    if (decision.action === 'keep_until') {
      await supabase.from('tutors').update({ subscription_expires_at: decision.until }).eq('id', tutorId)
      console.log('[polar-webhook] CANCELED tutor=%s keeps the plan until %s', tutorId, decision.until)
    } else if (decision.action === 'drop') {
      await supabase.from('tutors').update({
        subscription_status: 'free',
        subscription_expires_at: null,
      }).eq('id', tutorId)
      console.log('[polar-webhook] DOWNGRADED tutor=%s event=%s', tutorId, event.type)
    } else {
      console.warn('[polar-webhook] CANCELED without an end date tutor=%s: plan left as it is until Polar sends revoked', tutorId)
    }
  }

  return NextResponse.json({ ok: true })
}
