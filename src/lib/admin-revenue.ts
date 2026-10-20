import { normalizeCurrency, totalsByCurrency } from '@/lib/currency'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a Supabase client, whose chained builder is not worth typing here
type Db = { from: (table: string) => any }

const ROWS_PER_REQUEST = 1000 // what the database answers at most in one request
const MAX_PAGES = 50
const RECENT = 20

export type AdminRevenue = {
  /** every paid lesson, with or without a price */
  paidCount: number
  /** one total per currency: tutors price in different currencies, so they are never added together */
  totals: { currency: string; total: number; count: number }[]
  byTutor: { id: string; name: string; currency: string; total: number; count: number }[]
  recent: { tutor: string; student: string; startsAt: string; price: number; currency: string }[]
  /** true when there were more paid lessons than the pages read */
  truncated: boolean
}

/**
 * The owner's revenue page. Each lesson is shown in its tutor's own currency (`tutors.currency`);
 * `lessons.currency` is never read because nothing writes it. Every paid lesson is counted (the old
 * page added up only the 20 newest as "total revenue").
 */
export async function loadAdminRevenue(db: Db): Promise<AdminRevenue> {
  const lessons: { price: number | null; starts_at: string; tutor_id: string; student_id: string }[] = []
  let truncated = false
  for (let page = 0; ; page++) {
    if (page >= MAX_PAGES) { truncated = true; break }
    const { data, error } = await db.from('lessons')
      .select('id, price, starts_at, tutor_id, student_id')
      .eq('payment_status', 'paid')
      .order('starts_at', { ascending: false }).order('id')
      .range(page * ROWS_PER_REQUEST, (page + 1) * ROWS_PER_REQUEST - 1)
    if (error) throw new Error('Could not read the paid lessons')
    lessons.push(...(data ?? []))
    if (!data || data.length < ROWS_PER_REQUEST) break
  }

  const tutorIds = [...new Set(lessons.map(l => l.tutor_id))]
  const tutors = new Map<string, { name: string; currency: string }>()
  for (let i = 0; i < tutorIds.length; i += 200) {
    const { data } = await db.from('tutors').select('id, name, currency').in('id', tutorIds.slice(i, i + 200))
    for (const t of data ?? []) tutors.set(t.id, { name: t.name ?? 'Unknown', currency: normalizeCurrency(t.currency) })
  }
  const currencyOf = (tutorId: string) => tutors.get(tutorId)?.currency ?? 'USD'

  const priced = lessons.filter(l => l.price !== null && l.price !== undefined)
  const totals = totalsByCurrency(priced.map(l => ({ price: l.price, currency: currencyOf(l.tutor_id) })))

  const perTutor = new Map<string, { id: string; name: string; currency: string; total: number; count: number }>()
  for (const l of priced) {
    const entry = perTutor.get(l.tutor_id) ?? { id: l.tutor_id, name: tutors.get(l.tutor_id)?.name ?? 'Unknown', currency: currencyOf(l.tutor_id), total: 0, count: 0 }
    entry.total += Number(l.price) || 0
    entry.count += 1
    perTutor.set(l.tutor_id, entry)
  }
  const byTutor = [...perTutor.values()].sort((a, b) => a.currency.localeCompare(b.currency) || b.total - a.total)

  const newest = lessons.slice(0, RECENT)
  const studentIds = [...new Set(newest.map(l => l.student_id))]
  const students = new Map<string, string>()
  if (studentIds.length > 0) {
    const { data } = await db.from('students').select('id, name').in('id', studentIds)
    for (const s of data ?? []) students.set(s.id, s.name ?? '—')
  }
  const recent = newest.map(l => ({
    tutor: tutors.get(l.tutor_id)?.name ?? '—',
    student: students.get(l.student_id) ?? '—',
    startsAt: l.starts_at,
    price: Number(l.price ?? 0),
    currency: currencyOf(l.tutor_id),
  }))

  return { paidCount: lessons.length, totals, byTutor, recent, truncated }
}
