import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { hasPlan } from '@/lib/plans'
import { stripeUnavailableResponse } from '@/lib/stripe/availability'

export async function POST(request: Request) {
  const { lessonId, portalToken, amount, tutorName, studentName, duration, currency, origin } = await request.json()

  if (!process.env.STRIPE_SECRET_KEY) {
    return stripeUnavailableResponse()
  }

  if (!portalToken) return NextResponse.json({ error: 'portalToken required' }, { status: 400 })

  // Card payments are a Pro feature — verify the owning tutor's plan, not the
  // student's, since the caller here is an unauthenticated student.
  const admin = createAdminClient()
  const { data: student } = await admin.from('students').select('tutor_id').eq('portal_token', portalToken).single()
  if (!student) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  const { data: tutor } = await admin.from('tutors').select('subscription_status').eq('id', student.tutor_id).single()
  if (!hasPlan(tutor?.subscription_status, 'pro')) {
    return NextResponse.json({ error: 'upgrade_required' }, { status: 403 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: (currency ?? 'USD').toLowerCase(),
        product_data: {
          name: `${duration}-min lesson with ${tutorName}`,
          description: studentName ? `Student: ${studentName}` : undefined,
        },
        unit_amount: Math.round(amount * 100),
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${origin}/portal/${portalToken}?payment=success`,
    cancel_url: `${origin}/portal/${portalToken}`,
    metadata: { lesson_id: lessonId, portal_token: portalToken },
  })

  return NextResponse.json({ url: session.url })
}
