// What a Polar "canceled" or "revoked" subscription event means for the tutor's plan (T-1052).
//
// Polar sends `subscription.canceled` as soon as the customer asks to cancel at the end of the period they have
// paid for; they keep the plan until then. The plan is taken away at `subscription.revoked`, or when the paid
// period is already over. So `canceled` must not drop the plan while time is left, and `revoked` always does.
// The paid period's end is `ends_at` when Polar sends it, else `current_period_end`; both are stored in
// tutors.subscription_expires_at (a column the tutor cannot write: migration 016).

export interface SubscriptionTimes {
  ends_at?: string | null
  current_period_end?: string | null
}

export type CancelDecision =
  | { action: 'keep_until'; until: string }   // paid time is left: keep the plan, remember when it ends
  | { action: 'drop' }                        // the period is over (or revoked): back to Free
  | { action: 'wait' }                        // Polar gave no usable end date: change nothing, `revoked` will come

/** When the paid period ends, as a time in milliseconds, or null when Polar sent no usable date. */
export function paidUntil(sub: SubscriptionTimes): number | null {
  for (const raw of [sub.ends_at, sub.current_period_end]) {
    if (typeof raw !== 'string') continue
    const t = Date.parse(raw)
    if (Number.isFinite(t)) return t
  }
  return null
}

/** A `subscription.canceled` event: keep the plan while paid time is left. `now` is a time in milliseconds. */
export function decideCancel(sub: SubscriptionTimes, now: number): CancelDecision {
  const end = paidUntil(sub)
  if (end === null) return { action: 'wait' }
  return end > now ? { action: 'keep_until', until: new Date(end).toISOString() } : { action: 'drop' }
}

/**
 * A subscription still counts as paid when its status is active or trialing, and also when Polar marks it canceled
 * but the period the customer paid for has not ended yet.
 */
export function isPaidNow(sub: SubscriptionTimes & { status?: string | null }, now: number): boolean {
  if (['active', 'trialing'].includes(sub.status ?? '')) return true
  if (sub.status !== 'canceled') return false
  const end = paidUntil(sub)
  return end !== null && end > now
}
