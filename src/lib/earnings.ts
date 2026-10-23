// The numbers of the Earnings page (T-0821): one period, the period before it, a trend between them,
// a chart series, the top students and the payment history, plus the CSV of that history.
// Pure: the page reads the tutor's own lessons and hands them here.

export type Period = '30d' | '90d' | '12m' | 'all'
export const PERIODS: { value: Period; label: string }[] = [
  { value: '30d', label: '30 days' }, { value: '90d', label: '90 days' }, { value: '12m', label: '12 months' }, { value: 'all', label: 'All time' },
]
export const DEFAULT_PERIOD: Period = '90d'

export type LessonRow = {
  id: string
  starts_at: string
  price: number | string | null
  payment_status: string | null
  status: string | null
  duration_minutes: number | null
  students: { id: string; name: string } | { id: string; name: string }[] | null
}

/** Anything that is not one of the four periods is the default (the address is typed by the visitor). */
export function parsePeriod(raw: string | null | undefined): Period {
  return PERIODS.some(p => p.value === raw) ? (raw as Period) : DEFAULT_PERIOD
}

const DAY = 86_400_000

export type Range = { start: number; end: number; prevStart: number | null; prevEnd: number | null }

/** The period ends now and starts N days back; the previous period is the same length just before it. "All time" has none. */
export function rangeOf(period: Period, now: Date): Range {
  const end = now.getTime()
  if (period === 'all') return { start: -Infinity, end, prevStart: null, prevEnd: null }
  const days = period === '30d' ? 30 : period === '90d' ? 90 : 365
  const start = end - days * DAY
  return { start, end, prevStart: start - days * DAY, prevEnd: start }
}

export type Trend = { pct: number | null; dir: 'up' | 'down' | 'flat' | 'none' }

