import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calendar, BookOpen, MessageCircle, ChevronRight, Video, Clock, Star, Award } from 'lucide-react'
import { ReviewForm } from './ReviewForm'
import { RescheduleCancel } from './RescheduleCancel'

const LEVEL_COLOR: Record<string, string> = {
  A1: 'bg-slate-100 text-slate-500', A2: 'bg-blue-50 text-blue-600',
  B1: 'bg-cyan-50 text-cyan-700', B2: 'bg-green-50 text-green-700',
  C1: 'bg-orange-50 text-orange-700', C2: 'bg-red-50 text-red-700',
  Native: 'bg-purple-50 text-purple-700',
}

export default async function StudentPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: student } = await supabase
    .from('students')
    .select('id, name, email, level, goals, tags, status, tutor_id')
    .eq('portal_token', token)
    .single()

  if (!student || student.status === 'inactive') notFound()

  const now = new Date().toISOString()

  const [
    { data: tutorRow },
    { data: upcomingLessons },
    { data: recentLessons },
    { count: unreadCount },
  ] = await Promise.all([
    supabase.from('tutors').select('name, avatar_url, cancellation_hours').eq('id', student.tutor_id).single(),
    supabase.from('lessons')
      .select('id, starts_at, duration_minutes, zoom_link, meet_link, status')
      .eq('student_id', student.id)
      .eq('status', 'scheduled')
      .gte('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(3),
    supabase.from('lessons')
      .select('id, starts_at, duration_minutes, homework, vocabulary, status, payment_status')
      .eq('student_id', student.id)
      .lt('starts_at', now)
      .order('starts_at', { ascending: false })
      .limit(6),
    supabase.from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .eq('sender_type', 'tutor')
      .is('read_at', null),
  ])

  const tutor = tutorRow
  const initials = student.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const pendingHomework = (recentLessons ?? []).filter(l => l.homework && l.status === 'completed').length
  const cancellationHours = (tutor as any)?.cancellation_hours ?? 24

  return (
    <div className="space-y-5">
      {/* Welcome card */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <span className="text-[16px] font-bold text-indigo-600">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-bold text-gray-900">Hi, {student.name.split(' ')[0]}!</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${LEVEL_COLOR[student.level] ?? 'bg-gray-100 text-gray-500'}`}>
              {student.level}
            </span>
            <span className="text-[12px] text-gray-400">
              with <span className="font-medium text-gray-600">{tutor?.name}</span>
            </span>
          </div>
        </div>
        <Link href={`/portal/${token}/messages`}
          className="relative flex items-center gap-1.5 text-[13px] font-semibold text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors">
          <MessageCircle className="h-4 w-4" />
          Message
          {(unreadCount ?? 0) > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
              {(unreadCount ?? 0) > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </div>

      {/* Upcoming Lessons */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
          <Calendar className="h-4 w-4 text-gray-400" />
          <h2 className="text-[13px] font-semibold text-gray-900">Upcoming Lessons</h2>
        </div>
        {(upcomingLessons ?? []).length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[13px] text-gray-400">No upcoming lessons scheduled</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {(upcomingLessons ?? []).map(lesson => {
              const date = new Date(lesson.starts_at)
              const isToday = date.toDateString() === new Date().toDateString()
              const meetLink = lesson.zoom_link || lesson.meet_link
              return (
                <div key={lesson.id} className="flex items-center gap-4 px-5 py-4">
                  <div className={`text-center min-w-[44px] py-1.5 px-2 rounded-lg flex-shrink-0 ${isToday ? 'bg-indigo-500 text-white' : 'bg-gray-50 text-gray-700'}`}>
                    <p className="text-[9px] font-bold uppercase opacity-70">
                      {date.toLocaleDateString('en-US', { month: 'short' })}
                    </p>
                    <p className="text-[16px] font-bold leading-none mt-0.5">{date.getDate()}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-gray-900">
                      {date.toLocaleDateString('en-US', { weekday: 'long' })}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock className="h-3 w-3" />
                        {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <span className="text-[11px] text-gray-400">{lesson.duration_minutes} min</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {meetLink && (
                      <a href={meetLink} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors">
                        <Video className="h-3.5 w-3.5" />
                        Join
                      </a>
                    )}
                    <RescheduleCancel
                      lessonId={lesson.id}
                      token={token}
                      startsAt={lesson.starts_at}
                      cancellationHours={cancellationHours}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent Homework */}
      {(recentLessons ?? []).some(l => l.homework) && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
            <BookOpen className="h-4 w-4 text-gray-400" />
            <h2 className="text-[13px] font-semibold text-gray-900">Recent Homework</h2>
            {pendingHomework > 0 && (
              <span className="ml-auto text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                {pendingHomework} to review
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {(recentLessons ?? []).filter(l => l.homework).map(lesson => (
              <Link key={lesson.id} href={`/portal/${token}/lessons/${lesson.id}`}
                className="flex items-start gap-3 px-5 py-4 hover:bg-gray-50/60 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <BookOpen className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-gray-400 mb-0.5">
                    {new Date(lesson.starts_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-[13px] text-gray-700 leading-relaxed line-clamp-2">{lesson.homework}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0 mt-1" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Goals */}
      {student.goals && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">My Learning Goals</p>
          <p className="text-[13px] text-gray-700 leading-relaxed">{student.goals}</p>
          {student.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {student.tags.map((tag: string) => (
                <span key={tag} className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Certificates for completed lessons */}
      {(recentLessons ?? []).some(l => l.status === 'completed') && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
            <Award className="h-4 w-4 text-gray-400" />
            <h2 className="text-[13px] font-semibold text-gray-900">Certificates</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(recentLessons ?? []).filter(l => l.status === 'completed').slice(0, 3).map(lesson => (
              <Link
                key={lesson.id}
                href={`/portal/${token}/certificate/${lesson.id}`}
                target="_blank"
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Award className="h-3.5 w-3.5 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-gray-400 mb-0.5">
                    {new Date(lesson.starts_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    <span className="ml-2 text-gray-300">·</span>
                    <span className="ml-2 text-gray-400">{lesson.duration_minutes} min</span>
                  </p>
                  <p className="text-[13px] font-medium text-indigo-600">Download certificate →</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Rate recent lessons */}
      {(recentLessons ?? []).some(l => l.status === 'completed') && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
            <Star className="h-4 w-4 text-gray-400" />
            <h2 className="text-[13px] font-semibold text-gray-900">Rate your lessons</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(recentLessons ?? []).filter(l => l.status === 'completed').slice(0, 3).map(lesson => (
              <div key={lesson.id} className="px-5 py-4">
                <p className="text-[12px] font-semibold text-gray-700">
                  {new Date(lesson.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  <span className="text-gray-400 font-normal ml-2">{lesson.duration_minutes} min</span>
                </p>
                <ReviewForm lessonId={lesson.id} portalToken={token} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
