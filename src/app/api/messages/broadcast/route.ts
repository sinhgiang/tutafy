import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subject, message } = await request.json()
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Subject and message required' }, { status: 400 })
  }

  const { data: tutor } = await supabase.from('tutors').select('name').eq('id', user.id).single()
  const adminSupabase = createAdminClient()
  const { data: students } = await adminSupabase
    .from('students')
    .select('name, email')
    .eq('tutor_id', user.id)
    .eq('status', 'active')
    .not('email', 'is', null)

  if (!students?.length) return NextResponse.json({ sent: 0 })

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_API_KEY.startsWith('re_')) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 503 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const tutorName = tutor?.name ?? 'Your tutor'
  let sent = 0

  for (const student of students) {
    if (!student.email) continue
    await resend.emails.send({
      from: 'Tutafy <noreply@tutafy.com>',
      to: student.email,
      subject: `${subject} — from ${tutorName}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
          <div style="background:#6366f1;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
            <p style="color:rgba(255,255,255,0.7);margin:0 0 4px;font-size:12px;">Message from ${tutorName}</p>
            <h1 style="color:white;margin:0;font-size:20px;">${subject}</h1>
          </div>
          <p style="color:#374151;font-size:15px;">Hi <strong>${student.name}</strong>,</p>
          <div style="color:#374151;font-size:15px;line-height:1.6;white-space:pre-wrap;">${message}</div>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px;text-align:center;">
            Sent via Tutafy &middot; tutafy.com
          </p>
        </div>
      `,
    }).catch(() => {})
    sent++
  }

  return NextResponse.json({ sent })
}
