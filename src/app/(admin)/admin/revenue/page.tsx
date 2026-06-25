import { createAdminClient } from '@/lib/supabase/server'
import { DollarSign, TrendingUp, BookOpen, Users } from 'lucide-react'

export default async function AdminRevenuePage() {
  const admin = createAdminClient()

  const [
    { data: paidLessons },
    { data: tutorRevenue },
    { count: totalPaid },
  ] = await Promise.all([
    admin.from('lessons')
      .select('price, currency, starts_at, tutors(name), students(name)')
      .eq('payment_status', 'paid')
      .order('starts_at', { ascending: false })
      .limit(20),
    admin.from('lessons')
      .select('price, tutors(id, name)')
      .eq('payment_status', 'paid')
      .not('price', 'is', null),
    admin.from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'paid'),
  ])

  const totalRevenue = (paidLessons ?? []).reduce((sum: number, l: any) => sum + (l.price ?? 0), 0)

  const byTutor = (tutorRevenue ?? []).reduce((acc: Record<string, { name: string; total: number; count: number }>, l: any) => {
    const tutorId = l.tutors?.id ?? 'unknown'
    const name = l.tutors?.name ?? 'Unknown'
    if (!acc[tutorId]) acc[tutorId] = { name, total: 0, count: 0 }
    acc[tutorId].total += l.price ?? 0
    acc[tutorId].count++
    return acc
  }, {})

  const tutorList = Object.values(byTutor).sort((a, b) => b.total - a.total)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
        <p className="text-sm text-gray-500 mt-1">Platform-wide payment overview</p>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">Across all tutors</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Paid Lessons</p>
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalPaid ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">Completed payments</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Avg per Lesson</p>
            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            ${totalPaid ? (totalRevenue / totalPaid).toFixed(2) : '0.00'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Average lesson price</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
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
                <span className="font-semibold text-green-600">${t.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Recent Payments</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(paidLessons ?? []).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No payments yet</p>
            )}
            {(paidLessons ?? []).map((l: any, i: number) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {l.tutors?.name ?? '—'} → {l.students?.name ?? '—'}
                  </p>
                  <p className="text-xs text-gray-400">{new Date(l.starts_at).toLocaleDateString()}</p>
                </div>
                <span className="font-semibold text-green-600">${(l.price ?? 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
