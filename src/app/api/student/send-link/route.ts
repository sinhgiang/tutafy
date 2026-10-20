import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { isStudentAuthConfigured, signStudentToken } from '@/lib/student-auth'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    // No signing key on the server (nothing is written in the code): no link can be made, for anyone.
    if (!isStudentAuthConfigured()) return NextResponse.json({ error: 'Unavailable' }, { status: 503 })

    const normalizedEmail = email.toLowerCase().trim()
    const supabase = createAdminClient()

    const { data: students } = await supabase
      .from('students')
      .select('id, name')
      .eq('email', normalizedEmail)
      .eq('status', 'active')
      .limit(1)

    // Always return success (don't reveal if email exists)
    if (!students?.length) {
      return NextResponse.json({ ok: true })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutafy.com'
    const token = signStudentToken(normalizedEmail)
    const link = `${appUrl}/student/dashboard?token=${token}`
    const firstName = students[0].name.split(' ')[0]

    if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('your_')) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'Tutafy <noreply@tutafy.com>',
        to: email,
        subject: 'Access your Tutafy lessons',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
            <div style="background:#6366f1;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <h1 style="color:white;margin:0;font-size:22px;">Your Lessons 📚</h1>
            </div>
            <p style="color:#374151;font-size:15px;">Hi <strong>${firstName}</strong>,</p>
            <p style="color:#374151;font-size:15px;">Click the button below to view all your upcoming lessons, homework, and progress.</p>
            <a href="${link}" style="display:block;background:#6366f1;color:white;text-align:center;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:bold;margin:24px 0;font-size:15px;">
              View My Lessons →
            </a>
            <p style="color:#9ca3af;font-size:12px;">This link expires in 7 days. Do not share it with others.</p>
            <p style="color:#9ca3af;font-size:12px;margin-top:4px;">Powered by Tutafy</p>
          </div>
        `,
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
