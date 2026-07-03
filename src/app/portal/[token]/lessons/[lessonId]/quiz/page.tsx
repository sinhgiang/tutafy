import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { VocabQuiz } from './VocabQuiz'

export default async function QuizPage({ params }: { params: Promise<{ token: string; lessonId: string }> }) {
  const { token, lessonId } = await params
  const supabase = createAdminClient()

  const { data: student } = await supabase.from('students').select('id').eq('portal_token', token).single()
  if (!student) notFound()

  const { data: lesson } = await supabase.from('lessons')
    .select('id, starts_at, vocabulary')
    .eq('id', lessonId).eq('student_id', student.id).single()
  if (!lesson) notFound()

  const vocab = Array.isArray(lesson.vocabulary) ? lesson.vocabulary : []
  if (vocab.length === 0) notFound()

  const start = new Date(lesson.starts_at)
  const lessonLabel = start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  return <VocabQuiz vocab={vocab} lessonLabel={lessonLabel} backUrl={`/portal/${token}/lessons/${lessonId}`} />
}
