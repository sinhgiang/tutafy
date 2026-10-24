import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/admin-guard'
import { getAdminT } from '@/lib/admin-lang'
import { BookOpen, GraduationCap } from 'lucide-react'
import { planBadgeClass, planLabel } from '@/lib/buyers'

export default async function AdminTutorsPage() {
  // Own check, before any query (the layout alone is not a safe gate): this page reads other people's data with the service-role key.
  await requireAdminPage()
  const { t } = await getAdminT()

  const admin = createAdminClient()

  const { data: tutors } = await admin
    .from('tutors')
    .select(`
      id, name, email, slug, created_at, stripe_onboarding_complete, booking_url_active, subscription_status,
      students(count),
      lessons(count)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('tutors.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('tutors.count', { n: tutors?.length ?? 0 })}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('common.tutor')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('tutors.colSlug')}</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">{t('common.plan')}</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">{t('common.students')}</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">{t('common.lessons')}</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">Stripe</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">{t('tutors.colBooking')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('tutors.colJoined')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(tutors ?? []).length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">{t('tutors.empty')}</td></tr>
              )}
              {(tutors ?? []).map((tu: {
                id: string; name: string; email: string; slug: string; created_at: string;
                stripe_onboarding_complete: boolean; booking_url_active: boolean; subscription_status: string | null;
                students: { count: number }[]; lessons: { count: number }[];
              }) => (
                <tr key={tu.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{tu.name}</p>
                    <p className="text-xs text-gray-400">{tu.email}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-500 font-mono text-xs">{tu.slug}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planBadgeClass(tu.subscription_status)}`}>
                      {planLabel(tu.subscription_status)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-gray-700">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {tu.students?.[0]?.count ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-gray-700">
                      <BookOpen className="h-3.5 w-3.5" />
                      {tu.lessons?.[0]?.count ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      tu.stripe_onboarding_complete ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {tu.stripe_onboarding_complete ? t('tutors.connected') : t('tutors.pending')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      tu.booking_url_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {tu.booking_url_active ? t('tutors.bookingActive') : t('tutors.bookingOff')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(tu.created_at).toLocaleDateString()}
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
