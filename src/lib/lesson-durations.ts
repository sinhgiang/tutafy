// Which lesson lengths a tutor takes (T-0675).
//
// The booking page used to offer 30, 45, 60 and 90 minutes to every tutor. A tutor now ticks the
// lengths they accept in Settings (tutors.lesson_durations, an integer list) and picks one of them
// as the length that is selected first (tutors.default_lesson_duration). Both columns come from
// supabase/migrations/018_lesson_durations.sql, which is written but not applied to the real database
// until the owner decides, so every reader here treats "no value" and "column missing" the same way:
// a tutor who has chosen nothing keeps all four lengths and the old default of 60 (no change).

export const ALL_DURATIONS = [30, 45, 60, 90] as const
export const FALLBACK_DEFAULT = 60

export type DurationConfig = { durations: number[]; defaultDuration: number }

/** Keep only the four known lengths, each once, in ascending order. Anything else is dropped. */
export function cleanDurations(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  const wanted = new Set(raw.map(Number))
  return ALL_DURATIONS.filter(d => wanted.has(d))
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
 * Server check for a booking. A tutor who chose lengths only takes those. A tutor who chose nothing
 * is not restricted (this route never limited them before, and that does not change).
 */
export function durationAccepted(rawDurations: unknown, requested: unknown): boolean {
  const chosen = chosenDurations(rawDurations)
  if (!chosen) return true
  return chosen.includes(Number(requested))
}

/** "30 or 60 min sessions", "30, 45 or 90 min sessions", "60 min sessions". */
export function describeDurations(durations: number[]): string {
  const list = cleanDurations(durations)
  if (list.length === 0) return describeDurations([...ALL_DURATIONS])
  if (list.length === 1) return `${list[0]} min sessions`
  return `${list.slice(0, -1).join(', ')} or ${list[list.length - 1]} min sessions`
}

/**
 * Tick or untick one length in Settings. The last ticked length cannot be unticked (a tutor with
 * no length could not be booked), and the default length follows when its own tick is removed.
 */
export function toggleDuration(current: DurationConfig, length: number): DurationConfig {
  if (!(ALL_DURATIONS as readonly number[]).includes(length)) return current
  const has = current.durations.includes(length)
  if (has && current.durations.length === 1) return current
  const durations = has ? current.durations.filter(d => d !== length) : cleanDurations([...current.durations, length])
  const defaultDuration = durations.includes(current.defaultDuration)
    ? current.defaultDuration
    : durations.includes(FALLBACK_DEFAULT) ? FALLBACK_DEFAULT : durations[0]
  return { durations, defaultDuration }
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
