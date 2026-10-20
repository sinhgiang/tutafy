import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { hasPlan } from '@/lib/plans'
import { originFromRequest } from '@/lib/app-url'
import { createLimiter } from '@/lib/rate-limit-memory'
import { isStripeEnabled, stripeUnavailableResponse } from '@/lib/stripe/availability'
import { stripeMinorUnits } from '@/lib/stripe/amount'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Limits live in this server instance's memory. `perToken` counts a portal token that exists in the
// database (checked first), never a value the caller made up; `overall` caps what unknown callers can cost.
const perToken = createLimiter({ max: 20, windowMs: 10 * 60 * 1000 })
const overall = createLimiter({ max: 120, windowMs: 60 * 1000 })

// A student pays one lesson by card. The money goes to the TUTOR's own Stripe account (a direct
// charge on the account the tutor connected in Settings), never to the platform's account, and the
// amount, the currency and the lesson are read from the database: the body only names the lesson and
// carries the student's portal token. If Stripe is off, or the tutor has not finished connecting
// Stripe, the route refuses; it never falls back to charging the platform account.
export async function POST(request: Request) {
  let body: { lessonId?: unknown; portalToken?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()
  if (!isStripeEnabled() || !secretKey) return stripeUnavailableResponse()

  if (!overall.hit('all')) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const lessonId = typeof body.lessonId === 'string' ? body.lessonId : ''
  const portalToken = typeof body.portalToken === 'string' ? body.portalToken : ''
  if (!portalToken || portalToken.length > 200) return NextResponse.json({ error: 'portalToken required' }, { status: 400 })
  if (!UUID.test(lessonId)) return NextResponse.json({ error: 'lessonId required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: student } = await admin.from('students').select('id, name, tutor_id').eq('portal_token', portalToken).maybeSingle()
  if (!student) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  if (!perToken.hit(portalToken)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  // The lesson must be this student's, with this student's tutor: another student's lesson id is "not found".
  // `lessons.currency` is not read: nothing writes it (the column keeps its 'USD' default for every
  // lesson, whoever created it), so it would charge a EUR or VND price as dollars. A lesson's price is
  // in its tutor's currency, the same `tutors.currency` the booking page shows the student.
  const { data: lesson } = await admin.from('lessons')
    .select('id, price, duration_minutes, payment_status')
    .eq('id', lessonId).eq('student_id', student.id).eq('tutor_id', student.tutor_id).maybeSingle()
  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  if (lesson.payment_status !== 'pending') return NextResponse.json({ error: 'already_settled' }, { status: 409 })

  // Card payments are a Pro feature: the owning tutor's plan counts, not the student's.
  const { data: tutor } = await admin.from('tutors')
    .select('name, currency, subscription_status, stripe_account_id, stripe_onboarding_complete').eq('id', student.tutor_id).maybeSingle()
  if (!hasPlan(tutor?.subscription_status, 'pro')) {
    return NextResponse.json({ error: 'upgrade_required' }, { status: 403 })
  }
  // The tutor must have connected Stripe and finished onboarding. Otherwise there is nobody to pay.
  if (!tutor?.stripe_account_id || !tutor.stripe_onboarding_complete) return stripeUnavailableResponse()

  // A tutor who never chose a currency is shown dollars on the booking page, so dollars here too; any
  // other value must be a three-letter code, or nothing is charged (never a guess).
  const currency = String(tutor.currency ?? '').trim().toLowerCase() || 'usd'
  if (!/^[a-z]{3}$/.test(currency)) return NextResponse.json({ error: 'no_price' }, { status: 400 })
  const unitAmount = stripeMinorUnits(Number(lesson.price), currency)
  if (unitAmount === null) return NextResponse.json({ error: 'no_price' }, { status: 400 })

  const stripe = new Stripe(secretKey)
  const origin = originFromRequest(request)

  // One open session per lesson. A session this app opened earlier for the lesson and that is still open
  // is closed first, so a student with two tabs cannot pay the same lesson twice. If Stripe says the
  // earlier one is already complete, the payment is on its way (the webhook marks the lesson paid): no
  // new session. Any doubt about the earlier session means no new session.
  const { data: earlier, error: earlierError } = await admin.from('lesson_card_payments')
    .select('stripe_session_id, stripe_account_id').eq('lesson_id', lesson.id).eq('status', 'created')
  if (earlierError) return paymentUnavailable()
  for (const row of earlier ?? []) {
    try {
      const old = await stripe.checkout.sessions.retrieve(row.stripe_session_id, {}, { stripeAccount: row.stripe_account_id })
      if (old.status === 'complete') return NextResponse.json({ error: 'payment_in_progress' }, { status: 409 })
      if (old.status === 'open') await stripe.checkout.sessions.expire(row.stripe_session_id, {}, { stripeAccount: row.stripe_account_id })
    } catch {
      return paymentUnavailable()
    }
    const { error } = await admin.from('lesson_card_payments').update({ status: 'expired' })
      .eq('stripe_session_id', row.stripe_session_id).eq('status', 'created')
    if (error) return paymentUnavailable()
  }

  const session = await stripe.checkout.sessions.create(
    {
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency,
          product_data: {
            name: `${lesson.duration_minutes ?? 60}-min lesson with ${tutor.name}`,
            description: student.name ? `Student: ${student.name}` : undefined,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/portal/${portalToken}?payment=success`,
      cancel_url: `${origin}/portal/${portalToken}`,
      metadata: { lesson_id: lesson.id, tutor_id: student.tutor_id },
    },
    { stripeAccount: tutor.stripe_account_id },
  )

  // Record the session before the student can use it. The webhook marks the lesson paid only through this
  // row (lesson, tutor, account, amount and currency are ours, written here). If the row cannot be written
  // (or another request just opened a session for this lesson), the session is closed and no link is given.
  const { error: saveError } = await admin.from('lesson_card_payments').insert({
    stripe_session_id: session.id,
    lesson_id: lesson.id,
    tutor_id: student.tutor_id,
    stripe_account_id: tutor.stripe_account_id,
    amount_minor: unitAmount,
    currency,
    status: 'created',
  })
  if (saveError || !session.url) {
    try { await stripe.checkout.sessions.expire(session.id, {}, { stripeAccount: tutor.stripe_account_id }) } catch { /* it expires by itself */ }
    if (saveError?.code === '23505') return NextResponse.json({ error: 'payment_in_progress' }, { status: 409 })
    return paymentUnavailable()
  }

  return NextResponse.json({ url: session.url })
}

// Nothing was charged and no link was given: the same neutral answer the student gets when Stripe is off.
function paymentUnavailable() {
  return NextResponse.json({ error: 'payment_unavailable' }, { status: 503 })
}
