import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSSRClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { PLAN_RANK, type Plan } from '@/lib/plans'

// POST /api/subscriptions/upgrade  { target: 'pro' | 'academy' }
//
// Instant, one-click plan change for a tutor who ALREADY has a paid Polar
// subscription (card on file). We call Polar's API to switch the subscription's
// product and charge the prorated difference immediately on the saved card —
// no hosted checkout. A tutor with no subscription yet (Free, no card) can't be
// charged off-session, so we tell the client to fall back to checkout.
//
// Requires POLAR_ACCESS_TOKEN (org access token) in the environment.

const POLAR_API = (process.env.POLAR_API_BASE ?? 'https://api.polar.sh').replace(/\/+$/, '')

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

async function polar(path: string, init?: RequestInit) {
  const token = process.env.POLAR_ACCESS_TOKEN!
  return fetch(`${POLAR_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })
}

export async function POST(req: NextRequest) {
  // Who is asking?
  const supabase = await createSSRClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { target } = await req.json().catch(() => ({})) as { target?: Plan }
  if (target !== 'pro' && target !== 'academy') {
    return NextResponse.json({ error: 'invalid_target' }, { status: 400 })
  }

  const { data: tutor } = await supabase
    .from('tutors')
    .select('subscription_status, polar_subscription_id')
    .eq('id', user.id)
    .single()

  const currentPlan = (tutor?.subscription_status ?? 'free') as Plan
  if (PLAN_RANK[target] <= PLAN_RANK[currentPlan]) {
    return NextResponse.json({ error: 'not_an_upgrade' }, { status: 400 })
  }

  // No API token configured → client should open the hosted checkout instead.
  if (!process.env.POLAR_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'not_configured', needsCheckout: true }, { status: 503 })
  }

  // No existing subscription = no saved card to charge off-session → checkout.
  const subId = tutor?.polar_subscription_id
  if (!subId) {
    return NextResponse.json({ error: 'no_subscription', needsCheckout: true }, { status: 409 })
  }

  // Resolve the target product id. Prefer an explicit env override; otherwise
  // match by name against the org's products (name must contain "pro"/"academy").
  let productId: string | null =
    (target === 'academy' ? process.env.POLAR_PRODUCT_ACADEMY : process.env.POLAR_PRODUCT_PRO)?.trim() || null
  if (!productId) {
    try {
      const res = await polar('/v1/products?is_archived=false&limit=100')
      if (!res.ok) {
        return NextResponse.json({ error: 'polar_products_failed', status: res.status }, { status: 502 })
      }
      const json = await res.json() as { items?: { id: string; name?: string; is_recurring?: boolean }[] }
      const items = json.items ?? []
      const match = items.find(p => p.is_recurring !== false && (p.name ?? '').toLowerCase().includes(target))
      productId = match?.id ?? null
    } catch {
      return NextResponse.json({ error: 'polar_unreachable' }, { status: 502 })
    }
  }
  if (!productId) {
    return NextResponse.json({ error: 'product_not_found', needsCheckout: true }, { status: 502 })
  }

  // Switch the subscription's product and charge the prorated difference now.
  const proration = process.env.POLAR_PRORATION ?? 'invoice'
  const upd = await polar(`/v1/subscriptions/${subId}`, {
    method: 'PATCH',
    body: JSON.stringify({ product_id: productId, proration_behavior: proration }),
  })

  if (upd.status === 402) {
    const detail = await upd.json().catch(() => ({}))
    return NextResponse.json({ error: 'payment_failed', detail }, { status: 402 })
  }
  if (!upd.ok) {
    const detail = await upd.text().catch(() => '')
    console.error('[polar-upgrade] failed status=%s body=%s', upd.status, detail.slice(0, 300))
    return NextResponse.json({ error: 'polar_error', status: upd.status }, { status: 502 })
  }

  // Payment succeeded and the product switched. Reflect it immediately (the
  // subscription.updated webhook will also confirm this shortly).
  await admin().from('tutors').update({ subscription_status: target }).eq('id', user.id)

  return NextResponse.json({ ok: true, plan: target })
}
