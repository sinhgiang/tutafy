import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/admin-guard'
import { loadOverview, type WeekCount } from '@/lib/platform-overview'
import { readErrorMessage } from '@/lib/read-errors'
import { Users, GraduationCap, BookOpen, TrendingUp, UserCheck, Clock, UserRoundCheck, BadgeCheck, UserRound, Repeat } from 'lucide-react'

export const dynamic = 'force-dynamic'

const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-600',
}

const show = (v: number | null) => (v === null ? '—' : v.toLocaleString())
const percent = (part: number | null, whole: number | null) => (part === null || !whole ? null : Math.round((part / whole) * 100))
const weekLabel = (weekStart: string, current: boolean) =>
  current ? 'This week' : new Date(`${weekStart}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

function WeeklyChart({ weeks }: { weeks: WeekCount[] }) {
  const max = Math.max(1, ...weeks.map(w => w.count))
  const newestFirst = [...weeks].reverse()
  return (
    <ul className="px-5 py-4 space-y-2" data-testid="weekly-signups">
      {newestFirst.map((w, i) => (
        <li key={w.weekStart} className="flex items-center gap-3 text-sm" data-week={w.weekStart}>
          <span className="w-20 shrink-0 text-gray-500">{weekLabel(w.weekStart, i === 0)}</span>
          <span className="flex-1 h-3 bg-gray-50 rounded-full overflow-hidden" aria-hidden="true">
            <span className="block h-full rounded-full bg-blue-500" style={{ width: `${(w.count / max) * 100}%` }} />
          </span>
          <span className="w-10 shrink-0 text-right font-medium text-gray-900" data-count>{w.count}</span>
        </li>
      ))}
    </ul>
  )
}

export default async function AdminOverviewPage() {
  // Own check, before any query: this page reads every tutor, student and lesson with the service-role key.
  await requireAdminPage()

  const admin = createAdminClient()
  const d = await loadOverview(admin)

  const stats = [
    { id: 'tutors', label: 'Total Tutors', value: d.tutors, icon: Users, color: 'blue', desc: 'Registered tutors' },
    { id: 'active-tutors', label: 'Active Tutors', value: d.activeTutors, icon: UserRoundCheck, color: 'green', desc: percent(d.activeTutors, d.tutors) === null ? 'A lesson with a real student' : `${percent(d.activeTutors, d.tutors)}% of tutors have a lesson with a real student` },
    { id: 'activated-tutors', label: 'Activated Tutors', value: d.activatedTutors, icon: BadgeCheck, color: 'purple', desc: percent(d.activatedTutors, d.tutors) === null ? 'A completed lesson' : `${percent(d.activatedTutors, d.tutors)}% of tutors completed a lesson` },
    { id: 'new-tutors', label: 'New This Month', value: d.newTutors, icon: TrendingUp, color: 'orange', desc: 'Tutors joined last 30d' },
    { id: 'total-students', label: 'Total Students', value: d.totalStudents, icon: GraduationCap, color: 'green', desc: 'Real + self-added' },
    { id: 'real-students', label: 'Real Students', value: d.realStudents, icon: UserRound, color: 'blue', desc: "Not the tutor's own email" },
    { id: 'self-students', label: 'Self-added Students', value: d.selfAddedStudents, icon: Repeat, color: 'orange', desc: 'Same email as their tutor' },
    { id: 'lessons', label: 'Total Lessons', value: d.totalLessons, icon: BookOpen, color: 'purple', desc: 'Scheduled & completed' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-sm text-gray-500 mt-1">All activity across Tutafy</p>
      </div>

      {d.failedTables.length > 0 && (
        <div data-testid="overview-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          {readErrorMessage(d.failedTables)}
        </div>
      )}
      {d.truncated && (
        <div data-testid="overview-truncated" role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          Some records were too many to read in full, so a few counts below may be incomplete.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map(({ id, label, value, icon: Icon, color, desc }) => (
          <div key={id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100" data-stat={id}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{label}</p>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p data-value className="text-3xl font-bold text-gray-900">{show(value)}</p>
            <p className="text-xs text-gray-400 mt-1">{desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-x-2 gap-y-1 flex-wrap">
          <TrendingUp className="h-4 w-4 text-gray-400 shrink-0" />
          <h2 className="font-semibold text-gray-900 text-sm whitespace-nowrap">New tutors per week</h2>
          <span className="text-xs text-gray-400">last 12 weeks, weeks start on Monday (UTC)</span>
        </div>
        {d.weekly ? <WeeklyChart weeks={d.weekly} /> : <p className="text-sm text-gray-400 text-center py-6">Could not read the tutors table</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900 text-sm">Recent Tutor Registrations</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {d.recentTutors.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No tutors yet</p>
            )}
            {d.recentTutors.map(t => (
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
            {d.recentLessons.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No lessons yet</p>
            )}
            {d.recentLessons.map((l) => (
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
