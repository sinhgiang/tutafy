// Reading and writing what is remembered about a Polar subscription's cancellation (table polar_subscription_state, migration 031),
// and telling the owner about it (T-1074). Every function here is safe to call when the table does not exist yet (the migration is
// applied by the owner): it answers "nothing known" or "not saved", logs a short warning and never throws, so the webhook keeps working as
// it did before the table. The client handed in is the service-role client; the table has no policy, so nothing else can reach it.
import { createMailer } from '@/lib/email'
import { adminEmail } from '@/lib/admin'
import type { StateRow } from '@/lib/polar-subscription'

const TABLE = 'polar_subscription_state'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any }

export interface StoredState extends StateRow {
  subscription_id: string
  tutor_id: string
  cancel_noticed_at: string | null
}

/** The remembered state of one subscription, or null when there is none (or the table is not there yet). */
export async function readState(db: Db, subscriptionId: string): Promise<StoredState | null> {
  try {
    const { data, error } = await db.from(TABLE)
      .select('subscription_id, tutor_id, state, ends_at, last_event_at, cancel_noticed_at')
      .eq('subscription_id', subscriptionId).maybeSingle()
    if (error) {
      console.warn('[polar-state] could not read the subscription state')
      return null
    }
    return (data as StoredState | null) ?? null
  } catch {
    console.warn('[polar-state] could not read the subscription state')
    return null
  }
}

export interface StateWrite {
  subscription_id: string
  tutor_id: string
  state: 'active' | 'canceling' | 'ended'
  ends_at: string | null
  last_event_at?: string | null
  ended_by?: 'revoked' | 'canceled' | 'safety_net' | null
  cancel_noticed_at?: string
}

/** Saves the state (one row for each subscription). Returns false when it could not be saved. */
export async function writeState(db: Db, row: StateWrite): Promise<boolean> {
  try {
    const { error } = await db.from(TABLE).upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'subscription_id' })
    if (error) {
      console.warn('[polar-state] could not save the subscription state')
      return false
    }
    return true
  } catch {
    console.warn('[polar-state] could not save the subscription state')
    return false
  }
}

/**
 * One short mail to the platform admin (ADMIN_EMAIL) from the site's own sender. It names the tutor by id only (the admin opens the tutor
 * from /admin), never a name or an address. Returns true only when the mail service accepted it; never throws.
 */
export async function noticeOwner(subject: string, lines: string[]): Promise<boolean> {
  try {
    const to = adminEmail()
    if (!to || !process.env.RESEND_API_KEY?.startsWith('re_')) {
      console.warn('[polar-state] owner not told: mail is not set up on this server')
      return false
    }
    const html = lines.map(l => `<p>${l.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)}</p>`).join('')
    const res = await createMailer(process.env.RESEND_API_KEY, 'general').emails.send({ to, subject, html })
    return !(res as { error?: unknown } | null | undefined)?.error
  } catch {
    console.warn('[polar-state] owner not told: the mail service failed')
    return false
  }
}
