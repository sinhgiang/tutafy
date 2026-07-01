import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createAdminClient } from '@/lib/supabase/server'

// Used from student portal (token auth) OR tutor dashboard (no token)
export async function POST(req: NextRequest) {
  const { homework_text, lesson_id, portal_token } = await req.json()

  if (!homework_text?.trim()) {
    return NextResponse.json({ error: 'homework_text required' }, { status: 400 })
  }

  // Validate access: either portal token or verify lesson belongs to authenticated tutor
  let lessonHomework = ''
  let studentName = ''

  const supabase = createAdminClient()

  if (portal_token) {
    // Student accessing via portal
    const { data: student } = await supabase
      .from('students').select('id, name').eq('portal_token', portal_token).single()
    if (!student) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    studentName = student.name

    if (lesson_id) {
      const { data: lesson } = await supabase
        .from('lessons').select('homework').eq('id', lesson_id).eq('student_id', student.id).single()
      lessonHomework = lesson?.homework ?? ''
    }
  } else {
    return NextResponse.json({ error: 'portal_token required' }, { status: 400 })
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 503 })
  }

  const prompt = `You are a language teacher providing homework feedback. Be encouraging but specific.

${lessonHomework ? `Assignment: ${lessonHomework}\n\n` : ''}Student submission from ${studentName}:
"${homework_text}"

Provide feedback in this format:
1. Overall score (e.g. 8/10)
2. What was done well (1-2 sentences)
3. What to improve (1-2 specific corrections)
4. Encouragement

Use plain text. Be concise and friendly.`

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  const feedback = completion.choices[0]?.message?.content ?? ''
  return NextResponse.json({ feedback })
}
