// The start and end of a subscription's current period, as ISO dates, for `student_subscriptions`.
//
// Stripe moved these dates: older API versions put `current_period_start` and `current_period_end` on the subscription, newer ones put them
// on each subscription item. The webhook reads whichever the event carries (the subscription first) and gives back only dates that are real:
// a date that is missing or not a number is `null`, never "Invalid Date" (which made `toISOString()` throw and the webhook answer 500, so
// Stripe kept sending the same event and the subscription was never saved).
export type SubscriptionPeriod = { start: string | null; end: string | null }

function secondsToIso(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  const date = new Date(value * 1000)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function subscriptionPeriod(sub: unknown): SubscriptionPeriod {
  const top = (sub ?? {}) as { current_period_start?: unknown; current_period_end?: unknown; items?: { data?: unknown } }
  const items = Array.isArray(top.items?.data) ? top.items.data as { current_period_start?: unknown; current_period_end?: unknown }[] : []
  const first = items[0] ?? {}
  return {
    start: secondsToIso(top.current_period_start) ?? secondsToIso(first.current_period_start),
    end: secondsToIso(top.current_period_end) ?? secondsToIso(first.current_period_end),
  }
}
