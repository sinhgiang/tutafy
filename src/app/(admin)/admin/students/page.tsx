import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/admin-guard'
import { getAdminT } from '@/lib/admin-lang'
import { statusText } from '@/lib/admin-i18n'

const LEVEL_COLOR: Record<string, string> = {
  A1: 'bg-gray-100 text-gray-600',
  A2: 'bg-blue-100 text-blue-600',
  B1: 'bg-cyan-100 text-cyan-700',
  B2: 'bg-green-100 text-green-700',
  C1: 'bg-orange-100 text-orange-700',
  C2: 'bg-red-100 text-red-700',
  Native: 'bg-purple-100 text-purple-700',
}

export default async function AdminStudentsPage() {
  // Own check, before any query (the layout alone is not a safe gate): this page reads other people's data with the service-role key.
  await requireAdminPage()
  const { t } = await getAdminT()

  const admin = createAdminClient()

  const { data: students } = await admin
    .from('students')
    .select('id, name, email, country, level, status, created_at, tutors(name)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('students.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('students.count', { n: students?.length ?? 0 })}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('common.student')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('common.tutor')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('common.country')}</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">{t('common.level')}</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">{t('common.status')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('students.colAdded')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(students ?? []).length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">{t('students.empty')}</td></tr>
              )}
              {(students ?? []).map((s: any) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.email ?? '—'}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{s.tutors?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{s.country ?? '—'}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_COLOR[s.level] ?? 'bg-gray-100 text-gray-600'}`}>
                      {s.level}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.status === 'active' ? 'bg-green-100 text-green-700' :
                      s.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{statusText(t, s.status)}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
