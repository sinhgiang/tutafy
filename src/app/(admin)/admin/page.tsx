import { createAdminClient } from '@/lib/supabase/server'
import { Users, GraduationCap, BookOpen, TrendingUp, UserCheck, Clock } from 'lucide-react'

export default async function AdminOverviewPage() {
  const admin = createAdminClient()

  const [
    { count: totalTutors },
    { count: totalStudents },
    { count: totalLessons },
    { count: activeTutors },
    { data: recentTutors },
    { data: recentLessons },
  ] = await Promise.all([
    admin.from('tutors').select('*', { count: 'exact', head: true }),
    admin.from('students').select('*', { count: 'exact', head: true }),
    admin.from('lessons').select('*', { count: 'exact', head: true }),
    admin.from('tutors').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    admin.from('tutors').select('id, name, email, created_at').order('created_at', { ascending: false }).limit(8),
    admin.from('lessons').select('id, starts_at, status, tutors(name), students(name)').order('created_at', { ascending: false }).limit(8),
  ])

  const stats = [
    { label: 'Total Tutors', value: totalTutors ?? 0, icon: Users, color: 'blue', desc: 'Registered tutors' },
    { label: 'Total Students', value: totalStudents ?? 0, icon: GraduationCap, color: 'green', desc: 'Across all tutors' },
    { label: 'Total Lessons', value: totalLessons ?? 0, icon: BookOpen, color: 'purple', desc: 'Scheduled & completed' },
    { label: 'New This Month', value: activeTutors ?? 0, icon: TrendingUp, color: 'orange', desc: 'Tutors joined last 30d' },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-sm text-gray-500 mt-1">All activity across Tutafy</p>
      </div>

      <div className="grid grid-cols-4 gap-5">
        {stats.map(({ label, value, icon: Icon, color, desc }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{label}</p>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900 text-sm">Recent Tutor Registrations</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(recentTutors ?? []).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No tutors yet</p>
            )}
            {(recentTutors ?? []).map((t: { id: string; name: string; email: string; created_at: string }) => (
              <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.email}</p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(t.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900 text-sm">Recent Lessons</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(recentLessons ?? []).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No lessons yet</p>
            )}
            {(recentLessons ?? []).map((l: any) => (
              <div key={l.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {l.tutors?.name ?? '—'} → {l.students?.name ?? '—'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(l.starts_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  l.status === 'completed' ? 'bg-green-100 text-green-700' :
                  l.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}>{l.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
