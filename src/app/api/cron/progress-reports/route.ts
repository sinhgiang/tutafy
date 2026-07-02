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
  const from = 'Tutafy <noreply@tutafy.com>'
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
  const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Find students with parent_email set
  const { data: students } = await supabase
    .from('students')
    .select('id, name, email, parent_email, tutors(name, email)')
    .not('parent_email', 'is', null)
    .neq('parent_email', '')

  if (!students || students.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'No students with parent_email' })
  }

  let sent = 0
  const errors: string[] = []

  for (const student of students) {
    try {
      const tutor = student.tutors as any

      // Get last month's lessons for this student
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, starts_at, duration_minutes, status, topic, homework, payment_status, price')
        .eq('student_id', student.id)
        .gte('starts_at', monthStart.toISOString())
        .lte('starts_at', monthEnd.toISOString())
        .order('starts_at')

      const completedLessons = (lessons ?? []).filter(l => l.status === 'completed')
      const totalMinutes = completedLessons.reduce((s, l) => s + (l.duration_minutes ?? 0), 0)
      const topicsSet = completedLessons.filter(l => l.topic).map(l => l.topic!)
      const homeworkDone = completedLessons.filter(l => l.homework).length
      const pendingPayments = (lessons ?? []).filter(l => l.payment_status === 'pending' && (l.price ?? 0) > 0)

      if (completedLessons.length === 0) continue

      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#fff;">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 24px;border-radius:16px 16px 0 0;text-align:center;">
            <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">Monthly Progress Report</h1>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">${student.name} · ${monthLabel}</p>
          </div>
          <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;">
            <p style="color:#374151;font-size:15px;margin:0 0 20px;">
              Dear Parent,<br/>Here is ${student.name}'s learning progress for <strong>${monthLabel}</strong> with tutor <strong>${tutor?.name ?? 'their tutor'}</strong>.
            </p>

            <!-- Stats grid -->
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;">
              <div style="text-align:center;background:#f0fdf4;padding:16px;border-radius:12px;">
                <p style="margin:0;font-size:28px;font-weight:700;color:#16a34a;">${completedLessons.length}</p>
                <p style="margin:4px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Lessons</p>
              </div>
              <div style="text-align:center;background:#eff6ff;padding:16px;border-radius:12px;">
                <p style="margin:0;font-size:28px;font-weight:700;color:#2563eb;">${Math.round(totalMinutes / 60 * 10) / 10}h</p>
                <p style="margin:4px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Learning</p>
              </div>
              <div style="text-align:center;background:#fdf4ff;padding:16px;border-radius:12px;">
                <p style="margin:0;font-size:28px;font-weight:700;color:#9333ea;">${homeworkDone}</p>
                <p style="margin:4px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Homework</p>
              </div>
            </div>

            ${topicsSet.length > 0 ? `
            <div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:20px;">
              <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#374151;">Topics Covered</p>
              <div style="display:flex;flex-wrap:wrap;gap:6px;">
                ${topicsSet.map(t => `<span style="background:#e0e7ff;color:#4338ca;font-size:12px;padding:3px 10px;border-radius:20px;">${t}</span>`).join('')}
              </div>
            </div>
            ` : ''}

            ${completedLessons.slice(-3).length > 0 ? `
            <div style="margin-bottom:20px;">
              <p style="font-size:13px;font-weight:600;color:#374151;margin:0 0 10px;">Recent Lessons</p>
              ${completedLessons.slice(-3).map(l => {
                const d = new Date(l.starts_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f3f4f6;">
                  <span style="font-size:13px;color:#6b7280;min-width:80px;">${d}</span>
                  <span style="font-size:13px;color:#111827;">${l.topic ?? 'General lesson'}</span>
                  ${l.homework ? `<span style="font-size:11px;background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:10px;margin-left:auto;">HW assigned</span>` : ''}
                </div>`
              }).join('')}
            </div>
            ` : ''}

            ${pendingPayments.length > 0 ? `
            <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:12px;padding:14px;margin-bottom:20px;">
              <p style="margin:0;font-size:13px;font-weight:600;color:#92400e;">⚠️ Payment Reminder</p>
              <p style="margin:6px 0 0;font-size:12px;color:#78350f;">There ${pendingPayments.length === 1 ? 'is' : 'are'} ${pendingPayments.length} unpaid lesson${pendingPayments.length > 1 ? 's' : ''} for ${student.name}. Please contact the tutor to arrange payment.</p>
            </div>
            ` : ''}

            <p style="font-size:13px;color:#6b7280;margin:0;">
              This report is sent by <strong>${tutor?.name ?? 'your tutor'}</strong> via Tutafy.
              If you have questions, contact them at <a href="mailto:${tutor?.email}" style="color:#6366f1;">${tutor?.email ?? ''}</a>.
            </p>
          </div>
        </div>
      `

      await resend.emails.send({
        from,
        to: student.parent_email!,
        subject: `${student.name}'s Monthly Progress Report — ${monthLabel}`,
        html,
      })

      sent++
    } catch (err) {
      errors.push(`${student.id}: ${String(err)}`)
    }
  }

  return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined })
}
