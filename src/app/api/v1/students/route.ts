import { NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/apiAuth'
import { createAdminClient } from '@/lib/supabase/server'
import { fireWebhooks } from '@/lib/webhooks'

// GET /api/v1/students — list this tutor's students (newest first).
// Supports ?limit (max 100) and ?offset for polling/pagination.
export async function GET(request: Request) {
  const caller = await authenticateApiKey(request)
  if (!caller) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })

  const url = new URL(request.url)
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50') || 50))
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0') || 0)

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('students')
    .select('id, name, email, level, goals, status, created_at')
    .eq('tutor_id', caller.tutorId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ students: data ?? [] })
}

// POST /api/v1/students — create a student. Body: { name (required), email?, level?, goals?, phone? }
// Fires the `student.created` webhook so Zapier "new student" triggers can react.
export async function POST(request: Request) {
  const caller = await authenticateApiKey(request)
  if (!caller) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  const name = (body?.name ?? '').toString().trim()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('students')
    .insert({
      tutor_id: caller.tutorId,
      name,
      email: body.email ? String(body.email).trim() : null,
      level: body.level ? String(body.level).trim() : null,
      goals: body.goals ? String(body.goals).trim() : null,
      phone: body.phone ? String(body.phone).trim() : null,
    })
    .select('id, name, email, level, goals, status, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  fireWebhooks(caller.tutorId, 'student.created', { student: data })
  return NextResponse.json({ student: data }, { status: 201 })
}
