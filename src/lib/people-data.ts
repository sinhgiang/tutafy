// What the owner's /super-admin list and the per-person journey page read: EVERY tutor
// (Free, Pro and Academy), where each came from, and the steps they took. Read-only.
// Nothing is added to the database: it uses the tutors table and the visitor tables of
// migration 015. Every long read is paged (see paged-read.ts); the Supabase 1000-row
// limit never cuts a list. The client is passed in (the service-role client, from a page
// that already passed the admin gate), so the node tests can use a fake.
import type { BuyersClient } from '@/lib/buyers-data'
import { rangeBounds, type DateRange, type EventRow, type VisitorRow } from '@/lib/journey'
import { CHUNK, chunks, inBatches, newReadState, readAll, type ReadState } from '@/lib/paged-read'
import { buildTimeline, planOf, stageOf, type Stage, type TimelineEntry } from '@/lib/timeline'
import { VISITOR_COLUMNS, VISITOR_DETAIL_COLUMNS, eventsQuery, milestoneEvents } from '@/lib/visitor-reads'
import type { Source } from '@/lib/visitor-source'

export const PEOPLE_PAGE_SIZE = 50

export type PlanFilter = 'all' | 'free' | 'pro' | 'academy'
export type StageFilter = 'all' | Stage

export function parsePlanFilter(v: string | null | undefined): PlanFilter {
  return v === 'free' || v === 'pro' || v === 'academy' ? v : 'all'
}
export function parseStageFilter(v: string | null | undefined): StageFilter {
  return v === 'registered' || v === 'checkout' || v === 'upgraded' ? v : 'all'
}
export function parsePage(v: string | null | undefined): number {
  const n = Number.parseInt(v ?? '', 10)
  return Number.isFinite(n) && n >= 1 && n <= 100000 ? n : 1
}

type TutorRow = { id: string; name: string; email: string; created_at: string; subscription_status: string | null }

export type PersonRow = {
  id: string
  name: string
  email: string
  plan: 'free' | 'pro' | 'academy'
  signedUp: string
  stage: Stage
  tracked: boolean // false when no visitor record is linked (did not accept cookies, or signed up before tracking)
  country: string | null
  firstSource: Source | null
  firstPath: string | null
  checkoutAt: string | null
  checkoutPlan: string | null
  upgradedAt: string | null
  upgradedPlan: string | null
}

export type PeopleQuery = { plan: PlanFilter; stage: StageFilter; range: DateRange; page: number }

export type PeopleResult = {
  rows: PersonRow[]
  matching: number // people matching both filters
  page: number
  pages: number
  counts: { all: number; free: number; pro: number; academy: number } // by sign-up date range only
  readTruncated: boolean
  failed: boolean
}

/** Read every tutor signed up in the range, newest first (a paged read, with a fixed order). */
async function readTutors(admin: BuyersClient, range: DateRange, state: ReadState): Promise<TutorRow[]> {
  const { gte, lt } = rangeBounds(range)
  return readAll<TutorRow>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = admin.from('tutors').select('id, name, email, created_at, subscription_status')
    if (gte) q = q.gte('created_at', gte)
    if (lt) q = q.lt('created_at', lt)
    return q.order('created_at', { ascending: false }).order('id', { ascending: false })
  }, state)
}

async function countTutors(admin: BuyersClient, range: DateRange, plan: 'pro' | 'academy' | null, state: ReadState): Promise<number> {
  const { gte, lt } = rangeBounds(range)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = admin.from('tutors').select('id', { count: 'exact', head: true })
  if (plan) q = q.eq('subscription_status', plan)
  if (gte) q = q.gte('created_at', gte)
  if (lt) q = q.lt('created_at', lt)
  const { count, error } = await q
  if (error) state.error = true
  return count ?? 0
}

/** Journey facts for these tutors: their earliest visitor record and first checkout click / paid order. */
async function summaries(admin: BuyersClient, tutors: TutorRow[], state: ReadState): Promise<Map<string, {
  visitor: VisitorRow | null
  click: EventRow | null
  paid: EventRow | null
}>> {
  const out = new Map<string, { visitor: VisitorRow | null; click: EventRow | null; paid: EventRow | null }>()
  for (const t of tutors) out.set(t.id, { visitor: null, click: null, paid: null })

  await inBatches(chunks(tutors.map(t => t.id), CHUNK), async ids => {
    const visitors = await readAll<VisitorRow>(() => admin.from('visitors').select(VISITOR_COLUMNS)
      .in('tutor_id', ids).order('first_seen_at', { ascending: true }).order('id', { ascending: true }), state)
    const tutorOf = new Map<string, string>()
    for (const v of visitors) {
      if (!v.tutor_id) continue
      tutorOf.set(v.id, v.tutor_id)
      const s = out.get(v.tutor_id)
      if (s && !s.visitor) s.visitor = v // oldest first, so the first one seen is the first visit
    }
    for (const e of await milestoneEvents(admin, visitors.map(v => v.id), state)) {
      const s = out.get(tutorOf.get(e.visitor_id) ?? '')
      if (!s) continue
      if (e.kind === 'checkout_click' && (!s.click || Date.parse(e.created_at) < Date.parse(s.click.created_at))) s.click = e
      if (e.kind === 'order_paid' && (!s.paid || Date.parse(e.created_at) < Date.parse(s.paid.created_at))) s.paid = e
    }
  })
  return out
}

