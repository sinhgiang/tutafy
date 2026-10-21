// Which lesson lengths a tutor takes (T-0675, custom lengths T-0700).
//
// allow-old-rule: history, says what the booking page offered every tutor before T-0675
// The booking page used to offer 30, 45, 60 and 90 minutes to every tutor. A tutor now ticks the
// lengths they accept in Settings (tutors.lesson_durations, an integer list), may type lengths of their own
// ("Custom", e.g. 20, 75 or 120), and picks one of them as the length that is selected first
// (tutors.default_lesson_duration). Both columns come from supabase/migrations/018_lesson_durations.sql
// (its first version was applied on 21 Oct 2026; the owner ran it again for custom lengths), and every reader here treats
// "no value" and "column missing" the same way: a tutor who has chosen nothing keeps all four preset lengths
// and the old default of 60 (no change).
//
// What a length is, everywhere (Settings, the booking route, and the database check in 018 says the same):
// a whole number of minutes from 10 to 240, a multiple of 5; a tutor offers at least one and at most six.

export const ALL_DURATIONS = [30, 45, 60, 90] as const
export const FALLBACK_DEFAULT = 60
export const MIN_DURATION = 10
export const MAX_DURATION = 240
export const DURATION_STEP = 5
export const MAX_DURATIONS = 6

export type DurationConfig = { durations: number[]; defaultDuration: number }

/** One length: a whole number of minutes, 10 to 240, a multiple of 5. */
export function isValidLength(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_DURATION && value <= MAX_DURATION && value % DURATION_STEP === 0
}

/** Keep only valid lengths, each once, in ascending order, at most six. Anything else is dropped. */
export function cleanDurations(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<number>()
  for (const item of raw) {
    if (item === null || item === '' || typeof item === 'boolean') continue
    const n = Number(item)
    if (isValidLength(n)) seen.add(n)
  }
  return [...seen].sort((a, b) => a - b).slice(0, MAX_DURATIONS)
}

/**
 * What Settings may save: the list exactly as the tutor made it. Unlike cleanDurations it does not drop anything
 * quietly: a value out of range, not a multiple of 5, a repeat, too many, none at all or not a number is an error
 * with a sentence the tutor can read.
 */
export function checkDurations(raw: unknown): { ok: true; value: number[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: 'Pick at least one lesson length.' }
  if (raw.length > MAX_DURATIONS) return { ok: false, error: `You can offer up to ${MAX_DURATIONS} lesson lengths.` }
  const seen = new Set<number>()
  for (const item of raw) {
    if (!isValidLength(item)) return { ok: false, error: `A lesson length is a whole number of minutes from ${MIN_DURATION} to ${MAX_DURATION}, in steps of ${DURATION_STEP} (got ${JSON.stringify(item)}).` }
    if (seen.has(item)) return { ok: false, error: `${item} minutes is in the list twice.` }
    seen.add(item)
  }
  return { ok: true, value: [...seen].sort((a, b) => a - b) }
}

/** What the tutor typed in the Custom box, checked against the lengths they already have. */
export function parseCustomLength(text: string, current: number[]): { ok: true; value: number } | { ok: false; error: string } {
  const t = String(text ?? '').trim()
  if (!/^\d{1,4}$/.test(t)) return { ok: false, error: 'Type a whole number of minutes, for example 75.' }
  const n = Number(t)
  if (n < MIN_DURATION || n > MAX_DURATION) return { ok: false, error: `A lesson is ${MIN_DURATION} to ${MAX_DURATION} minutes long.` }
  if (n % DURATION_STEP !== 0) return { ok: false, error: `Use a multiple of ${DURATION_STEP} minutes (for example ${Math.round(n / DURATION_STEP) * DURATION_STEP}).` }
  if (current.includes(n)) return { ok: false, error: `${n} minutes is already in your list.` }
  if (current.length >= MAX_DURATIONS) return { ok: false, error: `You can offer up to ${MAX_DURATIONS} lesson lengths. Remove one first.` }
  return { ok: true, value: n }
}

