// The two reads the public tutor profile makes beyond the tutor row (T-0765): the next free times, and how many lessons each
// reviewing student had. Both need tables a visitor's own session cannot read (lessons: only the tutor reads their lessons; blocked
// days: the tutor's note for a day is private, T-0774), so they use the server's admin client and let NOTHING leave except what the page shows:
//   - free times: only start and end times of this tutor's saved lessons and the DATE of each blocked day are read (never the note for the
//     day), and only the free times that remain are returned (no student, no title, no link, no price);
//   - lesson counts: only a number per student id, and the student id itself is never sent to the browser or into the markup.
// A failed read never guesses: the times become 'unknown' (the page says "open the booking page"), the counts are simply absent.
import { clashWindowStart, type AvailabilityRow, type LessonWindow } from '@/lib/booking-slots'
import { nextFreeSlots, safeZone, lessonsPerStudent, type FreeSlot } from '@/lib/tutor-profile'

type Row = Record<string, unknown>
type Result = { data: Row[] | null; error?: unknown; count?: number | null }
// the part of a Supabase client these reads use: a chain of filters that can be awaited
type Query = PromiseLike<Result> & { eq(c: string, v: unknown): Query; neq(c: string, v: unknown): Query; is(c: string, v: unknown): Query; in(c: string, v: unknown[]): Query; gte(c: string, v: string): Query; lt(c: string, v: string): Query; limit(n: number): Query }
export type ReadClient = { from(table: string): { select(cols: string): Query } }

export const TIMES_HORIZON_DAYS = 14

export type FreeTimes = { slots: FreeSlot[]; state: 'ok' | 'none' | 'unknown' }

/**
 * Starts a read now and hands back what happened to it, never a rejection: the caller judges it later, in its own order, and a read it
 * never gets to judge (the tutor has no weekly hours) cannot end as an unhandled rejection. A throw while building the read counts too.
 */
function started<T>(make: () => PromiseLike<T>): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  try {
    return Promise.resolve(make()).then(value => ({ ok: true as const, value }), error => ({ ok: false as const, error }))
  } catch (error) {
    return Promise.resolve({ ok: false as const, error })
  }
}

/**
 * The tutor's next free times for the profile. `anon` is the visitor's session client (the weekly hours are public, the booking page
 * reads them the same way); `getAdmin` makes the admin client for the blocked days and the lessons and may throw when it is not configured.
 */
export async function loadFreeTimes(
  anon: ReadClient,
  getAdmin: () => ReadClient,
  tutor: { id: string; timezone: string | null; buffer_minutes?: number | null },
  durationMinutes: number,
  now: Date = new Date(),
): Promise<FreeTimes> {
  try {
    const today = now.toISOString().slice(0, 10)
    // lessons that could overlap a slot in the window: the same read the booking route does (clashWindowStart goes back far enough
    // for the longest lesson), for the tutor's own calendar (assigned_to is null), and cancelled lessons free their time
    const until = new Date(now.getTime() + (TIMES_HORIZON_DAYS + 2) * 86400000).toISOString()
    // The three reads need nothing from each other, so they go out together (T-0896). The two admin reads are started now and judged below,
    // in the order they always were: no weekly hours is still "none" even if one of them failed, and a throw there still ends as 'unknown'.
    const blockedRead = started(() => getAdmin().from('availability_exceptions').select('date').eq('tutor_id', tutor.id).gte('date', today))
    const lessonsRead = started(() => getAdmin().from('lessons').select('starts_at, ends_at, duration_minutes')
      .eq('tutor_id', tutor.id).is('assigned_to', null).neq('status', 'cancelled')
      .gte('starts_at', clashWindowStart(new Date(now.getTime() - 86400000))).lt('starts_at', until).limit(1000))
    const hours = await anon.from('availability').select('day_of_week, start_time, end_time').eq('tutor_id', tutor.id)
    if (hours.error || !hours.data) return { slots: [], state: 'unknown' }
    const availability = hours.data as unknown as AvailabilityRow[]
    if (availability.length === 0) return { slots: [], state: 'none' }

    const tz = safeZone(tutor.timezone)
    let blockedDates: string[] = []
    // the table may not exist on an older database: no blocked days is the right answer then. Any other failure is not: a day the
    // tutor blocked must never be offered, so the times become 'unknown'.
    const blockedDone = await blockedRead
    if (!blockedDone.ok) throw blockedDone.error
    const blocked = blockedDone.value
    if (blocked.error) {
      const code = (blocked.error as { code?: string }).code
      if (code !== '42P01' && code !== 'PGRST205') return { slots: [], state: 'unknown' }
    } else {
      blockedDates = (blocked.data ?? []).map(r => String(r.date))
    }

    const lessonsDone = await lessonsRead
    if (!lessonsDone.ok) throw lessonsDone.error
    const lessons = lessonsDone.value
    if (lessons.error || !lessons.data) return { slots: [], state: 'unknown' }

    const slots = nextFreeSlots({
      availability, timezone: tz, durationMinutes, bufferMinutes: tutor.buffer_minutes ?? 0,
      blockedDates, busy: lessons.data as unknown as LessonWindow[], now, days: TIMES_HORIZON_DAYS,
    })
    return { slots, state: slots.length > 0 ? 'ok' : 'none' }
  } catch {
    return { slots: [], state: 'unknown' }
  }
}

/** Completed lessons per student id for these students and this tutor. Empty when the read fails. */
export async function loadReviewLessonCounts(getAdmin: () => ReadClient, tutorId: string, studentIds: string[]): Promise<Map<string, number>> {
  const ids = [...new Set(studentIds.filter(Boolean))].slice(0, 100)
  if (ids.length === 0) return new Map()
  try {
    const { data, error } = await getAdmin().from('lessons').select('student_id').eq('tutor_id', tutorId).eq('status', 'completed').in('student_id', ids).limit(1000)
    if (error || !data) return new Map()
    return lessonsPerStudent(data.map(r => (typeof r.student_id === 'string' ? r.student_id : null)))
  } catch {
    return new Map()
  }
}
