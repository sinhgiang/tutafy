import { createAdminClient } from '@/lib/supabase/server'
import { DollarSign, CreditCard, BookOpen, Users, TriangleAlert } from 'lucide-react'
import { loadAdminRevenue, type RevenueRow } from '@/lib/admin-revenue'
import { requireAdminPage } from '@/lib/admin-guard'
import { formatMoney } from '@/lib/currency'
import { readPolarIncome } from '@/lib/polar-income'
import { getAdminT } from '@/lib/admin-lang'
import type { AdminT } from '@/lib/admin-i18n'

export const dynamic = 'force-dynamic'

export default async function AdminRevenuePage() {
  // Every tutor's payments are read with the service key: the page checks the admin itself, before anything is read.
  await requireAdminPage()
  const { t } = await getAdminT()
  // Each lesson in its tutor's own currency; tutors in different currencies are never added together.
  const [{ paidCount: totalPaid, totals, byTutor: tutorList, recent: paidLessons, flagged, notCounted, card, truncated }, plans] = await Promise.all([loadAdminRevenue(createAdminClient()), readPolarIncome()])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('revenue.title')}</h1>
        <p data-testid="revenue-subtitle" className="text-sm text-gray-500 mt-1">{t('revenue.subtitle')}</p>
      </div>

      {/* What the owner earns from the plans: read from Polar, or said plainly when it cannot be read (T-0699) */}
      <div data-testid="plan-income" className="bg-white rounded-xl p-5 shadow-sm border border-indigo-100">
        <div className="flex items-center justify-between mb-2 gap-2">
          <p className="text-sm font-semibold text-gray-900">{t('revenue.planIncome')}</p>
          <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5 text-indigo-600" />
          </div>
        </div>
        {plans.ok ? (
          <>
            {plans.monthly.length === 0 && <p data-testid="plan-income-value" className="text-3xl font-bold text-gray-900">{formatMoney(0, 'USD')}<span className="text-xs font-normal text-gray-400">{t('revenue.perMonth')}</span></p>}
            {plans.monthly.map(m => (
              <p key={m.currency} data-testid="plan-income-value" className={plans.monthly.length > 1 ? 'text-xl font-bold text-gray-900' : 'text-3xl font-bold text-gray-900'}>{formatMoney(m.amount, m.currency)}<span className="text-xs font-normal text-gray-400">{t('revenue.perMonthCurrency', { currency: m.currency })}</span></p>
            ))}
            <p className="text-xs text-gray-500 mt-1">{t('revenue.planNote', { n: plans.subscriptions, cut: plans.truncated ? t('revenue.planNoteCut') : '' })}</p>
          </>
        ) : (
          <>
            <p data-testid="plan-income-unreadable" className="text-base font-semibold text-gray-700">{t(`revenue.polar.${plans.reason}`)}</p>
            <p className="text-xs text-gray-500 mt-1">{t('revenue.planUnreadableHint')}</p>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div data-testid="revenue-marked" className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3 gap-2">
            <p className="text-sm text-gray-500">{t('revenue.marked')}</p>
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </div>
          {totals.length === 0 && <p className="text-3xl font-bold text-gray-900">{formatMoney(0, 'USD')}</p>}
          {totals.map(tot => (
            <p key={tot.currency} data-testid="revenue-marked-value" className={totals.length > 1 ? 'text-xl font-bold text-gray-900' : 'text-3xl font-bold text-gray-900'}>{formatMoney(tot.total, tot.currency)}<span className="text-xs font-normal text-gray-500"> {tot.currency}</span></p>
          ))}
          {totals.map(tot => (
            <p key={`avg-${tot.currency}`} className="text-xs text-gray-500 mt-1">{t('revenue.average')}: {formatMoney(tot.count ? tot.total / tot.count : 0, tot.currency)}</p>
          ))}
          <p className="text-xs text-gray-500 mt-1">{t('revenue.markedHint')}{totals.length > 1 ? t('revenue.hintCurrencies') : ''}{truncated ? t('revenue.hintCut') : ''}</p>
        </div>
        <div data-testid="revenue-card" className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3 gap-2">
            <p className="text-sm text-gray-500">{t('revenue.card')}</p>
            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          {card.ok ? (
            <>
              {card.totals.length === 0 && <p data-testid="revenue-card-value" className="text-3xl font-bold text-gray-900">{formatMoney(0, 'USD')}</p>}
              {card.totals.map(tot => (
                <p key={tot.currency} data-testid="revenue-card-value" className={card.totals.length > 1 ? 'text-xl font-bold text-gray-900' : 'text-3xl font-bold text-gray-900'}>{formatMoney(tot.total, tot.currency)}<span className="text-xs font-normal text-gray-500"> {tot.currency}</span></p>
              ))}
              <p className="text-xs text-gray-500 mt-1">{t('revenue.cardHint')}</p>
            </>
          ) : (
            <>
              <p data-testid="revenue-card-unreadable" className="text-base font-semibold text-gray-700">{t('revenue.cardUnreadable')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('revenue.cardUnreadableHint')}</p>
            </>
          )}
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3 gap-2">
            <p className="text-sm text-gray-500">{t('revenue.counted')}</p>
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p data-testid="revenue-counted-value" className="text-3xl font-bold text-gray-900">{totalPaid}</p>
          <p className="text-xs text-gray-500 mt-1">{t('revenue.countedHint')}</p>
        </div>
      </div>

      {/* What is marked paid but left out of the numbers above, so the owner sees the gap and not only the smaller number */}
      {(notCounted.cancelled.count + notCounted.overdue.count + notCounted.other.count) > 0 && (
        <div data-testid="revenue-not-counted" className="bg-amber-50 rounded-xl p-5 border border-amber-200">
          <div className="flex items-center gap-2 mb-1">
            <TriangleAlert className="h-4 w-4 text-amber-700 shrink-0" />
            <h2 className="text-sm font-semibold text-amber-900">{t('revenue.notCountedTitle')}</h2>
          </div>
          <p className="text-xs text-amber-900 mb-3">{t('revenue.notCountedHint')}</p>
          <ul className="space-y-1">
            {(['cancelled', 'overdue', 'other'] as const).filter(r => notCounted[r].count > 0).map(r => (
              <li key={r} data-testid={`revenue-not-counted-${r}`} className="text-sm text-amber-900 flex flex-col sm:flex-row sm:justify-between gap-x-4">
                <span className="font-medium">{t(FLAG_KEY[r])}</span>
                <span>{t('revenue.flagSummary', { n: notCounted[r].count, amount: notCounted[r].totals.length ? notCounted[r].totals.map(x => formatMoney(x.total, x.currency)).join(', ') : '—' })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {flagged.length > 0 && (
        <div data-testid="revenue-flagged" className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">{t('revenue.needsLook')}</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {flagged.map((l, i) => <PaymentRow key={i} l={l} t={t} />)}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900 text-sm">{t('revenue.byTutor')}</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {tutorList.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">{t('revenue.noPayments')}</p>
            )}
            {tutorList.map((row, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{row.name}</p>
                  <p className="text-xs text-gray-500">{t('revenue.paidCount', { n: row.count })}</p>
                </div>
                <span className="font-semibold text-green-600">{formatMoney(row.total, row.currency)}</span>
              </div>
            ))}
          </div>
        </div>

        <div data-testid="revenue-recent" className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">{t('revenue.recent')}</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {paidLessons.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">{t('revenue.noPayments')}</p>
            )}
            {paidLessons.map((l, i) => <PaymentRow key={i} l={l} t={t} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

const FLAG_KEY = { cancelled: 'revenue.flagCancelled', overdue: 'revenue.flagOverdue', other: 'revenue.flagOther' } as const

/** One marked-paid lesson: a flag next to a lesson that is not counted, and its amount greyed out with "not counted". */
function PaymentRow({ l, t }: { l: RevenueRow; t: AdminT }) {
  return (
    <div data-testid="revenue-row" data-reason={l.reason ?? 'counted'} className="px-5 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 break-words">{l.tutor} → {l.student}</p>
        <p className="text-xs text-gray-500">{new Date(l.startsAt).toLocaleDateString()}</p>
        {l.reason && (
          <span data-testid="revenue-flag" className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium ${l.reason === 'other' ? 'bg-gray-100 text-gray-700' : 'bg-red-50 text-red-700'}`}>{t(FLAG_KEY[l.reason])}</span>
        )}
      </div>
      <div className="text-right shrink-0">
        <span className={`font-semibold ${l.counted ? 'text-green-600' : 'text-gray-500'}`}>{formatMoney(l.price, l.currency)}</span>
        {!l.counted && l.reason && <p className="text-xs text-gray-500">{t('revenue.notCountedTag')}</p>}
      </div>
    </div>
  )
}
