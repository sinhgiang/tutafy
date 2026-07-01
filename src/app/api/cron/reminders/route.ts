import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_API_KEY.startsWith('re_')) {
    return NextResponse.json({ skipped: 'RESEND_API_KEY not configured' })
  }

  const supabase = createAdminClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = 'Tutafy <onboarding@resend.dev>'
  const now = new Date()

  const win24h_start = new Date(now.getTime() + 23 * 3600 * 1000)
  const win24h_end = new Date(now.getTime() + 25 * 3600 * 1000)
  const win1h_start = new Date(now.getTime() + 45 * 60 * 1000)
  const win1h_end = new Date(now.getTime() + 75 * 60 * 1000)

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, starts_at, duration_minutes, zoom_link, meet_link, reminder_24h_sent, reminder_1h_sent, students(name, email), tutors(name)')
    .eq('status', 'scheduled')
    .gte('starts_at', win24h_start.toISOString())
    .lte('starts_at', win1h_end.toISOString())

  if (!lessons || lessons.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  let sent = 0

  for (const lesson of lessons) {
    const lessonTime = new Date(lesson.starts_at)
    const student = lesson.students as any
    const tutor = lesson.tutors as any
    if (!student?.email) continue

    const dateLabel = lessonTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const timeLabel = lessonTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    const meetingLink = lesson.zoom_link || lesson.meet_link || null

    // 24h reminder
    if (!lesson.reminder_24h_sent && lessonTime >= win24h_start && lessonTime <= win24h_end) {
      await resend.emails.send({
        from,
        to: student.email,
        subject: `Reminder: Lesson with ${tutor?.name ?? 'your tutor'} tomorrow at ${timeLabel}`,
        html: reminderHtml({
          studentName: student.name,
          tutorName: tutor?.name ?? 'your tutor',
          dateLabel,
          timeLabel,
          duration: lesson.duration_minutes,
          meetingLink,
          hoursAway: 24,
        }),
      }).catch(() => {})

      await supabase.from('lessons').update({ reminder_24h_sent: true }).eq('id', lesson.id)
      sent++
    }

    // 1h reminder
    if (!lesson.reminder_1h_sent && lessonTime >= win1h_start && lessonTime <= win1h_end) {
      await resend.emails.send({
        from,
        to: student.email,
        subject: `Your lesson starts in 1 hour — ${timeLabel}`,
        html: reminderHtml({
          studentName: student.name,
          tutorName: tutor?.name ?? 'your tutor',
          dateLabel,
          timeLabel,
          duration: lesson.duration_minutes,
          meetingLink,
          hoursAway: 1,
        }),
      }).catch(() => {})

      await supabase.from('lessons').update({ reminder_1h_sent: true }).eq('id', lesson.id)
      sent++
    }
  }

  // Payment reminders: lessons 3-4 days past with pending payment
  const pay3d_start = new Date(now.getTime() - 4 * 24 * 3600 * 1000)
  const pay3d_end = new Date(now.getTime() - 3 * 24 * 3600 * 1000)

  const { data: paymentLessons } = await supabase
    .from('lessons')
    .select('id, starts_at, price, students(name, email), tutors(name)')
    .eq('status', 'completed')
    .eq('payment_status', 'pending')
    .gt('price', 0)
    .gte('starts_at', pay3d_start.toISOString())
    .lte('starts_at', pay3d_end.toISOString())

  if (paymentLessons) {
    for (const lesson of paymentLessons) {
      const student = lesson.students as any
      const tutor = lesson.tutors as any
      if (!student?.email) continue

      const lessonDate = new Date(lesson.starts_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

      await resend.emails.send({
        from,
        to: student.email,
        subject: `Payment reminder — ${tutor?.name ?? 'Your tutor'} lesson on ${lessonDate}`,
        html: paymentReminderHtml({
          studentName: student.name,
          tutorName: tutor?.name ?? 'your tutor',
          lessonDate,
          amount: Number(lesson.price),
        }),
      }).catch(() => {})

      // Mark reminder sent if column exists (migration 007)
      try {
        await supabase
          .from('lessons')
          .update({ payment_reminder_sent_at: now.toISOString() } as any)
          .eq('id', lesson.id)
      } catch {}

      sent++
    }
  }

  return NextResponse.json({ sent, checked: lessons.length })
}

function paymentReminderHtml({ studentName, tutorName, lessonDate, amount }: {
  studentName: string
  tutorName: string
  lessonDate: string
  amount: number
}) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
      <div style="background:#f59e0b;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
        <h1 style="color:white;margin:0;font-size:20px;">💳 Payment Reminder</h1>
      </div>
      <p style="color:#374151;font-size:15px;">Hi <strong>${studentName}</strong>,</p>
      <p style="color:#374151;font-size:15px;">
        This is a friendly reminder that payment for your lesson with <strong>${tutorName}</strong> on <strong>${lessonDate}</strong> is still pending.
      </p>
      <div style="background:#fef3c7;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #fde68a;">
        <p style="margin:4px 0;color:#92400e;font-size:13px;">Amount due</p>
        <p style="margin:0;color:#78350f;font-size:24px;font-weight:700;">$${amount.toFixed(2)}</p>
      </div>
      <p style="color:#374151;font-size:14px;">
        Please contact your tutor to arrange payment. Thank you!
      </p>
      <p style="color:#9ca3af;font-size:12px;margin-top:32px;text-align:center;">
        Powered by Tutafy · tutafy.vercel.app
      </p>
    </div>
  `
}

function reminderHtml({ studentName, tutorName, dateLabel, timeLabel, duration, meetingLink, hoursAway }: {
  studentName: string
  tutorName: string
  dateLabel: string
  timeLabel: string
  duration: number
  meetingLink: string | null
  hoursAway: number
}) {
  const urgency = hoursAway === 1 ? '⏰ Starting in 1 hour!' : '📅 Tomorrow'
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
      <div style="background:#6366f1;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
        <h1 style="color:white;margin:0;font-size:20px;">${urgency}</h1>
      </div>
      <p style="color:#374151;font-size:15px;">Hi <strong>${studentName}</strong>,</p>
      <p style="color:#374151;font-size:15px;">
        Your lesson with <strong>${tutorName}</strong> is ${hoursAway === 1 ? 'starting soon' : 'tomorrow'}.
      </p>
      <div style="background:#f3f4f6;border-radius:12px;padding:20px;margin:20px 0;">
        <p style="margin:4px 0;color:#6b7280;font-size:13px;">📅 Date</p>
        <p style="margin:0 0 12px;color:#111827;font-size:15px;font-weight:600;">${dateLabel}</p>
        <p style="margin:4px 0;color:#6b7280;font-size:13px;">🕐 Time</p>
        <p style="margin:0 0 12px;color:#111827;font-size:15px;font-weight:600;">${timeLabel}</p>
        <p style="margin:4px 0;color:#6b7280;font-size:13px;">⏱ Duration</p>
        <p style="margin:0;color:#111827;font-size:15px;font-weight:600;">${duration} minutes</p>
      </div>
      ${meetingLink ? `
        <div style="text-align:center;margin:24px 0;">
          <a href="${meetingLink}" style="background:#6366f1;color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">
            Join Lesson →
          </a>
        </div>
      ` : ''}
      <p style="color:#9ca3af;font-size:12px;margin-top:32px;text-align:center;">
        Powered by Tutafy · tutafy.vercel.app
      </p>
    </div>
  `
}
