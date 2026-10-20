import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { readSecret } from '@/lib/secrets'

export const runtime = 'nodejs'

// Stripe Connect webhook (T-0618): a student paid a lesson by card on the TUTOR's connected account.
// This is a separate endpoint from /api/webhooks/stripe (subscriptions on the platform account): a Stripe
// "Connect" endpoint has its own signing secret, STRIPE_CONNECT_WEBHOOK_SECRET.
//
// What it trusts, in this order:
//   1. the signature on the raw body (no secret, or a short one: 503 and nothing is read or changed);
//   2. from the body, ONLY the Checkout session id and the connected account that sent the event;
//   3. everything else (which lesson, which tutor, how much, which currency) comes from our own row in
//      lesson_card_payments, written by the checkout route when it opened that session. The body's
//      metadata is never read.
// A lesson is marked paid only when the session is in our table, belongs to the account that sent the
// event, and Stripe reports exactly the amount and currency we asked for. Delivering the same event again
// (or two deliveries at once) changes nothing the second time: only one delivery can move the row from
// 'created' to 'paid'.
const HANDLED = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded'])
const MAX_BODY = 1_000_000

const ok = (extra: Record<string, unknown> = {}) => NextResponse.json({ received: true, ...extra })

export async function POST(request: Request) {
  const secret = readSecret('STRIPE_CONNECT_WEBHOOK_SECRET')
  if (!secret) return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 })

  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  const body = await request.text()
  if (body.length > MAX_BODY) return NextResponse.json({ error: 'Too large' }, { status: 413 })

  let event: Stripe.Event
  try {
    event = Stripe.webhooks.constructEvent(body, signature, secret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (!HANDLED.has(event.type)) return ok({ ignored: 'event_type' })
  // Events about the platform's own account have no `account`; a tutor's payment always does.
  const account = typeof event.account === 'string' ? event.account : ''
  if (!account) return ok({ ignored: 'no_connected_account' })
  const session = event.data.object as Stripe.Checkout.Session
  if (typeof session.id !== 'string' || session.payment_status !== 'paid') return ok({ ignored: 'not_paid' })

  const admin = createAdminClient()
  const { data: payment, error: readError } = await admin.from('lesson_card_payments')
    .select('stripe_session_id, lesson_id, tutor_id, stripe_account_id, amount_minor, currency, status')
    .eq('stripe_session_id', session.id).maybeSingle()
  if (readError) return NextResponse.json({ error: 'try_again' }, { status: 500 })
  // Not a session this app opened, or one opened for another tutor's account: nothing to do.
  if (!payment || payment.stripe_account_id !== account) return ok({ ignored: 'unknown_session' })

  if (payment.status === 'created') {
    if (session.amount_total !== Number(payment.amount_minor) || String(session.currency ?? '').toLowerCase() !== payment.currency) {
      await admin.from('lesson_card_payments').update({ status: 'mismatch', stripe_event_id: event.id })
        .eq('stripe_session_id', payment.stripe_session_id).eq('status', 'created')
      console.error(`[stripe-connect] paid amount or currency differs from the session ${payment.stripe_session_id}; lesson not marked`)
      return ok({ ignored: 'amount_mismatch' })
    }

    // Claim: only one delivery can move the row from 'created' to 'paid'.
    const { data: claimed, error: claimError } = await admin.from('lesson_card_payments')
      .update({ status: 'paid', stripe_event_id: event.id, paid_at: new Date().toISOString() })
      .eq('stripe_session_id', payment.stripe_session_id).eq('status', 'created')
      .select('stripe_session_id')
    if (claimError) {
      if (claimError.code === '23505') return markDuplicate(admin, payment.stripe_session_id, event.id)
      return NextResponse.json({ error: 'try_again' }, { status: 500 })
    }
    if (!claimed || claimed.length === 0) return ok({ already: true }) // another delivery claimed it
  } else if (payment.status !== 'paid') {
    return ok({ already: payment.status })
  }

  // Mark the lesson. Only a lesson that is still pending moves to paid, so a repeat never undoes a
  // later change (a refund, a manual edit). Repeating this step for a row that is already 'paid' also
  // finishes the work of a delivery that stopped between the two steps.
  const { data: marked, error: markError } = await admin.from('lessons')
    .update({ payment_status: 'paid' })
    .eq('id', payment.lesson_id).eq('tutor_id', payment.tutor_id).eq('payment_status', 'pending')
    .select('id')
  if (markError) {
    if (payment.status === 'created') {
      // Give the claim back so Stripe's retry does the whole job.
      await admin.from('lesson_card_payments').update({ status: 'created', stripe_event_id: null, paid_at: null })
        .eq('stripe_session_id', payment.stripe_session_id).eq('status', 'paid')
    }
    return NextResponse.json({ error: 'try_again' }, { status: 500 })
  }
  if (payment.status === 'created' && (!marked || marked.length === 0)) {
    // The lesson was not pending: paid some other way, or by another session. The student may have paid twice.
    return markDuplicate(admin, payment.stripe_session_id, event.id)
  }
  return ok({ paid: payment.status === 'created' })
}

async function markDuplicate(admin: ReturnType<typeof createAdminClient>, sessionId: string, eventId: string) {
  await admin.from('lesson_card_payments')
    .update({ status: 'duplicate', stripe_event_id: eventId, paid_at: new Date().toISOString() })
    .eq('stripe_session_id', sessionId).in('status', ['created', 'paid'])
  console.error(`[stripe-connect] session ${sessionId} was paid but its lesson was not pending: a refund may be due`)
  return ok({ duplicate: true })
}
