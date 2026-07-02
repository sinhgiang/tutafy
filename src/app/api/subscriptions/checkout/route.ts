import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'

// POST /api/subscriptions/checkout
// Body: { plan_id, student_name, student_email, tutor_slug }
// Creates a Stripe Checkout session in subscription mode, charges student, transfers to tutor
export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const { plan_id, student_name, student_email, tutor_slug } = await req.json()
  if (!plan_id || !student_name || !student_email) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Fetch plan + tutor's Stripe account
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('*, tutors(id, name, email, stripe_account_id, slug)')
    .eq('id', plan_id)
    .eq('is_active', true)
    .single()

  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const tutor = plan.tutors as any
  if (!tutor?.stripe_account_id) {
    return NextResponse.json({ error: 'Tutor has not connected Stripe yet' }, { status: 400 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutafy.com'

  // Create or retrieve Stripe price for this plan
  let stripePriceId = plan.stripe_price_id

  if (!stripePriceId) {
    // Create a Stripe product + price on the connected account
    const product = await stripe.products.create(
      {
        name: `${plan.name} â€” ${plan.lessons_per_period} lessons/${plan.period}`,
        description: plan.description ?? undefined,
        metadata: { plan_id: plan.id, tutor_id: tutor.id },
      },
      { stripeAccount: tutor.stripe_account_id }
    )

    const price = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: Math.round(plan.price * 100),
        currency: plan.currency ?? 'usd',
        recurring: { interval: plan.period === 'week' ? 'week' : 'month' },
      },
      { stripeAccount: tutor.stripe_account_id }
    )

    stripePriceId = price.id
    await supabase.from('subscription_plans').update({ stripe_price_id: stripePriceId }).eq('id', plan.id)
  }

  // Create Stripe Checkout session
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'subscription',
      customer_email: student_email,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${origin}/book/${tutor.slug}?subscribed=1`,
      cancel_url: `${origin}/book/${tutor.slug}`,
      metadata: {
        plan_id: plan.id,
        tutor_id: tutor.id,
        student_name,
        student_email,
      },
      subscription_data: {
        metadata: { plan_id: plan.id, tutor_id: tutor.id, student_name, student_email },
      },
      payment_method_types: ['card'],
    },
    { stripeAccount: tutor.stripe_account_id }
  )

  return NextResponse.json({ url: session.url })
}
