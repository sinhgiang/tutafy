import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { ChatPanel } from './ChatPanel'

export default async function ConversationPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const [{ data: student }, { data: messages }] = await Promise.all([
    supabase.from('students')
      .select('id, name, level, email, portal_token')
      .eq('id', studentId)
      .eq('tutor_id', user.id)
      .single(),
    admin.from('messages')
      .select('id, sender_type, content, created_at, read_at')
      .eq('tutor_id', user.id)
      .eq('student_id', studentId)
      .order('created_at', { ascending: true }),
  ])

  if (!student) notFound()

  // Mark student messages as read
  await admin
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('tutor_id', user.id)
    .eq('student_id', studentId)
    .eq('sender_type', 'student')
    .is('read_at', null)

  const initials = student.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutafy.vercel.app'}/portal/${student.portal_token}`

  return (
    <div className="max-w-[680px] flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <Link href="/messages"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <span className="text-[11px] font-bold text-indigo-600">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-gray-900 leading-none">{student.name}</p>
          {student.email && (
            <p className="text-[11px] text-gray-400 mt-0.5">{student.email}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/students/${student.id}`}
            className="text-[12px] text-gray-500 hover:text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg transition-colors">
            Profile
          </Link>
          <a href={portalUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[12px] text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
            <ExternalLink className="h-3 w-3" />
            Student Portal
          </a>
        </div>
      </div>

      {/* Chat area */}
      <ChatPanel
        studentId={student.id}
        studentName={student.name}
        initialMessages={messages ?? []}
      />
    </div>
  )
}
