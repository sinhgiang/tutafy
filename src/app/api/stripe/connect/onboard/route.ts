import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tutor } = await supabase.from('tutors').select('stripe_account_id, email, name').eq('id', user.id).single()
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
    await supabase.from('tutors').update({ stripe_account_id: accountId }).eq('id', user.id)
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
