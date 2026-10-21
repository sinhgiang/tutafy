// What the owner's first page ("Khách hàng của tôi", T-0699) reads besides the overview: the paying tutors (the same function as the
// Buyers page, so the two never disagree) and the day each one's paid order was recorded. Read-only. The client is passed in (the
// service-role client, from a page that already passed the admin gate), so the node tests can use a fake.
//
// The order day comes from the visitor tables of migration 015 (the Polar webhook records `order_paid` there). Until 015 is applied,
// or for a tutor who bought before tracking, there is none: the tutor's sign-up day stands in for it and the page says so.
import { loadBuyers, type BuyerRow, type BuyersClient } from '@/lib/buyers-data'
import { buildPayingCustomers, type NewPaying, type PayingCustomer } from '@/lib/customers'
import type { EventRow } from '@/lib/journey'
import { CHUNK, chunks, newReadState, readAll } from '@/lib/paged-read'
import { VISITOR_COLUMNS, milestoneEvents } from '@/lib/visitor-reads'

export type PayingData = {
  pro: number
  academy: number
  total: number
  customers: PayingCustomer[]
  newPaying: NewPaying
  /** The list is cut at BUYERS_LIST_LIMIT while the totals above still count everyone. */
  listCut: boolean
  /** The tutors table could not be read. */
  failed: boolean
  /** Tables the purchase dates needed and could not be read (the visitor tables, usually: migration 015). */
  datesFailedTables: string[]
}

/** The first recorded paid order of each of these tutors: tutor id -> ISO time. */
export async function loadOrderDates(admin: BuyersClient, tutorIds: string[]): Promise<{ dates: Map<string, string>; failedTables: string[] }> {
  const state = newReadState()
  const visitorOfTutor = new Map<string, string>()
  for (const ids of chunks(tutorIds, CHUNK)) {
    const rows = await readAll<{ id: string; tutor_id: string | null }>(() => admin.from('visitors').select(VISITOR_COLUMNS)
      .in('tutor_id', ids).order('first_seen_at', { ascending: true }).order('id', { ascending: true }), state, 'visitors')
    for (const v of rows) if (v.tutor_id && !visitorOfTutor.has(v.tutor_id)) visitorOfTutor.set(v.tutor_id, v.id)
  }
  const tutorOfVisitor = new Map([...visitorOfTutor].map(([tutorId, visitorId]) => [visitorId, tutorId]))
  const dates = new Map<string, string>()
  const events: EventRow[] = await milestoneEvents(admin, [...visitorOfTutor.values()], state)
  for (const e of events) {
    if (e.kind !== 'order_paid') continue
    const tutorId = tutorOfVisitor.get(e.visitor_id)
    if (tutorId && !dates.has(tutorId)) dates.set(tutorId, e.created_at) // oldest first: the first order stays
  }
  return { dates, failedTables: state.tables }
}

export async function loadPaying(admin: BuyersClient, now: Date = new Date()): Promise<PayingData> {
  const base = await loadBuyers(admin)
  const { dates, failedTables } = base.buyers.length > 0 ? await loadOrderDates(admin, base.buyers.map((b: BuyerRow) => b.id)) : { dates: new Map<string, string>(), failedTables: [] as string[] }
  const { customers, newPaying } = buildPayingCustomers(base.buyers, dates, now)
  return {
    pro: base.pro, academy: base.academy, total: base.total,
    customers, newPaying,
    listCut: base.total > base.buyers.length,
    failed: base.failed,
    datesFailedTables: failedTables,
  }
}
