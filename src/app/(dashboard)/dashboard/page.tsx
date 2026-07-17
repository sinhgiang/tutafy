import { createClient } from '@/lib/supabase/server'
import { DashboardHome, type DashboardData, type LessonRow, type AtRiskRow, type ReminderRow } from '@/components/dashboard/DashboardHome'

const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', AUD: 'A$', CAD: 'C$', VND: '₫' }

function toLessonRow(l: any): LessonRow {
  const s = Array.isArray(l.students) ? l.students[0] : l.students
  return {
    id: l.id,
    starts_at: l.starts_at,
    duration_minutes: l.duration_minutes ?? 60,
    status: l.status,
    is_group: !!l.is_group,
    group_max_students: l.group_max_students ?? 1,
    attachments: Array.isArray(l.vocabulary) ? l.vocabulary.length : 0,
    docs: l.homework ? 1 : 0,
    hasVideo: !!(l.meet_link || l.zoom_link),
    student: s ? { name: s.name, level: s.level ?? null, avatar_url: s.avatar_url ?? null } : null,
  }
}

function relativeWhen(iso: string, now: Date): string {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  const today = now.toDateString()
  const tomorrow = new Date(now.getTime() + 86400000).toDateString()
  if (d.toDateString() === today) return `Today · ${time}`
  if (d.toDateString() === tomorrow) return `Tomorrow · ${time}`
  return `${d.toLocaleDateString('en-US', { weekday: 'short' })} · ${time}`
}

const LESSON_COLS = 'id, starts_at, duration_minutes, status, is_group, group_max_students, homework, vocabulary, meet_link, zoom_link, students(name, level, avatar_url)'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const nowIso = now.toISOString()

  // Week (Mon–Sun) containing today
  const weekStart = new Date(now)
  const dow = (weekStart.getDay() + 6) % 7 // 0 = Monday
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - dow)
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000)

  const [
    { data: tutor },
    { data: upcomingRaw },
    { data: pastRaw },
    { data: cancelledRaw },
    { data: activeStudentsFull },
    { data: weekLessonsRaw },
    { data: invoicesRaw },
  ] = await Promise.all([
    supabase.from('tutors').select('name').eq('id', user!.id).single(),
    supabase.from('lessons').select(LESSON_COLS).eq('tutor_id', user!.id).eq('status', 'scheduled').gte('starts_at', nowIso).order('starts_at').limit(12),
    supabase.from('lessons').select(LESSON_COLS).eq('tutor_id', user!.id).in('status', ['completed', 'no_show']).order('starts_at', { ascending: false }).limit(12),
    supabase.from('lessons').select(LESSON_COLS).eq('tutor_id', user!.id).eq('status', 'cancelled').order('starts_at', { ascending: false }).limit(12),
    supabase.from('students').select('id, name, level, avatar_url').eq('tutor_id', user!.id).eq('status', 'active'),
    supabase.from('lessons').select('starts_at, status, price, currency').eq('tutor_id', user!.id).gte('starts_at', weekStart.toISOString()).lt('starts_at', weekEnd.toISOString()),
    supabase.from('invoices').select('id, amount, currency, status, due_date, students(name)').eq('tutor_id', user!.id).in('status', ['sent', 'overdue']).order('due_date', { ascending: true, nullsFirst: false }).limit(5),
  ])

  const upcoming = (upcomingRaw ?? []).map(toLessonRow)
  const past = (pastRaw ?? []).map(toLessonRow)
  const cancelled = (cancelledRaw ?? []).map(toLessonRow)

  // Currency symbol from any available record
  const ccy = (weekLessonsRaw ?? [])[0]?.currency ?? (invoicesRaw ?? [])[0]?.currency ?? 'USD'
  const currencySymbol = CURRENCY_SYMBOL[ccy] ?? '$'

  // ── At risk: active students with no scheduled lesson in the next 21 days ──
  const next21 = new Date(now.getTime() + 21 * 86400000).toISOString()
  const { data: bookedRows } = (activeStudentsFull && activeStudentsFull.length > 0)
    ? await supabase.from('lessons').select('student_id').eq('tutor_id', user!.id).eq('status', 'scheduled').gte('starts_at', nowIso).lte('starts_at', next21)
    : { data: [] as any[] }
  const bookedIds = new Set((bookedRows ?? []).map((r: any) => r.student_id))
  const atRisk: AtRiskRow[] = (activeStudentsFull ?? [])
    .filter((s: any) => !bookedIds.has(s.id))
    .slice(0, 3)
    .map((s: any) => ({
      id: s.id,
      name: s.name,
      avatar_url: s.avatar_url ?? null,
      level: s.level ?? null,
      reason: 'No upcoming lesson booked in the next 3 weeks.',
      since: '',
    }))

  // ── Reminders: nearest upcoming lessons + unpaid invoices ──
  const lessonReminders: ReminderRow[] = upcoming.slice(0, 4).map(l => ({
    id: `l-${l.id}`,
    kind: 'lesson' as const,
    title: l.is_group ? `Group class${l.student ? ` · ${l.student.name}` : ''}` : `Lesson with ${l.student?.name ?? 'student'}`,
    when: relativeWhen(l.starts_at, now),
    tag: l.is_group ? 'Group' : (l.hasVideo ? 'Meeting' : 'Lesson'),
    href: '/lessons',
  }))
  const paymentReminders: ReminderRow[] = (invoicesRaw ?? []).map((inv: any) => {
    const st = Array.isArray(inv.students) ? inv.students[0] : inv.students
    const overdue = inv.status === 'overdue' || (inv.due_date && new Date(inv.due_date) < now)
    return {
      id: `p-${inv.id}`,
      kind: 'payment' as const,
      title: `Payment from ${st?.name ?? 'student'} — ${currencySymbol}${Number(inv.amount ?? 0).toLocaleString('en-US')}`,
      when: overdue ? 'Overdue' : (inv.due_date ? `Due ${new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Awaiting payment'),
      tag: overdue ? 'Overdue' : 'Payment',
      href: '/payments',
    }
  })
  const reminders = [...paymentReminders.filter(r => r.tag === 'Overdue'), ...lessonReminders, ...paymentReminders.filter(r => r.tag !== 'Overdue')].slice(0, 6)

  // ── Analytics: per-day lessons + revenue for the current week ──
  const weekLessons = [0, 0, 0, 0, 0, 0, 0]
  const weekRevenue = [0, 0, 0, 0, 0, 0, 0]
  for (const l of (weekLessonsRaw ?? [])) {
    const idx = Math.floor((new Date(l.starts_at).getTime() - weekStart.getTime()) / 86400000)
    if (idx < 0 || idx > 6) continue
    if (l.status !== 'cancelled') weekLessons[idx] += 1
    if (l.status === 'completed') weekRevenue[idx] += Number(l.price ?? 0)
  }

  // ── Start lesson: link to the soonest lesson's video room if it has one ──
  const soonest = (upcomingRaw ?? [])[0]
  const nextLessonHref: string | null = soonest ? (soonest.meet_link || soonest.zoom_link || null) : null

  const data: DashboardData = {
    firstName: tutor?.name?.split(' ')[0] ?? 'there',
    dateLabel: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    nextLessonHref,
    lessons: { upcoming, past, cancelled },
    atRisk,
    reminders,
    week: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], lessons: weekLessons, revenue: weekRevenue },
    weekTotalLessons: weekLessons.reduce((s, v) => s + v, 0),
    currencySymbol,
  }

  return <DashboardHome data={data} />
}
