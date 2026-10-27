import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { loadConversations } from '@/lib/conversations'
import { MessagesShell } from './MessagesShell'

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { conversations, totalUnread, failed } = await loadConversations(supabase, createAdminClient(), user.id)
  return <MessagesShell conversations={conversations} totalUnread={totalUnread} failed={failed}>{children}</MessagesShell>
}
