import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'

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

    // Upsert subscription record
    await supabase.from('student_subscriptions').upsert({
      plan_id: planId,
      student_id: student.id,
      tutor_id: tutorId,
      stripe_subscription_id: sub.id,
      stripe_customer_id: sub.customer as string,
      status: sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : 'cancelled',
      current_period_start: new Date((sub as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
    }, { onConflict: 'stripe_subscription_id' })
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    await supabase.from('student_subscriptions')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', sub.id)
  }

  return NextResponse.json({ received: true })
}
