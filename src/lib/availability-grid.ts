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

// ---- the grid you press and drag on (T-0844) ---------------------------------------------------------------------------------------------

/** The grid works in half hours: a drag, a press and the time lists all land on :00 or :30. */
export const SNAP_MIN = 30
/** A press that moves less than this many pixels is a press, not a drag. */
export const DRAG_THRESHOLD_PX = 6

/** "HH:MM" for minutes from midnight (1440 is "24:00", the end of the day). */
export function minutesToTime(m: number): string {
  const c = Math.min(Math.max(Math.round(m), 0), 1440)
  return `${String(Math.floor(c / 60)).padStart(2, '0')}:${String(c % 60).padStart(2, '0')}`
}

/** The minute under a point `y` pixels down a day column that starts at `fromHour`, not rounded. */
export function yToMinutes(y: number, fromHour: number): number {
  return fromHour * 60 + (y / GRID_HOUR_PX) * 60
}

const floorSnap = (m: number) => Math.floor(m / SNAP_MIN) * SNAP_MIN
const ceilSnap = (m: number) => Math.ceil(m / SNAP_MIN) * SNAP_MIN

/**
 * The slot a drag from `y1` to `y2` (pixels down one day column) draws: from the half hour under the upper end to the half hour
 * under the lower end, at least one half hour long, kept inside the hours the grid shows. Null when the day is not a day.
 */
export function dragToSlot(day: number, y1: number, y2: number, range: { from: number; to: number }): NewSlot | null {
  if (!(day >= 0 && day <= 6)) return null
  const lo = range.from * 60, hi = range.to * 60
  const a = Math.min(Math.max(floorSnap(yToMinutes(Math.min(y1, y2), range.from)), lo), hi - SNAP_MIN)
  const b = Math.min(Math.max(ceilSnap(yToMinutes(Math.max(y1, y2), range.from)), a + SNAP_MIN), hi)
  return { day_of_week: day, start_time: minutesToTime(a), end_time: minutesToTime(b) }
}

/**
 * The slot a press at `y` proposes: an hour from the half hour pressed, shortened to end where the next slot of that day starts or the
 * grid ends. Null when the press is on a slot already there, or the free room is shorter than a half hour.
 */
export function pressToSlot(existing: Slot[], day: number, y: number, range: { from: number; to: number }, length = 60): NewSlot | null {
  if (!(day >= 0 && day <= 6)) return null
  const start = floorSnap(yToMinutes(y, range.from))
  if (start < range.from * 60 || start >= range.to * 60) return null
  let end = Math.min(start + length, range.to * 60)
  for (const s of existing) {
    if (s.day_of_week !== day) continue
    const x = toMinutes(s.start_time), z = toMinutes(s.end_time)
    if (x === null || z === null) continue
    if (start >= x && start < z) return null
    if (x >= start) end = Math.min(end, x)
  }
  return end - start >= SNAP_MIN ? { day_of_week: day, start_time: minutesToTime(start), end_time: minutesToTime(end) } : null
}

/** The first free hour of a day for "add a slot on Monday" from the keyboard: from 09:00, then from the top of the grid, then the first free half hour. */
export function firstFreeSlot(existing: Slot[], day: number, range: { from: number; to: number }): NewSlot | null {
  const tries: { from: number; length: number }[] = [{ from: Math.max(range.from, 9) * 60, length: 60 }, { from: range.from * 60, length: 60 }, { from: range.from * 60, length: SNAP_MIN }]
  for (const { from, length } of tries) {
    for (let start = from; start + length <= range.to * 60; start += SNAP_MIN) {
      const one = { day_of_week: day, start_time: minutesToTime(start), end_time: minutesToTime(start + length) }
      if (!overlapsExisting(existing, one)) return one
    }
  }
  return null
}

/** Why a changed slot is not allowed, or null: the same rules as a new slot, with the slot itself left out of the overlap check. */
export function checkEditedSlot(existing: Slot[], id: string, edit: NewSlot): string | null {
  return checkNewSlot(existing.filter(s => s.id !== id), edit)
}

/** The end (or start) minute a handle dragged to `y` means, snapped to a half hour and kept at least a half hour from the other end. */
export function resizeTo(slot: Slot, edge: 'start' | 'end', y: number, range: { from: number; to: number }): NewSlot {
  const a = toMinutes(slot.start_time) ?? 0, b = toMinutes(slot.end_time) ?? a + SNAP_MIN
  const m = yToMinutes(y, range.from)
  const lo = range.from * 60, hi = range.to * 60
  if (edge === 'end') {
    const end = Math.min(Math.max(Math.round(m / SNAP_MIN) * SNAP_MIN, a + SNAP_MIN), Math.max(hi, b))
    return { day_of_week: slot.day_of_week, start_time: minutesToTime(a), end_time: minutesToTime(end) }
  }
  const start = Math.max(Math.min(Math.round(m / SNAP_MIN) * SNAP_MIN, b - SNAP_MIN), Math.min(lo, a))
  return { day_of_week: slot.day_of_week, start_time: minutesToTime(start), end_time: minutesToTime(b) }
}

/** The half-hour choices of the time lists, with `extra` (a time a slot already has that is not on the half hour) kept so it can be shown. */
export function timeChoices(extra: string[] = [], includeEnd = false): string[] {
  const list = Array.from({ length: 48 }, (_, i) => minutesToTime(i * SNAP_MIN))
  if (includeEnd) list.push('24:00')
  for (const e of extra) { const t = e.slice(0, 5); if (!list.includes(t) && toMinutes(t) !== null) list.push(t) }
  return list.sort((x, y) => (toMinutes(x) ?? 0) - (toMinutes(y) ?? 0))
}
