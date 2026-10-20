import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/admin-guard'
import { loadBuyers, BUYERS_LIST_LIMIT } from '@/lib/buyers-data'
import { planBadgeClass, planLabel, POLAR_DASHBOARD_URL } from '@/lib/buyers'
import { ShoppingBag, GraduationCap, BookOpen, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminBuyersPage() {
  // Own check, before any query: this page reads every paying tutor with the service-role key.
  await requireAdminPage()

  const { pro, academy, total, buyers, failed } = await loadBuyers(createAdminClient())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Buyers</h1>
        <p className="text-sm text-gray-500 mt-1">Tutors on a paid plan (Pro or Academy), newest first</p>
      </div>

      {failed && (
        <div data-testid="buyers-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          Could not read the tutors table, so the numbers below are not reliable. Reload the page; if it keeps happening, check the database.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center h-9 mb-1"><p className="text-sm text-gray-500">Pro</p></div>
          <p data-testid="buyers-pro" className="text-3xl font-bold text-gray-900">{failed ? '—' : pro}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center h-9 mb-1"><p className="text-sm text-gray-500">Academy</p></div>
          <p data-testid="buyers-academy" className="text-3xl font-bold text-gray-900">{failed ? '—' : academy}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">Total buyers</p>
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <p data-testid="buyers-total" className="text-3xl font-bold text-gray-900">{failed ? '—' : total}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Buyer</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Signed up</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">Plan</th>
                {/* The tutors table has no country column; the timezone is the closest thing it stores. */}
                <th className="text-left px-5 py-3 font-medium text-gray-500" title="Country is not stored for tutors">Timezone</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">Students</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">Lessons</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Polar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {buyers.length === 0 && !failed && (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">No buyers yet</td></tr>
              )}
              {buyers.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{b.name}</p>
                    <p className="text-xs text-gray-400">{b.email}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planBadgeClass(b.subscription_status)}`}>
                      {planLabel(b.subscription_status)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{b.timezone ?? '—'}</td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-gray-700">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {b.students?.[0]?.count ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-gray-700">
                      <BookOpen className="h-3.5 w-3.5" />
                      {b.lessons?.[0]?.count ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <a href={POLAR_DASHBOARD_URL} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800">
                      Open Polar <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > buyers.length && (
          <p className="px-5 py-3 text-xs text-gray-400 border-t border-gray-50">
            Showing the newest {BUYERS_LIST_LIMIT} of {total} buyers.
          </p>
        )}
      </div>
    </div>
  )
}
