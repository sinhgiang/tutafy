import { createAdminClient } from '@/lib/supabase/server'
import { BarChart3, TrendingUp, Globe, Award } from 'lucide-react'

export default async function AdminAnalyticsPage() {
  const admin = createAdminClient()

  const [
    { data: studentsByLevel },
    { data: studentsByCountry },
    { data: lessonsByStatus },
    { data: tutorGrowth },
  ] = await Promise.all([
    admin.from('students').select('level').not('level', 'is', null),
    admin.from('students').select('country').not('country', 'is', null),
    admin.from('lessons').select('status'),
    admin.from('tutors').select('created_at').order('created_at'),
  ])

  const levelCount = (studentsByLevel ?? []).reduce((acc: Record<string, number>, s: { level: string }) => {
    acc[s.level] = (acc[s.level] ?? 0) + 1
    return acc
  }, {})

  const countryCount = (studentsByCountry ?? []).reduce((acc: Record<string, number>, s: { country: string }) => {
    if (s.country) acc[s.country] = (acc[s.country] ?? 0) + 1
    return acc
  }, {})

  const statusCount = (lessonsByStatus ?? []).reduce((acc: Record<string, number>, l: { status: string }) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1
    return acc
  }, {})

  const topCountries = Object.entries(countryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native']
  const maxLevel = Math.max(...Object.values(levelCount), 1)
  const maxCountry = Math.max(...topCountries.map(([, v]) => v), 1)

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    no_show: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Platform growth and usage insights</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-5">
            <Award className="h-4 w-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900 text-sm">Students by Level</h2>
          </div>
          <div className="space-y-3">
            {levelOrder.map(level => {
              const count = levelCount[level] ?? 0
              const pct = Math.round((count / maxLevel) * 100)
              return (
                <div key={level} className="flex items-center gap-3">
                  <span className="text-xs font-mono w-12 text-gray-500">{level}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-6 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-5">
            <Globe className="h-4 w-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900 text-sm">Top Student Countries</h2>
          </div>
          <div className="space-y-3">
            {topCountries.length === 0 && <p className="text-sm text-gray-400">No country data yet</p>}
            {topCountries.map(([country, count]) => {
              const pct = Math.round((count / maxCountry) * 100)
              return (
                <div key={country} className="flex items-center gap-3">
                  <span className="text-xs w-24 truncate text-gray-500">{country}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-6 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="h-4 w-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900 text-sm">Lessons by Status</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(statusCount).length === 0 && <p className="text-sm text-gray-400">No lessons yet</p>}
            {Object.entries(statusCount).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {status.replace('_', ' ')}
                </span>
                <span className="text-sm font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900 text-sm">Tutor Growth</h2>
          </div>
          {(tutorGrowth ?? []).length === 0 ? (
            <p className="text-sm text-gray-400">No tutors yet</p>
          ) : (
            <div className="space-y-2">
              {(() => {
                const byMonth = (tutorGrowth ?? []).reduce((acc: Record<string, number>, t: { created_at: string }) => {
                  const month = t.created_at.slice(0, 7)
                  acc[month] = (acc[month] ?? 0) + 1
                  return acc
                }, {})
                const months = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).slice(-6)
                const maxVal = Math.max(...months.map(([, v]) => v), 1)
                return months.map(([month, count]) => (
                  <div key={month} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16">{month}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${Math.round((count / maxVal) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 w-4 text-right">{count}</span>
                  </div>
                ))
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
