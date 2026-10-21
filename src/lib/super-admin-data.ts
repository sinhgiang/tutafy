// What /super-admin reads. The buyer list and the Pro/Academy counts come from the
// SAME function as /admin/buyers (loadBuyers); the journey is added on top from
// the visitors tables. Read-only. The client is passed in (the service-role client,
// from a page that already passed the admin gate), so the node tests can use a fake.
//
// How much is read: Supabase answers at most 1000 rows per request, and one active tutor
// can leave thousands of page views. So (1) every read that can be long is paged with
// range() until a page comes back short, in a fixed order; (2) a buyer's journey is read
// only up to their first paid order (else their first checkout click), one visitor at a
// time, so later daily use never crowds out anyone else's rows.
import { loadBuyers, type BuyerRow, type BuyersClient } from '@/lib/buyers-data'
import {
  buildJourney, funnelBySource, inRange, rangeBounds,
  type DateRange, type EventRow, type FunnelRow, type OrderResult, type VisitorRow,
} from '@/lib/journey'
import type { Source } from '@/lib/visitor-source'
import { VISITOR_COLUMNS, eventsQuery, milestoneEvents, pageViewsUpTo } from '@/lib/visitor-reads'
import { CHUNK, MAX_PAGES, ROWS_PER_REQUEST, chunks, inBatches, markFailed, newReadState, readAll, type ReadState } from '@/lib/paged-read'

export { MAX_PAGES, ROWS_PER_REQUEST }

// Supabase answers at most 1000 rows per request by default, so this is also the most the funnel can read.
export const FUNNEL_VISITOR_LIMIT = 1000
export const ABANDONED_LIMIT = 50
export const FALLBACK_PAGE_VIEWS = 200 // a buyer with no order or checkout event: their first page views only


export type BuyerWithJourney = {
  id: string
  name: string
  email: string
  plan: string
  signedUp: string
  boughtOn: string // the order date when we saw it, else the sign-up date
  students: number
  lessons: number
  tracked: boolean // false when this buyer has no journey (bought before tracking, or did not accept cookies)
  country: string | null
  firstSource: Source | null
  firstPath: string | null
  pages: string[]
  lastBeforeCheckout: string | null
  result: OrderResult
}

export type AbandonedCheckout = {
  tutorName: string | null
  country: string | null
  firstSource: Source
  lastBeforeCheckout: string | null
  plan: string | null
  at: string | null
}

export type SuperAdminData = {
  pro: number
  academy: number
  total: number
  buyers: BuyerWithJourney[]
  abandoned: AbandonedCheckout[]
  funnel: { rows: FunnelRow[]; total: FunnelRow }
  funnelTruncated: boolean
  buyersTruncated: boolean
  /** A single read hit MAX_PAGES: some rows were not read. */
  readTruncated: boolean
  failed: boolean
  failedTables: string[] // which tables could not be read (T-0680)
}

/** Visitors first seen in the range, their checkout and paid events, and the funnel built from them. */
async function readFunnel(admin: BuyersClient, range: DateRange, state: ReadState) {
  const { gte, lt } = rangeBounds(range)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let vq: any = admin.from('visitors').select(VISITOR_COLUMNS)
  if (gte) vq = vq.gte('first_seen_at', gte)
  if (lt) vq = vq.lt('first_seen_at', lt)
  const { data: vdata, error: verr } = await vq.order('first_seen_at', { ascending: false }).order('id', { ascending: false }).limit(FUNNEL_VISITOR_LIMIT)
  if (verr) markFailed(state, 'visitors')
  const visitors = (vdata ?? []) as VisitorRow[]

  // Checkout clicks and paid orders of exactly these visitors, read in groups and in full.
  const events = await milestoneEvents(admin, visitors.map(v => v.id), state)
  return { visitors, events, funnel: funnelBySource(visitors, events) }
}

/** Only the funnel (what the owner's main page needs); no buyer journeys are read. */
export async function loadFunnel(admin: BuyersClient, range: DateRange) {
  const state: ReadState = newReadState()
  const { visitors, funnel } = await readFunnel(admin, range, state)
  return { funnel, funnelTruncated: visitors.length >= FUNNEL_VISITOR_LIMIT, readTruncated: state.truncated, failed: state.error, failedTables: state.tables }
}

