import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Get tutor's Google Calendar credentials
  const { data: tutor } = await admin
    .from('tutors')
    .select('google_calendar_refresh_token, google_calendar_id')
    .eq('id', user.id)
    .single()

  const refreshToken = (tutor as any)?.google_calendar_refresh_token
  const calendarId = (tutor as any)?.google_calendar_id

  if (!refreshToken || !calendarId) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 })
  }

  // Get lesson details
  const { data: lesson } = await admin
    .from('lessons')
    .select('id, starts_at, ends_at, duration_minutes, meet_link, zoom_link, notes, students(name, email)')
    .eq('id', lessonId)
    .eq('tutor_id', user.id)
    .single()

  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

  const student = lesson.students as any
  const endAt = lesson.ends_at ?? new Date(new Date(lesson.starts_at).getTime() + lesson.duration_minutes * 60000).toISOString()

  const event = {
    summary: `Lesson with ${student?.name ?? 'Student'}`,
    description: [
      lesson.notes ?? '',
      lesson.meet_link ? `Join: ${lesson.meet_link}` : '',
      lesson.zoom_link ? `Zoom: ${lesson.zoom_link}` : '',
    ].filter(Boolean).join('\n'),
    start: { dateTime: lesson.starts_at },
    end: { dateTime: endAt },
    location: lesson.meet_link || lesson.zoom_link || undefined,
  }

  const existingEventId = (lesson as any).google_event_id

  let gcalEventId: string | null = null

  if (existingEventId) {
    await updateCalendarEvent(refreshToken, calendarId, existingEventId, event)
    gcalEventId = existingEventId
  } else {
    gcalEventId = await createCalendarEvent(refreshToken, calendarId, event)
  }

  if (gcalEventId) {
    await admin
      .from('lessons')
      .update({ google_event_id: gcalEventId } as any)
      .eq('id', lessonId)
  }

  return NextResponse.json({ ok: true, gcalEventId })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: tutor } = await admin
    .from('tutors')
    .select('google_calendar_refresh_token, google_calendar_id')
    .eq('id', user.id)
    .single()

  const { data: lesson } = await admin
    .from('lessons')
    .select('google_event_id')
    .eq('id', lessonId)
    .eq('tutor_id', user.id)
    .single()

  const refreshToken = (tutor as any)?.google_calendar_refresh_token
  const calendarId = (tutor as any)?.google_calendar_id
  const gcalEventId = (lesson as any)?.google_event_id

  if (refreshToken && calendarId && gcalEventId) {
    await deleteCalendarEvent(refreshToken, calendarId, gcalEventId)
    await admin.from('lessons').update({ google_event_id: null } as any).eq('id', lessonId)
  }

  return NextResponse.json({ ok: true })
}
