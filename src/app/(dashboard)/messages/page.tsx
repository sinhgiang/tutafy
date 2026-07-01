import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageCircle, Search } from 'lucide-react'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Get all students with their latest message and unread count
  const { data: students } = await supabase
    .from('students')
    .select('id, name, level, status, email')
    .eq('tutor_id', user.id)
    .eq('status', 'active')
    .order('name')

  const studentIds = (students ?? []).map(s => s.id)

  type MsgRow = { id: string; student_id: string; sender_type: string; content: string; created_at: string; read_at: string | null }

  // Get latest message + unread count for each student
  const allMessagesResult = studentIds.length > 0
    ? await admin
        .from('messages')
        .select('id, student_id, sender_type, content, created_at, read_at')
        .eq('tutor_id', user.id)
        .in('student_id', studentIds)
        .order('created_at', { ascending: false })
    : { data: [] as MsgRow[] }

  const allMessages: MsgRow[] = allMessagesResult.data ?? []

  const messagesByStudent = new Map<string, {
    latest: MsgRow | null
    unread: number
  }>()

  for (const s of students ?? []) {
    const msgs = allMessages.filter(m => m.student_id === s.id)
    const unread = msgs.filter(m => m.sender_type === 'student' && !m.read_at).length
    messagesByStudent.set(s.id, { latest: msgs[0] ?? null, unread })
  }

  // Sort by most recent message
  const sorted = (students ?? []).sort((a, b) => {
    const aLatest = messagesByStudent.get(a.id)?.latest?.created_at ?? ''
    const bLatest = messagesByStudent.get(b.id)?.latest?.created_at ?? ''
    return bLatest.localeCompare(aLatest)
  })

  const totalUnread = allMessages.filter(m => m.sender_type === 'student' && !m.read_at).length

  const LEVEL_COLOR: Record<string, string> = {
    A1: 'bg-slate-100 text-slate-500', A2: 'bg-blue-50 text-blue-600',
    B1: 'bg-cyan-50 text-cyan-700', B2: 'bg-green-50 text-green-700',
    C1: 'bg-orange-50 text-orange-700', C2: 'bg-red-50 text-red-700',
    Native: 'bg-purple-50 text-purple-700',
  }

  return (
    <div className="max-w-[760px] space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
            Messages
            {totalUnread > 0 && (
              <span className="text-[11px] font-bold bg-indigo-500 text-white rounded-full px-2 py-0.5">
                {totalUnread} new
              </span>
            )}
          </h1>
          <p className="text-[12px] text-gray-400 mt-0.5">
            {sorted.length} active student{sorted.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
              <MessageCircle className="h-6 w-6 text-gray-300" />
            </div>
            <p className="text-[14px] font-medium text-gray-500">No active students yet</p>
            <p className="text-[12px] text-gray-400 mt-1">Add students to start messaging</p>
            <Link href="/students/new"
              className="mt-4 text-[13px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors">
              Add Student →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sorted.map(student => {
              const meta = messagesByStudent.get(student.id)
              const unread = meta?.unread ?? 0
              const latest = meta?.latest
              const initials = student.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

              return (
                <Link key={student.id} href={`/messages/${student.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-[13px] font-bold text-indigo-600">{initials}</span>
                    </div>
                    {unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-[13px] truncate ${unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {student.name}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${LEVEL_COLOR[student.level] ?? 'bg-gray-100 text-gray-500'}`}>
                        {student.level}
                      </span>
                    </div>
                    {latest ? (
                      <p className={`text-[12px] truncate mt-0.5 ${unread > 0 ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>
                        {latest.sender_type === 'tutor' ? 'You: ' : ''}{latest.content}
                      </p>
                    ) : (
                      <p className="text-[12px] text-gray-300 mt-0.5 italic">No messages yet</p>
                    )}
                  </div>

                  <div className="flex-shrink-0 text-right">
                    {latest && (
                      <p className="text-[11px] text-gray-400">
                        {new Date(latest.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                    {unread > 0 && (
                      <div className="w-2 h-2 bg-indigo-500 rounded-full ml-auto mt-1" />
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
