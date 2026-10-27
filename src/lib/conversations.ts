// The Messages list (T-0823): the signed-in tutor's active students, each with the latest message and the number of unread
// ones, newest conversation first. Shared by the Messages layout (the list pane). Only the tutor's own students and
// messages are read: both queries carry the session's tutor id.
export type Msg = { id: string; student_id: string; sender_type: string; content: string; created_at: string; read_at: string | null }
export type Conversation = {
  id: string; name: string; level: string | null; email: string | null; unread: number
  latest: { content: string; fromTutor: boolean; at: string } | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase clients
type Db = { from: (table: string) => any }

export async function loadConversations(supabase: Db, admin: Db, tutorId: string): Promise<{ conversations: Conversation[]; totalUnread: number; failed: boolean }> {
  const { data: students, error } = await supabase.from('students').select('id, name, level, email').eq('tutor_id', tutorId).eq('status', 'active').order('name')
  if (error) return { conversations: [], totalUnread: 0, failed: true }
  const list = (students ?? []) as { id: string; name: string; level: string | null; email: string | null }[]
  if (list.length === 0) return { conversations: [], totalUnread: 0, failed: false }
  const { data: msgs, error: msgError } = await admin.from('messages')
    .select('id, student_id, sender_type, content, created_at, read_at').eq('tutor_id', tutorId).in('student_id', list.map(s => s.id)).order('created_at', { ascending: false })
  if (msgError) return { conversations: [], totalUnread: 0, failed: true }
  const byStudent = new Map<string, Msg[]>()
  for (const m of (msgs ?? []) as Msg[]) { const a = byStudent.get(m.student_id) ?? []; a.push(m); byStudent.set(m.student_id, a) }
  const conversations = list.map(s => {
    const ms = byStudent.get(s.id) ?? []
    return {
      id: s.id, name: s.name, level: s.level, email: s.email,
      unread: ms.filter(m => m.sender_type === 'student' && !m.read_at).length,
      latest: ms[0] ? { content: ms[0].content, fromTutor: ms[0].sender_type === 'tutor', at: ms[0].created_at } : null,
    }
  }).sort((a, b) => (b.latest?.at ?? '').localeCompare(a.latest?.at ?? '') || a.name.localeCompare(b.name))
  return { conversations, totalUnread: conversations.reduce((n, c) => n + c.unread, 0), failed: false }
}

/** Case-insensitive filter of the list by name or email. */
export function filterConversations(list: Conversation[], q: string): Conversation[] {
  const t = q.trim().toLowerCase()
  return t ? list.filter(c => c.name.toLowerCase().includes(t) || (c.email ?? '').toLowerCase().includes(t)) : list
}
