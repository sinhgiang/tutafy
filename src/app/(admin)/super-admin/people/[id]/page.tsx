import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/admin-guard'
import { isTutorId, loadJourney, parsePage, parsePlanFilter, parseStageFilter, TIMELINE_SHOWN } from '@/lib/people-data'
import { STAGE_LABEL, pageLabel, type TimelineEntry } from '@/lib/timeline'
import { countryName, formatWhen } from '@/lib/format'
import { SOURCE_LABEL } from '@/lib/visitor-source'
import { parseRange } from '@/lib/journey'
import { planBadgeClass, planLabel } from '@/lib/buyers'
import { ArrowLeft, Eye, Flag, UserPlus, MousePointerClick, BadgeCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

const ICON = { first_visit: Flag, page_view: Eye, signup: UserPlus, checkout_click: MousePointerClick, order_paid: BadgeCheck } as const
const DOT: Record<TimelineEntry['kind'], string> = {
  first_visit: 'bg-indigo-100 text-indigo-600',
  page_view: 'bg-gray-100 text-gray-500',
  signup: 'bg-blue-100 text-blue-600',
  checkout_click: 'bg-amber-100 text-amber-700',
  order_paid: 'bg-green-100 text-green-700',
}

export default async function PersonJourneyPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Own check, before any query: this page reads one tutor's whole journey with the service-role key.
  await requireAdminPage()

  const { id } = await params
  if (!isTutorId(id)) notFound()
  const sp = await searchParams
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const includeAfter = first(sp.after) === '1'

  // The list filters, passed along so "back" lands where the owner was.
  const range = parseRange(first(sp.from), first(sp.to))
  const back = new URLSearchParams()
  const plan = parsePlanFilter(first(sp.plan)); if (plan !== 'all') back.set('plan', plan)
  const stage = parseStageFilter(first(sp.stage)); if (stage !== 'all') back.set('stage', stage)
  if (range.from) back.set('from', range.from)
  if (range.to) back.set('to', range.to)
  const pageNo = parsePage(first(sp.page)); if (pageNo > 1) back.set('page', String(pageNo))
  const backQuery = back.toString() ? `?${back.toString()}` : ''

  const j = await loadJourney(createAdminClient(), id, includeAfter)
  if (!j) notFound()
  const p = j.person
  const hidden = j.timeline.length - j.shown.length

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href={`/super-admin${backQuery}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="h-4 w-4" /> All tutors
      </Link>

      {j.failed && (
        <div data-testid="journey-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          Could not read all of this journey, so it may be incomplete. Reload the page; if it keeps happening, check the database.
        </div>
      )}
      {j.readTruncated && (
        <div data-testid="journey-truncated" role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          This tutor has too many recorded steps to read in full; the later ones may be missing.
        </div>
      )}

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900" data-testid="person-name">{p.name || p.email}</h1>
            <p className="text-sm text-gray-400">{p.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planBadgeClass(p.plan)}`}>{planLabel(p.plan)}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{STAGE_LABEL[p.stage]}</span>
          </div>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
          <div><dt className="text-xs text-gray-400">First source</dt><dd className="text-gray-900" data-testid="person-source">{p.firstSource ? SOURCE_LABEL[p.firstSource] : '—'}</dd></div>
          <div><dt className="text-xs text-gray-400">Country</dt><dd className="text-gray-900" data-testid="person-country">{p.tracked ? countryName(p.country) : '—'}</dd></div>
          <div><dt className="text-xs text-gray-400">Signed up</dt><dd className="text-gray-900">{formatWhen(p.signedUp)}</dd></div>
          <div><dt className="text-xs text-gray-400">Upgraded</dt><dd className="text-gray-900">{p.upgradedAt ? `${formatWhen(p.upgradedAt)}${p.upgradedPlan ? ` (${planLabel(p.upgradedPlan)})` : ''}` : '—'}</dd></div>
        </dl>
        {!p.tracked && (
          <p className="text-xs text-gray-400 mt-3" data-testid="no-journey">
            No visit was recorded for this tutor: they signed up before tracking started, or did not accept cookies. Only the sign-up from the tutors table is shown.
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Journey, in order <span className="text-gray-400 font-normal">({j.timeline.length} steps, times in UTC)</span></h2>
          {j.upgradeCutsOff && (
            <Link href={`/super-admin/people/${id}${backQuery ? `${backQuery}&` : '?'}after=1`} className="text-xs text-indigo-600 hover:underline">Also show what they did after upgrading</Link>
          )}
        </div>
        <ol className="divide-y divide-gray-50" data-testid="timeline">
          {j.shown.map((e, i) => {
            const Icon = ICON[e.kind]
            return (
              <li key={`${e.at}-${i}`} className="flex items-start gap-3 px-5 py-2.5" data-kind={e.kind}>
                <span className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${DOT[e.kind]}`}><Icon className="h-3.5 w-3.5" /></span>
                <time className="w-36 flex-shrink-0 text-xs text-gray-400 pt-1 font-mono">{formatWhen(e.at)}</time>
                <div className="min-w-0">
                  <p className={`text-sm ${e.kind === 'page_view' ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>{e.title}</p>
                  {e.kind === 'first_visit' && (
                    <p className="text-xs text-gray-500">
                      {countryName(e.country)}
                      {e.referrerHost && <> · from {e.referrerHost}</>}
                      {e.campaign && <> · campaign {e.campaign}</>}
                      {e.path && <> · landed on {pageLabel(e.path)} <span className="font-mono text-gray-400">({e.path})</span></>}
                    </p>
                  )}
                  {e.kind !== 'first_visit' && e.path && <p className="text-xs font-mono text-gray-400">{e.path}</p>}
                </div>
              </li>
            )
          })}
          {j.shown.length === 0 && <li className="px-5 py-8 text-center text-sm text-gray-400">Nothing recorded</li>}
        </ol>
        {hidden > 0 && (
          <p className="px-5 py-3 text-xs text-gray-400 border-t border-gray-50" data-testid="timeline-more">
            Showing the first {TIMELINE_SHOWN} of {j.timeline.length} steps.
          </p>
        )}
      </div>
    </div>
  )
}
