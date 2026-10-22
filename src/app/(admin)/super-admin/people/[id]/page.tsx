import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/admin-guard'
import { isTutorId, loadJourney, parsePage, parsePlanFilter, parseStageFilter } from '@/lib/people-data'
import { buildJourneyView, parseStepsPage, VIEW_PAGE_SIZE, type ViewRow } from '@/lib/journey-view'
import type { TimelineEntry } from '@/lib/timeline'
import { countryName, formatWhen } from '@/lib/format'
import { JourneyStep } from '@/components/admin/JourneyStep'
import { getAdminT } from '@/lib/admin-lang'
import { pageLabelText, sourceText, stageText } from '@/lib/admin-i18n'
import { parseRange } from '@/lib/journey'
import { planBadgeClass, planLabel } from '@/lib/buyers'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PersonJourneyPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Own check, before any query: this page reads one tutor's whole journey with the service-role key.
  await requireAdminPage()
  const { t } = await getAdminT()

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
  const view = buildJourneyView(j.timeline, parseStepsPage(first(sp.steps)))

  // A link to this journey keeping the list filters, the "after upgrade" switch and a steps page.
  const journeyHref = (stepsPage: number, anchor = '') => {
    const q = new URLSearchParams(back)
    if (includeAfter) q.set('after', '1')
    if (stepsPage > 1) q.set('steps', String(stepsPage))
    const qs = q.toString()
    return `/super-admin/people/${id}${qs ? `?${qs}` : ''}${anchor}`
  }
  const lastBefore = view.lastPageBeforeCheckout

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href={`/super-admin${backQuery}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="h-4 w-4" /> {t('journey.back')}
      </Link>

      {j.failed && (
        <div data-testid="journey-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          {t('journey.error')}
        </div>
      )}
      {j.readTruncated && (
        <div data-testid="journey-truncated" role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          {t('journey.truncated')}
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
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{stageText(t, p.stage)}</span>
          </div>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-sm">
          <div><dt className="text-xs text-gray-400">{t('journey.firstSource')}</dt><dd className="text-gray-900" data-testid="person-source">{p.firstSource ? sourceText(t, p.firstSource) : '—'}</dd></div>
          <div><dt className="text-xs text-gray-400">{t('common.country')}</dt><dd className="text-gray-900" data-testid="person-country">{p.tracked ? countryName(p.country) : '—'}</dd></div>
          <div><dt className="text-xs text-gray-400">{t('common.signedUp')}</dt><dd className="text-gray-900">{j.failed && !p.tracked && !p.email ? '—' : formatWhen(p.signedUp)}</dd></div>
          <div><dt className="text-xs text-gray-400">{t('journey.firstCheckout')}</dt><dd className="text-gray-900" data-testid="person-checkout">{p.checkoutAt ? `${formatWhen(p.checkoutAt)}${p.checkoutPlan ? ` (${planLabel(p.checkoutPlan)})` : ''}` : '—'}</dd></div>
          <div><dt className="text-xs text-gray-400">{t('journey.lastBeforeCheckout')}</dt><dd className="text-gray-900" data-testid="person-last-before-checkout">{lastBefore ? <>{pageLabelText(t, lastBefore.path)} <span className="text-xs text-gray-400">({formatWhen(lastBefore.at)})</span></> : '—'}</dd></div>
          <div><dt className="text-xs text-gray-400">{t('journey.upgraded')}</dt><dd className="text-gray-900">{p.upgradedAt ? `${formatWhen(p.upgradedAt)}${p.upgradedPlan ? ` (${planLabel(p.upgradedPlan)})` : ''}` : '—'}</dd></div>
        </dl>
        {!p.tracked && (
          <p className="text-xs text-gray-400 mt-3" data-testid="no-journey">
            {t('journey.noVisit')}
          </p>
        )}
      </div>

      {view.pages > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" data-testid="key-moments">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">{t('journey.keyMoments')} <span className="text-gray-400 font-normal">{t('journey.keyMomentsHint', { pages: view.pages })}</span></h2>
          </div>
          <ol className="divide-y divide-gray-50">
            {view.keyMoments.map(m => (
              <JourneyStep key={m.index} e={m.row} t={t} extra={
                <p className="text-xs mt-0.5">
                  <Link href={journeyHref(m.page, `#step-${m.index}`)} className="text-indigo-600 hover:underline">
                    {m.page === view.page ? t('journey.jump') : t('journey.open', { page: m.page, pages: view.pages })}
                  </Link>
                </p>
              } />
            ))}
          </ol>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">{t('journey.inOrder')} <span className="text-gray-400 font-normal" data-testid="journey-size">{t('journey.size', { steps: view.steps, lines: view.lines < view.steps ? t('journey.sizeLines', { lines: view.lines }) : '' })}</span></h2>
          {j.upgradeCutsOff && (
            <Link href={`/super-admin/people/${id}${backQuery ? `${backQuery}&` : '?'}after=1`} className="text-xs text-indigo-600 hover:underline">{t('journey.showAfter')}</Link>
          )}
        </div>
        <ol className="divide-y divide-gray-50" data-testid="timeline">
          {view.rows.map(({ row, index }) => <JourneyStep key={index} e={row} id={`step-${index}`} t={t} />)}
          {view.rows.length === 0 && <li className="px-5 py-8 text-center text-sm text-gray-400">{t('journey.nothing')}</li>}
        </ol>
        {view.pages > 1 && (
          <nav className="px-5 py-3 text-xs text-gray-500 border-t border-gray-50 flex items-center justify-between gap-3" data-testid="timeline-pages" aria-label={t('journey.pagesLabel')}>
            <span>{t('journey.lines', { from: (view.page - 1) * VIEW_PAGE_SIZE + 1, to: Math.min(view.page * VIEW_PAGE_SIZE, view.lines), total: view.lines, page: view.page, pages: view.pages })}</span>
            <span className="flex gap-4">
              {view.page > 1 && <Link href={journeyHref(view.page - 1)} className="text-indigo-600 hover:underline" data-testid="steps-prev">{t('journey.earlier')}</Link>}
              {view.page < view.pages && <Link href={journeyHref(view.page + 1)} className="text-indigo-600 hover:underline" data-testid="steps-next">{t('journey.later')}</Link>}
            </span>
          </nav>
        )}
      </div>
    </div>
  )
}