/** Change from the previous period. No previous value (or none to compare) says "none", never a made-up percentage. */
export function trendOf(current: number, previous: number | null): Trend {
  if (previous === null || previous <= 0) return { pct: null, dir: 'none' }
  const pct = Math.round(((current - previous) / previous) * 100)
  return { pct, dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' }
}

const num = (v: unknown) => Number(v) || 0
const inRange = (iso: string, from: number, to: number) => { const t = new Date(iso).getTime(); return t >= from && t < to }
const studentOf = (l: LessonRow) => (Array.isArray(l.students) ? l.students[0] : l.students) ?? null

export type Kpi = { value: number; previous: number | null; trend: Trend }
export type Bucket = { key: string; label: string; revenue: number; lessons: number }
export type TopStudent = { id: string; name: string; lessons: number; revenue: number }

export type Earnings = {
  empty: boolean
  earned: Kpi
  pending: Kpi
  lessons: Kpi
  cancellation: Kpi & { cancelled: number; total: number }
  buckets: Bucket[]
  bucketUnit: 'week' | 'month'
  top: TopStudent[]
  history: LessonRow[]
}

function sum(rows: LessonRow[], pick: (l: LessonRow) => boolean): number {
  return rows.filter(pick).reduce((s, l) => s + num(l.price), 0)
}

export function computeEarnings(all: LessonRow[], now: Date, period: Period): Earnings {
  const r = rangeOf(period, now)
  const cur = all.filter(l => inRange(l.starts_at, r.start, r.end))
  const prev = r.prevStart === null ? null : all.filter(l => inRange(l.starts_at, r.prevStart!, r.prevEnd!))

  const earnedOf = (rows: LessonRow[]) => sum(rows, l => l.payment_status === 'paid' && l.status !== 'cancelled')
  const pendingOf = (rows: LessonRow[]) => sum(rows, l => l.payment_status === 'pending' && l.status !== 'cancelled')
  const countOf = (rows: LessonRow[]) => rows.filter(l => l.status !== 'cancelled').length
  const rateOf = (rows: LessonRow[]) => (rows.length ? Math.round((rows.filter(l => l.status === 'cancelled').length / rows.length) * 100) : 0)

  const kpi = (f: (rows: LessonRow[]) => number): Kpi => {
    const value = f(cur)
    const previous = prev ? f(prev) : null
    return { value, previous, trend: trendOf(value, previous) }
  }
  const cancelled = cur.filter(l => l.status === 'cancelled').length
  const cancelKpi = kpi(rateOf)
  // For the cancellation rate a fall is the good direction; the page colours it, the number stays honest.
  const cancellation = { ...cancelKpi, cancelled, total: cur.length }

  // Chart: weeks for up to 90 days, months beyond that (all time shows the last 12 months).
  const weekly = period === '30d' || period === '90d'
  const buckets: Bucket[] = []
  if (weekly) {
    const weeks = period === '30d' ? 5 : 13
    const endOfWeek0 = now.getTime()
    for (let i = weeks - 1; i >= 0; i--) {
      const to = endOfWeek0 - i * 7 * DAY, from = to - 7 * DAY
      const rows = all.filter(l => inRange(l.starts_at, from, to) && l.status !== 'cancelled')
      buckets.push({ key: `w${i}`, label: new Date(from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), revenue: earnedOf(rows), lessons: rows.length })
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
      const rows = all.filter(l => inRange(l.starts_at, d.getTime(), to) && l.status !== 'cancelled')
      buckets.push({ key: `m${i}`, label: d.toLocaleDateString('en-US', { month: 'short' }), revenue: earnedOf(rows), lessons: rows.length })
    }
  }

  const byStudent = new Map<string, TopStudent>()
  for (const l of cur.filter(x => x.status !== 'cancelled')) {
    const s = studentOf(l)
    if (!s?.id) continue
    const e = byStudent.get(s.id) ?? { id: s.id, name: s.name, lessons: 0, revenue: 0 }
    e.lessons += 1
    if (l.payment_status === 'paid') e.revenue += num(l.price)
    byStudent.set(s.id, e)
  }
  const top = [...byStudent.values()].sort((a, b) => b.revenue - a.revenue || b.lessons - a.lessons).slice(0, 5)

  const history = cur.filter(l => l.price != null).sort((a, b) => b.starts_at.localeCompare(a.starts_at))

  return {
    empty: all.length === 0,
    earned: kpi(earnedOf), pending: kpi(pendingOf), lessons: kpi(countOf), cancellation,
    buckets, bucketUnit: weekly ? 'week' : 'month', top, history,
  }
}

export const STATUS_FILTERS = ['all', 'pending', 'paid', 'free', 'refunded'] as const
export type StatusFilter = (typeof STATUS_FILTERS)[number]
export const parseStatus = (raw: string | null | undefined): StatusFilter => (STATUS_FILTERS as readonly string[]).includes(raw ?? '') ? (raw as StatusFilter) : 'all'

export function filterHistory(rows: LessonRow[], status: StatusFilter): LessonRow[] {
  return status === 'all' ? rows : rows.filter(l => (l.payment_status ?? 'pending') === status)
}

/** A spreadsheet runs a cell that starts with = + - or @ as a formula; a student name typed by a stranger must not. */
export function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export function historyCsv(rows: LessonRow[], currency: string): string {
  const head = ['Date', 'Student', 'Duration (min)', `Amount (${currency})`, 'Payment status', 'Lesson status']
  const lines = rows.map(l => [
    new Date(l.starts_at).toISOString().slice(0, 10), studentOf(l)?.name ?? '', l.duration_minutes ?? '', num(l.price).toFixed(2), l.payment_status ?? 'pending', l.status ?? '',
  ])
  return [head, ...lines].map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

export type Attendance = { completed: number; cancelled: number; noShow: number; rate: number }

/** Of the lessons that ended one way or the other, how many were held (the Reports tab). */
export function attendanceOf(all: LessonRow[], now: Date, period: Period): Attendance {
  const r = rangeOf(period, now)
  const rows = all.filter(l => inRange(l.starts_at, r.start, r.end))
  const completed = rows.filter(l => l.status === 'completed').length
  const cancelled = rows.filter(l => l.status === 'cancelled').length
  const noShow = rows.filter(l => l.status === 'no_show').length
  const done = completed + cancelled + noShow
  return { completed, cancelled, noShow, rate: done ? Math.round((completed / done) * 100) : 0 }
}
