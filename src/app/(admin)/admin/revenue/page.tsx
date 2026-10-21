import { createAdminClient } from '@/lib/supabase/server'
import { DollarSign, TrendingUp, BookOpen, Users } from 'lucide-react'
import { loadAdminRevenue } from '@/lib/admin-revenue'
import { requireAdminPage } from '@/lib/admin-guard'
import { formatMoney } from '@/lib/currency'
import { readPolarIncome } from '@/lib/polar-income'
import { getAdminT } from '@/lib/admin-lang'

export const dynamic = 'force-dynamic'

export default async function AdminRevenuePage() {
  // Every tutor's payments are read with the service key: the page checks the admin itself, before anything is read.
  await requireAdminPage()
  const { t } = await getAdminT()
  // Each lesson in its tutor's own currency; tutors in different currencies are never added together.
  const [{ paidCount: totalPaid, totals, byTutor: tutorList, recent: paidLessons, truncated }, plans] = await Promise.all([loadAdminRevenue(createAdminClient()), readPolarIncome()])

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
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">{t('revenue.total')}</p>
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </div>
          {totals.length === 0 && <p className="text-3xl font-bold text-gray-900">{formatMoney(0, 'USD')}</p>}
          {totals.map(tot => (
            <p key={tot.currency} className={totals.length > 1 ? 'text-xl font-bold text-gray-900' : 'text-3xl font-bold text-gray-900'}>{formatMoney(tot.total, tot.currency)}<span className="text-xs font-normal text-gray-400"> {tot.currency}</span></p>
          ))}
          <p className="text-xs text-gray-400 mt-1">{t('revenue.totalHint')}{totals.length > 1 ? t('revenue.totalHintCurrencies') : ''}{truncated ? t('revenue.totalHintCut') : ''}{t('revenue.totalHintEnd')}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">{t('revenue.paidLessons')}</p>
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalPaid}</p>
          <p className="text-xs text-gray-400 mt-1">{t('revenue.paidLessonsHint')}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">{t('revenue.average')}</p>
            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          {totals.length === 0 && <p className="text-3xl font-bold text-gray-900">{formatMoney(0, 'USD')}</p>}
          {totals.map(tot => (
            <p key={tot.currency} className={totals.length > 1 ? 'text-xl font-bold text-gray-900' : 'text-3xl font-bold text-gray-900'}>{formatMoney(tot.count ? tot.total / tot.count : 0, tot.currency)}<span className="text-xs font-normal text-gray-400"> {tot.currency}</span></p>
          ))}
          <p className="text-xs text-gray-400 mt-1">{t('revenue.averageHint')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900 text-sm">{t('revenue.byTutor')}</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {tutorList.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">{t('revenue.noPayments')}</p>
            )}
            {tutorList.map((row, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{row.name}</p>
                  <p className="text-xs text-gray-400">{t('revenue.paidCount', { n: row.count })}</p>
                </div>
                <span className="font-semibold text-green-600">{formatMoney(row.total, row.currency)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">{t('revenue.recent')}</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {paidLessons.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">{t('revenue.noPayments')}</p>
            )}
            {paidLessons.map((l, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {l.tutor} → {l.student}
                  </p>
                  <p className="text-xs text-gray-400">{new Date(l.startsAt).toLocaleDateString()}</p>
                </div>
                <span className="font-semibold text-green-600">{formatMoney(l.price, l.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
