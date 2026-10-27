// The Lessons list (T-0822): filters from the address, one query builder for the page and the CSV export, the CSV.
import { cleanSearch, isUuid, parsePage, pick } from './list-params'
import { csvCell } from './csv'

export const L_STATUSES = ['all', 'scheduled', 'completed', 'cancelled', 'no_show'] as const
export const L_PAYMENTS = ['all', 'pending', 'paid', 'free', 'refunded'] as const
export const L_WHEN = ['all', 'upcoming', 'past'] as const
export const L_SORTS = ['newest', 'oldest'] as const
export type LessonFilters = {
  q: string; status: (typeof L_STATUSES)[number]; pay: (typeof L_PAYMENTS)[number]; when: (typeof L_WHEN)[number]
  sort: (typeof L_SORTS)[number]; student: string; page: number
}
export const LESSON_DEFAULTS = { q: '', status: 'all', pay: 'all', when: 'all', sort: 'newest', student: '', page: '1' }
export const L_SORT_LABEL = { newest: 'Newest first', oldest: 'Oldest first' } as const

export function parseLessonFilters(sp: Record<string, string | string[] | undefined> | URLSearchParams): LessonFilters {
  const get = (k: string) => { const v = sp instanceof URLSearchParams ? sp.get(k) : sp[k]; return Array.isArray(v) ? v[0] : v ?? null }
  const student = get('student')
  return {
    q: cleanSearch(get('q')),
    status: pick(get('status'), L_STATUSES, 'all'),
    pay: pick(get('pay'), L_PAYMENTS, 'all'),
    when: pick(get('when'), L_WHEN, 'all'),
    sort: pick(get('sort'), L_SORTS, 'newest'),
    student: isUuid(student) ? student : '',
    page: parsePage(get('page')),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a Supabase filter builder
type Q = any

/**
 * Adds the filters. `studentIds` is the answer to the name search (the ids of the tutor's own students whose name or
 * email matches), or null when nobody searched; an empty list means "nobody matches", which the caller turns into an empty page.
 */
export function applyLessonFilters(q: Q, f: LessonFilters, now: Date, studentIds: string[] | null): Q {
  if (f.status !== 'all') q = q.eq('status', f.status)
  if (f.pay !== 'all') q = q.eq('payment_status', f.pay)
  if (f.when === 'upcoming') q = q.gte('starts_at', now.toISOString()).eq('status', 'scheduled')
  if (f.when === 'past') q = q.lt('starts_at', now.toISOString())
  if (f.student) q = q.eq('student_id', f.student)
  if (studentIds) q = q.in('student_id', studentIds)
  return q.order('starts_at', { ascending: f.sort === 'oldest' }).order('id', { ascending: true })
}

type Stu = { name: string; level: string | null }
export type LessonRow = {
  id: string; starts_at: string; duration_minutes: number; status: string; payment_status: string | null; price: number | null
  zoom_link: string | null; meet_link: string | null; students: Stu | Stu[] | null
}
export const LESSON_COLUMNS = 'id, starts_at, duration_minutes, status, payment_status, price, zoom_link, meet_link, students(name, level)'
export const studentOf = (l: LessonRow): Stu | null => (Array.isArray(l.students) ? l.students[0] : l.students) ?? null

export function lessonsCsv(rows: LessonRow[], currency: string): string {
  const head = ['Date', 'Time (UTC)', 'Student', 'Duration (min)', `Price (${currency})`, 'Lesson status', 'Payment status']
  const lines = rows.map(l => [
    l.starts_at.slice(0, 10), l.starts_at.slice(11, 16), studentOf(l)?.name ?? '', l.duration_minutes, l.price == null ? '' : Number(l.price).toFixed(2), l.status, l.payment_status ?? 'pending',
  ])
  return [head, ...lines].map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a Supabase client
type Db = { from: (table: string) => any }

/** The ids of the signed-in tutor's own students whose name or email matches the words typed (null when nothing was typed). */
export async function matchingStudentIds(db: Db, tutorId: string, q: string): Promise<string[] | null> {
  if (!q) return null
  const { data } = await db.from('students').select('id').eq('tutor_id', tutorId).or(`name.ilike.%${q}%,email.ilike.%${q}%`).limit(500)
  return ((data ?? []) as { id: string }[]).map(r => r.id)
}
