import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireApiPlan } from '@/lib/api-guard'

export async function POST() {
  // Sign-in, plan and "Stripe is switched on" are checked together, in that order.
  const gate = await requireApiPlan('pro', { needsStripe: true })
  if ('error' in gate) return gate.error
  const { supabase, userId: user } = gate

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  const { data: tutor } = await supabase.from('tutors').select('stripe_account_id, email, name').eq('id', user).single()
  if (!tutor) return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })

  let accountId = tutor.stripe_account_id

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: tutor.email,
      capabilities: { transfers: { requested: true } },
      business_profile: { name: tutor.name },
    })
    accountId = account.id
    await supabase.from('tutors').update({ stripe_account_id: accountId }).eq('id', user)
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutafy.com'
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/api/stripe/connect/onboard`,
    return_url: `${origin}/settings/stripe/return`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: accountLink.url })
}
