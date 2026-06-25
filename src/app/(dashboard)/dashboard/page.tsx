import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, BookOpen, DollarSign, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ count: totalStudents }, { count: activeStudents }, { data: lessons }] =
    await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('tutor_id', user!.id),
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('tutor_id', user!.id).eq('status', 'active'),
      supabase.from('lessons').select('starts_at, price, status').eq('tutor_id', user!.id),
    ])

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const lessonsThisMonth = lessons?.filter(l =>
    new Date(l.starts_at) >= startOfMonth && l.status !== 'cancelled'
  ).length ?? 0

  const revenueThisMonth = lessons?.filter(l =>
    new Date(l.starts_at) >= startOfMonth && l.status === 'completed'
  ).reduce((sum, l) => sum + (l.price ?? 0), 0) ?? 0

  const revenueLastMonth = lessons?.filter(l =>
    new Date(l.starts_at) >= startOfLastMonth && new Date(l.starts_at) < startOfMonth && l.status === 'completed'
  ).reduce((sum, l) => sum + (l.price ?? 0), 0) ?? 0

  const stats = [
    { title: 'Total Students', value: totalStudents ?? 0, sub: `${activeStudents ?? 0} active`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Lessons This Month', value: lessonsThisMonth, sub: 'scheduled + completed', icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Revenue This Month', value: `$${revenueThisMonth.toFixed(0)}`, sub: `$${revenueLastMonth.toFixed(0)} last month`, icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Growth', value: revenueLastMonth > 0 ? `${(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100).toFixed(0)}%` : '—', sub: 'vs last month', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back! Here&apos;s your overview.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">{stat.sub}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Lessons</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">No upcoming lessons. <a href="/calendar" className="text-blue-600 hover:underline">Add one →</a></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">No students yet. <a href="/students/new" className="text-blue-600 hover:underline">Add your first student →</a></p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
