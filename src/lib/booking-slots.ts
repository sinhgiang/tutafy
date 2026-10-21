// Times a student can pick on the booking page, and the check that a new lesson does not run into another (T-0700).
//
// A length is any number of minutes the tutor offers (10 to 240, steps of 5: see src/lib/lesson-durations.ts), so nothing here
// may assume 30, 45, 60 or 90: the free times step by length plus the tutor's buffer, a lesson ends length minutes after it
// starts, and two lessons clash when their minutes overlap, not only when they start at the same minute.

export type AvailabilityRow = { day_of_week: number; start_time: string; end_time: string }

/**
 * The start times ("HH:MM", in the tutor's timezone) offered on a date: inside each free-hours row of that weekday, one every
 * `duration + bufferMinutes` minutes, as long as the whole lesson fits before the row ends.
 */
export function getSlots(avail: AvailabilityRow[], dateStr: string, duration: number, bufferMinutes = 0): string[] {
  if (!dateStr) return []
  const day = new Date(dateStr + 'T00:00:00').getDay()
  const slots: string[] = []
  for (const a of avail.filter(a => a.day_of_week === day)) {
    const [sh, sm] = a.start_time.split(':').map(Number)
    const [eh, em] = a.end_time.split(':').map(Number)
    let cur = sh * 60 + sm
    const step = duration + bufferMinutes
    while (cur + duration <= eh * 60 + em) {
      const h = Math.floor(cur / 60), m = (cur % 60).toString().padStart(2, '0')
      slots.push(`${h.toString().padStart(2,'0')}:${m}`)
      cur += step
    }
  }
  return slots
}

/** Longest lesson a tutor can offer, in minutes: how far back before a new lesson another one may still be running. */
const LONGEST_MS = 240 * 60 * 1000

export type LessonWindow = { starts_at: string | null; ends_at?: string | null; duration_minutes?: number | null }

/** When a saved lesson ends: its own end time, else its start plus its length, else one hour after it starts. */
export function lessonEnd(l: LessonWindow): number {
  const start = new Date(l.starts_at ?? '').getTime()
  const own = l.ends_at ? new Date(l.ends_at).getTime() : NaN
  if (Number.isFinite(own)) return own
  const minutes = Number(l.duration_minutes)
  return start + (Number.isFinite(minutes) && minutes > 0 ? minutes : 60) * 60 * 1000
}

/** The earliest start worth asking the database for when looking for a lesson that is still running at `start`. */
export function clashWindowStart(start: Date): string {
  return new Date(start.getTime() - LONGEST_MS).toISOString()
}

/** The first saved lesson that overlaps [start, end), or null. Touching (one ends when the other starts) is not an overlap. */
export function overlappingLesson<T extends LessonWindow>(existing: T[], start: Date, end: Date): T | null {
  for (const l of existing) {
    const s = new Date(l.starts_at ?? '').getTime()
    if (!Number.isFinite(s)) continue
    if (s < end.getTime() && lessonEnd(l) > start.getTime()) return l
  }
  return null
}
