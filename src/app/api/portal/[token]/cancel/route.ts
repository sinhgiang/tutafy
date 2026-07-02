import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { deleteCalendarEvent } from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { lesson_id } = await req.json()

  if (!lesson_id) return NextResponse.json({ error: 'Missing lesson_id' }, { status: 400 })

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
  const startTime = new Date(lesson.starts_at)
  const cancellationHours = tutor?.cancellation_hours ?? 24
  const hoursUntil = (startTime.getTime() - Date.now()) / 3600000

  if (hoursUntil < cancellationHours) {
    return NextResponse.json({
      error: `Cannot cancel within ${cancellationHours}h of lesson start. Contact your tutor directly.`
    }, { status: 400 })
  }

  await supabase.from('lessons').update({ status: 'cancelled' }).eq('id', lesson_id)

  // Delete from Google Calendar (fire-and-forget)
  const gcalToken = (tutor as any)?.google_calendar_refresh_token
  const gcalEventId = (lesson as any)?.google_event_id
  const gcalId = (tutor as any)?.google_calendar_id ?? 'primary'
  if (gcalToken && gcalEventId) {
    deleteCalendarEvent(gcalToken, gcalId, gcalEventId).catch(() => {})
  }

  // Email tutor
  if (process.env.RESEND_API_KEY?.startsWith('re_') && tutor?.email) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const dateLabel = startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const timeLabel = startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

    await resend.emails.send({
      from: 'Tutafy <noreply@tutafy.com>',
      to: tutor.email,
      subject: `${student.name} cancelled their lesson on ${dateLabel}`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        <div style="background:#ef4444;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
          <h1 style="color:white;margin:0;font-size:18px;">❌ Lesson Cancelled</h1>
        </div>
        <p style="color:#374151;font-size:15px;"><strong>${student.name}</strong> has cancelled their lesson.</p>
        <div style="background:#fef2f2;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #fecaca;">
          <p style="margin:4px 0;color:#9ca3af;font-size:12px;">Cancelled lesson</p>
          <p style="margin:0;color:#111827;font-size:15px;font-weight:600;">${dateLabel} at ${timeLabel}</p>
        </div>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Tutafy · tutafy.com</p>
      </div>`,
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
