import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lesson_id, send_email } = await req.json()
  if (!lesson_id) return NextResponse.json({ error: 'lesson_id required' }, { status: 400 })

  const { data: lesson } = await supabase
    .from('lessons')
    .select('*, students(name, email)')
    .eq('id', lesson_id)
    .eq('tutor_id', user.id)
    .single()

  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

  const { data: tutor } = await supabase
    .from('tutors').select('name').eq('id', user.id).single()

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 503 })
  }

  const student = lesson.students as any
  const vocab = (lesson.vocabulary as { word: string; definition: string }[]) ?? []

  const prompt = `You are a professional language tutor. Write a concise, friendly lesson summary to send to a student after their lesson.

Student: ${student?.name}
Date: ${new Date(lesson.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
Duration: ${lesson.duration_minutes} minutes
${lesson.notes ? `Lesson Notes: ${lesson.notes}` : ''}
${lesson.homework ? `Homework Assigned: ${lesson.homework}` : ''}
${vocab.length > 0 ? `Vocabulary Covered: ${vocab.map(v => `${v.word} (${v.definition})`).join(', ')}` : ''}

Write a warm, encouraging 3-4 sentence summary covering: what was covered, key takeaway, and a reminder about homework if any. Use plain text, no markdown.`

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  const summary = completion.choices[0]?.message?.content ?? ''

  // Optionally send via email
  if (send_email && student?.email && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Tutafy <onboarding@resend.dev>',
      to: student.email,
      subject: `Lesson Summary — ${new Date(lesson.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <div style="background:#6366f1;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
            <h1 style="color:white;margin:0;font-size:18px;">📚 Lesson Summary</h1>
            <p style="color:#c7d2fe;margin:4px 0 0;font-size:13px;">
              ${new Date(lesson.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <p style="color:#374151;font-size:15px;">Hi <strong>${student.name}</strong>,</p>
          <p style="color:#374151;font-size:15px;line-height:1.6;">${summary}</p>
          ${lesson.homework ? `
          <div style="background:#fef3c7;border-radius:10px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 6px;color:#92400e;font-size:12px;font-weight:600;">📝 HOMEWORK</p>
            <p style="margin:0;color:#78350f;font-size:14px;">${lesson.homework}</p>
          </div>` : ''}
          ${vocab.length > 0 ? `
          <div style="background:#f3f4f6;border-radius:10px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 10px;color:#6b7280;font-size:12px;font-weight:600;">🔤 VOCABULARY</p>
            ${vocab.map(v => `<p style="margin:4px 0;color:#111827;font-size:13px;"><strong>${v.word}</strong> — ${v.definition}</p>`).join('')}
          </div>` : ''}
          <p style="color:#9ca3af;font-size:12px;margin-top:32px;text-align:center;">
            Sent by ${tutor?.name ?? 'your tutor'} via Tutafy
          </p>
        </div>`,
    }).catch(() => {})
  }

  return NextResponse.json({ summary })
}
