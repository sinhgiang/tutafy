import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { requireFeature } from '@/lib/guard'
import Link from 'next/link'
import {
  DollarSign, BookOpen, Users, TrendingUp, BarChart3, Trophy,
  CheckCircle2, XCircle, Clock, Download,
} from 'lucide-react'

const MONTHS_BACK = 6

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locked = await requireFeature('pro', 'Reports')
  if (locked) return locked

  const [{ data: tutor }, { data: lessons }, { data: students }] = await Promise.all([
    supabase.from('tutors').select('name, currency').eq('id', user.id).single(),
    supabase.from('lessons')
      .select('starts_at, price, status, payment_status, duration_minutes, student_id')
      .eq('tutor_id', user.id),
    supabase.from('students')
      .select('id, name, created_at, status')
      .eq('tutor_id', user.id),
  ])

  const now = new Date()
  const cur = (tutor as any)?.currency === 'EUR' ? '€' : (tutor as any)?.currency === 'GBP' ? '£' : '$'
  const money = (n: number) => `${cur}${Math.round(n).toLocaleString('en-US')}`
  const allLessons = lessons ?? []
  const allStudents = students ?? []

  // ---- Monthly buckets (last 6 months incl. current) ----
  const months = Array.from({ length: MONTHS_BACK }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS_BACK - 1 - i), 1)
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-US', { month: 'short' }),
      revenue: 0, lessons: 0, newStudents: 0 }
  })
  const monthIdx = new Map(months.map((m, i) => [m.key, i]))
  const keyOf = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}` }

  for (const l of allLessons) {
    const i = monthIdx.get(keyOf(l.starts_at))
    if (i === undefined) continue
    if (l.status !== 'cancelled') months[i].lessons += 1
    if (l.status === 'completed') months[i].revenue += Number(l.price) || 0
  }
  for (const s of allStudents) {
    const i = monthIdx.get(keyOf(s.created_at))
    if (i !== undefined) months[i].newStudents += 1
  }

  // ---- Headline totals ----
  const completed = allLessons.filter(l => l.status === 'completed')
  const totalRevenue = completed.reduce((s, l) => s + (Number(l.price) || 0), 0)
  const lessonsCompleted = completed.length
  const activeStudents = allStudents.filter(s => s.status === 'active').length
  const avgPrice = lessonsCompleted > 0 ? totalRevenue / lessonsCompleted : 0
  const totalHours = completed.reduce((s, l) => s + (Number(l.duration_minutes) || 0), 0) / 60

  // ---- Payment breakdown (non-cancelled lessons) ----
  const active = allLessons.filter(l => l.status !== 'cancelled')
  const paidAmt = active.filter(l => l.payment_status === 'paid').reduce((s, l) => s + (Number(l.price) || 0), 0)
  const pendingAmt = active.filter(l => l.payment_status === 'pending').reduce((s, l) => s + (Number(l.price) || 0), 0)
  const freeCount = active.filter(l => l.payment_status === 'free' || (Number(l.price) || 0) === 0).length

  // ---- Completion / attendance ----
  const past = allLessons.filter(l => new Date(l.starts_at) < now)
  const cancelled = allLessons.filter(l => l.status === 'cancelled').length
  const noShow = allLessons.filter(l => l.status === 'no_show').length
  const finishedOrMissed = lessonsCompleted + cancelled + noShow
  const completionRate = finishedOrMissed > 0 ? Math.round((lessonsCompleted / finishedOrMissed) * 100) : 0

  // ---- Top students by revenue ----
  const nameById = new Map(allStudents.map(s => [s.id, s.name]))
  const perStudent = new Map<string, { revenue: number; lessons: number }>()
  for (const l of completed) {
    if (!l.student_id) continue
    const e = perStudent.get(l.student_id) ?? { revenue: 0, lessons: 0 }
    e.revenue += Number(l.price) || 0
    e.lessons += 1
    perStudent.set(l.student_id, e)
  }
  const topStudents = [...perStudent.entries()]
    .map(([id, v]) => ({ id, name: nameById.get(id) ?? 'Unknown', ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  const maxRevenue = Math.max(1, ...months.map(m => m.revenue))
  const maxLessons = Math.max(1, ...months.map(m => m.lessons))

  const STAT = [
    { label: 'Total Revenue', value: money(totalRevenue), sub: 'from completed lessons', icon: DollarSign, bg: 'bg-violet-50', accent: 'text-violet-500' },
    { label: 'Lessons Completed', value: lessonsCompleted.toLocaleString(), sub: `${totalHours.toFixed(0)} hours taught`, icon: BookOpen, bg: 'bg-emerald-50', accent: 'text-emerald-500' },
    { label: 'Active Students', value: activeStudents.toLocaleString(), sub: `${allStudents.length} total`, icon: Users, bg: 'bg-indigo-50', accent: 'text-indigo-500' },
    { label: 'Avg. Lesson Price', value: money(avgPrice), sub: 'per completed lesson', icon: TrendingUp, bg: 'bg-amber-50', accent: 'text-amber-500' },
  ]

  return (
    <div className="space-y-6 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">Your business at a glance — last {MONTHS_BACK} months</p>
        </div>
        <a href="/api/payments/export"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 transition-colors px-4 py-2 rounded-lg">
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </a>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT.map(({ label, value, sub, icon: Icon, bg, accent }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${accent}`} />
              </div>
            </div>
            <span className="text-[26px] font-bold text-gray-900 leading-none tracking-tight">{value}</span>
            <p className="text-[12px] text-gray-400 mt-1.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="h-4 w-4 text-violet-500" />
            <h2 className="text-[13px] font-semibold text-gray-900">Monthly Revenue</h2>
          </div>
          <div className="flex items-end justify-between gap-2 h-40">
            {months.map(m => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-semibold text-gray-500">{m.revenue > 0 ? money(m.revenue) : ''}</span>
                <div className="w-full bg-gray-50 rounded-t-md flex items-end" style={{ height: '100%' }}>
                  <div className="w-full bg-violet-400 rounded-t-md transition-all" style={{ height: `${(m.revenue / maxRevenue) * 100}%`, minHeight: m.revenue > 0 ? '4px' : '0' }} />
                </div>
                <span className="text-[10px] text-gray-400">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lessons chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-5">
            <BookOpen className="h-4 w-4 text-emerald-500" />
            <h2 className="text-[13px] font-semibold text-gray-900">Lessons per Month</h2>
          </div>
          <div className="flex items-end justify-between gap-2 h-40">
            {months.map(m => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-semibold text-gray-500">{m.lessons > 0 ? m.lessons : ''}</span>
                <div className="w-full bg-gray-50 rounded-t-md flex items-end" style={{ height: '100%' }}>
                  <div className="w-full bg-emerald-400 rounded-t-md transition-all" style={{ height: `${(m.lessons / maxLessons) * 100}%`, minHeight: m.lessons > 0 ? '4px' : '0' }} />
                </div>
                <span className="text-[10px] text-gray-400">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lower grid: top students + breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top students */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
            <Trophy className="h-4 w-4 text-amber-400" />
            <h2 className="text-[13px] font-semibold text-gray-900">Top Students by Revenue</h2>
          </div>
          {topStudents.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-gray-400">No completed lessons yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {topStudents.map((s, i) => (
                <Link key={s.id} href={`/students/${s.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-400'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 truncate">{s.name}</p>
                    <p className="text-[11px] text-gray-400">{s.lessons} lessons</p>
                  </div>
                  <span className="text-[13px] font-bold text-gray-900">{money(s.revenue)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Breakdowns */}
        <div className="space-y-4">
          {/* Payment status */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Payments</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] text-gray-600"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Collected</span>
                <span className="text-[13px] font-bold text-gray-900">{money(paidAmt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] text-gray-600"><span className="w-2 h-2 rounded-full bg-amber-400" /> Pending</span>
                <span className="text-[13px] font-bold text-amber-600">{money(pendingAmt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] text-gray-600"><span className="w-2 h-2 rounded-full bg-gray-300" /> Free / trial lessons</span>
                <span className="text-[13px] font-bold text-gray-500">{freeCount}</span>
              </div>
            </div>
          </div>

          {/* Completion rate */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Attendance</p>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="3.5"
                    strokeDasharray={`${completionRate} ${100 - completionRate}`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-gray-900">{completionRate}%</span>
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2 text-[12px] text-gray-600"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {lessonsCompleted} completed</div>
                <div className="flex items-center gap-2 text-[12px] text-gray-600"><XCircle className="h-3.5 w-3.5 text-red-400" /> {cancelled} cancelled</div>
                <div className="flex items-center gap-2 text-[12px] text-gray-600"><Clock className="h-3.5 w-3.5 text-gray-400" /> {noShow} no-show</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accounting export */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Download className="h-4 w-4 text-gray-400" />
          <h2 className="text-[13px] font-semibold text-gray-900">Accounting Export</h2>
        </div>
        <p className="text-[12px] text-gray-500 mb-4">
          Download your {now.getFullYear()} invoices as a CSV ready to import into Xero or QuickBooks Online.
          For live sync, connect Tutafy to your accounting app via <Link href="/developers" className="text-indigo-500 hover:underline">Zapier &amp; webhooks</Link>.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href={`/api/accounting/export?provider=xero&year=${now.getFullYear()}`}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 transition-colors px-4 py-2 rounded-lg">
            <Download className="h-3.5 w-3.5" /> Export for Xero
          </a>
          <a href={`/api/accounting/export?provider=quickbooks&year=${now.getFullYear()}`}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 transition-colors px-4 py-2 rounded-lg">
            <Download className="h-3.5 w-3.5" /> Export for QuickBooks
          </a>
        </div>
      </div>
    </div>
  )
}
