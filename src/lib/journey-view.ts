// What the journey page draws for one tutor, built from the full timeline. Pure, so the node tests
// run the same code the page uses. Two rules keep a long journey readable without hiding anything:
//  - a run of in-app page views (/students, /lessons ...) is ONE line ("In the app: 25 page views"),
//    because signed-in use is the bulk of a long journey;
//  - what is left is split into pages of VIEW_PAGE_SIZE lines, and the key moments (first visit,
//    sign-up, checkout click, paid order) are listed in their own block on EVERY page with a link
//    to the page that holds them, so a checkout at the end of three weeks of use is never out of sight.
import { isAppPath } from '@/lib/track-path'
import type { TimelineEntry } from '@/lib/timeline'

export const VIEW_PAGE_SIZE = 200

export type ViewRow = TimelineEntry & {
  /** Set on a grouped run of in-app page views: when the run ended, how many views, and the sections. */
  until?: string
  count?: number
  breakdown?: string
}
export type IndexedRow = { row: ViewRow; index: number }
export type KeyMoment = IndexedRow & { page: number }

export type JourneyView = {
  rows: IndexedRow[] // the lines of this page
  keyMoments: KeyMoment[] // every non-page step, wherever it is
  page: number
  pages: number
  steps: number // steps in the timeline
  lines: number // lines after grouping in-app runs
  lastPageBeforeCheckout: TimelineEntry | null
}

export function parseStepsPage(v: string | null | undefined): number {
  const n = Number.parseInt(v ?? '', 10)
  return Number.isFinite(n) && n >= 1 && n <= 100000 ? n : 1
}

// /upgrade is the pricing page: the owner wants to see it on its own line, so it is never folded into a run.
const isAppView = (e: TimelineEntry) => e.kind === 'page_view' && e.path !== '/upgrade' && isAppPath(e.path ?? null)

function describeRun(run: TimelineEntry[]): ViewRow {
  const counts = new Map<string, number>()
  for (const e of run) {
    const section = (e.path ?? '').slice(1)
    counts.set(section, (counts.get(section) ?? 0) + 1)
  }
  const parts = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const shown = parts.slice(0, 6).map(([s, n]) => `${s} ×${n}`)
  if (parts.length > 6) shown.push(`+${parts.length - 6} more`)
  return {
    at: run[0].at,
    until: run[run.length - 1].at,
    kind: 'page_view',
    count: run.length,
    title: `In the app: ${run.length} page views`,
    breakdown: shown.join(', '),
  }
}

/** Runs of two or more in-app page views become one line; everything else is kept as it is. */
export function groupAppRuns(timeline: TimelineEntry[]): ViewRow[] {
  const out: ViewRow[] = []
  let run: TimelineEntry[] = []
  const flush = () => {
    if (run.length === 1) out.push(run[0])
    else if (run.length > 1) out.push(describeRun(run))
    run = []
  }
  for (const e of timeline) {
    if (isAppView(e)) run.push(e)
    else { flush(); out.push(e) }
  }
  flush()
  return out
}

/** The last page the tutor saw before their first click on checkout, or null if they never clicked. */
export function lastPageBeforeFirstCheckout(timeline: TimelineEntry[]): TimelineEntry | null {
  const click = timeline.findIndex(e => e.kind === 'checkout_click')
  if (click < 0) return null
  for (let i = click - 1; i >= 0; i--) if (timeline[i].kind === 'page_view') return timeline[i]
  return null
}

export function buildJourneyView(timeline: TimelineEntry[], requestedPage: number): JourneyView {
  const grouped = groupAppRuns(timeline)
  const pages = Math.max(1, Math.ceil(grouped.length / VIEW_PAGE_SIZE))
  const page = Math.min(Math.max(1, requestedPage), pages)
  const pageOf = (index: number) => Math.floor(index / VIEW_PAGE_SIZE) + 1
  const start = (page - 1) * VIEW_PAGE_SIZE
  const rows = grouped.slice(start, start + VIEW_PAGE_SIZE).map((row, i) => ({ row, index: start + i }))
  const keyMoments: KeyMoment[] = []
  grouped.forEach((row, index) => {
    if (row.kind !== 'page_view') keyMoments.push({ row, index, page: pageOf(index) })
  })
  return { rows, keyMoments, page, pages, steps: timeline.length, lines: grouped.length, lastPageBeforeCheckout: lastPageBeforeFirstCheckout(timeline) }
}
