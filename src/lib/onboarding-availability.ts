// The "free hours" step of the new-tutor onboarding (T-0728): what is written to public.availability, and how a failure is handled.
//
// What went wrong before (found by the activation-funnel report, T-0716): the page wrote the day as a WORD ('monday') into a column
// that holds a whole number (day_of_week, 0 to 6, 0 = Sunday, as the Availability page and the booking page read it) and added a
// column (is_available) that no migration creates. On a database built from the migrations both writes fail (42703, 22P02), and the
// page did not look at the answer: it went on to "share your booking link" with no hours at all.
//
// Now: the rows carry exactly tutor_id, day_of_week (a number), start_time and end_time, and nothing else. A number is also accepted by a
// text column, so this works on a database whose column differs from the migrations. The new hours are written FIRST and the old ones
// removed only after that worked, so a failure never leaves a tutor with fewer hours than before. The answer of every step is read; the
// last step reads the hours back; and the caller moves to the next screen only when this says ok.
// Only the part of the Supabase client used here is typed, so the node tests can hand in a stand-in over a real Postgres.

/** The days in the order the screen shows them. */
export const ONBOARDING_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
export type OnboardingDay = (typeof ONBOARDING_DAYS)[number]

/** day_of_week as the rest of the app reads it: 0 = Sunday ... 6 = Saturday. */
export const DAY_NUMBER: Record<OnboardingDay, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 }

export const AVAILABILITY_COLUMNS = ['tutor_id', 'day_of_week', 'start_time', 'end_time'] as const

export const SAVE_FAILED_MESSAGE = 'We could not save your hours. Nothing was changed, so please try again. If it keeps happening, you can set them under Availability.'

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** What is wrong with the choice, in words for the tutor, or null when it can be saved. */
export function checkAvailabilityInput(days: readonly string[], start: string, end: string): string | null {
  if (!days.some(d => d in DAY_NUMBER)) return 'Pick at least one day.'
  if (!TIME.test(start) || !TIME.test(end)) return 'Choose a start time and an end time.'
  if (start >= end) return 'The end time must be after the start time.'
  return null
}

export type AvailabilityRow = { tutor_id: string; day_of_week: number; start_time: string; end_time: string }

/** One row for each chosen day (a day twice, or a word that is not a day, makes no row), in week order from Sunday. */
export function availabilityRows(userId: string, days: readonly string[], start: string, end: string): AvailabilityRow[] {
  const numbers = [...new Set(days.filter((d): d is OnboardingDay => d in DAY_NUMBER).map(d => DAY_NUMBER[d]))].sort((a, b) => a - b)
  return numbers.map(n => ({ tutor_id: userId, day_of_week: n, start_time: start, end_time: end }))
}

type Answer<T> = PromiseLike<{ data: T | null; error: unknown }>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AvailabilityClient = { from(table: string): any }

export type SaveResult = { ok: true; saved: number } | { ok: false; message: string }

/**
 * Saves the hours the tutor chose. ok only when the new rows are in the table and the old ones are gone (read back from the table);
 * any failure answers a message to show and leaves the tutor's earlier hours as they were.
 */
export async function saveOnboardingAvailability(db: AvailabilityClient, userId: string, days: readonly string[], start: string, end: string): Promise<SaveResult> {
  const problem = checkAvailabilityInput(days, start, end)
  if (problem) return { ok: false, message: problem }
  const rows = availabilityRows(userId, days, start, end)
  try {
    const table = () => db.from('availability')
    const before = await (table().select('id').eq('tutor_id', userId) as Answer<{ id: string }[]>)
    if (before.error) return { ok: false, message: SAVE_FAILED_MESSAGE }
    const oldIds = (before.data ?? []).map(r => r.id)

    const inserted = await (table().insert(rows).select('id') as Answer<{ id: string }[]>)
    const newIds = (inserted.data ?? []).map(r => r.id)
    if (inserted.error || newIds.length !== rows.length) {
      if (newIds.length) await table().delete().in('id', newIds) // take back what did get in
      return { ok: false, message: SAVE_FAILED_MESSAGE }
    }

    if (oldIds.length) {
      const removed = await (table().delete().in('id', oldIds) as PromiseLike<{ error: unknown }>)
      if (removed.error) {
        await table().delete().in('id', newIds) // keep the earlier hours exactly as they were
        return { ok: false, message: SAVE_FAILED_MESSAGE }
      }
    }

    const after = await (table().select('id').eq('tutor_id', userId) as Answer<{ id: string }[]>)
    if (after.error || (after.data ?? []).length !== rows.length) return { ok: false, message: SAVE_FAILED_MESSAGE }
    return { ok: true, saved: rows.length }
  } catch {
    return { ok: false, message: SAVE_FAILED_MESSAGE }
  }
}
