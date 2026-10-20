import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/admin-guard'
import { loadSuperAdmin, FUNNEL_VISITOR_LIMIT } from '@/lib/super-admin-data'
import { ORDER_RESULT_LABEL, parseRange } from '@/lib/journey'
import { SOURCE_LABEL, type Source } from '@/lib/visitor-source'
import { planBadgeClass, planLabel } from '@/lib/buyers'
import { ShoppingBag, Globe } from 'lucide-react'

export const dynamic = 'force-dynamic'

const MAX_PAGES_SHOWN = 12

function countryName(code: string | null): string {
  if (!code) return '—'
  try {
    return `${new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code} (${code})`
  } catch {
    return code
  }
}

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '—')
const sourceName = (s: Source | null) => (s ? SOURCE_LABEL[s] : '—')

function PagesList({ pages }: { pages: string[] }) {
  if (pages.length === 0) return <span className="text-gray-300">—</span>
  const shown = pages.slice(0, MAX_PAGES_SHOWN)
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-gray-600" data-testid="buyer-pages">
      {shown.map((p, i) => (
        <li key={`${p}-${i}`} className="flex items-center gap-1">
          {i > 0 && <span className="text-gray-300">→</span>}
          <span className="font-mono">{p}</span>
        </li>
      ))}
      {pages.length > shown.length && <li className="text-gray-400">+{pages.length - shown.length} more</li>}
    </ol>
  )
}

export default async function SuperAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Own check, before any query: this page reads every buyer and visitor with the service-role key.
  await requireAdminPage()

  const sp = await searchParams
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const range = parseRange(first(sp.from), first(sp.to))
  const d = await loadSuperAdmin(createAdminClient(), range)
  const trackedCount = d.buyers.filter(b => b.tracked).length
  const filtered = range.from !== null || range.to !== null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Super admin</h1>
          <p className="text-sm text-gray-500 mt-1">Who bought Tutafy, where they came from, and what they did before paying</p>
        </div>
        <form method="get" className="flex items-end gap-2 text-sm" data-testid="date-filter">
          <label className="text-xs text-gray-500">From
            <input type="date" name="from" defaultValue={range.from ?? ''} className="block mt-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white" />
          </label>
          <label className="text-xs text-gray-500">To
            <input type="date" name="to" defaultValue={range.to ?? ''} className="block mt-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white" />
          </label>
          <button type="submit" className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium">Apply</button>
          {filtered && <Link href="/super-admin" className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-800">Clear</Link>}
        </form>
      </div>

      {d.failed && (
        <div data-testid="super-admin-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          Could not read some of the data (the tutors table or the visitor tables), so the numbers below are not reliable. Reload the page; if it keeps happening, check the database.
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center h-9 mb-1"><p className="text-sm text-gray-500">Pro</p></div>
          <p data-testid="sa-pro" className="text-3xl font-bold text-gray-900">{d.failed ? '—' : d.pro}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center h-9 mb-1"><p className="text-sm text-gray-500">Academy</p></div>
          <p data-testid="sa-academy" className="text-3xl font-bold text-gray-900">{d.failed ? '—' : d.academy}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">Total buyers</p>
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <p data-testid="sa-total" className="text-3xl font-bold text-gray-900">{d.failed ? '—' : d.total}</p>
          <p className="text-xs text-gray-400 mt-1">{trackedCount} of {d.buyers.length} listed have a recorded journey</p>
        </div>
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Globe className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Funnel by first source</h2>
          <span className="text-xs text-gray-400">visitors who accepted cookies{filtered ? ', first seen in the range' : ''}</span>
        </div>
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
            {d.funnel.rows.map(r => (
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
              <td className="px-5 py-2.5 text-right">{d.funnel.total.visitors}</td>
              <td className="px-5 py-2.5 text-right">{d.funnel.total.signedUp}</td>
              <td className="px-5 py-2.5 text-right">{d.funnel.total.checkout}</td>
              <td className="px-5 py-2.5 text-right">{d.funnel.total.paid}</td>
            </tr>
          </tbody>
        </table>
        {d.funnelTruncated && <p className="px-5 py-3 text-xs text-gray-400 border-t border-gray-50">Showing the newest {FUNNEL_VISITOR_LIMIT} visitors of the range.</p>}
      </div>

      {/* Buyers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Buyers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="buyers-table">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Buyer</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">Plan</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Bought</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Country</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">First source</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Pages viewed, in order</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Last page before checkout</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {d.buyers.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">{d.failed ? 'Could not read buyers' : 'No buyers in this range'}</td></tr>
              )}
              {d.buyers.map(b => (
                <tr key={b.id} className="align-top hover:bg-gray-50 transition-colors" data-buyer={b.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{b.name}</p>
                    <p className="text-xs text-gray-400">{b.email}</p>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planBadgeClass(b.plan)}`}>{planLabel(b.plan)}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">{day(b.boughtOn)}</td>
                  <td className="px-5 py-3 text-gray-700 text-xs">{countryName(b.country)}</td>
                  <td className="px-5 py-3 text-gray-700 text-xs">
                    {sourceName(b.firstSource)}
                    {b.firstPath && <p className="font-mono text-gray-400">{b.firstPath}</p>}
                  </td>
                  <td className="px-5 py-3 min-w-[16rem]">
                    {b.tracked ? <PagesList pages={b.pages} /> : <span className="text-xs text-gray-300" title="Bought before tracking, or did not accept cookies">no journey recorded</span>}
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-gray-600">{b.lastBeforeCheckout ?? '—'}</td>
                  <td className="px-5 py-3 text-xs">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{ORDER_RESULT_LABEL[b.result]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {d.buyersTruncated && <p className="px-5 py-3 text-xs text-gray-400 border-t border-gray-50">Showing the newest 500 buyers; the boxes above count everyone.</p>}
      </div>

      {/* Started checkout, did not pay */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Started checkout, not paid</h2>
        </div>
        <table className="w-full text-sm" data-testid="abandoned-table">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-2.5 font-medium text-gray-500">Tutor</th>
              <th className="text-left px-5 py-2.5 font-medium text-gray-500">Plan</th>
              <th className="text-left px-5 py-2.5 font-medium text-gray-500">Country</th>
              <th className="text-left px-5 py-2.5 font-medium text-gray-500">First source</th>
              <th className="text-left px-5 py-2.5 font-medium text-gray-500">Last page before checkout</th>
              <th className="text-left px-5 py-2.5 font-medium text-gray-500">Clicked</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {d.abandoned.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nobody has started a checkout without paying</td></tr>}
            {d.abandoned.map((a, i) => (
              <tr key={i}>
                <td className="px-5 py-2.5 text-gray-900">{a.tutorName ?? <span className="text-gray-300">not signed up</span>}</td>
                <td className="px-5 py-2.5 text-gray-700 text-xs">{a.plan ? planLabel(a.plan) : '—'}</td>
                <td className="px-5 py-2.5 text-gray-700 text-xs">{countryName(a.country)}</td>
                <td className="px-5 py-2.5 text-gray-700 text-xs">{SOURCE_LABEL[a.firstSource]}</td>
                <td className="px-5 py-2.5 text-xs font-mono text-gray-600">{a.lastBeforeCheckout ?? '—'}</td>
                <td className="px-5 py-2.5 text-xs text-gray-400">{day(a.at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        Journeys exist only for visitors who accepted cookies. No IP address is stored; the country comes from Vercel&apos;s country header.
        Buyers from before tracking started show &ldquo;no journey recorded&rdquo;.
      </p>
    </div>
  )
}
