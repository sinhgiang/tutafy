// Whether card payments (Stripe) are switched on for this deployment, and the
// wording customers see when they are not. Deliberately import-free so the node
// tests can load it directly.
//
// Customers (tutors and students) must never see operator wording such as the
// name of an environment variable, and must never learn which plan anyone is on.

export const STRIPE_UNAVAILABLE_CODE = 'stripe_unavailable'

/** Shown to a tutor in Settings, next to the PayPal field. */
export const STRIPE_UNAVAILABLE_TUTOR_MESSAGE =
  'Card payments are not available yet. Please use the PayPal link above.'

/** Shown to a student on a booking page. */
export const STRIPE_UNAVAILABLE_STUDENT_MESSAGE =
  'Card payment is not available right now. Please use one of the other payment methods.'

export const TUTOR_PLAN_MESSAGE = 'Card payments are part of the Pro plan.'

/** True when the server has a Stripe secret key. Reads the env, never returns it. */
export function isStripeEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.STRIPE_SECRET_KEY?.trim())
}

/** The one response every Stripe-backed route returns while Stripe is off. */
export function stripeUnavailableResponse(): Response {
  return Response.json(
    { error: STRIPE_UNAVAILABLE_CODE, message: STRIPE_UNAVAILABLE_TUTOR_MESSAGE },
    { status: 503 },
  )
}

/**
 * Turn an API error body into a sentence safe to show a customer.
 * `audience` picks the wording: a tutor in Settings, or a student on a booking page.
 * Anything about Stripe being off or the tutor's plan collapses to the same
 * "not available" sentence for students, so a booking page never reveals a plan.
 */
export function stripeErrorMessage(
  body: unknown,
  audience: 'tutor' | 'student',
  fallback: string,
): string {
  const error = typeof (body as { error?: unknown } | null)?.error === 'string'
    ? (body as { error: string }).error
    : ''
  const unavailable =
    audience === 'tutor' ? STRIPE_UNAVAILABLE_TUTOR_MESSAGE : STRIPE_UNAVAILABLE_STUDENT_MESSAGE

  if (error === STRIPE_UNAVAILABLE_CODE || /not configured/i.test(error)) return unavailable
  if (error === 'upgrade_required') {
    return audience === 'tutor' ? TUTOR_PLAN_MESSAGE : unavailable
  }
  return error || fallback
}
