import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Verify Polar.sh webhook signature
// Polar uses Webhook-ID, Webhook-Timestamp, Webhook-Signature headers (svix standard)
async function verifyPolarSignature(req: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.POLAR_WEBHOOK_SECRET
  if (!secret) return true // skip if not configured

  const msgId = req.headers.get('webhook-id') ?? ''
  const msgTimestamp = req.headers.get('webhook-timestamp') ?? ''
  const msgSignature = req.headers.get('webhook-signature') ?? ''

  if (!msgId || !msgTimestamp || !msgSignature) return false

  // Verify timestamp within 5 minutes
  const now = Math.floor(Date.now() / 1000)
  const ts = parseInt(msgTimestamp)
  if (Math.abs(now - ts) > 300) return false

  // Compute signature: HMAC-SHA256 of "{id}.{timestamp}.{body}"
  const toSign = `${msgId}.${msgTimestamp}.${body}`
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const mac = crypto.createHmac('sha256', secretBytes).update(toSign).digest('base64')
  const expected = `v1,${mac}`

  // msgSignature may have multiple space-separated sigs
  const sigs = msgSignature.split(' ')
  return sigs.includes(expected)
}

export async function POST(req: NextRequest) {
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

  if (event.type === 'subscription.created' || event.type === 'subscription.updated') {
    const sub = event.data as {
      id: string; status: string;
      customer?: { email?: string }
      current_period_end?: string
      product?: { name?: string }
    }

    const customerEmail = sub.customer?.email
    if (!customerEmail) return NextResponse.json({ ok: true })

    const isActive = ['active', 'trialing'].includes(sub.status ?? '')

    // Detect plan from product name
    const productName = (sub.product?.name ?? '').toLowerCase()
    let plan = 'free'
    if (isActive) {
      if (productName.includes('academy')) plan = 'academy'
      else plan = 'pro'
    }

    const { data: authUser } = await supabase.auth.admin.listUsers()
    const user = authUser?.users?.find(u => u.email === customerEmail)
    if (!user) return NextResponse.json({ ok: true })

    await supabase.from('tutors').update({
      subscription_status: plan,
      polar_subscription_id: sub.id,
      subscription_expires_at: sub.current_period_end ?? null,
    }).eq('id', user.id)
  }

  if (event.type === 'subscription.canceled' || event.type === 'subscription.revoked') {
    const sub = event.data as { id: string; customer?: { email?: string } }
    const customerEmail = sub.customer?.email
    if (!customerEmail) return NextResponse.json({ ok: true })

    const { data: authUser } = await supabase.auth.admin.listUsers()
    const user = authUser?.users?.find(u => u.email === customerEmail)
    if (!user) return NextResponse.json({ ok: true })

    await supabase.from('tutors').update({
      subscription_status: 'free',
      subscription_expires_at: null,
    }).eq('id', user.id)
  }

  return NextResponse.json({ ok: true })
}
