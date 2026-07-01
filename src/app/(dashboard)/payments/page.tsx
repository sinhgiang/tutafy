import { createClient } from '@/lib/supabase/server'
import { TrendingUp, Clock, CheckCircle, DollarSign, Users, XCircle, FileText } from 'lucide-react'
import Link from 'next/link'

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600',
  paid: 'bg-emerald-50 text-emerald-600',
  free: 'bg-gray-50 text-gray-400',
  refunded: 'bg-red-50 text-red-500',
}

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: lessons } = await supabase
    .from('lessons')
    .select('*, students(id, name)')
    .eq('tutor_id', user!.id)
    .order('starts_at', { ascending: false })

  const allLessons = lessons ?? []
  const paidLessons = allLessons.filter(l => l.payment_status === 'paid' && l.price)
  const pendingLessons = allLessons.filter(l => l.payment_status === 'pending' && l.price)
  const cancelled = allLessons.filter(l => l.status === 'cancelled')
  const total = paidLessons.reduce((s, l) => s + Number(l.price ?? 0), 0)
  const pending = pendingLessons.reduce((s, l) => s + Number(l.price ?? 0), 0)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const thisMonth = paidLessons
    .filter(l => new Date(l.starts_at) >= startOfMonth)
    .reduce((s, l) => s + Number(l.price ?? 0), 0)

  const lastMonth = paidLessons
    .filter(l => new Date(l.starts_at) >= startOfLastMonth && new Date(l.starts_at) <= endOfLastMonth)
    .reduce((s, l) => s + Number(l.price ?? 0), 0)

  const growth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null
  const cancellationRate = allLessons.length > 0 ? (cancelled.length / allLessons.length) * 100 : 0

  // Lessons per week (last 8 weeks)
  const weeks: { label: string; count: number; revenue: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const wStart = new Date(now.getTime() - (i + 1) * 7 * 86400 * 1000)
    const wEnd = new Date(now.getTime() - i * 7 * 86400 * 1000)
    const wLabel = wStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const wLessons = allLessons.filter(l => {
      const d = new Date(l.starts_at)
      return d >= wStart && d < wEnd && l.status !== 'cancelled'
    })
    weeks.push({ label: wLabel, count: wLessons.length, revenue: wLessons.reduce((s, l) => s + Number(l.price ?? 0), 0) })
  }
  const maxWeekCount = Math.max(...weeks.map(w => w.count), 1)

  // Top students by lesson count
  const studentMap = new Map<string, { name: string; id: string; count: number; revenue: number }>()
  for (const l of allLessons.filter(l => l.status !== 'cancelled')) {
    const s = l.students as any
    if (!s?.id) continue
    const existing = studentMap.get(s.id) ?? { name: s.name, id: s.id, count: 0, revenue: 0 }
    studentMap.set(s.id, { ...existing, count: existing.count + 1, revenue: existing.revenue + Number(l.price ?? 0) })
  }
  const topStudents = Array.from(studentMap.values()).sort((a, b) => b.count - a.count).slice(0, 5)

  const paymentHistory = allLessons.filter(l => l.price != null).slice(0, 30)

  return (
    <div className="space-y-6 max-w-[900px]">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Payments & Analytics</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Track your earnings and lesson performance</p>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Earned', value: `$${total.toFixed(2)}`, icon: CheckCircle, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', sub: 'all time' },
          { label: 'This Month', value: `$${thisMonth.toFixed(2)}`, icon: TrendingUp, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-500', sub: growth != null ? `${growth >= 0 ? '+' : ''}${growth.toFixed(0)}% vs last month` : now.toLocaleDateString('en', { month: 'long' }) },
          { label: 'Pending', value: `$${pending.toFixed(2)}`, icon: Clock, iconBg: 'bg-amber-50', iconColor: 'text-amber-500', sub: `${pendingLessons.length} lessons` },
          { label: 'Cancellation Rate', value: `${cancellationRate.toFixed(0)}%`, icon: XCircle, iconBg: 'bg-red-50', iconColor: 'text-red-400', sub: `${cancelled.length} of ${allLessons.length} lessons` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${s.iconBg} flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`h-4 w-4 ${s.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 truncate">{s.label}</p>
              <p className="text-[18px] font-bold text-gray-900 leading-tight">{s.value}</p>
              <p className={`text-[10px] truncate ${growth != null && s.label === 'This Month' ? (growth >= 0 ? 'text-emerald-500' : 'text-red-400') : 'text-gray-400'}`}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-5">
        {/* Weekly chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-[13px] font-semibold text-gray-900 mb-4">Lessons per week (last 8 weeks)</p>
          <div className="flex items-end gap-2 h-28">
            {weeks.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="w-full flex flex-col justify-end" style={{ height: '96px' }}>
                  <div
                    className="w-full bg-indigo-500 rounded-t-md transition-all group-hover:bg-indigo-600 relative"
                    style={{ height: `${(w.count / maxWeekCount) * 96}px`, minHeight: w.count > 0 ? '4px' : '0' }}
                    title={`${w.count} lessons · $${w.revenue.toFixed(0)}`}
                  />
                </div>
                <p className="text-[9px] text-gray-400 text-center leading-tight">{w.label}</p>
                <p className="text-[10px] font-semibold text-gray-700">{w.count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top students */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <p className="text-[13px] font-semibold text-gray-900">Top Students</p>
          </div>
          {topStudents.length === 0 ? (
            <div className="flex items-center justify-center h-24">
              <p className="text-[12px] text-gray-300">No data yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {topStudents.map((s, i) => (
                <Link key={s.id} href={`/students/${s.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors">
                  <span className="text-[11px] font-bold text-gray-300 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{s.name}</p>
                    <p className="text-[11px] text-gray-400">{s.count} lessons</p>
                  </div>
                  <p className="text-[12px] font-semibold text-gray-700">${s.revenue.toFixed(0)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-gray-900">Payment History</p>
          <p className="text-[12px] text-gray-400">{paymentHistory.length} records</p>
        </div>
        {paymentHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-3">
              <DollarSign className="h-5 w-5 text-gray-300" />
            </div>
            <p className="text-[13px] text-gray-400">No payments yet</p>
            <p className="text-[12px] text-gray-300 mt-0.5">Lessons with a price will appear here</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50/60">
              <tr>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Student</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Duration</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paymentHistory.map(l => (
                <tr key={l.id} className="hover:bg-gray-50/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/lessons/${l.id}`} className="text-[13px] font-medium text-gray-900 hover:text-indigo-600">
                      {(l.students as any)?.name ?? '—'}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-gray-500">
                    {new Date(l.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-gray-400">{l.duration_minutes} min</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-[13px] font-semibold text-gray-900">${Number(l.price ?? 0).toFixed(2)}</span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${STATUS_STYLE[l.payment_status ?? 'pending']}`}>
                      {l.payment_status ?? 'pending'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <a href={`/api/invoices/${l.id}`} target="_blank" rel="noopener noreferrer"
                      title="Download invoice"
                      className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-indigo-500 transition-colors">
                      <FileText className="h-3.5 w-3.5" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Stripe CTA */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <DollarSign className="h-4 w-4 text-indigo-600" />
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-indigo-900">Accept online payments via Stripe</p>
          <p className="text-[12px] text-indigo-600 mt-0.5">Connect your Stripe account in Settings to accept credit card payments from students directly.</p>
        </div>
        <Link href="/settings" className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 whitespace-nowrap">
          Go to Settings →
        </Link>
      </div>
    </div>
  )
}
