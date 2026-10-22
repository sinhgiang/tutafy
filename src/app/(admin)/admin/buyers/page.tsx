import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/admin-guard'
import { getAdminT } from '@/lib/admin-lang'
import { loadBuyers, BUYERS_LIST_LIMIT } from '@/lib/buyers-data'
import { planBadgeClass, planLabel, POLAR_DASHBOARD_URL } from '@/lib/buyers'
import { readPolarBilling, buildBuyerBilling, summarizeBilling } from '@/lib/buyer-billing'
import { formatMoney } from '@/lib/currency'
import { formatDayLabel as dayLabel } from '@/lib/format'
import { ShoppingBag, GraduationCap, BookOpen, ExternalLink, Wallet, Repeat, CalendarClock } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_STYLE = { active: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-600', past_due: 'bg-red-100 text-red-700', other: 'bg-gray-100 text-gray-500' } as const

export default async function AdminBuyersPage() {
  // Own check, before any query: this page reads every paying tutor with the service-role key.
  await requireAdminPage()
  const { t } = await getAdminT()

  const { pro, academy, total, buyers, failed } = await loadBuyers(createAdminClient())

  // What each buyer has paid and when their plan renews: READ from Polar with the same read key as the plan income on the Revenue
  // page (two GET lists, nothing written). With nobody to look up, Polar is not asked.
  const polar = await readPolarBilling(!failed && buyers.length > 0)
  const billing = buildBuyerBilling(buyers, polar)
  const sum = summarizeBilling(billing, new Date())
  const unreadable = polar
    ? [
        ...(!polar.subscriptions.ok ? [{ what: t('buyers.polarPlans'), reason: polar.subscriptions.reason }] : []),
        ...(!polar.orders.ok ? [{ what: t('buyers.polarOrders'), reason: polar.orders.reason }] : []),
      ]
    : []
  const plansOk = !failed && (!polar || polar.subscriptions.ok)
  const ordersOk = !failed && (!polar || polar.orders.ok)
  const money = (rows: { currency: string; amount: number }[], testid: string) => (
    rows.length === 0
      ? <p data-testid={testid} className="text-3xl font-bold text-gray-900">{formatMoney(0, 'USD')}</p>
      : rows.map(r => (
        <p key={r.currency} data-testid={testid} className={rows.length > 1 ? 'text-xl font-bold text-gray-900' : 'text-3xl font-bold text-gray-900'}>
          {formatMoney(r.amount, r.currency)}<span className="text-xs font-normal text-gray-400"> {r.currency}</span>
        </p>
      ))
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('buyers.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('buyers.subtitle')}</p>
      </div>

      {failed && (
        <div data-testid="buyers-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          {t('buyers.error')}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center h-9 mb-1"><p className="text-sm text-gray-500">Pro</p></div>
          <p data-testid="buyers-pro" className="text-3xl font-bold text-gray-900">{failed ? '—' : pro}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center h-9 mb-1"><p className="text-sm text-gray-500">Academy</p></div>
          <p data-testid="buyers-academy" className="text-3xl font-bold text-gray-900">{failed ? '—' : academy}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">{t('buyers.total')}</p>
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <p data-testid="buyers-total" className="text-3xl font-bold text-gray-900">{failed ? '—' : total}</p>
        </div>
      </div>

      {unreadable.length > 0 && (
        <div data-testid="buyers-polar-unreadable" role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 space-y-1">
          {unreadable.map(u => (
            <p key={u.what}><span className="font-semibold">Polar · {u.what}:</span> {t(`revenue.polar.${u.reason}`)}</p>
          ))}
        </div>
      )}
      {polar && polar.truncated && <p data-testid="buyers-polar-cut" className="text-xs text-amber-700">{t('buyers.polarCut')}</p>}
      {polar && polar.skipped > 0 && <p data-testid="buyers-polar-skipped" className="text-xs text-amber-700">{t('buyers.polarSkipped', { n: polar.skipped })}</p>}

      {/* The money the buyers bring: every figure comes from Polar, or is a dash with the reason above it */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <div data-card="paid-total" className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2 gap-2">
            <p className="text-sm text-gray-500">{t('buyers.sumPaid')}</p>
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center shrink-0"><Wallet className="h-5 w-5 text-green-600" /></div>
          </div>
          {ordersOk ? money(sum.paid, 'paid-total-value') : <p data-testid="paid-total-value" className="text-3xl font-bold text-gray-900">—</p>}
          <p className="text-xs text-gray-400 mt-1">{t('buyers.sumPaidHint')}</p>
        </div>
        <div data-card="mrr" className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2 gap-2">
            <p className="text-sm text-gray-500">{t('buyers.sumMrr')}</p>
            <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0"><Repeat className="h-5 w-5 text-indigo-600" /></div>
          </div>
          {plansOk ? money(sum.mrr, 'mrr-value') : <p data-testid="mrr-value" className="text-3xl font-bold text-gray-900">—</p>}
          <p className="text-xs text-gray-400 mt-1">{t('buyers.sumMrrHint')}</p>
        </div>
        <div data-card="renew-7" className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2 gap-2">
            <p className="text-sm text-gray-500">{t('buyers.renew7')}</p>
            <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center shrink-0"><CalendarClock className="h-5 w-5 text-orange-600" /></div>
          </div>
          <p data-testid="renew-7-value" className="text-3xl font-bold text-gray-900">{plansOk ? sum.renewing7 : '—'}</p>
          <p className="text-xs text-gray-400 mt-1">{t('buyers.renewHint', { days: 7 })}</p>
        </div>
        <div data-card="renew-30" className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2 gap-2">
            <p className="text-sm text-gray-500">{t('buyers.renew30')}</p>
            <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center shrink-0"><CalendarClock className="h-5 w-5 text-orange-600" /></div>
          </div>
          <p data-testid="renew-30-value" className="text-3xl font-bold text-gray-900">{plansOk ? sum.renewing30 : '—'}</p>
          <p className="text-xs text-gray-400 mt-1">{t('buyers.renewHint', { days: 30 })}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-3 py-3 font-medium text-gray-500">{t('buyers.colBuyer')}</th>
                <th className="text-left px-3 py-3 font-medium text-gray-500">{t('common.signedUp')}</th>
                <th className="text-center px-3 py-3 font-medium text-gray-500">{t('common.plan')}</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500 whitespace-nowrap">{t('buyers.colPaid')}</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500 whitespace-nowrap">{t('buyers.colPrice')}</th>
                <th className="text-left px-3 py-3 font-medium text-gray-500 whitespace-nowrap">{t('buyers.colStarted')}</th>
                <th className="text-left px-3 py-3 font-medium text-gray-500 whitespace-nowrap">{t('buyers.colDate')}</th>
                <th className="text-center px-3 py-3 font-medium text-gray-500">{t('common.status')}</th>
                {/* The tutors table has no country column; the timezone is the closest thing it stores. */}
                <th className="text-left px-3 py-3 font-medium text-gray-500" title={t('buyers.timezoneTitle')}>{t('buyers.colTimezone')}</th>
                <th className="text-center px-3 py-3 font-medium text-gray-500">{t('common.students')}</th>
                <th className="text-center px-3 py-3 font-medium text-gray-500">{t('common.lessons')}</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500">Polar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {buyers.length === 0 && !failed && (
                <tr><td colSpan={12} className="text-center py-10 text-gray-400">{t('buyers.empty')}</td></tr>
              )}
              {buyers.map(b => {
                const bill = billing.get(b.id)
                const sub = bill?.sub ?? null
                // Why a figure is a dash: this row has no Polar subscription, or Polar does not know it, or the read as a whole failed.
                const whySub = bill?.subWhy ? t(`buyers.why.${bill.subWhy}`) : null
                const paidCell = bill?.paid
                  ? (bill.paid.length > 0
                    ? bill.paid.map(p => <span key={p.currency} className="block font-medium text-gray-900">{formatMoney(p.amount, p.currency)}<span className="text-xs font-normal text-gray-400"> {p.currency}</span></span>)
                    : <span className="font-medium text-gray-900">{formatMoney(0, sub?.price.currency ?? 'USD')}<span className="text-xs font-normal text-gray-400"> {sub?.price.currency ?? 'USD'}</span></span>)
                  : <span className="text-gray-400" title={whySub ?? undefined}>—</span>
                const paidWhy = whySub ?? (bill && !bill.paid && polar && !polar.orders.ok ? t('buyers.why.orders') : null)
                return (
                  <tr key={b.id} data-buyer={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3">
                      <Link href={`/admin/tutors/${b.id}`} className="font-medium text-gray-900 hover:text-indigo-700">{b.name}</Link>
                      <p className="text-xs text-gray-400">{b.email}</p>
                    </td>
                    <td className="px-3 py-3 text-gray-400 text-xs whitespace-nowrap">{dayLabel(b.created_at)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planBadgeClass(b.subscription_status)}`}>
                        {planLabel(b.subscription_status)}
                      </span>
                    </td>
                    <td data-col="paid" className="px-3 py-3 text-right whitespace-nowrap">
                      {paidCell}
                      {paidWhy && <span data-testid="buyer-why" className="block text-[11px] text-gray-400 whitespace-normal min-w-40">{paidWhy}</span>}
                    </td>
                    <td data-col="price" className="px-3 py-3 text-right whitespace-nowrap">
                      {sub
                        ? <><span className="font-medium text-gray-900">{formatMoney(sub.price.amount, sub.price.currency)}</span><span className="block text-xs text-gray-400">{t(sub.price.interval === 'year' ? 'buyers.perYear' : 'buyers.perMonth')} · {sub.price.currency}</span></>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td data-col="started" className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{sub ? dayLabel(sub.started) : '—'}</td>
                    <td data-col="date" className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">
                      {sub && sub.dateKind
                        ? <><span className="text-gray-900">{dayLabel(sub.date)}</span><span className="block text-gray-400">{t(sub.dateKind === 'ends' ? 'buyers.ends' : 'buyers.nextCharge')}</span></>
                        : '—'}
                    </td>
                    <td data-col="status" className="px-3 py-3 text-center">
                      {sub
                        ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_STYLE[sub.status]}`}>{t(`buyers.status.${sub.status}`)}</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{b.timezone ?? '—'}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-gray-700">
                        <GraduationCap className="h-3.5 w-3.5" />
                        {b.students?.[0]?.count ?? 0}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-gray-700">
                        <BookOpen className="h-3.5 w-3.5" />
                        {b.lessons?.[0]?.count ?? 0}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <a href={POLAR_DASHBOARD_URL} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800">
                        {t('buyers.openPolar')} <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {total > buyers.length && (
          <p className="px-5 py-3 text-xs text-gray-400 border-t border-gray-50">
            {t('buyers.cut', { limit: BUYERS_LIST_LIMIT, total })}
          </p>
        )}
      </div>
    </div>
  )
}
