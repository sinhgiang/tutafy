import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/admin-guard'
import { loadFunnel, FUNNEL_VISITOR_LIMIT } from '@/lib/super-admin-data'
import { loadPeople, parsePage, parsePlanFilter, parseStageFilter, PEOPLE_PAGE_SIZE } from '@/lib/people-data'
import { parseRange } from '@/lib/journey'
import type { Stage } from '@/lib/timeline'
import { countryName, formatWhen } from '@/lib/format'
import { planBadgeClass, planLabel } from '@/lib/buyers'
import { getAdminT } from '@/lib/admin-lang'
import { pageLabelText, readErrorText, sourceText, stageText } from '@/lib/admin-i18n'
import { Users, Globe } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STAGE_BADGE: Record<Stage, string> = {
  registered: 'bg-gray-100 text-gray-600',
  checkout: 'bg-amber-100 text-amber-700',
  upgraded: 'bg-green-100 text-green-700',
}

export default async function SuperAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Own check, before any query: this page reads every tutor and visitor with the service-role key.
  await requireAdminPage()
  const { t } = await getAdminT()

  const sp = await searchParams
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const range = parseRange(first(sp.from), first(sp.to))
  const plan = parsePlanFilter(first(sp.plan))
  const stage = parseStageFilter(first(sp.stage))
  const page = parsePage(first(sp.page))

  const admin = createAdminClient()
  const [people, funnel] = await Promise.all([
    loadPeople(admin, { plan, stage, range, page }),
    loadFunnel(admin, range),
  ])
  const failed = people.failed || funnel.failed
  const failedTables = [...new Set([...people.failedTables, ...funnel.failedTables])]
  const filtered = range.from !== null || range.to !== null || plan !== 'all' || stage !== 'all'

  // The filters, kept in every link so paging and "back" do not lose them.
  const query = (over: Record<string, string | number | null> = {}) => {
    const p = new URLSearchParams()
    const base: Record<string, string | number | null> = { plan: plan === 'all' ? null : plan, stage: stage === 'all' ? null : stage, from: range.from, to: range.to, page: page > 1 ? page : null, ...over }
    for (const [k, v] of Object.entries(base)) if (v !== null && v !== '') p.set(k, String(v))
    const s = p.toString()
    return s ? `?${s}` : ''
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('sa.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('sa.subtitle')}</p>
        </div>
        <form method="get" className="flex items-end gap-2 text-sm flex-wrap" data-testid="filters">
          <label className="text-xs text-gray-500">{t('sa.filterPlan')}
            <select name="plan" defaultValue={plan} className="block mt-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
              <option value="all">{t('sa.allPlans')}</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="academy">Academy</option>
            </select>
          </label>
          <label className="text-xs text-gray-500">{t('sa.filterStage')}
            <select name="stage" defaultValue={stage} className="block mt-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
              <option value="all">{t('sa.anyStage')}</option>
              <option value="registered">{t('sa.registeredOnly', { stage: stageText(t, 'registered') })}</option>
              <option value="checkout">{stageText(t, 'checkout')}</option>
              <option value="upgraded">{stageText(t, 'upgraded')}</option>
            </select>
          </label>
          <label className="text-xs text-gray-500">{t('sa.signedUpFrom')}
            <input type="date" name="from" defaultValue={range.from ?? ''} className="block mt-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white" />
          </label>
          <label className="text-xs text-gray-500">{t('sa.to')}
            <input type="date" name="to" defaultValue={range.to ?? ''} className="block mt-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white" />
          </label>
          <button type="submit" className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium">{t('sa.apply')}</button>
          {filtered && <Link href="/super-admin" className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-800">{t('sa.clear')}</Link>}
        </form>
      </div>

      {failed && (
        <div data-testid="super-admin-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          {readErrorText(t, failedTables)}
        </div>
      )}
      {(people.readTruncated || funnel.readTruncated) && (
        <div data-testid="super-admin-truncated" role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          {t('sa.truncated')}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5" data-testid="plan-counts">
        {([['Free', 'free', people.counts.free], ['Pro', 'pro', people.counts.pro], ['Academy', 'academy', people.counts.academy], [t('sa.allTutors'), 'all', people.counts.all]] as const).map(([label, key, n]) => (
          <div key={key} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-500">{label}</p>
              {key === 'all' && <Users className="h-4 w-4 text-gray-300" />}
            </div>
            <p data-testid={`count-${key}`} className="text-3xl font-bold text-gray-900">{failed ? '—' : n}</p>
          </div>
        ))}
      </div>

      {/* People */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">{t('sa.tutors')} <span className="text-gray-400 font-normal">{t('sa.matching', { n: people.matching })}</span></h2>
          <p className="text-xs text-gray-400">{t('sa.clickName')}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="people-table">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('common.tutor')}</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">{t('common.plan')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('common.country')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('sa.colFirstSource')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('sa.colFirstPage')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('common.signedUp')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('sa.colCheckout')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('sa.colUpgraded')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('sa.colStage')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {people.rows.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">{failed ? t('sa.readFail') : t('sa.noMatch')}</td></tr>
              )}
              {people.rows.map(p => (
                <tr key={p.id} className="align-top hover:bg-gray-50 transition-colors" data-person={p.id}>
                  <td className="px-5 py-3">
                    <Link href={`/admin/tutors/${p.id}`} className="font-medium text-indigo-700 hover:underline" data-testid="person-link">{p.name || p.email}</Link>
                    <p className="text-xs text-gray-400">{p.email}</p>
                    <Link href={`/super-admin/people/${p.id}${query({ page: page > 1 ? page : null })}`} className="text-xs text-gray-500 hover:text-indigo-700 hover:underline">{t('sa.journeyLink')}</Link>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planBadgeClass(p.plan)}`}>{planLabel(p.plan)}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-700">{p.tracked ? countryName(p.country) : <span className="text-gray-300" title={t('sa.noJourneyTitle')}>—</span>}</td>
                  <td className="px-5 py-3 text-xs text-gray-700">{p.firstSource ? sourceText(t, p.firstSource) : <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3 text-xs text-gray-700">{p.firstPath ? <>{pageLabelText(t, p.firstPath)}<p className="font-mono text-gray-400">{p.firstPath}</p></> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{formatWhen(p.signedUp)}</td>
                  <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{p.checkoutAt ? <>{formatWhen(p.checkoutAt)}{p.checkoutPlan && <p className="text-gray-400">{planLabel(p.checkoutPlan)}</p>}</> : '—'}</td>
                  <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{p.upgradedAt ? <>{formatWhen(p.upgradedAt)}{p.upgradedPlan && <p className="text-gray-400">{planLabel(p.upgradedPlan)}</p>}</> : p.plan !== 'free' ? <span title={t('sa.paidNoDateTitle')}>{planLabel(p.plan)}</span> : '—'}</td>
                  <td className="px-5 py-3 text-xs">
                    <span className={`inline-block px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${STAGE_BADGE[p.stage]}`}>{stageText(t, p.stage)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {people.pages > 1 && (
          <nav className="px-5 py-3 border-t border-gray-50 flex items-center justify-between text-sm" data-testid="pager">
            <span className="text-xs text-gray-400">{t('sa.pageOf', { page: people.page, pages: people.pages, size: PEOPLE_PAGE_SIZE })}</span>
            <span className="flex gap-3">
              {people.page > 1 && <Link href={`/super-admin${query({ page: people.page - 1 > 1 ? people.page - 1 : null })}`} className="text-indigo-600 hover:underline">{t('sa.newer')}</Link>}
              {people.page < people.pages && <Link href={`/super-admin${query({ page: people.page + 1 })}`} className="text-indigo-600 hover:underline">{t('sa.older')}</Link>}
            </span>
          </nav>
        )}
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Globe className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">{t('sa.funnel')}</h2>
          <span className="text-xs text-gray-400">{t('sa.funnelHint')}{range.from || range.to ? t('sa.funnelHintRange') : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="funnel">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium text-gray-500">{t('sa.colSource')}</th>
                <th className="text-right px-5 py-2.5 font-medium text-gray-500">{t('sa.colVisitors')}</th>
                <th className="text-right px-5 py-2.5 font-medium text-gray-500">{t('common.signedUp')}</th>
                <th className="text-right px-5 py-2.5 font-medium text-gray-500">{t('sa.colCheckout')}</th>
                <th className="text-right px-5 py-2.5 font-medium text-gray-500">{t('sa.colPaid')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {funnel.funnel.rows.map(r => (
                <tr key={r.source} data-source={r.source}>
                  <td className="px-5 py-2.5 text-gray-900">{sourceText(t, r.source)}</td>
                  <td className="px-5 py-2.5 text-right text-gray-700">{r.visitors}</td>
                  <td className="px-5 py-2.5 text-right text-gray-700">{r.signedUp}</td>
                  <td className="px-5 py-2.5 text-right text-gray-700">{r.checkout}</td>
                  <td className="px-5 py-2.5 text-right font-medium text-gray-900">{r.paid}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold" data-source="total">
                <td className="px-5 py-2.5 text-gray-900">{t('sa.all')}</td>
                <td className="px-5 py-2.5 text-right">{funnel.funnel.total.visitors}</td>
                <td className="px-5 py-2.5 text-right">{funnel.funnel.total.signedUp}</td>
                <td className="px-5 py-2.5 text-right">{funnel.funnel.total.checkout}</td>
                <td className="px-5 py-2.5 text-right">{funnel.funnel.total.paid}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {funnel.funnelTruncated && <p className="px-5 py-3 text-xs text-gray-400 border-t border-gray-50">{t('sa.funnelCut', { n: FUNNEL_VISITOR_LIMIT })}</p>}
      </div>

      <p className="text-xs text-gray-400">
        {t('sa.footnote')}
      </p>
    </div>
  )
}
