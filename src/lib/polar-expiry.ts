// The safety net under "cancelling keeps the plan to the end of the paid period" (T-1074).
//
// When Polar sends `subscription.canceled` the tutor keeps Pro or Academy, and Polar's `subscription.revoked` takes it away when the paid
// period ends. If that `revoked` is late, or never sent, the plan would stay for ever. This daily check looks at every subscription
// remembered as "canceling" (table polar_subscription_state, migration 031) whose paid period ended more than SAFETY_GRACE_MS ago and
// that no `revoked` has closed, and puts that tutor back on Free, with a log line and one mail to the admin.
//
//  - Before the end of the period (plus the grace time) nothing happens: the tutor keeps the plan they paid for.
//  - A subscription the customer took back (uncanceled) is 'active' again and is not touched.
//  - The row is CLAIMED first (one conditional update from 'canceling' to 'ended'), so two runs at once, or a `revoked` arriving at the same
//    moment, cannot both act; a later `revoked` finds the tutor already on Free and changes nothing.
//  - A tutor who has since bought another subscription (polar_subscription_id is another id) is not downgraded for the old one.
import { safetyDue, SAFETY_GRACE_MS } from '@/lib/polar-subscription'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any }

export const MAX_PER_RUN = 200

export interface ExpiryResult {
  checked: number
  downgraded: string[]   // tutor ids put back on Free by this run
  skipped: number        // rows closed without touching a plan (another subscription now, tutor already Free or gone)
  failed: number
  notified: boolean
  error?: 'read-failed' | 'table-missing'
}

export async function runPolarExpiry(
  admin: Db,
  now: Date,
  notify: (subject: string, lines: string[]) => Promise<boolean>,
): Promise<ExpiryResult> {
  const result: ExpiryResult = { checked: 0, downgraded: [], skipped: 0, failed: 0, notified: false }
  const cutoff = new Date(now.getTime() - SAFETY_GRACE_MS).toISOString()

  const { data: rows, error } = await admin.from('polar_subscription_state')
    .select('subscription_id, tutor_id, state, ends_at')
    .eq('state', 'canceling').lt('ends_at', cutoff).order('ends_at', { ascending: true }).limit(MAX_PER_RUN)
  if (error) {
    console.warn('[polar-expiry] could not read the cancelled subscriptions')
    return { ...result, error: 'read-failed' }
  }

  const due = ((rows ?? []) as { subscription_id: string; tutor_id: string; state: string; ends_at: string | null }[]).filter(r => safetyDue(r, now.getTime()))
  result.checked = due.length

  for (const row of due) {
    // Claim the row. Nothing back means another run, or a `revoked`, or an uncancel got there first.
    const { data: claimed, error: claimErr } = await admin.from('polar_subscription_state')
      .update({ state: 'ended', ended_by: 'safety_net', safety_downgraded_at: now.toISOString(), updated_at: now.toISOString() })
      .eq('subscription_id', row.subscription_id).eq('state', 'canceling').select('subscription_id')
    if (claimErr) { result.failed++; console.warn('[polar-expiry] could not close a subscription row'); continue }
    if (!claimed || claimed.length === 0) continue

    const { data: tutor } = await admin.from('tutors').select('id, subscription_status, polar_subscription_id').eq('id', row.tutor_id).maybeSingle()
    const t = tutor as { id: string; subscription_status: string | null; polar_subscription_id: string | null } | null
    if (!t || (t.polar_subscription_id && t.polar_subscription_id !== row.subscription_id) || !t.subscription_status || t.subscription_status === 'free') {
      result.skipped++
      continue
    }

    const { error: updErr } = await admin.from('tutors').update({ subscription_status: 'free', subscription_expires_at: null }).eq('id', row.tutor_id)
    if (updErr) {
      // Put the claim back so tomorrow's run tries again.
      await admin.from('polar_subscription_state').update({ state: 'canceling', ended_by: null, safety_downgraded_at: null }).eq('subscription_id', row.subscription_id)
      result.failed++
      console.warn('[polar-expiry] could not put a tutor back on Free tutor=%s', row.tutor_id)
      continue
    }
    result.downgraded.push(row.tutor_id)
    console.log('[polar-expiry] SAFETY DOWNGRADE tutor=%s: the paid period ended %s and Polar sent no revoked', row.tutor_id, row.ends_at)
  }

  if (result.downgraded.length > 0) {
    result.notified = await notify(
      `Tutafy: ${result.downgraded.length} tutor${result.downgraded.length === 1 ? '' : 's'} put back on Free by the safety check`,
      [
        'Polar did not send subscription.revoked within 12 hours of the end of the paid period, so the daily safety check took the plan away.',
        `Tutor ids: ${result.downgraded.join(', ')}`,
        'Open the tutor from the admin Tutors page to look. If this happens often, Polar sends revoked later than expected or not at all.',
      ],
    )
    if (result.notified) {
      await admin.from('polar_subscription_state').update({ safety_noticed_at: now.toISOString() }).eq('safety_downgraded_at', now.toISOString())
    }
  }
  return result
}
