import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { computePayroll, type PayrollMember, type PayrollLesson } from '@/lib/payroll'
import { requireFeature } from '@/lib/guard'
import { TeamClient } from './TeamClient'

export const dynamic = 'force-dynamic'

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locked = await requireFeature('academy', 'Team & Payroll')
  if (locked) return locked

  const { period } = await searchParams
  const scope = period === 'month' ? 'month' : 'all'

  const [{ data: members }, { data: lessons }, { data: tutor }] = await Promise.all([
    supabase.from('team_members').select('id, name, email, pay_type, pay_rate, active, created_at').eq('owner_id', user.id).order('created_at', { ascending: true }),
    supabase.from('lessons').select('id, starts_at, status, price, duration_minutes, assigned_to, students(name)').eq('tutor_id', user.id).order('starts_at', { ascending: false }),
    supabase.from('tutors').select('subscription_status').eq('id', user.id).single(),
  ])

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const allLessons = lessons ?? []

  // Payroll counts completed lessons; optionally restrict to the current month.
  const scoped = scope === 'month'
    ? allLessons.filter(l => new Date(l.starts_at) >= startOfMonth)
    : allLessons

  const payMembers: PayrollMember[] = (members ?? []).map(m => ({ id: m.id, name: m.name, pay_type: m.pay_type, pay_rate: Number(m.pay_rate) }))
  const payLessons: PayrollLesson[] = scoped.map(l => ({ assigned_to: l.assigned_to, status: l.status, price: l.price, duration_minutes: l.duration_minutes }))
  const payroll = computePayroll(payMembers, payLessons)

  // Recent completed lessons for the assignment UI (most useful to assign).
  const assignable = allLessons
    .filter(l => l.status === 'completed')
    .slice(0, 40)
    .map((l: any) => ({
      id: l.id,
      date: l.starts_at,
      student: l.students?.name ?? '—',
      price: Number(l.price) || 0,
      duration: Number(l.duration_minutes) || 0,
      assigned_to: l.assigned_to ?? null,
    }))

  return (
    <TeamClient
      members={members ?? []}
      payroll={payroll}
      assignable={assignable}
      scope={scope}
      plan={(tutor as any)?.subscription_status ?? 'free'}
    />
  )
}
