import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export async function POST(request: NextRequest) {
  const { prompt, system } = await request.json()
  if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 })

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 503 })
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1500,
    messages: [
      {
        role: 'system',
        content: system ?? 'You are an expert language tutor assistant. Provide clear, practical, professional responses. Use plain text formatting only — no markdown symbols like **, ##, or bullet dashes. Write in clean paragraphs.',
      },
      { role: 'user', content: prompt },
    ],
  })

  const text = completion.choices[0]?.message?.content ?? ''
  return NextResponse.json({ text })
}
