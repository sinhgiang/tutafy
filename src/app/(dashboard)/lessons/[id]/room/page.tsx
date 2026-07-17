import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { VideoRoom } from '@/components/VideoRoom'
import { mintJaasToken, getJaasAppId } from '@/lib/jaas'

export default async function TutorVideoRoomPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: lesson }, { data: tutor }] = await Promise.all([
    supabase
      .from('lessons')
      .select('id, starts_at, duration_minutes, students(name)')
      .eq('id', id)
      .eq('tutor_id', user.id)
      .single(),
    supabase.from('tutors').select('name').eq('id', user.id).single(),
  ])

  if (!lesson) notFound()

  const start = new Date(lesson.starts_at)
  const studentName = (lesson.students as any)?.name ?? 'Group lesson'
  const lessonLabel = `${studentName} · ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`

  // The tutor is always a moderator of their own lesson room.
  const jwt = mintJaasToken({ userName: tutor?.name ?? 'Tutor', userId: user.id, moderator: true }) ?? undefined
  const appId = getJaasAppId() ?? undefined

  return (
    <VideoRoom
      lessonId={id}
      displayName={tutor?.name ?? 'Tutor'}
      backUrl={`/lessons/${id}`}
      lessonLabel={lessonLabel}
      jwt={jwt}
      appId={appId}
    />
  )
}
