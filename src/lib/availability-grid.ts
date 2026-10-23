// The Availability page's rules (T-0824): where a weekly slot sits on the grid, whether a new slot overlaps one the tutor already
// has, and what "copy this day to other days" would add. Pure, so tests can run them.
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const GRID_HOUR_PX = 40

export type Slot = { id: string; day_of_week: number; start_time: string; end_time: string }
export type NewSlot = { day_of_week: number; start_time: string; end_time: string }

/** "09:30" or "09:30:00" as minutes from midnight; null when it is not a time. */
export function toMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(t)
  if (!m) return null
  const h = Number(m[1]), min = Number(m[2])
  return h <= 24 && min < 60 && h * 60 + min <= 1440 ? h * 60 + min : null
}

/** The hours the grid shows: 6 to 22 at least, wider when a slot starts earlier or ends later. */
export function gridRange(slots: { start_time: string; end_time: string }[]): { from: number; to: number } {
  let from = 6, to = 22
  for (const s of slots) {
    const a = toMinutes(s.start_time), b = toMinutes(s.end_time)
    if (a !== null) from = Math.min(from, Math.floor(a / 60))
    if (b !== null) to = Math.max(to, Math.ceil(b / 60))
  }
  return { from, to }
}

export function slotBlock(slot: { start_time: string; end_time: string }, fromHour: number): { top: number; height: number } {
  const a = toMinutes(slot.start_time) ?? 0
  const b = toMinutes(slot.end_time) ?? a
  return { top: ((a - fromHour * 60) / 60) * GRID_HOUR_PX, height: Math.max(((b - a) / 60) * GRID_HOUR_PX, 14) }
}

/** True when [start, end) overlaps a slot of the same day; touching slots (one ends when the next starts) do not overlap. */
export function overlapsExisting(existing: { day_of_week: number; start_time: string; end_time: string }[], add: NewSlot): boolean {
  const a = toMinutes(add.start_time), b = toMinutes(add.end_time)
  if (a === null || b === null) return false
  return existing.some(s => {
    if (s.day_of_week !== add.day_of_week) return false
    const x = toMinutes(s.start_time), y = toMinutes(s.end_time)
    return x !== null && y !== null && a < y && x < b
  })
}

/** Why a new slot is not allowed, or null when it is fine. */
export function checkNewSlot(existing: Slot[], add: NewSlot): string | null {
  const a = toMinutes(add.start_time), b = toMinutes(add.end_time)
  if (a === null || b === null) return 'Choose a start and an end time'
  if (!(add.day_of_week >= 0 && add.day_of_week <= 6)) return 'Choose a day'
  if (a >= b) return 'End time must be after start time'
  if (overlapsExisting(existing, add)) return `That overlaps a slot you already have on ${DAYS[add.day_of_week]}`
  return null
}

/** The slots "copy a day" would add: the slots of the source day on each chosen day, leaving out any that would overlap one already there. */
export function copyPlan(existing: Slot[], fromDay: number, toDays: number[]): NewSlot[] {
  const source = existing.filter(s => s.day_of_week === fromDay)
  const plan: NewSlot[] = []
  for (const day of [...new Set(toDays)].filter(d => d !== fromDay && d >= 0 && d <= 6)) {
    for (const s of source) {
      const add = { day_of_week: day, start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5) }
      if (!overlapsExisting([...existing, ...plan], add)) plan.push(add)
    }
  }
  return plan
}

/** Hours a week of slots adds up to, for the sentence under the title. */
export function weeklyHours(slots: { start_time: string; end_time: string }[]): number {
  return slots.reduce((n, s) => n + Math.max(((toMinutes(s.end_time) ?? 0) - (toMinutes(s.start_time) ?? 0)) / 60, 0), 0)
}
