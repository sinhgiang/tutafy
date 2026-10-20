import { createAdminClient } from '@/lib/supabase/server'
import { DollarSign, TrendingUp, BookOpen, Users } from 'lucide-react'
import { loadAdminRevenue } from '@/lib/admin-revenue'
import { requireAdminPage } from '@/lib/admin-guard'
import { formatMoney } from '@/lib/currency'

export default async function AdminRevenuePage() {
  // Every tutor's payments are read with the service key: the page checks the admin itself, before anything is read.
  await requireAdminPage()
  // Each lesson in its tutor's own currency; tutors in different currencies are never added together.
  const { paidCount: totalPaid, totals, byTutor: tutorList, recent: paidLessons, truncated } = await loadAdminRevenue(createAdminClient())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
        <p className="text-sm text-gray-500 mt-1">Platform-wide payment overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </div>
          {totals.length === 0 && <p className="text-3xl font-bold text-gray-900">{formatMoney(0, 'USD')}</p>}
          {totals.map(t => (
            <p key={t.currency} className={totals.length > 1 ? 'text-xl font-bold text-gray-900' : 'text-3xl font-bold text-gray-900'}>{formatMoney(t.total, t.currency)}<span className="text-xs font-normal text-gray-400"> {t.currency}</span></p>
          ))}
          <p className="text-xs text-gray-400 mt-1">Across all tutors{totals.length > 1 ? ', one total per currency' : ''}{truncated ? ' (first lessons only, the list is very long)' : ''}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Paid Lessons</p>
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalPaid}</p>
          <p className="text-xs text-gray-400 mt-1">Completed payments</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Avg per Lesson</p>
            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          {totals.length === 0 && <p className="text-3xl font-bold text-gray-900">{formatMoney(0, 'USD')}</p>}
          {totals.map(t => (
            <p key={t.currency} className={totals.length > 1 ? 'text-xl font-bold text-gray-900' : 'text-3xl font-bold text-gray-900'}>{formatMoney(t.count ? t.total / t.count : 0, t.currency)}<span className="text-xs font-normal text-gray-400"> {t.currency}</span></p>
          ))}
          <p className="text-xs text-gray-400 mt-1">Average lesson price</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900 text-sm">Revenue by Tutor</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {tutorList.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No revenue yet</p>
            )}
            {tutorList.map((t, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.count} paid lessons</p>
                </div>
                <span className="font-semibold text-green-600">{formatMoney(t.total, t.currency)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Recent Payments</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {paidLessons.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No payments yet</p>
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
