import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Video, DollarSign, FileText, User, BookOpen, Mic, ExternalLink, Pencil, MonitorPlay } from 'lucide-react'
import { LessonActions } from './LessonActions'
import { GroupStudentsPanel } from './GroupStudentsPanel'
import { HomeworkSubmissionsPanel } from './HomeworkSubmissionsPanel'
import { MaterialsPanel } from './MaterialsPanel'

const STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-600 border-blue-100',
  completed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  cancelled: 'bg-red-50 text-red-500 border-red-100',
  no_show: 'bg-gray-50 text-gray-400 border-gray-100',
}
const PAY_STYLE: Record<string, string> = {
  paid: 'text-emerald-500',
  pending: 'text-amber-500',
  refunded: 'text-red-400',
  free: 'text-gray-400',
}

export default async function LessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: lesson } = await supabase
    .from('lessons')
    .select('*, students(id, name, level, email)')
    .eq('id', id)
    .eq('tutor_id', user!.id)
    .single()

  if (!lesson) notFound()

  const now = new Date()
  const lessonStart = new Date(lesson.starts_at)
  const lessonEnd = new Date(lesson.ends_at)
  const isOngoing = now >= new Date(lessonStart.getTime() - 15 * 60 * 1000) && now <= lessonEnd
  const showVideoCall = lesson.status === 'scheduled'

  // Fetch homework submissions for this lesson
  let homeworkSubmissions: any[] = []
  try {
    const { data: subs } = await supabase
      .from('homework_submissions')
      .select('id, content, submitted_at, tutor_feedback, feedback_at, students(name)')
      .eq('lesson_id', id)
      .order('submitted_at', { ascending: true })
    homeworkSubmissions = subs ?? []
  } catch { /* table may not exist */ }

  const start = new Date(lesson.starts_at)
  const end = new Date(lesson.ends_at)
  const vocab: { word: string; def: string }[] = Array.isArray(lesson.vocabulary) ? lesson.vocabulary : []
  const isGroup = !!(lesson as any).is_group

  // Fetch all students for group panel (needed for adding new students)
  let allStudents: { id: string; name: string; email?: string }[] = []
  if (isGroup) {
    const { data: students } = await supabase
      .from('students')
      .select('id, name, email')
      .eq('tutor_id', user!.id)
      .eq('status', 'active')
      .order('name')
    allStudents = students ?? []
  }

  return (
    <div className="max-w-[700px] space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/lessons" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">Lesson Detail</h1>
          <p className="text-[12px] text-gray-400">
            {start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[12px] px-3 py-1 rounded-full font-medium border ${STATUS_STYLE[lesson.status] ?? 'bg-gray-50 text-gray-500 border-gray-100'}`}>
            {lesson.status}
          </span>
          <Link href={`/lessons/${id}/edit`}
            className="flex items-center gap-1.5 text-[12px] font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors px-3 py-1.5 rounded-lg">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Link>
        </div>
      </div>

      {/* Join Video Call Banner */}
      {showVideoCall && (
        <Link
          href={`/lessons/${id}/room`}
          className={`flex items-center gap-3 rounded-xl p-4 transition-colors ${
            isOngoing
              ? 'bg-indigo-500 hover:bg-indigo-600'
              : 'bg-indigo-50 hover:bg-indigo-100 border border-indigo-100'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isOngoing ? 'bg-white/20' : 'bg-indigo-100'
          }`}>
            <MonitorPlay className={`h-5 w-5 ${isOngoing ? 'text-white' : 'text-indigo-500'}`} />
          </div>
          <div className="flex-1">
            <p className={`text-[14px] font-bold ${isOngoing ? 'text-white' : 'text-indigo-800'}`}>
              {isOngoing ? 'Lesson is live — Join now' : 'Join Video Room'}
            </p>
            <p className={`text-[12px] ${isOngoing ? 'text-indigo-100' : 'text-indigo-500'}`}>
              {isOngoing ? 'Your student can see this room is live' : 'Opens built-in video call with your student'}
            </p>
          </div>
          <span className={`text-[14px] font-bold ${isOngoing ? 'text-white' : 'text-indigo-400'}`}>→</span>
        </Link>
      )}

      {/* Student / Group */}
      {isGroup ? (
        <GroupStudentsPanel lessonId={id} allStudents={allStudents} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Student</p>
          <Link href={`/students/${lesson.students?.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <User className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-gray-900">{lesson.students?.name}</p>
              <p className="text-[12px] text-gray-400">{lesson.students?.email ?? 'No email'} · Level {lesson.students?.level}</p>
            </div>
          </Link>
        </div>
      )}

      {/* Time & Price */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Lesson Info</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Time</p>
              <p className="text-[13px] font-semibold text-gray-900">
                {start.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })} – {end.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
              </p>
              <p className="text-[11px] text-gray-400">{lesson.duration_minutes} minutes</p>
            </div>
          </div>
          {lesson.price != null && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Price</p>
                <p className="text-[13px] font-semibold text-gray-900">${Number(lesson.price).toFixed(2)}</p>
                <p className={`text-[11px] font-medium ${PAY_STYLE[lesson.payment_status ?? 'pending']}`}>
                  {lesson.payment_status ?? 'pending'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Meeting & Recording */}
      {(lesson.zoom_link || lesson.meet_link || lesson.recording_url) && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Links</p>
          {lesson.zoom_link && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Video className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-400">Zoom</p>
                <a href={lesson.zoom_link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[12px] text-indigo-500 hover:underline truncate">
                  {lesson.zoom_link} <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>
            </div>
          )}
          {lesson.meet_link && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Video className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-400">Google Meet</p>
                <a href={lesson.meet_link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[12px] text-indigo-500 hover:underline truncate">
                  {lesson.meet_link} <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>
            </div>
          )}
          {lesson.recording_url && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mic className="h-4 w-4 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-400">Recording</p>
                <a href={lesson.recording_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[12px] text-indigo-500 hover:underline truncate">
                  {lesson.recording_url} <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {lesson.notes && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-gray-400" />
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Lesson Notes</p>
          </div>
          <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{lesson.notes}</p>
        </div>
      )}

      {/* Homework */}
      {lesson.homework && (
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-amber-500" />
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest">Homework</p>
          </div>
          <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{lesson.homework}</p>
        </div>
      )}

      {/* Materials */}
      <MaterialsPanel lessonId={id} initialMaterials={Array.isArray(lesson.materials) ? lesson.materials : []} />

      {/* Student homework submissions */}
      {homeworkSubmissions.length > 0 && (
        <HomeworkSubmissionsPanel lessonId={id} submissions={homeworkSubmissions} />
      )}

      {/* Vocabulary */}
      {vocab.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Vocabulary ({vocab.length} words)</p>
          </div>
          <div className="divide-y divide-gray-50">
            {vocab.map((v, i) => (
              <div key={i} className="flex items-start px-5 py-3">
                <span className="text-[13px] font-semibold text-indigo-700 w-40 flex-shrink-0">{v.word}</span>
                <span className="text-[13px] text-gray-600">{v.def}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Summary + Invoice + No-show */}
      <LessonActions
        lessonId={id}
        hasPrice={!!lesson.price}
        studentEmail={(lesson.students as any)?.email ?? null}
        isCompleted={lesson.status === 'completed'}
        isScheduled={lesson.status === 'scheduled'}
        lessonStatus={lesson.status}
      />
    </div>
  )
}
