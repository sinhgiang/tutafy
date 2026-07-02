import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

// POST /api/portal/[token]/messages  — student sends message to tutor
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: student } = await supabase
    .from('students')
    .select('id, name, tutor_id')
    .eq('portal_token', token)
    .single()

  if (!student) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })

  const { content } = await req.json()
  if (!content?.trim()) {
    return NextResponse.json({ error: 'content required' }, { status: 400 })
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      tutor_id: student.tutor_id,
      student_id: student.id,
      sender_type: 'student',
      content: content.trim(),
    })
    .select('id, sender_type, content, created_at, read_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify tutor by email
  if (process.env.RESEND_API_KEY?.startsWith('re_')) {
    const { data: tutor } = await supabase
      .from('tutors')
      .select('name, email')
      .eq('id', student.tutor_id)
      .single()

    if (tutor?.email) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'Tutafy <noreply@tutafy.com>',
        to: tutor.email,
        subject: `New message from ${student.name}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
            <h2 style="color:#111827;margin-bottom:4px;">New Message 💬</h2>
            <p style="color:#6b7280;font-size:14px;margin-top:0;">From <strong>${student.name}</strong></p>
            <div style="background:#f3f4f6;border-radius:12px;padding:16px;margin:20px 0;">
              <p style="margin:0;color:#374151;font-size:15px;">${content.trim()}</p>
            </div>
            <a href="https://tutafy.com/messages" style="display:inline-block;background:#6366f1;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;">
              Reply in Tutafy →
            </a>
            <p style="color:#9ca3af;font-size:12px;margin-top:32px;">Tutafy · tutafy.com</p>
          </div>
        `,
      }).catch(() => {})
    }
  }

  return NextResponse.json({ message })
}
