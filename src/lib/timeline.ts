// The journey of one tutor, step by step, and the stage they have reached. Pure
// functions, so the node tests can feed them sample data. Nothing here reads the
// database; the timeline is built from rows the caller already has.
import type { EventRow, VisitorRow } from '@/lib/journey'
import { SOURCE_LABEL, type Source } from '@/lib/visitor-source'
import { APP_SECTIONS } from '@/lib/track-path'

// ---- stage ---------------------------------------------------------------------

export type Stage = 'registered' | 'checkout' | 'upgraded'

export const STAGE_LABEL: Record<Stage, string> = {
  registered: 'Signed up (Free)',
  checkout: 'Started checkout, not upgraded',
  upgraded: 'Upgraded',
}

export function isPaidPlan(status: string | null | undefined): status is 'pro' | 'academy' {
  return status === 'pro' || status === 'academy'
}

/** The plan as the owner reads it: a missing value is Free. */
export function planOf(status: string | null | undefined): 'free' | 'pro' | 'academy' {
  return isPaidPlan(status) ? status : 'free'
}

/** Upgraded wins (a paid plan, or a paid order seen), then checkout started, else just signed up. */
export function stageOf(input: { plan: string | null | undefined; checkoutClicked: boolean; paid: boolean }): Stage {
  if (isPaidPlan(input.plan) || input.paid) return 'upgraded'
  return input.checkoutClicked ? 'checkout' : 'registered'
}

// ---- pages ---------------------------------------------------------------------

const FIXED_LABEL: Record<string, string> = {
  '/': 'Home page',
  '/blog': 'Blog (all posts)',
  '/upgrade': 'Pricing and upgrade page',
  '/register': 'Sign-up page',
  '/login': 'Log-in page',
  '/customers': 'Customers page',
  '/about': 'About page',
  '/updates': 'Updates page',
  '/contact': 'Contact page',
  '/privacy': 'Privacy page',
  '/terms': 'Terms page',
  '/tutors': 'Tutor directory',
  '/onboarding': 'Onboarding',
  '/dashboard': 'Dashboard (signed in)',
}

/** A readable name for a recorded path. Unknown paths are shown as they are. */
export function pageLabel(path: string | null | undefined): string {
  if (!path) return 'Unknown page'
  if (FIXED_LABEL[path]) return FIXED_LABEL[path]
  if (path.startsWith('/blog/')) return `Blog post: ${path.slice('/blog/'.length).replace(/-/g, ' ')}`
  const section = path.slice(1)
  if ((APP_SECTIONS as readonly string[]).includes(section)) return `In the app: ${section}`
  return path
}

// ---- timeline --------------------------------------------------------------------

export type TimelineKind = 'first_visit' | 'page_view' | 'signup' | 'checkout_click' | 'order_paid'

export type TimelineEntry = {
  at: string
  kind: TimelineKind
  title: string
  path?: string | null
  plan?: string | null
  source?: Source
  country?: string | null
  referrerHost?: string | null
  campaign?: string | null
  /** On a first_visit: true for a second or later browser of the same tutor. */
  another?: boolean
}

const RANK: Record<TimelineKind, number> = { first_visit: 0, page_view: 1, signup: 2, checkout_click: 3, order_paid: 4 }
const planName = (p: string | null | undefined) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : '')

/**
 * Every step in time order: the first visit (source, country, landing page), each page, the sign-up
 * (the tutor's created date), the checkout click and the paid order. A page opened again straight
 * after itself (a reload) counts once. Several browsers of one tutor are merged by time.
 */
export function buildTimeline(input: {
  tutor: { created_at: string }
  visitors: VisitorRow[]
  events: EventRow[]
}): TimelineEntry[] {
  const out: TimelineEntry[] = []
  const visitors = [...input.visitors].sort((a, b) => Date.parse(a.first_seen_at) - Date.parse(b.first_seen_at))

  visitors.forEach((v, i) => {
    out.push({
      at: v.first_seen_at,
      kind: 'first_visit',
      title: i === 0 ? `First visit, from ${SOURCE_LABEL[v.first_source] ?? v.first_source}` : `Another browser: first visit, from ${SOURCE_LABEL[v.first_source] ?? v.first_source}`,
      path: v.first_path,
      source: v.first_source,
      country: v.country,
      referrerHost: v.first_referrer_host ?? null,
      campaign: v.utm_campaign ?? null,
      another: i > 0,
    })
  })

  out.push({ at: input.tutor.created_at, kind: 'signup', title: 'Signed up (Free account created)' })

  const events = [...input.events].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
  const lastView = new Map<string, string | null>()
  const landed = new Set<string>()
  for (const e of events) {
    if (e.kind === 'page_view') {
      if (!e.path || lastView.get(e.visitor_id) === e.path) continue
      lastView.set(e.visitor_id, e.path)
      // The landing page is already shown on the "first visit" line; its own page view (same moment) is not repeated.
      const v = visitors.find(x => x.id === e.visitor_id)
      if (v && !landed.has(v.id) && v.first_path === e.path && Math.abs(Date.parse(e.created_at) - Date.parse(v.first_seen_at)) < 5000) {
        landed.add(v.id)
        continue
      }
      out.push({ at: e.created_at, kind: 'page_view', title: pageLabel(e.path), path: e.path })
    } else if (e.kind === 'checkout_click') {
      out.push({ at: e.created_at, kind: 'checkout_click', title: `Clicked checkout${e.plan ? ` (${planName(e.plan)})` : ''}`, path: e.path, plan: e.plan })
    } else if (e.kind === 'order_paid') {
      out.push({ at: e.created_at, kind: 'order_paid', title: `Upgraded to ${planName(e.plan) || 'a paid plan'}`, plan: e.plan })
    }
  }

  return out
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => (Date.parse(a.entry.at) - Date.parse(b.entry.at)) || (RANK[a.entry.kind] - RANK[b.entry.kind]) || (a.index - b.index))
    .map(x => x.entry)
}
