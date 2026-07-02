import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { lesson_id, content } = await req.json()

  if (!lesson_id || !content?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: student } = await supabase
    .from('students')
    .select('id, name, status')
    .eq('portal_token', token)
    .single()

  if (!student || student.status === 'inactive') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id')
    .eq('id', lesson_id)
    .eq('student_id', student.id)
    .single()

  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

  // Check for existing submission first, then update or insert
  const { data: existing } = await supabase
    .from('homework_submissions')
    .select('id')
    .eq('lesson_id', lesson_id)
    .eq('student_id', student.id)
    .single()

  let error
  if (existing) {
    const res = await supabase
      .from('homework_submissions')
      .update({ content: content.trim(), submitted_at: new Date().toISOString() })
      .eq('id', existing.id)
    error = res.error
  } else {
    const res = await supabase
      .from('homework_submissions')
      .insert({ lesson_id, student_id: student.id, content: content.trim(), submitted_at: new Date().toISOString() })
    error = res.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Notify tutor by email (fire-and-forget)
  try {
    const { data: lesson } = await supabase
      .from('lessons')
      .select('starts_at, tutors(name, email)')
      .eq('id', lesson_id)
      .single()

    const tutor = lesson?.tutors as any
    if (tutor?.email && process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('your_')) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const dateLabel = lesson?.starts_at
        ? new Date(lesson.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
        : 'your lesson'
      await resend.emails.send({
        from: 'Tutafy <noreply@tutafy.com>',
        to: tutor.email,
        subject: `${student.name || 'Your student'} submitted homework`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
            <h2 style="color:#111827;margin-bottom:8px;">Homework submitted 📝</h2>
            <p style="color:#374151;font-size:15px;">
              <strong>${(student as any).name || 'A student'}</strong> submitted homework for the lesson on <strong>${dateLabel}</strong>.
            </p>
            <div style="background:#f3f4f6;border-radius:12px;padding:16px;margin:20px 0;">
              <p style="margin:0;color:#374151;font-size:13px;white-space:pre-wrap;">${content.trim().slice(0, 500)}${content.trim().length > 500 ? '...' : ''}</p>
            </div>
            <p style="color:#9ca3af;font-size:12px;">Log in to Tutafy to leave feedback on this submission.</p>
          </div>
        `,
      }).catch(() => {})
    }
  } catch { /* non-critical */ }

  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const lessonId = req.nextUrl.searchParams.get('lesson_id')
  if (!lessonId) return NextResponse.json({ submission: null })

  const supabase = createAdminClient()

  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('portal_token', token)
    .single()

  if (!student) return NextResponse.json({ submission: null })

  const { data } = await supabase
    .from('homework_submissions')
    .select('*')
    .eq('lesson_id', lessonId)
    .eq('student_id', student.id)
    .single()

  return NextResponse.json({ submission: data ?? null })
}
