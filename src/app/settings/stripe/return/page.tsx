import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Stripe from 'stripe'

export default async function StripeReturnPage() {
  if (!process.env.STRIPE_SECRET_KEY) redirect('/settings')

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tutor } = await supabase.from('tutors').select('stripe_account_id').eq('id', user.id).single()

  if (tutor?.stripe_account_id) {
    const account = await stripe.accounts.retrieve(tutor.stripe_account_id).catch(() => null)
    const complete = account?.details_submitted ?? false
    await supabase.from('tutors').update({ stripe_onboarding_complete: complete }).eq('id', user.id)
  }

  redirect('/settings?stripe=connected')
}
