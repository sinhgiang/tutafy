import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/admin-guard'
import { loadFunnel, FUNNEL_VISITOR_LIMIT } from '@/lib/super-admin-data'
import { loadPeople, parsePage, parsePlanFilter, parseStageFilter, PEOPLE_PAGE_SIZE } from '@/lib/people-data'
import { parseRange } from '@/lib/journey'
import { STAGE_LABEL, type Stage } from '@/lib/timeline'
import { countryName, formatWhen } from '@/lib/format'
import { pageLabel } from '@/lib/timeline'
import { SOURCE_LABEL } from '@/lib/visitor-source'
import { planBadgeClass, planLabel } from '@/lib/buyers'
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
          <h1 className="text-2xl font-bold text-gray-900">Super admin</h1>
          <p className="text-sm text-gray-500 mt-1">Every tutor, where they came from, and the steps they took from the first visit to a paid plan</p>
        </div>
        <form method="get" className="flex items-end gap-2 text-sm flex-wrap" data-testid="filters">
          <label className="text-xs text-gray-500">Plan
            <select name="plan" defaultValue={plan} className="block mt-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
              <option value="all">All plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="academy">Academy</option>
            </select>
          </label>
          <label className="text-xs text-gray-500">Stage
            <select name="stage" defaultValue={stage} className="block mt-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
              <option value="all">Any stage</option>
              <option value="registered">{STAGE_LABEL.registered} only</option>
              <option value="checkout">{STAGE_LABEL.checkout}</option>
              <option value="upgraded">{STAGE_LABEL.upgraded}</option>
            </select>
          </label>
          <label className="text-xs text-gray-500">Signed up from
            <input type="date" name="from" defaultValue={range.from ?? ''} className="block mt-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white" />
          </label>
          <label className="text-xs text-gray-500">to
            <input type="date" name="to" defaultValue={range.to ?? ''} className="block mt-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white" />
          </label>
          <button type="submit" className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium">Apply</button>
          {filtered && <Link href="/super-admin" className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-800">Clear</Link>}
        </form>
      </div>

      {failed && (
        <div data-testid="super-admin-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          Could not read some of the data (the tutors table or the visitor tables), so the numbers below are not reliable. Reload the page; if it keeps happening, check the database.
        </div>
      )}
      {(people.readTruncated || funnel.readTruncated) && (
        <div data-testid="super-admin-truncated" role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          Some records were too many to read in full, so a few counts below may be incomplete.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5" data-testid="plan-counts">
        {([['Free', 'free', people.counts.free], ['Pro', 'pro', people.counts.pro], ['Academy', 'academy', people.counts.academy], ['All tutors', 'all', people.counts.all]] as const).map(([label, key, n]) => (
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
          <h2 className="text-sm font-semibold text-gray-900">Tutors <span className="text-gray-400 font-normal">({people.matching} match)</span></h2>
          <p className="text-xs text-gray-400">Click a name to see the whole journey</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="people-table">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Tutor</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">Plan</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Country</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">First source</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">First page</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Signed up</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Checkout</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Upgraded</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {people.rows.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">{failed ? 'Could not read tutors' : 'No tutors match these filters'}</td></tr>
              )}
              {people.rows.map(p => (
                <tr key={p.id} className="align-top hover:bg-gray-50 transition-colors" data-person={p.id}>
                  <td className="px-5 py-3">
                    <Link href={`/super-admin/people/${p.id}${query({ page: page > 1 ? page : null })}`} className="font-medium text-indigo-700 hover:underline">{p.name || p.email}</Link>
                    <p className="text-xs text-gray-400">{p.email}</p>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planBadgeClass(p.plan)}`}>{planLabel(p.plan)}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-700">{p.tracked ? countryName(p.country) : <span className="text-gray-300" title="No journey recorded: did not accept cookies, or signed up before tracking">—</span>}</td>
                  <td className="px-5 py-3 text-xs text-gray-700">{p.firstSource ? SOURCE_LABEL[p.firstSource] : <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3 text-xs text-gray-700">{p.firstPath ? <>{pageLabel(p.firstPath)}<p className="font-mono text-gray-400">{p.firstPath}</p></> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{formatWhen(p.signedUp)}</td>
                  <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{p.checkoutAt ? <>{formatWhen(p.checkoutAt)}{p.checkoutPlan && <p className="text-gray-400">{planLabel(p.checkoutPlan)}</p>}</> : '—'}</td>
                  <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{p.upgradedAt ? <>{formatWhen(p.upgradedAt)}{p.upgradedPlan && <p className="text-gray-400">{planLabel(p.upgradedPlan)}</p>}</> : p.plan !== 'free' ? <span title="Paid plan, order date not recorded">{planLabel(p.plan)}</span> : '—'}</td>
                  <td className="px-5 py-3 text-xs">
                    <span className={`inline-block px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${STAGE_BADGE[p.stage]}`}>{STAGE_LABEL[p.stage]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {people.pages > 1 && (
          <nav className="px-5 py-3 border-t border-gray-50 flex items-center justify-between text-sm" data-testid="pager">
            <span className="text-xs text-gray-400">Page {people.page} of {people.pages} ({PEOPLE_PAGE_SIZE} per page)</span>
            <span className="flex gap-3">
              {people.page > 1 && <Link href={`/super-admin${query({ page: people.page - 1 > 1 ? people.page - 1 : null })}`} className="text-indigo-600 hover:underline">← Newer</Link>}
              {people.page < people.pages && <Link href={`/super-admin${query({ page: people.page + 1 })}`} className="text-indigo-600 hover:underline">Older →</Link>}
            </span>
          </nav>
        )}
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Globe className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Funnel by first source</h2>
          <span className="text-xs text-gray-400">visitors who accepted cookies{range.from || range.to ? ', first seen in the range' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="funnel">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium text-gray-500">Source</th>
                <th className="text-right px-5 py-2.5 font-medium text-gray-500">Visitors</th>
                <th className="text-right px-5 py-2.5 font-medium text-gray-500">Signed up</th>
                <th className="text-right px-5 py-2.5 font-medium text-gray-500">Checkout</th>
                <th className="text-right px-5 py-2.5 font-medium text-gray-500">Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {funnel.funnel.rows.map(r => (
                <tr key={r.source} data-source={r.source}>
                  <td className="px-5 py-2.5 text-gray-900">{SOURCE_LABEL[r.source]}</td>
                  <td className="px-5 py-2.5 text-right text-gray-700">{r.visitors}</td>
                  <td className="px-5 py-2.5 text-right text-gray-700">{r.signedUp}</td>
                  <td className="px-5 py-2.5 text-right text-gray-700">{r.checkout}</td>
                  <td className="px-5 py-2.5 text-right font-medium text-gray-900">{r.paid}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold" data-source="total">
                <td className="px-5 py-2.5 text-gray-900">All</td>
                <td className="px-5 py-2.5 text-right">{funnel.funnel.total.visitors}</td>
                <td className="px-5 py-2.5 text-right">{funnel.funnel.total.signedUp}</td>
                <td className="px-5 py-2.5 text-right">{funnel.funnel.total.checkout}</td>
                <td className="px-5 py-2.5 text-right">{funnel.funnel.total.paid}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {funnel.funnelTruncated && <p className="px-5 py-3 text-xs text-gray-400 border-t border-gray-50">Showing the newest {FUNNEL_VISITOR_LIMIT} visitors of the range.</p>}
      </div>

      <p className="text-xs text-gray-400">
        Journeys exist only for visitors who accepted cookies. No IP address is stored; the country comes from Vercel&apos;s country header.
        A tutor with no recorded journey signed up before tracking started or did not accept cookies; the sign-up date and plan still come from the tutors table.
        The date filter applies to the sign-up date of the tutors above and to the first visit of the visitors in the funnel.
      </p>
    </div>
  )
}
