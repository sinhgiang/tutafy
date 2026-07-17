import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ notifications: [], unread: 0 })

    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [{ data: recentLessons }, { data: unreadMessages }, { data: recentStudents }] = await Promise.all([
      supabase.from('lessons')
        .select('id, starts_at, created_at, students(name)')
        .eq('tutor_id', user.id)
        .eq('status', 'scheduled')
        .gte('created_at', since7d)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase.from('messages')
        .select('id, content, created_at, student_id, students(name)')
        .eq('tutor_id', user.id)
        .eq('sender_type', 'student')
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase.from('students')
        .select('id, name, created_at')
        .eq('tutor_id', user.id)
        .gte('created_at', since7d)
        .order('created_at', { ascending: false })
        .limit(8),
    ])

    let recentReviews: any[] = []
    try {
      const { data: rv } = await supabase.from('reviews')
        .select('id, rating, created_at')
        .eq('tutor_id', user.id)
        .gte('created_at', since30d)
        .order('created_at', { ascending: false })
        .limit(3)
      recentReviews = rv ?? []
    } catch { /* reviews table may not exist yet */ }

    let recentWaitlist: any[] = []
    try {
      const { data: wl } = await supabase.from('waitlist')
        .select('id, name, created_at')
        .eq('tutor_id', user.id)
        .gte('created_at', since7d)
        .order('created_at', { ascending: false })
        .limit(5)
      recentWaitlist = wl ?? []
    } catch { /* waitlist table may not exist yet */ }

    const notifications = [
      ...(recentLessons ?? []).map((l: any) => ({
        id: `lesson-${l.id}`,
        type: 'booking',
        title: `New booking from ${(l.students as any)?.name ?? 'student'}`,
        body: new Date(l.starts_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        link: `/lessons/${l.id}`,
        time: l.created_at,
      })),
      ...(unreadMessages ?? []).map((m: any) => ({
        id: `msg-${m.id}`,
        type: 'message',
        title: `${(m.students as any)?.name ?? 'Student'} sent a message`,
        body: (m.content as string)?.slice(0, 70) ?? '',
        link: m.student_id ? `/messages/${m.student_id}` : `/messages`,
        time: m.created_at,
      })),
      ...(recentStudents ?? []).map((s: any) => ({
        id: `student-${s.id}`,
        type: 'student',
        title: `New student: ${s.name ?? 'student'}`,
        body: 'Added to your students',
        link: `/students/${s.id}`,
        time: s.created_at,
      })),
      ...recentWaitlist.map((w: any) => ({
        id: `waitlist-${w.id}`,
        type: 'waitlist',
        title: `${w.name ?? 'Someone'} joined the waitlist`,
        body: 'Your schedule was full',
        link: `/waitlist`,
        time: w.created_at,
      })),
      ...recentReviews.map((r: any) => ({
        id: `review-${r.id}`,
        type: 'review',
        title: `New ${r.rating}★ review received`,
        body: '',
        link: `/students`,
        time: r.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 15)

    return NextResponse.json({
      notifications,
      unread: (unreadMessages?.length ?? 0),
    })
  } catch {
    return NextResponse.json({ notifications: [], unread: 0 })
  }
}
