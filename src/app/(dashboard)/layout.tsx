import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { canViewAsStudent } from '@/lib/role-switch'
import { THEME_INIT_SCRIPT } from '@/lib/dashboard-theme'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'
import { PageFrame } from '@/components/layout/PageFrame'
import { NoticeBar } from '@/components/layout/NoticeBar'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { ThemeSync } from '@/components/layout/ThemeSync'
import '@/styles/dashboard-shell.css'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: tutor } = await supabase.from('tutors').select('*').eq('id', user.id).single()
  if (!tutor) redirect('/login')

  const plan = (tutor.subscription_status as string) ?? 'free'

  // Also a student of another tutor, with a verified email: offer "View as student" (T-0676)
  const viewAsStudent = await canViewAsStudent(createAdminClient(), user)

  // Count unread messages from students
  const { count: unreadMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('tutor_id', user.id)
    .eq('sender_type', 'student')
    .is('read_at', null)

  return (
    <div className="dash" data-theme="light" suppressHydrationWarning>
      {/* Sets the theme before the first paint, so a tutor who chose dark never sees a light flash */}
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      <ThemeSync />
      <Sidebar plan={plan} unreadMessages={unreadMessages ?? 0} />
      <div className="dash-main">
        <Header tutor={tutor} canViewAsStudent={viewAsStudent} />
        <NoticeBar />
        <main id="main" className="dash-content">
          <PageFrame>{children}</PageFrame>
        </main>
      </div>
      <MobileNav plan={plan} unreadMessages={unreadMessages ?? 0} />
      <CommandPalette slug={tutor.slug as string | null} />
    </div>
  )
}
