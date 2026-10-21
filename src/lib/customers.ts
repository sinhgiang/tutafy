// The numbers on the owner's first page, "My customers" (T-0699): who pays, how many moved from the free plan to a paid
// one, and what the tutors do. Pure functions over rows already read (the reading is in platform-overview.ts and
// customers-data.ts), so the node tests can hand in rows. Read-only; nothing is stored.
//
// Definitions (the page prints them, so the owner can read the numbers the same way):
//   paying tutor       tutors.subscription_status is "pro" or "academy" (the same rule as the Buyers page, written by the Polar webhook);
//   moved up           paying / all tutors, one decimal (3 of 723 = 0.4%);
//   new paying (7, 30) a paying tutor whose purchase date is in the last 7 or 30 days. The purchase date is the day the paid order
//                      was recorded (visitor_events, migration 015); when none was recorded (bought before tracking, or the tracking
//                      tables are not applied) it is the day the tutor signed up, and the page says how many were dated that way;
//   used (7 days)      a tutor with a lesson booked in the last 7 days, or a completed lesson that started in the last 7 days;
//   booked (7 days)    lessons created in the last 7 days, cancelled ones not counted;
//   first real student a tutor who signed up in the last 7 (30) days and has at least one student whose email is not the tutor's own
//                      (a student the tutor made by booking their own page does not count: src/lib/self-added.ts).
// NOT used as proof of a real person: whether an email address is confirmed. Supabase's "Confirm email" is OFF for Tutafy (the owner
// confirmed it on 2026-10-21), so every address counts as confirmed and says nothing; the owner does not change that setting.
import { isBuyerPlan } from '@/lib/buyers'
import { isSelfAdded } from '@/lib/self-added'

const DAY_MS = 24 * 60 * 60 * 1000

export type CustomerTutor = { id: string; email: string | null; created_at: string; subscription_status: string | null }
export type CustomerStudent = { id: string; tutor_id: string; email: string | null }
export type CustomerLesson = { id: string; tutor_id: string; status: string; created_at?: string | null; starts_at?: string | null }

export type CustomersData = {
  tutors: number
  pro: number
  academy: number
  free: number
  paying: number
  /** paying / all tutors, in percent with one decimal; null when there are no tutors */
  movedUpPercent: number | null
  activity: {
    usedTutors7: number
    lessonsBooked7: number
    newTutors7: number
    newTutors30: number
    newWithRealStudent7: number
    newWithRealStudent30: number
  }
}

const since = (now: Date, days: number) => now.getTime() - days * DAY_MS
const inLast = (iso: string | null | undefined, now: Date, days: number) => {
  const t = Date.parse(iso ?? '')
  return Number.isFinite(t) && t >= since(now, days) && t <= now.getTime()
}

/** One decimal, half up: 3 / 723 -> 0.4, 1 / 3 -> 33.3. */
export function percentOne(part: number, whole: number): number | null {
  if (!whole) return null
  return Math.round((part / whole) * 1000) / 10
}

export function buildCustomers(tutors: CustomerTutor[], students: CustomerStudent[], lessons: CustomerLesson[], now: Date): CustomersData {
  const pro = tutors.filter(t => t.subscription_status === 'pro').length
  const academy = tutors.filter(t => t.subscription_status === 'academy').length
  const paying = pro + academy

  const used = new Set<string>()
  let booked = 0
  for (const l of lessons) {
    const createdRecently = inLast(l.created_at, now, 7)
    if (createdRecently && l.status !== 'cancelled') booked++
    if (createdRecently || (l.status === 'completed' && inLast(l.starts_at, now, 7))) used.add(l.tutor_id)
  }

  const emailOf = new Map(tutors.map(t => [t.id, t.email]))
  const hasRealStudent = new Set<string>()
  for (const s of students) if (!isSelfAdded(s.email, emailOf.get(s.tutor_id))) hasRealStudent.add(s.tutor_id)

  const new7 = tutors.filter(t => inLast(t.created_at, now, 7))
  const new30 = tutors.filter(t => inLast(t.created_at, now, 30))
  return {
    tutors: tutors.length,
    pro,
    academy,
    free: tutors.length - paying,
    paying,
    movedUpPercent: percentOne(paying, tutors.length),
    activity: {
      usedTutors7: used.size,
      lessonsBooked7: booked,
      newTutors7: new7.length,
      newTutors30: new30.length,
      newWithRealStudent7: new7.filter(t => hasRealStudent.has(t.id)).length,
      newWithRealStudent30: new30.filter(t => hasRealStudent.has(t.id)).length,
    },
  }
}

export type PayingCustomer = {
  id: string
  name: string
  email: string
  plan: string
  signedUp: string
  /** the day the paid order was recorded, else the day the tutor signed up */
  boughtOn: string
  /** true when the paid order was recorded; false when the sign-up day stands in for it */
  boughtDateKnown: boolean
  students: number
  lessons: number
}

export type NewPaying = { d7: number; d30: number; datedBySignup: number }

/** The paying tutors with their purchase date, newest purchase first, and how many bought in the last 7 and 30 days. */
export function buildPayingCustomers(
  buyers: { id: string; name: string; email: string; created_at: string; subscription_status: string; students?: { count: number }[]; lessons?: { count: number }[] }[],
  orderDates: Map<string, string>,
  now: Date,
): { customers: PayingCustomer[]; newPaying: NewPaying } {
  const customers = buyers
    .filter(b => isBuyerPlan(b.subscription_status))
    .map<PayingCustomer>(b => {
      const order = orderDates.get(b.id)
      return {
        id: b.id, name: b.name, email: b.email, plan: b.subscription_status, signedUp: b.created_at,
        boughtOn: order ?? b.created_at, boughtDateKnown: Boolean(order),
        students: b.students?.[0]?.count ?? 0, lessons: b.lessons?.[0]?.count ?? 0,
      }
    })
    .sort((a, b) => Date.parse(b.boughtOn) - Date.parse(a.boughtOn))
  const recent = (days: number) => customers.filter(c => inLast(c.boughtOn, now, days))
  return {
    customers,
    newPaying: { d7: recent(7).length, d30: recent(30).length, datedBySignup: recent(30).filter(c => !c.boughtDateKnown).length },
  }
}
