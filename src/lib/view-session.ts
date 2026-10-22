// The sessions of "View as this tutor" (T-0708): open one, find a valid one, close one. Each is a row of public.admin_view_log
// (supabase/migrations/022_admin_view_log.sql). The id of the row is the only thing the admin's browser holds (an httpOnly cookie); the
// server accepts it only while the row is for the signed-in admin, is not closed and has not run out. The client is passed in (the
// service-role client), after the caller's own admin check, so the node tests can use a fake or a copy of the database.
//
// Nothing here uses the tutor's login or credentials: a session is only a log row that says "this admin may read this tutor's rows,
// read-only, for 30 minutes".
import type { BuyersClient } from '@/lib/buyers-data'
import { VIEW_TTL_MS, isUuid } from '@/lib/view-as'

export type ViewSession = { id: string; adminId: string; tutorId: string; openedAt: string; expiresAt: string }

export type OpenResult =
  | { ok: true; session: ViewSession }
  | { ok: false; reason: 'bad_id' | 'no_such_tutor' | 'unavailable' }

/**
 * Open a view of `tutorId` for `adminId`. The row is the log: if it cannot be written (the table is not there yet, or the database
 * is down) NO view is opened, so a view is never open without its log line.
 */
export async function openViewSession(admin: BuyersClient, adminId: string, tutorId: string, now: Date = new Date()): Promise<OpenResult> {
  if (!isUuid(adminId) || !isUuid(tutorId)) return { ok: false, reason: 'bad_id' }
  const tutor = await admin.from('tutors').select('id').eq('id', tutorId).maybeSingle()
  if (tutor.error) return { ok: false, reason: 'unavailable' }
  if (!tutor.data) return { ok: false, reason: 'no_such_tutor' }

  const openedAt = now.toISOString()
  const expiresAt = new Date(now.getTime() + VIEW_TTL_MS).toISOString()
  const ins = await admin.from('admin_view_log')
    .insert({ admin_id: adminId, tutor_id: tutorId, opened_at: openedAt, expires_at: expiresAt })
    .select('id').single()
  if (ins.error || !ins.data || !isUuid(ins.data.id)) return { ok: false, reason: 'unavailable' }
  return { ok: true, session: { id: ins.data.id, adminId, tutorId, openedAt, expiresAt } }
}

/** The session behind a cookie value, or null: not a UUID, no such row, another admin's, closed, or past its end. */
export async function findViewSession(admin: BuyersClient, sessionId: string | null | undefined, adminId: string, now: Date = new Date()): Promise<ViewSession | null> {
  if (!isUuid(sessionId) || !isUuid(adminId)) return null
  const { data, error } = await admin.from('admin_view_log')
    .select('id, admin_id, tutor_id, opened_at, expires_at, closed_at').eq('id', sessionId).maybeSingle()
  if (error || !data) return null
  if (data.admin_id !== adminId || data.closed_at) return null
  if (!(Date.parse(data.expires_at) > now.getTime())) return null
  return { id: data.id, adminId: data.admin_id, tutorId: data.tutor_id, openedAt: data.opened_at, expiresAt: data.expires_at }
}

/** Write the closing time of the admin's own open session. Closing one that is not theirs or is already closed changes nothing. */
export async function closeViewSession(admin: BuyersClient, sessionId: string | null | undefined, adminId: string, now: Date = new Date()): Promise<void> {
  if (!isUuid(sessionId) || !isUuid(adminId)) return
  await admin.from('admin_view_log').update({ closed_at: now.toISOString() }).eq('id', sessionId).eq('admin_id', adminId).is('closed_at', null)
}
