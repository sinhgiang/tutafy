// What /super-admin reads. The buyer list and the Pro/Academy counts come from the
// SAME function as /admin/buyers (loadBuyers); the journey is added on top from
// the visitors tables. Read-only. The client is passed in (the service-role client,
// from a page that already passed the admin gate), so the node tests can use a fake.
import { loadBuyers, type BuyerRow, type BuyersClient } from '@/lib/buyers-data'
import {
  buildJourney, funnelBySource, inRange, rangeBounds,
  type DateRange, type EventRow, type FunnelRow, type OrderResult, type VisitorRow,
} from '@/lib/journey'
import type { Source } from '@/lib/visitor-source'

// Supabase answers at most 1000 rows per request by default, so this is also the most the funnel can read.
export const FUNNEL_VISITOR_LIMIT = 1000
export const ABANDONED_LIMIT = 50
const CHUNK = 100 // ids per database request, to keep the request address short

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
  failed: boolean
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export async function loadSuperAdmin(admin: BuyersClient, range: DateRange): Promise<SuperAdminData> {
  const base = await loadBuyers(admin)
  let failed = base.failed

  // ---- journeys of the buyers -------------------------------------------------
  const buyerIds = base.buyers.map((b: BuyerRow) => b.id)
  const visitorByTutor = new Map<string, VisitorRow>()
  for (const ids of chunks(buyerIds, CHUNK)) {
    const { data, error } = await admin.from('visitors')
      .select('id, first_seen_at, country, first_source, first_path, tutor_id')
      .in('tutor_id', ids).order('first_seen_at', { ascending: true })
    if (error) failed = true
    for (const v of (data ?? []) as VisitorRow[]) if (v.tutor_id && !visitorByTutor.has(v.tutor_id)) visitorByTutor.set(v.tutor_id, v)
  }
  const eventsByVisitor = new Map<string, EventRow[]>()
  for (const ids of chunks([...visitorByTutor.values()].map(v => v.id), CHUNK)) {
    const { data, error } = await admin.from('visitor_events')
      .select('visitor_id, kind, path, plan, created_at').in('visitor_id', ids).order('created_at', { ascending: true })
    if (error) failed = true
    for (const e of (data ?? []) as EventRow[]) {
      const list = eventsByVisitor.get(e.visitor_id) ?? []
      list.push(e)
      eventsByVisitor.set(e.visitor_id, list)
    }
  }

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
  const { gte, lt } = rangeBounds(range)
  let vq = admin.from('visitors').select('id, first_seen_at, country, first_source, first_path, tutor_id')
  if (gte) vq = vq.gte('first_seen_at', gte)
  if (lt) vq = vq.lt('first_seen_at', lt)
  const { data: vdata, error: verr } = await vq.order('first_seen_at', { ascending: false }).limit(FUNNEL_VISITOR_LIMIT)
  if (verr) failed = true
  const visitors = (vdata ?? []) as VisitorRow[]

  // Events are fetched for exactly these visitors, in groups, so nothing is cut off however many there are.
  const events: EventRow[] = []
  for (const vids of chunks(visitors.map(v => v.id), CHUNK)) {
    const { data, error } = await admin.from('visitor_events')
      .select('visitor_id, kind, path, plan, created_at').in('visitor_id', vids).in('kind', ['checkout_click', 'order_paid'])
      .order('created_at', { ascending: true })
    if (error) failed = true
    events.push(...((data ?? []) as EventRow[]))
  }
  const funnel = funnelBySource(visitors, events)

  // ---- checkout started but not paid ----------------------------------------------
  const paidVisitors = new Set(events.filter(e => e.kind === 'order_paid').map(e => e.visitor_id))
  const buyerTutorIds = new Set(buyerIds)
  const stuck = visitors.filter(v => !paidVisitors.has(v.id) && !(v.tutor_id && buyerTutorIds.has(v.tutor_id))
    && events.some(e => e.visitor_id === v.id && e.kind === 'checkout_click')).slice(0, ABANDONED_LIMIT)

  const names = new Map<string, string>()
  for (const tids of chunks(stuck.map(v => v.tutor_id).filter((x): x is string => Boolean(x)), CHUNK)) {
    const { data, error } = await admin.from('tutors').select('id, name').in('id', tids)
    if (error) failed = true
    for (const t of (data ?? []) as { id: string; name: string }[]) names.set(t.id, t.name)
  }
  // Page views before the click, for the "last page" of each stuck visitor.
  const pageEvents = new Map<string, EventRow[]>()
  for (const vids of chunks(stuck.map(v => v.id), CHUNK)) {
    const { data, error } = await admin.from('visitor_events')
      .select('visitor_id, kind, path, plan, created_at').in('visitor_id', vids).order('created_at', { ascending: true })
    if (error) failed = true
    for (const e of (data ?? []) as EventRow[]) pageEvents.set(e.visitor_id, [...(pageEvents.get(e.visitor_id) ?? []), e])
  }
  const abandoned: AbandonedCheckout[] = stuck.map(v => {
    const j = buildJourney(pageEvents.get(v.id) ?? [])
    const click = (pageEvents.get(v.id) ?? []).find(e => e.kind === 'checkout_click')
    return {
      tutorName: v.tutor_id ? (names.get(v.tutor_id) ?? null) : null,
      country: v.country,
      firstSource: v.first_source,
      lastBeforeCheckout: j.lastBeforeCheckout,
      plan: click?.plan ?? null,
      at: click?.created_at ?? null,
    }
  })

  return {
    pro: noFilter ? base.pro : pro,
    academy: noFilter ? base.academy : academy,
    total: noFilter ? base.total : pro + academy,
    buyers,
    abandoned,
    funnel,
    funnelTruncated: visitors.length >= FUNNEL_VISITOR_LIMIT,
    buyersTruncated: noFilter && base.total > base.buyers.length,
    failed,
  }
}
