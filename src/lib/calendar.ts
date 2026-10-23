// The Calendar's rules (T-0823), pure so tests can run them: which days a view shows, where a lesson sits on the
// week grid, what a drop on the grid means, and which lessons a move would overlap.
export const VIEWS = ['week', 'month'] as const
export type CalView = (typeof VIEWS)[number]
export const SNAP_MINUTES = 15
export const GRID_FROM_HOUR = 6
export const GRID_TO_HOUR = 22
export const HOUR_PX = 56

export const parseView = (raw: string | null | undefined): CalView => (raw === 'month' ? 'month' : 'week')

/** A date from "YYYY-MM-DD" (the address); anything else is today. Local time, noon, so a daylight-saving change never moves the day. */
export function parseDay(raw: string | null | undefined, today: Date): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw ?? '')
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)
    if (d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3])) return d
  }
  return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12)
}

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12)
}

/** The Sunday that starts the week of a day (the month grid also starts on Sunday). */
export function weekStart(d: Date): Date {
  return addDays(d, -d.getDay())
}

export function weekDays(d: Date): Date[] {
  const s = weekStart(d)
  return Array.from({ length: 7 }, (_, i) => addDays(s, i))
}

/** The instants a view must load: [from, to). The month view loads the whole grid (the days of the neighbouring months it draws). */
export function rangeFor(view: CalView, anchor: Date): { from: Date; to: Date } {
  if (view === 'week') {
    const s = weekStart(anchor)
    return { from: new Date(s.getFullYear(), s.getMonth(), s.getDate()), to: new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7) }
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const from = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay())
  return { from, to: new Date(from.getFullYear(), from.getMonth(), from.getDate() + 42) }
}

/** Previous or next period for the arrows. */
export function shift(view: CalView, anchor: Date, dir: 1 | -1): Date {
  return view === 'week' ? addDays(anchor, 7 * dir) : new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1, 12)
}

export type Block = { id: string; startMin: number; durMin: number }

/** Where a lesson's block sits in a day column: minutes from the first hour of the grid, clamped to the grid. */
export function blockOf(startsAt: Date, durationMinutes: number): Block & { top: number; height: number } {
  const startMin = startsAt.getHours() * 60 + startsAt.getMinutes() - GRID_FROM_HOUR * 60
  const maxMin = (GRID_TO_HOUR - GRID_FROM_HOUR) * 60
  const from = Math.min(Math.max(startMin, 0), maxMin - 15)
  const to = Math.min(Math.max(startMin + durationMinutes, from + 15), maxMin)
  return { id: '', startMin: from, durMin: to - from, top: (from / 60) * HOUR_PX, height: Math.max(((to - from) / 60) * HOUR_PX, 22) }
}

/** The minutes from the top of a day column at a pointer height, snapped to 15 minutes and kept inside the grid. */
export function minutesAtOffset(offsetPx: number, durationMinutes: number): number {
  const raw = (offsetPx / HOUR_PX) * 60
  const snapped = Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES
  const maxStart = (GRID_TO_HOUR - GRID_FROM_HOUR) * 60 - Math.min(durationMinutes, 60)
  return Math.min(Math.max(snapped, 0), maxStart)
}

/** The local date and time a drop means: a day and minutes from the first grid hour. */
export function dropTarget(day: Date, minutesFromGridStart: number): Date {
  const total = GRID_FROM_HOUR * 60 + minutesFromGridStart
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(total / 60), total % 60)
}

export type Span = { id: string; startsAt: Date; durationMinutes: number }

/** Two lessons overlap when each starts before the other ends; one that ends exactly when the next starts does not. */
export function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end
}

/** The other lessons a lesson would overlap if it started at `start`. */
export function conflictsFor(others: Span[], moving: { id: string; start: Date; durationMinutes: number }): Span[] {
  const a = { start: moving.start.getTime(), end: moving.start.getTime() + moving.durationMinutes * 60_000 }
  return others.filter(o => o.id !== moving.id && overlaps(a, { start: o.startsAt.getTime(), end: o.startsAt.getTime() + o.durationMinutes * 60_000 }))
}

/** Lessons of one local day, earliest first. */
export function onDay<T extends { starts_at: string }>(lessons: T[], day: Date): T[] {
  const k = dayKey(day)
  return lessons.filter(l => dayKey(new Date(l.starts_at)) === k).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
}

/** Lessons that are cancelled do not take the tutor's time, so they never conflict. */
export const takesTime = (status: string) => status !== 'cancelled'

/**
 * How far down the week grid to scroll when it opens, in minutes from the first grid hour (T-0842). The grid starts at 6 AM, so
 * without this the first screen of a week is mostly empty hours. It shows one hour before the first lesson of the week that
 * takes time; with no lesson, one hour before now when the week holds today, otherwise 8 AM. Never past the last 8 hours of the
 * grid, so the bottom of the grid is not scrolled away from.
 */
export function openingMinute(lessons: { starts_at: string; status: string }[], days: Date[], now: Date): number {
  const keys = new Set(days.map(dayKey))
  const starts = lessons
    .filter(l => takesTime(l.status))
    .map(l => new Date(l.starts_at))
    .filter(d => keys.has(dayKey(d)))
    .map(d => d.getHours() * 60 + d.getMinutes())
  const target = starts.length ? Math.min(...starts) - 60 : keys.has(dayKey(now)) ? now.getHours() * 60 - 60 : 8 * 60
  return Math.min(Math.max(target - GRID_FROM_HOUR * 60, 0), (GRID_TO_HOUR - GRID_FROM_HOUR - 8) * 60)
}
