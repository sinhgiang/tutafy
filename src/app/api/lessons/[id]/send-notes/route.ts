import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, starts_at, notes, homework, vocabulary, students(name, email, portal_token), tutors(name)')
    .eq('id', id).eq('tutor_id', user.id).single()

  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const student = lesson.students as any
  if (!student?.email) return NextResponse.json({ error: 'No student email' }, { status: 400 })

  if (!process.env.RESEND_API_KEY?.startsWith('re_')) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 503 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const tutor = lesson.tutors as any
  const lessonDate = new Date(lesson.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const vocab = Array.isArray(lesson.vocabulary) ? lesson.vocabulary : []
  const portalUrl = student.portal_token ? `https://tutafy.com/portal/${student.portal_token}` : 'https://tutafy.com'

  const vocabHtml = vocab.length > 0 ? `
    <div style="background:#f3f4f6;border-radius:12px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0 0 8px;color:#6b7280;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Vocabulary (${vocab.length} words)</p>
      ${vocab.map((v: any) => `<div style="display:flex;gap:12px;margin:4px 0;"><span style="font-size:13px;font-weight:600;color:#1f2937;min-width:120px;">${v.word}</span><span style="font-size:13px;color:#6b7280;">${v.definition ?? v.def ?? ''}</span></div>`).join('')}
    </div>` : ''

  await resend.emails.send({
    from: 'Tutafy <noreply@tutafy.com>',
    to: student.email,
    subject: `Lesson notes — ${tutor?.name ?? 'your tutor'} · ${lessonDate}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
        <div style="background:#6366f1;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
          <p style="color:rgba(255,255,255,0.7);margin:0 0 4px;font-size:12px;">Lesson recap</p>
          <h1 style="color:white;margin:0;font-size:20px;">${lessonDate}</h1>
        </div>
        <p style="color:#374151;font-size:15px;">Hi <strong>${student.name}</strong>,</p>
        ${lesson.notes ? `
          <div style="margin:16px 0;">
            <p style="margin:0 0 8px;color:#6b7280;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Lesson Notes</p>
            <p style="color:#374151;font-size:14px;line-height:1.6;white-space:pre-wrap;">${lesson.notes}</p>
          </div>` : ''}
        ${lesson.homework ? `
          <div style="background:#fef3c7;border-radius:12px;padding:16px 20px;margin:16px 0;border:1px solid #fde68a;">
            <p style="margin:0 0 8px;color:#92400e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Homework</p>
            <p style="color:#78350f;font-size:14px;line-height:1.6;white-space:pre-wrap;">${lesson.homework}</p>
          </div>` : ''}
        ${vocabHtml}
        <div style="text-align:center;margin:24px 0;">
          <a href="${portalUrl}" style="background:#6366f1;color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">View in Portal &rarr;</a>
        </div>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px;text-align:center;">Powered by Tutafy &middot; tutafy.com</p>
      </div>`,
  })

  return NextResponse.json({ ok: true })
}
