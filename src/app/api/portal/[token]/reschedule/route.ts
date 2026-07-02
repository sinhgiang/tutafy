import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { updateCalendarEvent } from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { lesson_id, new_date, new_time } = await req.json()

  if (!lesson_id || !new_date || !new_time) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: student } = await supabase
    .from('students')
    .select('id, name, email, tutor_id, status')
    .eq('portal_token', token)
    .single()

  if (!student || student.status === 'inactive') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, starts_at, duration_minutes, google_event_id, tutors(name, email, cancellation_hours, google_calendar_refresh_token, google_calendar_id)')
    .eq('id', lesson_id)
    .eq('student_id', student.id)
    .eq('status', 'scheduled')
    .single()

  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

  const tutor = lesson.tutors as any
  const oldStart = new Date(lesson.starts_at)
  const cancellationHours = tutor?.cancellation_hours ?? 24
  const hoursUntil = (oldStart.getTime() - Date.now()) / 3600000

  if (hoursUntil < cancellationHours) {
    return NextResponse.json({
      error: `Cannot reschedule within ${cancellationHours}h of lesson start`
    }, { status: 400 })
  }

  const newStart = new Date(`${new_date}T${new_time}:00`)
  const newEnd = new Date(newStart.getTime() + lesson.duration_minutes * 60000)

  // Check slot not already taken
  const { data: conflict } = await supabase
    .from('lessons')
    .select('id')
    .eq('tutor_id', student.tutor_id)
    .eq('starts_at', newStart.toISOString())
    .neq('status', 'cancelled')
    .neq('id', lesson_id)
    .single()

  if (conflict) return NextResponse.json({ error: 'That slot is already booked' }, { status: 409 })

  await supabase.from('lessons').update({
    starts_at: newStart.toISOString(),
    ends_at: newEnd.toISOString(),
    reminder_24h_sent: false,
    reminder_1h_sent: false,
  }).eq('id', lesson_id)

  // Update Google Calendar event (fire-and-forget)
  const gcalToken = (tutor as any)?.google_calendar_refresh_token
  const gcalEventId = (lesson as any)?.google_event_id
  const gcalCalId = (tutor as any)?.google_calendar_id ?? 'primary'
  if (gcalToken && gcalEventId) {
    updateCalendarEvent(gcalToken, gcalCalId, gcalEventId, {
      start: { dateTime: newStart.toISOString() },
      end: { dateTime: newEnd.toISOString() },
    }).catch(() => {})
  }

  // Email tutor
  if (process.env.RESEND_API_KEY?.startsWith('re_') && tutor?.email) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const oldLabel = oldStart.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const newLabel = newStart.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const newTime = newStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

    await resend.emails.send({
      from: 'Tutafy <noreply@tutafy.com>',
      to: tutor.email,
      subject: `${student.name} rescheduled their lesson`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        <div style="background:#6366f1;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
          <h1 style="color:white;margin:0;font-size:18px;">📅 Lesson Rescheduled</h1>
        </div>
        <p style="color:#374151;font-size:15px;"><strong>${student.name}</strong> has rescheduled their lesson.</p>
        <div style="background:#f3f4f6;border-radius:12px;padding:20px;margin:20px 0;">
          <p style="margin:4px 0;color:#9ca3af;font-size:12px;">FROM</p>
          <p style="margin:0 0 12px;color:#6b7280;font-size:14px;text-decoration:line-through;">${oldLabel}</p>
          <p style="margin:4px 0;color:#9ca3af;font-size:12px;">TO</p>
          <p style="margin:0;color:#111827;font-size:15px;font-weight:600;">${newLabel} at ${newTime}</p>
        </div>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Tutafy · tutafy.com</p>
      </div>`,
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
