import { isZeroDecimalCurrency } from '@/lib/stripe/amount'
import { normalizeCurrency, totalsByCurrency } from '@/lib/currency'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a Supabase client, whose chained builder is not worth typing here
type Db = { from: (table: string) => any }

const ROWS_PER_REQUEST = 1000 // what the database answers at most in one request
const MAX_PAGES = 50
const RECENT = 20
const FLAGGED = 20

/** Why a lesson that is marked paid is not counted. `other` = not completed and not wrong (not held yet, or a no-show). */
export type NotCountedReason = 'cancelled' | 'overdue' | 'other'

export type Totals = { currency: string; total: number; count: number }[]

export type RevenueRow = {
  tutor: string
  student: string
  startsAt: string
  price: number
  currency: string
  /** counted in the main number: the lesson is completed (and no card payment already covers it) */
  counted: boolean
  /** set when the lesson is not counted: the warning flag shown next to it */
  reason: NotCountedReason | null
}

export type AdminRevenue = {
  /** completed lessons the tutor marked paid (these are the ones added up) */
  paidCount: number
  /** the main number: one total per currency, tutors price in different currencies so they are never added together */
  totals: Totals
  byTutor: { id: string; name: string; currency: string; total: number; count: number }[]
  /** the newest marked-paid lessons of any status, each with its flag */
  recent: RevenueRow[]
  /** lessons that are marked paid and are cancelled, or are past their time and still not completed (newest first) */
  flagged: RevenueRow[]
  /** what is marked paid but left out of the main number, by reason */
  notCounted: Record<NotCountedReason, { count: number; totals: Totals }>
  /** money a card payment confirmed (the card payments table of migration 017); ok:false when it could not be read, 0 when the table is not there yet */
  card: { ok: true; totals: Totals } | { ok: false }
  /** true when there were more paid lessons than the pages read */
  truncated: boolean
}

type LessonRow = { id: string; price: number | null; starts_at: string; ends_at?: string | null; status: string | null; tutor_id: string; student_id: string }

/** The table is not there (yet): Postgres 42P01, or PostgREST's schema-cache answer PGRST205. Any other error is a real failure. */
function isMissingTable(error: { code?: string; message?: string }): boolean {
  return error.code === '42P01' || error.code === 'PGRST205' || /does not exist|schema cache/i.test(error.message ?? '')
}

/** A card amount in its smallest unit, as a major-unit amount (cents to dollars; yen and dong have no cents). */
const fromMinorUnits = (minor: unknown, currency: string) => (Number(minor) || 0) / (isZeroDecimalCurrency(currency) ? 1 : 100)

/** Past its time and still "scheduled": nobody ever marked it completed. */
function isOverdue(l: LessonRow, now: Date): boolean {
  const end = Date.parse(l.ends_at ?? l.starts_at)
  return l.status === 'scheduled' && Number.isFinite(end) && end < now.getTime()
}

function reasonFor(l: LessonRow, now: Date): NotCountedReason | null {
  if (l.status === 'completed') return null
  if (l.status === 'cancelled') return 'cancelled'
  return isOverdue(l, now) ? 'overdue' : 'other'
}

/**
 * The owner's page about lesson payments (T-0741). Every figure comes from what tutors typed, so the page says so:
 *  - the main number adds up COMPLETED lessons only that the tutor marked paid ("marked paid by tutors, not verified");
 *    a cancelled lesson or one that never happened is never added, whatever its payment says;
 *  - a second number is money a card payment confirmed (lesson_card_payments, migration 017): 0 while that table does not
 *    exist, and a lesson a card payment covers is counted there and not in the first number, so nothing is counted twice;
 *  - lessons marked paid but not counted are listed and flagged: cancelled but marked paid, and past their time but never completed.
 * Each lesson is shown in its tutor's own currency (`tutors.currency`); `lessons.currency` is never read because nothing writes it.
 * Only reads: nothing is written. `now` is a parameter so a test can say what "past" means.
 */
