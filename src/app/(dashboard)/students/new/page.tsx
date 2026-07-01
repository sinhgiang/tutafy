import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StudentForm } from './StudentForm'
import { Zap } from 'lucide-react'
import Link from 'next/link'

const FREE_LIMIT = 10

export default async function NewStudentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: tutor }, { count }] = await Promise.all([
    supabase.from('tutors').select('subscription_status').eq('id', user.id).single(),
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('tutor_id', user.id),
  ])

  const plan = tutor?.subscription_status ?? 'free'
  const studentCount = count ?? 0
  const isLimited = plan === 'free' && studentCount >= FREE_LIMIT

  if (isLimited) {
    return (
      <div className="max-w-[520px] mx-auto py-16">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-indigo-500 px-8 py-10 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-white" fill="white" />
            </div>
            <h2 className="text-[22px] font-bold text-white">Đã đạt giới hạn Free</h2>
            <p className="text-[13px] text-indigo-200 mt-2">
              Gói Free cho phép tối đa {FREE_LIMIT} học sinh.<br />
              Bạn hiện có <strong className="text-white">{studentCount} học sinh</strong>.
            </p>
          </div>
          <div className="p-8 space-y-4">
            <div className="space-y-2.5">
              {[
                'Học sinh không giới hạn',
                'AI lesson planning & content',
                'Payment links (PayPal, Paddle, Stripe)',
                'Analytics đầy đủ',
              ].map(f => (
                <div key={f} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-500 text-[10px]">✓</span>
                  </div>
                  <span className="text-[13px] text-gray-700">{f}</span>
                </div>
              ))}
            </div>
            <Link href="/upgrade"
              className="flex items-center justify-center gap-2 w-full mt-6 py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white text-[14px] font-bold rounded-xl transition-colors">
              <Zap className="h-4 w-4" fill="white" />
              Nâng cấp Pro — $12/tháng
            </Link>
            <Link href="/students"
              className="block text-center text-[13px] text-gray-400 hover:text-gray-600 transition-colors">
              ← Quay lại danh sách học sinh
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <StudentForm />
}