/** What the tutor chose, or null when they chose nothing (a never-set or invalid value). */
export function chosenDurations(raw: unknown): number[] | null {
  const list = cleanDurations(raw)
  return list.length > 0 ? list : null
}

/** The lengths the booking page shows, and the one selected first. */
export function resolveDurationConfig(rawDurations: unknown, rawDefault: unknown): DurationConfig {
  const durations = chosenDurations(rawDurations) ?? [...ALL_DURATIONS]
  const wanted = Number(rawDefault)
  const defaultDuration = durations.includes(wanted)
    ? wanted
    : durations.includes(FALLBACK_DEFAULT) ? FALLBACK_DEFAULT : durations[0]
  return { durations, defaultDuration }
}

/**
 * Server check for a booking: a length is accepted when the tutor's booking page offers it. A tutor who chose lengths takes those;
 * a tutor who chose nothing (every tutor before custom lengths, and every tutor while the database still has the first version
 * of migration 018) offers the four ordinary lengths, so a custom length from one of them, say from a made-up request, is refused.
 */
export function durationAccepted(rawDurations: unknown, requested: unknown): boolean {
  const offered: readonly number[] = chosenDurations(rawDurations) ?? ALL_DURATIONS
  return offered.includes(Number(requested))
}

/**
 * The length a booking asks for, as a number of minutes, or null when it is not a length at all (not a number, a
 * fraction, 0, negative, past 240, not a multiple of 5). Asked of every booking, whatever the tutor chose, so a length
 * the form could never send does not become a lesson that ends before it starts or runs for days.
 */
export function requestedLength(requested: unknown): number | null {
  if (typeof requested === 'boolean' || requested === null || requested === '') return null
  const n = typeof requested === 'string' ? (/^\d{1,4}$/.test(requested.trim()) ? Number(requested) : NaN) : requested
  return isValidLength(n) ? n : null
}

/** "30 or 60 min sessions", "30, 45 or 90 min sessions", "60 min sessions", "20, 75 or 120 min sessions". */
export function describeDurations(durations: number[]): string {
  const list = cleanDurations(durations)
  if (list.length === 0) return describeDurations([...ALL_DURATIONS])
  if (list.length === 1) return `${list[0]} min sessions`
  return `${list.slice(0, -1).join(', ')} or ${list[list.length - 1]} min sessions`
}

/**
 * Tick or untick one length in Settings (a preset button, or the x on a custom length). The last ticked length cannot
 * be unticked (a tutor with no length could not be booked), a seventh cannot be added, and the default length follows
 * when its own tick is removed.
 */
export function toggleDuration(current: DurationConfig, length: number): DurationConfig {
  if (!isValidLength(length)) return current
  const has = current.durations.includes(length)
  if (has && current.durations.length === 1) return current
  if (!has && current.durations.length >= MAX_DURATIONS) return current
  const durations = has ? current.durations.filter(d => d !== length) : cleanDurations([...current.durations, length])
  const defaultDuration = durations.includes(current.defaultDuration)
    ? current.defaultDuration
    : durations.includes(FALLBACK_DEFAULT) ? FALLBACK_DEFAULT : durations[0]
  return { durations, defaultDuration }
}

/** Add what the tutor typed in the Custom box. The default stays as it was. */
export function addCustomDuration(current: DurationConfig, text: string): { config: DurationConfig; error: string | null } {
  const parsed = parseCustomLength(text, current.durations)
  if (!parsed.ok) return { config: current, error: parsed.error }
  return { config: { durations: cleanDurations([...current.durations, parsed.value]), defaultDuration: current.defaultDuration }, error: null }
}

// allow-old-rule: history, the checks the first version of migration 018 put on the real database
/**
 * What the Settings page says when the database refuses to save the two length columns. Until the owner has run migration 018 again
 * on the real database, the database still has the first version's checks (30, 45, 60 and 90 only), so a tutor who typed a length of
 * their own is refused there. They get this plain sentence instead of the database's own words, and the rest of Settings is saved.
 */
export const LENGTHS_NEED_UPDATE = 'Custom lengths are not available yet, try again later. Your other settings are saved.'

