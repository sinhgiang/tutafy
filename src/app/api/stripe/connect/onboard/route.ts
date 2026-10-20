import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireApiPlan } from '@/lib/api-guard'
import { originFromRequest } from '@/lib/app-url'
import { createAdminClient } from '@/lib/supabase/server'

const SETTINGS_PAYMENTS = '/settings?tab=payments'

function appOrigin(request?: Request): string {
  return request ? originFromRequest(request) : (process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutafy.com')
}

// Stripe sends the browser back here with GET when an onboarding link has expired
// (refresh_url), so GET must work too: it makes a fresh link for the account the
// tutor already has and redirects to it. Anything else goes back to Settings.
export async function GET(request: Request) {
  const back = (path: string) => NextResponse.redirect(new URL(path, request.url))

  const gate = await requireApiPlan('pro', { needsStripe: true })
  if ('error' in gate) return back((gate.error as Response).status === 401 ? '/login' : SETTINGS_PAYMENTS)
  const { supabase, userId: user } = gate

  // A GET never creates a Stripe account; starting from scratch is the POST button.
  const { data: tutor } = await supabase.from('tutors').select('stripe_account_id').eq('id', user).single()
  if (!tutor?.stripe_account_id) return back(SETTINGS_PAYMENTS)

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const origin = appOrigin(request)
    const accountLink = await stripe.accountLinks.create({
      account: tutor.stripe_account_id,
      refresh_url: `${origin}/api/stripe/connect/onboard`,
      return_url: `${origin}/settings/stripe/return`,
      type: 'account_onboarding',
    })
    return NextResponse.redirect(accountLink.url)
  } catch {
    return back(SETTINGS_PAYMENTS)
  }
}

export async function POST(request?: Request) {
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
    // The Stripe account id is a paid-column: only the server (service role) may write it. `user` comes from the session.
    await createAdminClient().from('tutors').update({ stripe_account_id: accountId }).eq('id', user)
  }

  const origin = appOrigin(request)
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/api/stripe/connect/onboard`,
    return_url: `${origin}/settings/stripe/return`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: accountLink.url })
}