function toPerson(t: TutorRow, s: { visitor: VisitorRow | null; click: EventRow | null; paid: EventRow | null }): PersonRow {
  const plan = planOf(t.subscription_status)
  return {
    id: t.id,
    name: t.name,
    email: t.email,
    plan,
    signedUp: t.created_at,
    stage: stageOf({ plan, checkoutClicked: Boolean(s.click), paid: Boolean(s.paid) }),
    tracked: Boolean(s.visitor),
    country: s.visitor?.country ?? null,
    firstSource: s.visitor?.first_source ?? null,
    firstPath: s.visitor?.first_path ?? null,
    checkoutAt: s.click?.created_at ?? null,
    checkoutPlan: s.click?.plan ?? null,
    upgradedAt: s.paid?.created_at ?? null,
    upgradedPlan: s.paid?.plan ?? (plan !== 'free' ? plan : null),
  }
}

export async function loadPeople(admin: BuyersClient, q: PeopleQuery): Promise<PeopleResult> {
  const state = newReadState()

  const [all, pro, academy] = await Promise.all([
    countTutors(admin, q.range, null, state),
    countTutors(admin, q.range, 'pro', state),
    countTutors(admin, q.range, 'academy', state),
  ])
  const counts = { all, pro, academy, free: Math.max(all - pro - academy, 0) }

  const tutors = (await readTutors(admin, q.range, state)).filter(t => q.plan === 'all' || planOf(t.subscription_status) === q.plan)

  let rows: PersonRow[]
  let matching: number
  let pageRows: PersonRow[]
  const start = (q.page - 1) * PEOPLE_PAGE_SIZE

  if (q.stage === 'all') {
    // No stage filter: only the people on this page need their journey facts.
    matching = tutors.length
    const pageTutors = tutors.slice(start, start + PEOPLE_PAGE_SIZE)
    const s = await summaries(admin, pageTutors, state)
    pageRows = pageTutors.map(t => toPerson(t, s.get(t.id)!))
  } else {
    // A stage depends on the journey, so everyone matching the plan is checked, then the page is cut.
    const s = await summaries(admin, tutors, state)
    rows = tutors.map(t => toPerson(t, s.get(t.id)!)).filter(p => p.stage === q.stage)
    matching = rows.length
    pageRows = rows.slice(start, start + PEOPLE_PAGE_SIZE)
  }

  return {
    rows: pageRows,
    matching,
    page: q.page,
    pages: Math.max(1, Math.ceil(matching / PEOPLE_PAGE_SIZE)),
    counts,
    readTruncated: state.truncated,
    failed: state.error,
  }
}

// ---- one person's journey ------------------------------------------------------------

export type JourneyResult = {
  person: PersonRow
  timeline: TimelineEntry[] // every step, oldest first (the page splits it with journey-view.ts, nothing is cut)
  upgradeCutsOff: boolean // steps after the paid order were left out (they can be asked for)
  readTruncated: boolean
  failed: boolean
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isTutorId(v: string | null | undefined): v is string {
  return typeof v === 'string' && UUID.test(v)
}

/**
 * The full journey of one tutor: first visit, every page in order with its time, the sign-up,
 * the checkout click and the paid order. After the paid order only the activity of using the app
 * follows, so it is left out unless `includeAfterUpgrade` is true. Returns null if there is no such tutor.
 */
export async function loadJourney(admin: BuyersClient, tutorId: string, includeAfterUpgrade: boolean): Promise<JourneyResult | null> {
  const state = newReadState()
  const { data: tutor, error: tutorError } = await admin.from('tutors')
    .select('id, name, email, created_at, subscription_status').eq('id', tutorId).maybeSingle()
  if (tutorError) state.error = true
  if (!tutor) return state.error ? { person: toPerson({ id: tutorId, name: '', email: '', created_at: new Date(0).toISOString(), subscription_status: null }, { visitor: null, click: null, paid: null }), timeline: [], upgradeCutsOff: false, readTruncated: false, failed: true } : null

  const visitors = await readAll<VisitorRow>(() => admin.from('visitors').select(VISITOR_DETAIL_COLUMNS)
    .eq('tutor_id', tutorId).order('first_seen_at', { ascending: true }).order('id', { ascending: true }), state)

  const milestones = await milestoneEvents(admin, visitors.map(v => v.id), state)
  const firstPaid = milestones.filter(e => e.kind === 'order_paid').sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))[0] ?? null
  const endAt = !includeAfterUpgrade && firstPaid ? firstPaid.created_at : null

  const events: EventRow[] = []
  await inBatches(visitors, async v => {
    const rows = await readAll<EventRow>(() => {
      let q = eventsQuery(admin).eq('visitor_id', v.id)
      if (endAt) q = q.lte('created_at', endAt)
      return q.order('created_at', { ascending: true }).order('id', { ascending: true })
    }, state)
    for (const r of rows) events.push(r)
  })

  const timeline = buildTimeline({ tutor, visitors, events })
  const person = toPerson(tutor as TutorRow, {
    visitor: visitors[0] ?? null,
    click: milestones.find(e => e.kind === 'checkout_click') ?? null,
    paid: firstPaid,
  })
  return {
    person,
    timeline,
    upgradeCutsOff: Boolean(endAt),
    readTruncated: state.truncated,
    failed: state.error,
  }
}
