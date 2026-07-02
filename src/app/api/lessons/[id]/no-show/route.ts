import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, starts_at, duration_minutes, students(name, email)')
    .eq('id', id)
    .eq('tutor_id', user.id)
    .single()

  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await supabase.from('lessons').update({ status: 'no_show' }).eq('id', id)

  const student = lesson.students as any
  if (process.env.RESEND_API_KEY?.startsWith('re_') && student?.email) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const dateLabel = new Date(lesson.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const { data: tutor } = await supabase.from('tutors').select('name').eq('id', user.id).single()

    await resend.emails.send({
      from: 'Tutafy <noreply@tutafy.com>',
      to: student.email,
      subject: `Missed lesson — ${dateLabel}`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        <div style="background:#f59e0b;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
          <h1 style="color:white;margin:0;font-size:18px;">⚠️ Missed Lesson</h1>
        </div>
        <p style="color:#374151;font-size:15px;">Hi <strong>${student.name}</strong>,</p>
        <p style="color:#374151;font-size:15px;">
          We noticed you missed your lesson with <strong>${tutor?.name ?? 'your tutor'}</strong> on <strong>${dateLabel}</strong>.
        </p>
        <p style="color:#374151;font-size:14px;">
          Please reach out to your tutor to reschedule or discuss next steps.
        </p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;text-align:center;">Tutafy · tutafy.com</p>
      </div>`,
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
