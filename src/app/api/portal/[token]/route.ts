import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/portal/[token]  — student fetches their own data
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: student } = await supabase
    .from('students')
    .select('id, name, email, level, goals, tags, status, tutor_id')
    .eq('portal_token', token)
    .single()

  if (!student) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })

  const now = new Date().toISOString()

  const [
    { data: tutor },
    { data: upcomingLessons },
    { data: recentLessons },
    { data: messages },
  ] = await Promise.all([
    supabase.from('tutors').select('name, avatar_url, timezone').eq('id', student.tutor_id).single(),
    supabase.from('lessons')
      .select('id, starts_at, duration_minutes, zoom_link, meet_link, status')
      .eq('student_id', student.id)
      .eq('status', 'scheduled')
      .gte('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(5),
    supabase.from('lessons')
      .select('id, starts_at, duration_minutes, homework, vocabulary, notes, status')
      .eq('student_id', student.id)
      .lt('starts_at', now)
      .order('starts_at', { ascending: false })
      .limit(5),
    supabase.from('messages')
      .select('id, sender_type, content, created_at, read_at')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  // Mark tutor messages as read by student
  const unreadIds = (messages ?? [])
    .filter(m => m.sender_type === 'tutor' && !m.read_at)
    .map(m => m.id)
  if (unreadIds.length > 0) {
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)
  }

  return NextResponse.json({
    student,
    tutor,
    upcomingLessons: upcomingLessons ?? [],
    recentLessons: recentLessons ?? [],
    messages: (messages ?? []).reverse(),
  })
}
