import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Mail, Phone, Globe, BookOpen, DollarSign, Plus, MessageCircle, ExternalLink } from 'lucide-react'

const LEVEL_COLOR: Record<string, string> = {
  A1: 'bg-slate-100 text-slate-500', A2: 'bg-blue-50 text-blue-600',
  B1: 'bg-cyan-50 text-cyan-700', B2: 'bg-green-50 text-green-700',
  C1: 'bg-orange-50 text-orange-700', C2: 'bg-red-50 text-red-700',
  Native: 'bg-purple-50 text-purple-700',
}

const STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-500',
  completed: 'bg-emerald-50 text-emerald-500',
  cancelled: 'bg-red-50 text-red-400',
  no_show: 'bg-gray-50 text-gray-400',
}

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: student } = await supabase
    .from('students').select('*').eq('id', id).eq('tutor_id', user.id).single()
  if (!student) notFound()

  const { data: lessons } = await supabase
    .from('lessons').select('*').eq('student_id', id).order('starts_at', { ascending: false }).limit(10)

  const initials = student.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const totalLessons = lessons?.length ?? 0
  const completedLessons = lessons?.filter(l => l.status === 'completed').length ?? 0
  const totalRevenue = lessons?.filter(l => l.payment_status === 'paid').reduce((s, l) => s + (l.price ?? 0), 0) ?? 0

  return (
    <div className="max-w-[900px] space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/students" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">Student Profile</h1>
        <div className="ml-auto flex gap-2">
          <Link href={`/messages/${id}`}
            className="flex items-center gap-1.5 text-[12px] font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors px-3 py-1.5 rounded-lg">
            <MessageCircle className="h-3 w-3" /> Message
          </Link>
          {student.portal_token && (
            <a
              href={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutafy.vercel.app'}/portal/${student.portal_token}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[12px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors px-3 py-1.5 rounded-lg">
              <ExternalLink className="h-3 w-3" /> Portal Link
            </a>
          )}
          <Link href={`/students/${id}/edit`}
            className="text-[12px] font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors px-3 py-1.5 rounded-lg">
            Edit
          </Link>
          <Link href={`/lessons/new?student=${id}`}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-3 py-1.5 rounded-lg">
            <Plus className="h-3 w-3" /> Schedule Lesson
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Left: Profile */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                <span className="text-[20px] font-bold text-indigo-600">{initials}</span>
              </div>
              <h2 className="text-[15px] font-bold text-gray-900">{student.name}</h2>
              <div className="flex gap-2 mt-2 flex-wrap justify-center">
                <span className={`text-[11px] px-2 py-0.5 rounded font-semibold ${LEVEL_COLOR[student.level] ?? 'bg-gray-100 text-gray-500'}`}>
                  {student.level}
                </span>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                  student.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                  student.status === 'paused' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-400'
                }`}>{student.status}</span>
              </div>
            </div>

            <div className="space-y-2.5 border-t border-gray-50 pt-4">
              {student.email && (
                <div className="flex items-center gap-2.5 text-[12px] text-gray-600">
                  <Mail className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                  <span className="truncate">{student.email}</span>
                </div>
              )}
              {student.phone && (
                <div className="flex items-center gap-2.5 text-[12px] text-gray-600">
                  <Phone className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                  {student.phone}
                </div>
              )}
              {student.country && (
                <div className="flex items-center gap-2.5 text-[12px] text-gray-600">
                  <Globe className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                  {student.country}{student.native_language ? ` · ${student.native_language}` : ''}
                </div>
              )}
            </div>

            {student.goals && (
              <div className="mt-4 pt-4 border-t border-gray-50">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Goals</p>
                <p className="text-[12px] text-gray-600 leading-relaxed">{student.goals}</p>
              </div>
            )}

            {student.tags?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1">
                {student.tags.map((tag: string) => (
                  <span key={tag} className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Lessons', value: totalLessons, icon: BookOpen, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-400' },
              { label: 'Done', value: completedLessons, icon: BookOpen, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-400' },
              { label: 'Revenue', value: `$${totalRevenue}`, icon: DollarSign, iconBg: 'bg-amber-50', iconColor: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                <p className="text-[16px] font-bold text-gray-900">{s.value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Lessons + Notes */}
        <div className="col-span-2 space-y-4">
          {student.notes && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Private Notes</p>
              <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{student.notes}</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-gray-900">Lesson History</p>
              <Link href={`/lessons/new?student=${id}`} className="text-[12px] text-indigo-500 hover:underline font-medium">
                + Add Lesson
              </Link>
            </div>
            {!lessons || lessons.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <p className="text-[13px] text-gray-400">No lessons yet</p>
                <Link href={`/lessons/new?student=${id}`} className="mt-2 text-[12px] text-indigo-500 hover:underline font-medium">
                  Schedule the first one
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {lessons.map(l => (
                  <Link key={l.id} href={`/lessons/${l.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                    <div className="text-center w-10 flex-shrink-0">
                      <p className="text-[9px] text-gray-400 uppercase">{new Date(l.starts_at).toLocaleDateString('en', { month: 'short' })}</p>
                      <p className="text-[16px] font-bold text-gray-800 leading-none">{new Date(l.starts_at).getDate()}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-gray-900">
                        {new Date(l.starts_at).toLocaleDateString('en', { weekday: 'short' })} · {new Date(l.starts_at).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                      <p className="text-[11px] text-gray-400">{l.duration_minutes} min{l.price ? ` · $${l.price}` : ''}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_STYLE[l.status] ?? 'bg-gray-50 text-gray-400'}`}>
                      {l.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
