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

    const [{ data: recentLessons }, { data: unreadMessages }] = await Promise.all([
      supabase.from('lessons')
        .select('id, starts_at, created_at, students(name)')
        .eq('tutor_id', user.id)
        .eq('status', 'scheduled')
        .gte('created_at', since7d)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('messages')
        .select('id, content, created_at, students(name)')
        .eq('tutor_id', user.id)
        .eq('sender_type', 'student')
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(5),
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
        link: `/messages`,
        time: m.created_at,
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
      .slice(0, 12)

    return NextResponse.json({
      notifications,
      unread: (unreadMessages?.length ?? 0),
    })
  } catch {
    return NextResponse.json({ notifications: [], unread: 0 })
  }
}
