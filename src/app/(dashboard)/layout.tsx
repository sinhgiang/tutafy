import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: tutor } = await supabase.from('tutors').select('*').eq('id', user.id).single()
  if (!tutor) redirect('/login')

  const plan = (tutor.subscription_status as string) ?? 'free'

  // Count unread messages from students
  const { count: unreadMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('tutor_id', user.id)
    .eq('sender_type', 'student')
    .is('read_at', null)

  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      <Sidebar plan={plan} unreadMessages={unreadMessages ?? 0} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header tutor={tutor} />
        <main className="flex-1 p-4 md:p-7 pb-20 md:pb-7 overflow-y-auto">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
