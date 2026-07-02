import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lesson_id } = await req.json()
  if (!lesson_id) return NextResponse.json({ error: 'lesson_id required' }, { status: 400 })

  const [{ data: lesson }, { data: tutor }] = await Promise.all([
    supabase.from('lessons')
      .select('*, students(name, email)')
      .eq('id', lesson_id)
      .eq('tutor_id', user.id)
      .single(),
    supabase.from('tutors').select('name, email').eq('id', user.id).single(),
  ])

  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

  const student = lesson.students as any
  if (!student?.email) return NextResponse.json({ error: 'Student has no email' }, { status: 400 })
  if (!lesson.price) return NextResponse.json({ error: 'Lesson has no price' }, { status: 400 })

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 503 })
  }

  const invoiceNum = `INV-${Date.now().toString().slice(-6)}`
  const dateLabel = new Date(lesson.starts_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const dueDate = new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: 'Tutafy <noreply@tutafy.com>',
    to: student.email,
    subject: `Invoice ${invoiceNum} â€” $${Number(lesson.price).toFixed(2)} due ${dueDate}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:32px;">
          <div>
            <h1 style="margin:0;font-size:24px;color:#111827;font-weight:700;">INVOICE</h1>
            <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">${invoiceNum}</p>
          </div>
          <div style="background:#6366f1;color:white;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;">
            Tutafy
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;">
          <div>
            <p style="margin:0 0 4px;color:#9ca3af;font-size:11px;font-weight:600;text-transform:uppercase;">From</p>
            <p style="margin:0;color:#111827;font-size:14px;font-weight:600;">${tutor?.name ?? 'Your Tutor'}</p>
          </div>
          <div>
            <p style="margin:0 0 4px;color:#9ca3af;font-size:11px;font-weight:600;text-transform:uppercase;">Bill To</p>
            <p style="margin:0;color:#111827;font-size:14px;font-weight:600;">${student.name}</p>
            <p style="margin:2px 0 0;color:#6b7280;font-size:13px;">${student.email}</p>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="text-align:left;padding:10px 12px;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Description</th>
              <th style="text-align:right;padding:10px 12px;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #f3f4f6;">
              <td style="padding:12px;font-size:14px;color:#111827;">
                Language lesson â€” ${dateLabel}<br>
                <span style="color:#6b7280;font-size:12px;">${lesson.duration_minutes} minutes</span>
              </td>
              <td style="padding:12px;font-size:14px;color:#111827;text-align:right;font-weight:600;">
                $${Number(lesson.price).toFixed(2)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td style="padding:12px;font-size:14px;color:#111827;font-weight:700;">Total Due</td>
              <td style="padding:12px;font-size:20px;color:#6366f1;font-weight:700;text-align:right;">
                $${Number(lesson.price).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div style="background:#fef3c7;border-radius:10px;padding:16px;margin-bottom:24px;">
          <p style="margin:0;color:#92400e;font-size:13px;">
            <strong>Due by ${dueDate}</strong> â€” please pay via your tutor's preferred payment method.
          </p>
        </div>

        <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
          Sent via Tutafy Â· tutafy.com
        </p>
      </div>`,
  })

  if (error) return NextResponse.json({ error: 'Email failed to send' }, { status: 500 })

  // Mark lesson payment status as pending (invoice sent)
  await supabase.from('lessons').update({ payment_status: 'pending' }).eq('id', lesson_id)

  return NextResponse.json({ ok: true, invoiceNum })
}
