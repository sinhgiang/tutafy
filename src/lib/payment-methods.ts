// Which "Pay ..." buttons the booking page shows for a tutor. No framework
// imports, so the node tests can load it.
import { safeHttpsUrl } from '@/lib/payment-link'

export type PaymentMethod = { key: 'paypal' | 'card'; label: string; hint: string; color: string; link: string }

type TutorPay = {
  paypal_link?: string | null
  paddle_checkout_link?: string | null
}

/** PayPal link as the tutor typed it: a full link or a paypal.me name / email. */
export function paypalUrl(raw: string): string {
  return raw.startsWith('http') ? raw : `https://www.paypal.com/paypalme/${raw.replace('@', '')}`
}

/** The tutor's card payment link if it is a safe https address, else null. */
export function cardPaymentUrl(tutor: TutorPay): string | null {
  return safeHttpsUrl(tutor.paddle_checkout_link)
}

/** PayPal first, then the card payment link; a tutor with both shows both. */
export function buildPaymentMethods(tutor: TutorPay): PaymentMethod[] {
  const methods: PaymentMethod[] = []
  if (tutor.paypal_link) {
    methods.push({
      key: 'paypal', label: 'Pay via PayPal', hint: 'Instant payment',
      color: 'bg-[#0070BA] hover:bg-[#005ea6] text-white', link: paypalUrl(tutor.paypal_link),
    })
  }
  const card = cardPaymentUrl(tutor)
  if (card) {
    methods.push({
      key: 'card', label: 'Pay by card', hint: 'Secure card checkout',
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white', link: card,
    })
  }
  return methods
}

/**
 * The built-in "Pay by Card" checkout button (platform Stripe) is hidden when the
 * tutor has their own card payment link, so students never see two card buttons.
 */
export function showBuiltInCardCheckout(
  tutor: TutorPay,
  lessonId: string | null | undefined,
  price: number | null | undefined,
): boolean {
  return !!(lessonId && price && price > 0) && cardPaymentUrl(tutor) === null
}
