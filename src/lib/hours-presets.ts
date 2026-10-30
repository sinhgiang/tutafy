// One-tap free hours (T-1105): a tutor with no free hours picks a ready-made week on the dashboard instead of drawing one.
//
// Why: of the 24 tutors with a booking page, introduction and a link, 21 had no weekly hours, and drawing a week on the Availability grid is several steps
// for a tutor who has just arrived. A preset writes the same rows the grid and the onboarding step write: tutor_id, day_of_week (0 = Sunday ... 6 = Saturday),
// start_time, end_time, in the tutor's own time zone. The tutor changes them afterwards on the Availability page like any other hours.
//
// Safety: the preset id is looked up in the fixed list below (anything else is refused); the tutor id is the session's and is never read from the request;
// a preset is written ONLY for a tutor who has no hours yet, so it can never double up or replace hours the tutor chose themselves; the answer of every
// step is read, and a failed or raced write is taken back.
import type { AvailabilityClient } from '@/lib/onboarding-availability'

export type HoursPreset = {
  id: string
  label: string
  /** What it sets, in words the button shows. */
  detail: string
  days: readonly number[]
  start: string
  end: string
}

export const HOURS_PRESETS: readonly HoursPreset[] = [
  { id: 'weekday-evenings', label: 'Weekday evenings', detail: 'Mon to Fri, 18:00 to 21:00', days: [1, 2, 3, 4, 5], start: '18:00', end: '21:00' },
  { id: 'weekday-mornings', label: 'Weekday mornings', detail: 'Mon to Fri, 08:00 to 12:00', days: [1, 2, 3, 4, 5], start: '08:00', end: '12:00' },
  { id: 'weekdays', label: 'Weekdays, 9 to 5', detail: 'Mon to Fri, 09:00 to 17:00', days: [1, 2, 3, 4, 5], start: '09:00', end: '17:00' },
  { id: 'weekends', label: 'Weekends', detail: 'Sat and Sun, 09:00 to 17:00', days: [0, 6], start: '09:00', end: '17:00' },
]

/** The preset with exactly this id, or null (anything that is not one of the four ids, in any form, is null). */
export function parseHoursPreset(value: unknown): HoursPreset | null {
  return typeof value === 'string' ? HOURS_PRESETS.find(p => p.id === value) ?? null : null
}

export type PresetRow = { tutor_id: string; day_of_week: number; start_time: string; end_time: string }

export function presetRows(userId: string, preset: HoursPreset): PresetRow[] {
  return [...preset.days].sort((a, b) => a - b).map(d => ({ tutor_id: userId, day_of_week: d, start_time: preset.start, end_time: preset.end }))
}

export const HAVE_HOURS_MESSAGE = 'You already have free hours. Change them on the Availability page.'
export const PRESET_FAILED_MESSAGE = 'We could not save your hours. Nothing was changed, so please try again, or set them on the Availability page.'

export type PresetResult = { ok: true; saved: number; preset: HoursPreset } | { ok: false; status: 400 | 409 | 500; message: string }

type Answer<T> = PromiseLike<{ data: T | null; error: unknown }>

/**
 * Writes the preset for this tutor. ok only when the new rows are in the table (read back); a tutor who already has hours gets 409 and nothing is written.
 */
export async function applyHoursPreset(db: AvailabilityClient, userId: string, presetId: unknown): Promise<PresetResult> {
  const preset = parseHoursPreset(presetId)
  if (!preset) return { ok: false, status: 400, message: 'Choose one of the schedules.' }
  const rows = presetRows(userId, preset)
  try {
    const table = () => db.from('availability')
    const before = await (table().select('id').eq('tutor_id', userId) as Answer<{ id: string }[]>)
    if (before.error) return { ok: false, status: 500, message: PRESET_FAILED_MESSAGE }
    if ((before.data ?? []).length > 0) return { ok: false, status: 409, message: HAVE_HOURS_MESSAGE }

    const inserted = await (table().insert(rows).select('id') as Answer<{ id: string }[]>)
    const newIds = (inserted.data ?? []).map(r => r.id)
    if (inserted.error || newIds.length !== rows.length) {
      if (newIds.length) await table().delete().in('id', newIds) // take back what did get in
      return { ok: false, status: 500, message: PRESET_FAILED_MESSAGE }
    }

    // two presses at once (two tabs): both would pass the check above, so look again and keep neither when there are more rows than ours
    const after = await (table().select('id').eq('tutor_id', userId) as Answer<{ id: string }[]>)
    if (after.error || (after.data ?? []).length !== rows.length) {
      await table().delete().in('id', newIds)
      return { ok: false, status: 409, message: 'Your hours changed while saving. Reload the page and check them.' }
    }
    return { ok: true, saved: rows.length, preset }
  } catch {
    return { ok: false, status: 500, message: PRESET_FAILED_MESSAGE }
  }
}
