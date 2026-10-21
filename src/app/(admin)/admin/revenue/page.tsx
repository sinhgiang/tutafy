import { createAdminClient } from '@/lib/supabase/server'
import { DollarSign, TrendingUp, BookOpen, Users } from 'lucide-react'
import { loadAdminRevenue } from '@/lib/admin-revenue'
import { requireAdminPage } from '@/lib/admin-guard'
import { formatMoney } from '@/lib/currency'
import { readPolarIncome } from '@/lib/polar-income'

export const dynamic = 'force-dynamic'

export default async function AdminRevenuePage() {
  // Every tutor's payments are read with the service key: the page checks the admin itself, before anything is read.
  await requireAdminPage()
  // Each lesson in its tutor's own currency; tutors in different currencies are never added together.
  const [{ paidCount: totalPaid, totals, byTutor: tutorList, recent: paidLessons, truncated }, plans] = await Promise.all([loadAdminRevenue(createAdminClient()), readPolarIncome()])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tiền học sinh trả cho gia sư</h1>
        <p data-testid="revenue-subtitle" className="text-sm text-gray-500 mt-1">Thanh toán buổi học của học sinh cho gia sư, không phải thu nhập của bạn</p>
      </div>

      {/* What the owner earns from the plans: read from Polar, or said plainly when it cannot be read (T-0699) */}
      <div data-testid="plan-income" className="bg-white rounded-xl p-5 shadow-sm border border-indigo-100">
        <div className="flex items-center justify-between mb-2 gap-2">
          <p className="text-sm font-semibold text-gray-900">Thu nhập của bạn từ các gói (Pro, Academy)</p>
          <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5 text-indigo-600" />
          </div>
        </div>
        {plans.ok ? (
          <>
            {plans.monthly.length === 0 && <p data-testid="plan-income-value" className="text-3xl font-bold text-gray-900">{formatMoney(0, 'USD')}<span className="text-xs font-normal text-gray-400"> mỗi tháng</span></p>}
            {plans.monthly.map(m => (
              <p key={m.currency} data-testid="plan-income-value" className={plans.monthly.length > 1 ? 'text-xl font-bold text-gray-900' : 'text-3xl font-bold text-gray-900'}>{formatMoney(m.amount, m.currency)}<span className="text-xs font-normal text-gray-400"> {m.currency} mỗi tháng</span></p>
            ))}
            <p className="text-xs text-gray-500 mt-1">Cộng từ {plans.subscriptions} gói đang chạy trên Polar (gói theo năm tính một phần mười hai mỗi tháng){plans.truncated ? '; danh sách rất dài nên chỉ đọc phần đầu' : ''}. Chỉ đọc, không ghi gì.</p>
          </>
        ) : (
          <>
            <p data-testid="plan-income-unreadable" className="text-base font-semibold text-gray-700">{plans.detail}</p>
            <p className="text-xs text-gray-500 mt-1">Số người trả phí vẫn có ở trang Khách hàng của tôi. Tiền thật xem ở bảng điều khiển của Polar (polar.sh/dashboard).</p>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Tổng tiền học sinh đã trả</p>
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </div>
          {totals.length === 0 && <p className="text-3xl font-bold text-gray-900">{formatMoney(0, 'USD')}</p>}
          {totals.map(t => (
            <p key={t.currency} className={totals.length > 1 ? 'text-xl font-bold text-gray-900' : 'text-3xl font-bold text-gray-900'}>{formatMoney(t.total, t.currency)}<span className="text-xs font-normal text-gray-400"> {t.currency}</span></p>
          ))}
          <p className="text-xs text-gray-400 mt-1">Của mọi gia sư cộng lại{totals.length > 1 ? ', mỗi loại tiền một tổng' : ''}{truncated ? ' (chỉ phần đầu, danh sách rất dài)' : ''}. Đây là tiền của gia sư, không phải của bạn</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Buổi học đã trả tiền</p>
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalPaid}</p>
          <p className="text-xs text-gray-400 mt-1">Thanh toán đã xong</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Trung bình mỗi buổi</p>
            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          {totals.length === 0 && <p className="text-3xl font-bold text-gray-900">{formatMoney(0, 'USD')}</p>}
          {totals.map(t => (
            <p key={t.currency} className={totals.length > 1 ? 'text-xl font-bold text-gray-900' : 'text-3xl font-bold text-gray-900'}>{formatMoney(t.count ? t.total / t.count : 0, t.currency)}<span className="text-xs font-normal text-gray-400"> {t.currency}</span></p>
          ))}
          <p className="text-xs text-gray-400 mt-1">Giá trung bình một buổi học</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900 text-sm">Theo từng gia sư</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {tutorList.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">Chưa có thanh toán nào</p>
            )}
            {tutorList.map((t, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.count} buổi đã trả tiền</p>
                </div>
                <span className="font-semibold text-green-600">{formatMoney(t.total, t.currency)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Thanh toán gần đây</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {paidLessons.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">Chưa có thanh toán nào</p>
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
