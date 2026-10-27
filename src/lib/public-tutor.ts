// Reading a tutor for a PUBLIC page, on the server (T-0774). A visitor's own key must not read the `tutors` table or the tutor's
// blocked days (docs/tutors-rls/README.md: it exposed every column of every tutor whose page is on), so the public pages read with
// the server's admin client and ask only for the columns in src/lib/public-tutor-columns.ts. Nothing here is ever given to the browser
// except the row it returns, which holds exactly the columns that were asked for.
//
// The rule that used to be the database policy "Anyone can view tutor for booking" now lives here, in code: a tutor whose booking page
// is off is invisible, except to the signed-in tutor themselves (they preview their own profile). No imports at run time, so a node test can load it.
import type { createAdminClient } from '@/lib/supabase/server'

export type AdminReader = ReturnType<typeof createAdminClient>
// a row of the columns asked for (the caller chooses them from public-tutor-columns.ts, so the type is whatever those columns are)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PublicTutorRow = any

/**
 * The tutor with this slug, or null. `columns` is one of the lists of public-tutor-columns.ts and must include `id` and
 * `booking_url_active`. A tutor whose page is off comes back only when `viewerId` (the signed-in account) is that same tutor.
 */
export async function loadPublicTutor(admin: AdminReader, slug: string, columns: string, viewerId: string | null = null): Promise<PublicTutorRow | null> {
  const { data } = await admin.from('tutors').select(columns).eq('slug', slug).single()
  const row = data as PublicTutorRow | null
  if (!row) return null
  if (row.booking_url_active === true) return row
  return viewerId && row.id === viewerId ? row : null
}

/** The dates from today on that this tutor blocked. Only the date is read: the tutor's note for the day ("reason") is private. */
export async function loadBlockedDates(admin: AdminReader, tutorId: string, now: Date = new Date()): Promise<string[]> {
  try {
    const today = now.toISOString().split('T')[0]
    const { data } = await admin.from('availability_exceptions').select('date').eq('tutor_id', tutorId).gte('date', today)
    return (data ?? []).map((e: { date: string }) => e.date)
  } catch {
    return [] // the table may not exist yet on an older database
  }
}
