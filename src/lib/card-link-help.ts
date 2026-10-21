// The three links under the Card payment link field in Settings (Payments tab): Stripe's Payment
// links page, our step-by-step blog post, and Stripe's official guide. They live here, once, so the
// page and its test read the same addresses; the post's slug must be a real post (tests/card-link-help.test.ts).
import { absoluteUrl } from '@/lib/site-url'

export const STRIPE_GUIDE_SLUG = 'how-to-take-card-payments-with-a-stripe-payment-link'

export const CARD_LINK_HELP_LINKS = {
  stripePaymentLinks: 'https://dashboard.stripe.com/payment-links',
  stepByStepGuide: absoluteUrl(`/blog/${STRIPE_GUIDE_SLUG}`),
  stripeOfficialGuide: 'https://docs.stripe.com/payment-links/create',
} as const