export async function loadSuperAdmin(admin: BuyersClient, range: DateRange): Promise<SuperAdminData> {
  const base = await loadBuyers(admin)
  const state: ReadState = newReadState()

  // ---- journeys of the buyers -------------------------------------------------
  const buyerIds = base.buyers.map((b: BuyerRow) => b.id)
  const visitorByTutor = new Map<string, VisitorRow>()
  for (const ids of chunks(buyerIds, CHUNK)) {
    const rows = await readAll<VisitorRow>(() => admin.from('visitors').select(VISITOR_COLUMNS)
      .in('tutor_id', ids).order('first_seen_at', { ascending: true }).order('id', { ascending: true }), state, 'visitors')
    for (const v of rows) if (v.tutor_id && !visitorByTutor.has(v.tutor_id)) visitorByTutor.set(v.tutor_id, v)
  }

  const buyerVisitorIds = [...visitorByTutor.values()].map(v => v.id)
  const milestonesByVisitor = new Map<string, EventRow[]>()
  for (const e of await milestoneEvents(admin, buyerVisitorIds, state)) {
    const list = milestonesByVisitor.get(e.visitor_id)
    if (list) list.push(e)
    else milestonesByVisitor.set(e.visitor_id, [e])
  }

  const eventsByVisitor = new Map<string, EventRow[]>()
  await inBatches(buyerVisitorIds, async visitorId => {
    const milestones = milestonesByVisitor.get(visitorId) ?? []
    // The journey ends at the first paid order, else at the first checkout click.
    const end = (milestones.find(e => e.kind === 'order_paid') ?? milestones.find(e => e.kind === 'checkout_click'))?.created_at ?? null
    let views: EventRow[]
    if (end) {
      views = await pageViewsUpTo(admin, visitorId, end, state)
    } else {
      // Neither was recorded (for example the tutor bought before tracking): show only their first page views.
      const { data, error } = await eventsQuery(admin).eq('visitor_id', visitorId).eq('kind', 'page_view')
        .order('created_at', { ascending: true }).order('id', { ascending: true }).limit(FALLBACK_PAGE_VIEWS)
      if (error) markFailed(state, 'visitor_events')
      views = (data ?? []) as EventRow[]
    }
    eventsByVisitor.set(visitorId, [...views, ...milestones])
  })

  const allBuyers: BuyerWithJourney[] = base.buyers.map((b: BuyerRow) => {
    const visitor = visitorByTutor.get(b.id)
    const events = visitor ? (eventsByVisitor.get(visitor.id) ?? []) : []
    const journey = buildJourney(events)
    const orderEvent = events.find(e => e.kind === 'order_paid')
    return {
      id: b.id,
      name: b.name,
      email: b.email,
      plan: b.subscription_status,
      signedUp: b.created_at,
      boughtOn: orderEvent?.created_at ?? b.created_at,
      students: b.students?.[0]?.count ?? 0,
      lessons: b.lessons?.[0]?.count ?? 0,
      tracked: Boolean(visitor),
      country: visitor?.country ?? null,
      firstSource: visitor?.first_source ?? null,
      firstPath: visitor?.first_path ?? null,
      pages: journey.pages,
      lastBeforeCheckout: journey.lastBeforeCheckout,
      // A buyer is paid by definition (their plan is Pro or Academy), even when no order event was seen.
      result: 'paid',
    }
  })
  const buyers = allBuyers.filter(b => inRange(b.boughtOn, range))
  const pro = buyers.filter(b => b.plan === 'pro').length
  const academy = buyers.filter(b => b.plan === 'academy').length
  const noFilter = range.from === null && range.to === null

  // ---- funnel: visitors first seen in the range ---------------------------------
  const { visitors, events, funnel } = await readFunnel(admin, range, state)

  // ---- checkout started but not paid ----------------------------------------------
  const paidVisitors = new Set(events.filter(e => e.kind === 'order_paid').map(e => e.visitor_id))
  const buyerTutorIds = new Set(buyerIds)
  const clickOf = new Map<string, EventRow>()
  for (const e of events) if (e.kind === 'checkout_click' && !clickOf.has(e.visitor_id)) clickOf.set(e.visitor_id, e)
  const stuck = visitors.filter(v => !paidVisitors.has(v.id) && !(v.tutor_id && buyerTutorIds.has(v.tutor_id)) && clickOf.has(v.id))
    .slice(0, ABANDONED_LIMIT)

  const names = new Map<string, string>()
  for (const tids of chunks(stuck.map(v => v.tutor_id).filter((x): x is string => Boolean(x)), CHUNK)) {
    const rows = await readAll<{ id: string; name: string }>(() => admin.from('tutors').select('id, name').in('id', tids).order('id', { ascending: true }), state, 'tutors')
    for (const t of rows) names.set(t.id, t.name)
  }
  // The pages each stuck visitor saw up to their first checkout click, read one visitor at a time.
  const abandonedAt = new Map<string, AbandonedCheckout>()
  await inBatches(stuck, async v => {
    const click = clickOf.get(v.id)!
    const views = await pageViewsUpTo(admin, v.id, click.created_at, state)
    const j = buildJourney([...views, click])
    abandonedAt.set(v.id, {
      tutorName: v.tutor_id ? (names.get(v.tutor_id) ?? null) : null,
      country: v.country,
      firstSource: v.first_source,
      lastBeforeCheckout: j.lastBeforeCheckout,
      plan: click.plan ?? null,
      at: click.created_at,
    })
  })
  const abandoned = stuck.map(v => abandonedAt.get(v.id)!).filter(Boolean)

  return {
    pro: noFilter ? base.pro : pro,
    academy: noFilter ? base.academy : academy,
    total: noFilter ? base.total : pro + academy,
    buyers,
    abandoned,
    funnel,
    funnelTruncated: visitors.length >= FUNNEL_VISITOR_LIMIT,
    buyersTruncated: noFilter && base.total > base.buyers.length,
    readTruncated: state.truncated,
    failed: base.failed || state.error,
    failedTables: [...new Set([...base.failedTables, ...state.tables])],
  }
}
