import { createAdminClient } from '@/lib/supabase/server'
import { Users, BookOpen, GraduationCap } from 'lucide-react'

export default async function AdminTutorsPage() {
  const admin = createAdminClient()

  const { data: tutors } = await admin
    .from('tutors')
    .select(`
      id, name, email, slug, created_at, stripe_onboarding_complete, booking_url_active,
      students(count),
      lessons(count)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Tutors</h1>
          <p className="text-sm text-gray-500 mt-1">{tutors?.length ?? 0} registered tutors</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Tutor</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Slug</th>
              <th className="text-center px-5 py-3 font-medium text-gray-500">Students</th>
              <th className="text-center px-5 py-3 font-medium text-gray-500">Lessons</th>
              <th className="text-center px-5 py-3 font-medium text-gray-500">Stripe</th>
              <th className="text-center px-5 py-3 font-medium text-gray-500">Booking</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(tutors ?? []).length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">No tutors yet</td></tr>
            )}
            {(tutors ?? []).map((t: {
              id: string; name: string; email: string; slug: string; created_at: string;
              stripe_onboarding_complete: boolean; booking_url_active: boolean;
              students: { count: number }[]; lessons: { count: number }[];
            }) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.email}</p>
                </td>
                <td className="px-5 py-3 text-gray-500 font-mono text-xs">{t.slug}</td>
                <td className="px-5 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-gray-700">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {t.students?.[0]?.count ?? 0}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-gray-700">
                    <BookOpen className="h-3.5 w-3.5" />
                    {t.lessons?.[0]?.count ?? 0}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    t.stripe_onboarding_complete ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {t.stripe_onboarding_complete ? 'Connected' : 'Pending'}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    t.booking_url_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {t.booking_url_active ? 'Active' : 'Off'}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
