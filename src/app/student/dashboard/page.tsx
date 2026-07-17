import crypto from 'crypto'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { cleanUrl } from '@/lib/url'
import { Calendar, BookOpen, Video, Clock, ChevronRight, Star } from 'lucide-react'

function verifyToken(token: string): { email: string; valid: boolean } {
  try {
    const secret = process.env.CRON_SECRET ?? 'tutafy-student-auth-secret'
    const decoded = Buffer.from(token, 'base64url').toString()
    const parts = decoded.split(':')
    const sig = parts[parts.length - 1]
    const ts = parts[parts.length - 2]
    const email = parts.slice(0, parts.length - 2).join(':')
    const expected = crypto.createHmac('sha256', secret).update(`${email}:${ts}`).digest('hex')
    const age = Date.now() - parseInt(ts)
    const valid = sig === expected && age < 7 * 24 * 60 * 60 * 1000
    return { email, valid }
  } catch {
    return { email: '', valid: false }
  }
}

export default async function StudentDashboardPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="text-center py-20">
        <p className="text-[15px] font-semibold text-gray-400">No access link provided.</p>
        <Link href="/student/login" className="mt-4 inline-block text-[13px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors">
          Get your lessons link →
        </Link>
      </div>
    )
  }

  const { email, valid } = verifyToken(token)

  if (!valid) {
    return (
      <div className="text-center py-20">
        <p className="text-[18px] font-bold text-gray-800">Link expired</p>
        <p className="text-[13px] text-gray-400 mt-2">This link is no longer valid. Request a new one below.</p>
        <Link href="/student/login"
          className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-5 py-2.5 rounded-xl">
          Get a new link →
        </Link>
      </div>
    )
  }

  const supabase = createAdminClient()

  const { data: students } = await supabase
    .from('students')
    .select('id, name, tutor_id, portal_token')
    .ilike('email', email)
    .eq('status', 'active')

  if (!students?.length) {
    return (
      <div className="text-center py-20">
        <p className="text-[15px] font-semibold text-gray-400">No active lessons found for this email.</p>
        <p className="text-[12px] text-gray-300 mt-2">Your tutor needs to add you as a student first.</p>
      </div>
    )
  }

  const studentIds = students.map(s => s.id)
  const tutorIds = [...new Set(students.map(s => s.tutor_id))]
  const now = new Date().toISOString()

  const [{ data: tutors }, { data: upcoming }, { data: recent }] = await Promise.all([
    supabase.from('tutors').select('id, name, avatar_url, slug').in('id', tutorIds),
    supabase.from('lessons')
      .select('id, starts_at, duration_minutes, meet_link, zoom_link, status, student_id, tutor_id')
      .in('student_id', studentIds)
      .eq('status', 'scheduled')
      .gte('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(10),
    supabase.from('lessons')
      .select('id, starts_at, duration_minutes, homework, status, student_id, tutor_id')
      .in('student_id', studentIds)
      .lt('starts_at', now)
      .order('starts_at', { ascending: false })
      .limit(8),
  ])

  const tutorMap = Object.fromEntries((tutors ?? []).map(t => [t.id, t]))
  const studentMap = Object.fromEntries(students.map(s => [s.id, s]))
  const firstName = students[0].name.split(' ')[0]

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <span className="text-[16px] font-bold text-indigo-600">
            {firstName[0]?.toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-[17px] font-bold text-gray-900">Hi, {firstName}!</p>
          <p className="text-[12px] text-gray-400 mt-0.5">{email}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[11px] text-gray-400">Studying with</p>
          <p className="text-[13px] font-semibold text-gray-700">
            {(tutors ?? []).map(t => t.name).join(', ')}
          </p>
        </div>
      </div>

      {/* Upcoming Lessons */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
          <Calendar className="h-4 w-4 text-gray-400" />
          <h2 className="text-[13px] font-semibold text-gray-900">Upcoming Lessons</h2>
          {(upcoming ?? []).length > 0 && (
            <span className="ml-auto text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
              {upcoming!.length} scheduled
            </span>
          )}
        </div>
        {(upcoming ?? []).length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[13px] text-gray-400">No upcoming lessons</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {(upcoming ?? []).map(lesson => {
              const date = new Date(lesson.starts_at)
              const isToday = date.toDateString() === new Date().toDateString()
              // The tutor-chosen external platform (Zoom/Meet) wins over the built-in room.
              const meetLink = cleanUrl(lesson.zoom_link || lesson.meet_link)
              const tutor = tutorMap[lesson.tutor_id]
              return (
                <div key={lesson.id} className="flex items-center gap-4 px-5 py-4">
                  <div className={`text-center min-w-[44px] py-1.5 px-2 rounded-lg flex-shrink-0 ${isToday ? 'bg-indigo-500 text-white' : 'bg-gray-50 text-gray-700'}`}>
                    <p className="text-[9px] font-bold uppercase opacity-70">{date.toLocaleDateString('en-US', { month: 'short' })}</p>
                    <p className="text-[16px] font-bold leading-none mt-0.5">{date.getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900">
                      {date.toLocaleDateString('en-US', { weekday: 'long' })}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock className="h-3 w-3" />
                        {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <span className="text-[11px] text-gray-400">{lesson.duration_minutes} min</span>
                      {tutor && <span className="text-[11px] text-indigo-500">with {tutor.name}</span>}
                    </div>
                  </div>
                  {meetLink && (
                    <a href={meetLink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
                      <Video className="h-3.5 w-3.5" /> Join
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Homework */}
      {(recent ?? []).some(l => l.homework) && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
            <BookOpen className="h-4 w-4 text-gray-400" />
            <h2 className="text-[13px] font-semibold text-gray-900">Recent Homework</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(recent ?? []).filter(l => l.homework).map(lesson => {
              const student = studentMap[lesson.student_id]
              const portalToken = student?.portal_token
              return (
                <div key={lesson.id} className="px-5 py-4">
                  <p className="text-[11px] text-gray-400 mb-1">
                    {new Date(lesson.starts_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {tutorMap[lesson.tutor_id] && <> · <span className="text-indigo-400">{tutorMap[lesson.tutor_id].name}</span></>}
                  </p>
                  <p className="text-[13px] text-gray-700 leading-relaxed">{lesson.homework}</p>
                  {portalToken && (
                    <Link href={`/portal/${portalToken}/lessons/${lesson.id}`}
                      className="inline-flex items-center gap-1 mt-2 text-[11px] text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
                      View lesson details <ChevronRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* My tutors */}
      {tutors && tutors.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
            <Star className="h-4 w-4 text-gray-400" />
            <h2 className="text-[13px] font-semibold text-gray-900">My Tutors</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {tutors.map(tutor => {
              const student = students.find(s => s.tutor_id === tutor.id)
              const initials = tutor.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
              return (
                <div key={tutor.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    {tutor.avatar_url ? (
                      <img src={tutor.avatar_url} alt={tutor.name} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <span className="text-[12px] font-bold text-indigo-600">{initials}</span>
                    )}
                  </div>
                  <p className="flex-1 text-[13px] font-medium text-gray-800">{tutor.name}</p>
                  {student?.portal_token && (
                    <Link href={`/portal/${student.portal_token}`}
                      className="text-[12px] font-medium text-indigo-500 hover:text-indigo-700 transition-colors">
                      Full portal →
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
