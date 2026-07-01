import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react'

export default async function ParentPortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createAdminClient()

  // Look up student by parent_token
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, name, email, status, language_level, learning_goals, tutor_id')
    .eq('parent_token', token as any)
    .maybeSingle()

  if (studentError?.message?.includes('column') || (!student && !studentError)) {
    notFound()
  }

  if (!student) notFound()

  const { data: tutor } = await supabase
    .from('tutors')
    .select('name')
    .eq('id', student.tutor_id)
    .single()

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, starts_at, duration_minutes, status, payment_status, price, notes, homework')
    .eq('student_id', student.id)
    .order('starts_at', { ascending: false })
    .limit(30)

  const now = new Date()
  const completedLessons = (lessons ?? []).filter(l => l.status === 'completed')
  const upcomingLessons = (lessons ?? []).filter(l => l.status === 'scheduled' && new Date(l.starts_at) > now)
  const totalHours = completedLessons.reduce((a, l) => a + l.duration_minutes, 0) / 60
  const totalPaid = completedLessons.filter(l => l.payment_status === 'paid').reduce((a, l) => a + Number(l.price ?? 0), 0)
  const pendingPayments = completedLessons.filter(l => l.payment_status === 'pending' && Number(l.price ?? 0) > 0)

  const LEVEL_COLORS: Record<string, string> = {
    A1: 'bg-gray-100 text-gray-600', A2: 'bg-gray-100 text-gray-600',
    B1: 'bg-blue-100 text-blue-700', B2: 'bg-blue-100 text-blue-700',
    C1: 'bg-indigo-100 text-indigo-700', C2: 'bg-purple-100 text-purple-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">T</span>
            </div>
            <span className="text-[14px] font-semibold text-gray-900">Parent Portal</span>
          </div>
          <span className="text-[12px] text-gray-400">Read-only view</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Student header */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-[18px] font-bold text-gray-900">{student.name}</h1>
              <p className="text-[12px] text-gray-400 mt-0.5">Student · Tutor: {tutor?.name ?? 'Unknown'}</p>
            </div>
            {student.language_level && (
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${LEVEL_COLORS[student.language_level] ?? 'bg-gray-100 text-gray-600'}`}>
                {student.language_level}
              </span>
            )}
          </div>
          {student.learning_goals && (
            <p className="text-[12px] text-gray-500 italic">&ldquo;{student.learning_goals}&rdquo;</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-[20px] font-bold text-gray-900">{completedLessons.length}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Lessons done</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-[20px] font-bold text-gray-900">{totalHours.toFixed(1)}h</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Total hours</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-[20px] font-bold text-gray-900">{upcomingLessons.length}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Upcoming</p>
          </div>
        </div>

        {/* Pending payments alert */}
        {pendingPayments.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-amber-800">Pending Payment</p>
              <p className="text-[12px] text-amber-600 mt-0.5">
                {pendingPayments.length} lesson{pendingPayments.length > 1 ? 's' : ''} awaiting payment ·
                Total: ${pendingPayments.reduce((a, l) => a + Number(l.price ?? 0), 0).toFixed(0)}
              </p>
            </div>
          </div>
        )}

        {/* Upcoming lessons */}
        {upcomingLessons.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-1">Upcoming Lessons</p>
            {upcomingLessons.slice(0, 3).map(l => {
              const d = new Date(l.starts_at)
              return (
                <div key={l.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-gray-900">
                      {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · {l.duration_minutes} min
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Recent lessons */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-1">Recent Lessons</p>
          {completedLessons.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
              <p className="text-[13px] text-gray-400">No completed lessons yet</p>
            </div>
          )}
          {completedLessons.slice(0, 10).map(l => {
            const d = new Date(l.starts_at)
            return (
              <div key={l.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    <p className="text-[13px] font-semibold text-gray-900">
                      {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.price && Number(l.price) > 0 && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        l.payment_status === 'paid'
                          ? 'bg-green-50 text-green-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}>
                        {l.payment_status === 'paid' ? 'Paid' : `$${Number(l.price).toFixed(0)} pending`}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400">{l.duration_minutes}m</span>
                  </div>
                </div>
                {l.homework && (
                  <div className="bg-blue-50 rounded-lg px-3 py-2 mt-2">
                    <p className="text-[11px] font-semibold text-blue-600 mb-0.5">Homework</p>
                    <p className="text-[12px] text-blue-800 line-clamp-2">{l.homework}</p>
                  </div>
                )}
                {l.notes && (
                  <p className="text-[12px] text-gray-500 mt-2 line-clamp-2">{l.notes}</p>
                )}
              </div>
            )
          })}
        </div>

        {/* Progress summary */}
        {completedLessons.length >= 5 && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              <p className="text-[13px] font-bold text-indigo-800">Progress Summary</p>
            </div>
            <div className="space-y-2 text-[13px] text-indigo-700">
              <p>✓ <strong>{completedLessons.length}</strong> lessons completed with {tutor?.name}</p>
              <p>✓ <strong>{totalHours.toFixed(1)} hours</strong> of total study time</p>
              {student.language_level && <p>✓ Current level: <strong>{student.language_level}</strong></p>}
            </div>
          </div>
        )}

        <p className="text-[11px] text-gray-300 text-center py-2">
          Powered by Tutafy · Private parent view
        </p>
      </div>
    </div>
  )
}