/** True when the error is the database's check on the length columns refusing a value (a check violation, code 23514). */
export function isLengthCheckRefusal(error: unknown): boolean {
  const e = (error ?? {}) as { code?: unknown; message?: unknown }
  const message = typeof e.message === 'string' ? e.message : ''
  return /tutors_(lesson_durations|default_lesson_duration)_valid/.test(message) || (e.code === '23514' && /lesson_duration/.test(message))
}

export function lengthSaveErrorMessage(error: unknown, attempted: { durations: number[]; defaultDuration: number }): string {
  const message = typeof (error as { message?: unknown } | null)?.message === 'string' ? (error as { message: string }).message : 'unknown error'
  const custom = attempted.durations.some(d => !(ALL_DURATIONS as readonly number[]).includes(d)) || !(ALL_DURATIONS as readonly number[]).includes(attempted.defaultDuration)
  if (custom && isLengthCheckRefusal(error)) return LENGTHS_NEED_UPDATE
  return 'Your other settings are saved, but your lesson lengths were not: ' + message
}

/** Pick the default length among the ticked ones; anything not ticked is refused. */
export function chooseDefault(current: DurationConfig, length: number): DurationConfig {
  return current.durations.includes(length) ? { ...current, defaultDuration: length } : current
}

/** The two columns exactly as they are written to the database. */
export function durationColumns(config: DurationConfig): { lesson_durations: number[]; default_lesson_duration: number } {
  const clean = resolveDurationConfig(config.durations, config.defaultDuration)
  return { lesson_durations: clean.durations, default_lesson_duration: clean.defaultDuration }
}

type Reader = {
  from(table: string): {
    select(columns: string): { eq(column: string, value: string): { single(): PromiseLike<{ data: Record<string, unknown> | null; error: unknown }> } }
  }
}

/**
 * Read a tutor's chosen lengths. It asks for the two columns on their own, so a database that does
 * not have them yet (migration 018 not applied) answers with an error here and never breaks the
 * query that loads the rest of the tutor: the answer is then "chose nothing".
 */
export async function loadChosenDurations(db: unknown, tutorId: string): Promise<{ lesson_durations: unknown; default_lesson_duration: unknown }> {
  try {
    const client = db as Reader
    const { data, error } = await client.from('tutors').select('lesson_durations, default_lesson_duration').eq('id', tutorId).single()
    if (error || !data) return { lesson_durations: null, default_lesson_duration: null }
    return { lesson_durations: data.lesson_durations ?? null, default_lesson_duration: data.default_lesson_duration ?? null }
  } catch {
    return { lesson_durations: null, default_lesson_duration: null }
  }
}

/**
 * What Settings writes after a save: the two columns when the tutor changed them since the last
 * load or save, nothing when they did not. A tutor who chose nothing and left the section alone
 * stays "chose nothing" (null in the database), which is what keeps all four lengths for them.
 */
export function durationColumnsToSave(saved: DurationConfig | null, current: DurationConfig): ReturnType<typeof durationColumns> | null {
  const now = durationColumns(current)
  if (saved) {
    const before = durationColumns(saved)
    if (before.default_lesson_duration === now.default_lesson_duration && before.lesson_durations.join() === now.lesson_durations.join()) return null
  }
  return now
}

/** The lengths a tutor can pick when they make or edit a lesson themselves (T-0700). */
export const LESSON_FORM_LENGTHS = [30, 45, 60, 90, 120] as const

/**
 * The length buttons on the "new lesson" and "edit lesson" pages: the five the pages always had, the lengths the tutor
 * offers on their booking page (their custom ones too), and the lesson's own length when it is none of those (a lesson
 * imported with 50 minutes keeps its 50 when it is opened for editing). Ascending, each once.
 */
export function lessonLengthOptions(chosen: unknown, current: unknown): number[] {
  const out = new Set<number>([...LESSON_FORM_LENGTHS, ...(chosenDurations(chosen) ?? [])])
  const own = Number(current)
  if (Number.isInteger(own) && own > 0 && own <= 24 * 60) out.add(own)
  return [...out].sort((a, b) => a - b)
}
