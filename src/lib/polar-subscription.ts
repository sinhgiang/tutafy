// What a Polar subscription event means for the tutor's plan (T-1052, T-1074).
//
// Checked against Polar's documentation (https://polar.sh/docs/integrate/webhooks/events.md, 2026-10-28):
//  - A cancel at the end of the period (the default) sends `subscription.canceled` and `subscription.updated` AT ONCE with the
//    subscription still `active` and `cancel_at_period_end: true`; `subscription.revoked` follows when the period ends, and only then
//    is the status `canceled`. The tutor keeps the plan until then.
//  - An immediate revocation sends `canceled`, `updated` and `revoked` together, with status `canceled` straight away.
//  - `uncanceled` (the customer changed their mind) is one of the kinds of `updated`.
//  - The Subscription object has `cancel_at_period_end`, `canceled_at`, `ends_at` ("will end"), `ended_at` ("ended"),
//    `current_period_end` and `modified_at`.
// What the documentation does NOT say, and only a real cancel can show: how long after the end of the period `revoked` arrives.
// The safety net (src/lib/polar-expiry.ts) covers a `revoked` that is late or never sent.
//
// The paid period's end is `ends_at` when Polar sends it, else `current_period_end`; both are stored in
// tutors.subscription_expires_at (a column the tutor cannot write: migration 016).

export interface SubscriptionTimes {
  ends_at?: string | null
  current_period_end?: string | null
  ended_at?: string | null
}

export type CancelDecision =
  | { action: 'keep_until'; until: string }   // paid time is left: keep the plan, remember when it ends
  | { action: 'drop' }                        // the period is over (or revoked): back to Free
  | { action: 'wait' }                        // Polar gave no usable end date: change nothing, `revoked` will come

/** How long after the end of the paid period the daily check waits for Polar's `revoked` before it takes the plan away itself. */
export const SAFETY_GRACE_MS = 12 * 60 * 60 * 1000

function timeOf(raw: unknown): number | null {
  if (typeof raw !== 'string') return null
  const t = Date.parse(raw)
  return Number.isFinite(t) ? t : null
}

/** When the paid period ends, as a time in milliseconds, or null when Polar sent no usable date. */
export function paidUntil(sub: SubscriptionTimes): number | null {
  return timeOf(sub.ends_at) ?? timeOf(sub.current_period_end)
}

/** True when Polar says the subscription has already ended (`ended_at` is a time that has come). */
export function hasEnded(sub: SubscriptionTimes, now: number): boolean {
  const ended = timeOf(sub.ended_at)
  return ended !== null && ended <= now
}

/** A `subscription.canceled` event: keep the plan while paid time is left. `now` is a time in milliseconds. */
export function decideCancel(sub: SubscriptionTimes, now: number): CancelDecision {
  if (hasEnded(sub, now)) return { action: 'drop' }
  const end = paidUntil(sub)
  if (end === null) return { action: 'wait' }
  return end > now ? { action: 'keep_until', until: new Date(end).toISOString() } : { action: 'drop' }
}

/**
 * A subscription still counts as paid when its status is active or trialing, and also when Polar marks it canceled
 * but the period the customer paid for has not ended yet and Polar has not said it ended (`ended_at`).
 */
export function isPaidNow(sub: SubscriptionTimes & { status?: string | null }, now: number): boolean {
  if (['active', 'trialing'].includes(sub.status ?? '')) return true
  if (sub.status !== 'canceled') return false
  if (hasEnded(sub, now)) return false
  const end = paidUntil(sub)
  return end !== null && end > now
}

/** True when the subscription is paid now but the customer has asked to cancel: it will not renew and ends at `paidUntil`. */
export function isCanceling(sub: SubscriptionTimes & { status?: string | null; cancel_at_period_end?: boolean | null }, now: number): boolean {
  if (!isPaidNow(sub, now)) return false
  if (sub.status === 'canceled') return true
  const end = paidUntil(sub)
  return sub.cancel_at_period_end === true && end !== null
}

/** What this database remembers of one subscription (table polar_subscription_state). */
export interface StateRow {
  state: 'active' | 'canceling' | 'ended'
  ends_at: string | null
  last_event_at: string | null
}

/**
 * Whether an event must be ignored because of what was seen before it (events can arrive twice, late, or in any order).
 *  - `revoked` is final and always applies.
 *  - Anything else about a subscription that has ENDED is ignored: it cannot give the plan back. (Polar does not reopen a revoked
 *    subscription; a new purchase is a new subscription id.)
 *  - An event whose `modified_at` is older than the newest one seen is ignored; the same time (the events of one cancel carry the same
 *    data) is applied again, which changes nothing.
 */
export function ignoreReason(type: string, prev: StateRow | null, eventAt: number | null): 'ended' | 'older' | null {
  if (!prev || type === 'subscription.revoked') return null
  if (prev.state === 'ended') return 'ended'
  const seen = timeOf(prev.last_event_at)
  if (eventAt !== null && seen !== null && eventAt < seen) return 'older'
  return null
}

/** The `modified_at` of an event's subscription, in milliseconds, or null. */
export function eventTime(sub: { modified_at?: unknown }): number | null {
  return timeOf(sub.modified_at)
}

/** True when a cancelling subscription's paid period ended long enough ago that Polar's `revoked` should have come. */
export function safetyDue(row: { state: string; ends_at: string | null }, now: number): boolean {
  if (row.state !== 'canceling') return false
  const end = timeOf(row.ends_at)
  return end !== null && end + SAFETY_GRACE_MS < now
}
