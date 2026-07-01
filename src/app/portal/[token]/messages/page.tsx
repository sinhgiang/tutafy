import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PortalChatPanel } from './PortalChatPanel'

export default async function PortalMessagesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: student } = await supabase
    .from('students')
    .select('id, name, tutor_id, status')
    .eq('portal_token', token)
    .single()

  if (!student || student.status === 'inactive') notFound()

  const { data: tutor } = await supabase
    .from('tutors')
    .select('name')
    .eq('id', student.tutor_id)
    .single()

  const { data: messages } = await supabase
    .from('messages')
    .select('id, sender_type, content, created_at, read_at')
    .eq('student_id', student.id)
    .order('created_at', { ascending: true })

  // Mark tutor's messages as read
  const unreadIds = (messages ?? [])
    .filter(m => m.sender_type === 'tutor' && !m.read_at)
    .map(m => m.id)
  if (unreadIds.length > 0) {
    await supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <Link href={`/portal/${token}`}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div>
          <p className="text-[14px] font-bold text-gray-900">{tutor?.name ?? 'Your Tutor'}</p>
          <p className="text-[11px] text-gray-400">Message your tutor</p>
        </div>
      </div>

      <PortalChatPanel
        token={token}
        tutorName={tutor?.name ?? 'Tutor'}
        studentName={student.name}
        initialMessages={messages ?? []}
      />
    </div>
  )
}
