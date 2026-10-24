import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { subscriptionPeriod } from '@/lib/stripe/subscription-period'

export const runtime = 'nodejs'

// Handles Stripe Connect webhooks for subscription events
export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // These events come from tutors' connected Stripe accounts (`event.account`). The tutor named inside the event is only believed when this
  // event comes from the Stripe account that tutor connected: the signature proves Stripe sent it, not that the metadata is right.
  const account = typeof event.account === 'string' ? event.account : ''
  const fromTutorsAccount = async (tutorId: unknown): Promise<boolean> => {
    if (!account || typeof tutorId !== 'string' || !tutorId) return false
    const { data } = await supabase.from('tutors').select('stripe_account_id').eq('id', tutorId).maybeSingle()
    return !!data?.stripe_account_id && data.stripe_account_id === account
  }
  const ignoreMismatch = () => {
    console.error('[stripe-webhook] event is not from the Stripe account of the tutor it names; ignored:', event.id)
    return NextResponse.json({ received: true, ignored: 'account_mismatch' })
  }

  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    const meta = sub.metadata ?? {}
    const planId = meta.plan_id
    const tutorId = meta.tutor_id
    const studentEmail = meta.student_email
    const studentName = meta.student_name

    if (!planId || !tutorId || !studentEmail) {
      return NextResponse.json({ received: true })
    }

    if (!(await fromTutorsAccount(tutorId))) return ignoreMismatch()
    // the plan must be this tutor's too: a subscription is never attached to another tutor's plan
    const { data: plan } = await supabase.from('subscription_plans').select('id').eq('id', planId).eq('tutor_id', tutorId).maybeSingle()
    if (!plan) return ignoreMismatch()

    // Find or create student
    let { data: student } = await supabase.from('students')
      .select('id')
      .eq('tutor_id', tutorId)
      .eq('email', studentEmail)
      .single()

    if (!student) {
      const { data: newStudent } = await supabase.from('students')
        .insert({ tutor_id: tutorId, name: studentName ?? studentEmail, email: studentEmail })
        .select('id')
        .single()
      student = newStudent
    }

    if (!student) return NextResponse.json({ received: true })

    // The period dates: from the subscription or from its first item, whichever this Stripe API version sends. When the event carries none,
    // the row is still saved and the dates it already has are kept (a key left out of an upsert is not overwritten), and the event id goes
    // to the log so the gap can be traced. Never a 500 over a missing date: Stripe would send the same event again for days.
    const period = subscriptionPeriod(sub)
    if (!period.start || !period.end) console.warn('[stripe-webhook] subscription event without period dates:', event.id, sub.id)

    // Upsert subscription record
    const { error: saveError } = await supabase.from('student_subscriptions').upsert({
      plan_id: planId,
      student_id: student.id,
      tutor_id: tutorId,
      stripe_subscription_id: sub.id,
      stripe_customer_id: sub.customer as string,
      status: sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : 'cancelled',
      ...(period.start ? { current_period_start: period.start } : {}),
      ...(period.end ? { current_period_end: period.end } : {}),
    }, { onConflict: 'stripe_subscription_id' })
    // A row that could not be saved is a failure Stripe should retry.
    if (saveError) return NextResponse.json({ error: 'Could not save the subscription' }, { status: 500 })
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    // only the subscription of a tutor whose connected account sent this event
    const { data: saved } = await supabase.from('student_subscriptions').select('tutor_id').eq('stripe_subscription_id', sub.id).maybeSingle()
    if (!saved) return NextResponse.json({ received: true })
    if (!(await fromTutorsAccount(saved.tutor_id))) return ignoreMismatch()
    await supabase.from('student_subscriptions')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', sub.id)
  }

  return NextResponse.json({ received: true })
}
