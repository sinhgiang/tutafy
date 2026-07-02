import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { VideoRoom } from '@/components/VideoRoom'

export default async function StudentVideoRoomPage({
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
    .select('id, starts_at, duration_minutes, tutors(name)')
    .eq('id', lessonId)
    .eq('student_id', student.id)
    .single()

  if (!lesson) notFound()

  const start = new Date(lesson.starts_at)
  const tutorName = (lesson.tutors as any)?.name ?? 'your tutor'
  const lessonLabel = `${tutorName} · ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`

  return (
    <VideoRoom
      lessonId={lessonId}
      displayName={student.name}
      backUrl={`/portal/${token}/lessons/${lessonId}`}
      lessonLabel={lessonLabel}
    />
  )
}
