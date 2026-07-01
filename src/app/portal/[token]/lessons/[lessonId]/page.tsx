import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, BookOpen, FileText, Video, Award } from 'lucide-react'
import { HomeworkChecker } from './HomeworkChecker'
import { HomeworkSubmit } from '../../HomeworkSubmit'

export default async function PortalLessonPage({
  params,
}: {
  params: Promise<{ token: string; lessonId: string }>
}) {
  const { token, lessonId } = await params
  const supabase = createAdminClient()

  const { data: student } = await supabase
    .from('students')
    .select('id, name, status')
    .eq('portal_token', token)
    .single()

  if (!student || student.status === 'inactive') notFound()

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, starts_at, duration_minutes, notes, homework, vocabulary, recording_url, status')
    .eq('id', lessonId)
    .eq('student_id', student.id)
    .single()

  if (!lesson) notFound()

  const vocab = (lesson.vocabulary as { word: string; definition: string }[] | null) ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/portal/${token}`}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-[16px] font-bold text-gray-900">
            {new Date(lesson.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h1>
          <p className="text-[12px] text-gray-400">
            {new Date(lesson.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · {lesson.duration_minutes} min
          </p>
        </div>
      </div>

      {lesson.recording_url && (
        <a href={lesson.recording_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-4 hover:bg-gray-50 transition-colors">
          <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Video className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-gray-900">Recording</p>
            <p className="text-[11px] text-gray-400">Watch the lesson recording</p>
          </div>
        </a>
      )}

      {lesson.homework && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-amber-400" />
            <p className="text-[13px] font-semibold text-gray-900">Homework</p>
          </div>
          <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{lesson.homework}</p>
          <HomeworkChecker token={token} lessonId={lesson.id} homework={lesson.homework} />
          <HomeworkSubmit token={token} lessonId={lesson.id} homework={lesson.homework} />
        </div>
      )}

      {lesson.notes && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-indigo-400" />
            <p className="text-[13px] font-semibold text-gray-900">Lesson Notes</p>
          </div>
          <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{lesson.notes}</p>
        </div>
      )}

      {vocab.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Vocabulary</p>
          <div className="space-y-2">
            {vocab.map((v, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-[13px] font-semibold text-gray-900 min-w-[140px]">{v.word}</span>
                <span className="text-[13px] text-gray-500">{v.definition}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {lesson.status === 'completed' && (
        <Link
          href={`/portal/${token}/certificate/${lessonId}`}
          target="_blank"
          className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-4 hover:bg-indigo-100 transition-colors"
        >
          <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Award className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-indigo-800">Get your certificate</p>
            <p className="text-[11px] text-indigo-500">Print or save as PDF to keep a record of this lesson</p>
          </div>
          <span className="text-[12px] text-indigo-400">→</span>
        </Link>
      )}

    </div>
  )
}
