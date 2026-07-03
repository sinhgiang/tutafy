import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: Request) {
  const { lessonId, portalToken, amount, tutorName, studentName, duration, currency, origin } = await request.json()

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
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