export async function loadAdminRevenue(db: Db, now: Date = new Date()): Promise<AdminRevenue> {
  const lessons: LessonRow[] = []
  let truncated = false
  for (let page = 0; ; page++) {
    if (page >= MAX_PAGES) { truncated = true; break }
    const { data, error } = await db.from('lessons')
      .select('id, price, starts_at, ends_at, status, tutor_id, student_id')
      .eq('payment_status', 'paid')
      .order('starts_at', { ascending: false }).order('id')
      .range(page * ROWS_PER_REQUEST, (page + 1) * ROWS_PER_REQUEST - 1)
    if (error) throw new Error('Could not read the paid lessons')
    lessons.push(...(data ?? []))
    if (!data || data.length < ROWS_PER_REQUEST) break
  }

  // Card payments Stripe confirmed. A missing table is "no card payments yet" (0), not an error; another failure is said as unreadable.
  const cardLessonIds = new Set<string>()
  const cardRows: { price: number; currency: string }[] = []
  let cardOk = true
  for (let page = 0; ; page++) {
    if (page >= MAX_PAGES) break
    const { data, error } = await db.from('lesson_card_payments')
      .select('lesson_id, amount_minor, currency, status')
      .eq('status', 'paid')
      .order('stripe_session_id')
      .range(page * ROWS_PER_REQUEST, (page + 1) * ROWS_PER_REQUEST - 1)
    if (error) {
      if (!isMissingTable(error)) cardOk = false
      cardLessonIds.clear(); cardRows.length = 0
      break
    }
    for (const r of data ?? []) {
      const currency = normalizeCurrency(r.currency)
      if (r.lesson_id) cardLessonIds.add(r.lesson_id)
      cardRows.push({ price: fromMinorUnits(r.amount_minor, currency), currency })
    }
    if (!data || data.length < ROWS_PER_REQUEST) break
  }

  const tutorIds = [...new Set(lessons.map(l => l.tutor_id))]
  const tutors = new Map<string, { name: string; currency: string }>()
  for (let i = 0; i < tutorIds.length; i += 200) {
    const { data } = await db.from('tutors').select('id, name, currency').in('id', tutorIds.slice(i, i + 200))
    for (const t of data ?? []) tutors.set(t.id, { name: t.name ?? 'Unknown', currency: normalizeCurrency(t.currency) })
  }
  const currencyOf = (tutorId: string) => tutors.get(tutorId)?.currency ?? 'USD'

  // Priced lessons, split into counted (completed, not already confirmed by card) and not counted, with the reason.
  const priced = lessons.filter(l => l.price !== null && l.price !== undefined)
  const counted = priced.filter(l => l.status === 'completed' && !cardLessonIds.has(l.id))
  const totals = totalsByCurrency(counted.map(l => ({ price: l.price, currency: currencyOf(l.tutor_id) })))

  const notCounted: AdminRevenue['notCounted'] = {
    cancelled: { count: 0, totals: [] }, overdue: { count: 0, totals: [] }, other: { count: 0, totals: [] },
  }
  for (const reason of ['cancelled', 'overdue', 'other'] as const) {
    const rows = lessons.filter(l => l.status !== 'completed' && reasonFor(l, now) === reason)
    const withPrice = rows.filter(l => l.price !== null && l.price !== undefined)
    notCounted[reason] = { count: rows.length, totals: totalsByCurrency(withPrice.map(l => ({ price: l.price, currency: currencyOf(l.tutor_id) }))) }
  }

  const perTutor = new Map<string, { id: string; name: string; currency: string; total: number; count: number }>()
  for (const l of counted) {
    const entry = perTutor.get(l.tutor_id) ?? { id: l.tutor_id, name: tutors.get(l.tutor_id)?.name ?? 'Unknown', currency: currencyOf(l.tutor_id), total: 0, count: 0 }
    entry.total += Number(l.price) || 0
    entry.count += 1
    perTutor.set(l.tutor_id, entry)
  }
  const byTutor = [...perTutor.values()].sort((a, b) => a.currency.localeCompare(b.currency) || b.total - a.total)

  const newest = lessons.slice(0, RECENT)
  const flaggedLessons = lessons.filter(l => { const r = reasonFor(l, now); return r === 'cancelled' || r === 'overdue' }).slice(0, FLAGGED)
  const studentIds = [...new Set([...newest, ...flaggedLessons].map(l => l.student_id))]
  const students = new Map<string, string>()
  for (let i = 0; i < studentIds.length; i += 200) {
    const { data } = await db.from('students').select('id, name').in('id', studentIds.slice(i, i + 200))
    for (const s of data ?? []) students.set(s.id, s.name ?? '—')
  }
  const row = (l: LessonRow): RevenueRow => ({
    tutor: tutors.get(l.tutor_id)?.name ?? '—',
    student: students.get(l.student_id) ?? '—',
    startsAt: l.starts_at,
    price: Number(l.price ?? 0),
    currency: currencyOf(l.tutor_id),
    counted: l.status === 'completed' && !cardLessonIds.has(l.id),
    reason: reasonFor(l, now),
  })

  return {
    paidCount: counted.length,
    totals,
    byTutor,
    recent: newest.map(row),
    flagged: flaggedLessons.map(row),
    notCounted,
    card: cardOk ? { ok: true, totals: totalsByCurrency(cardRows) } : { ok: false },
    truncated,
  }
}
