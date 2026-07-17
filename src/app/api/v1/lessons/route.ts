import { NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/apiAuth'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/v1/lessons — list this tutor's lessons (newest first).
// Supports ?status (scheduled|completed|cancelled|no_show), ?limit, ?offset.
export async function GET(request: Request) {
  const caller = await authenticateApiKey(request)
  if (!caller) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })

  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50') || 50))
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0') || 0)

  const supabase = createAdminClient()
  let query = supabase
    .from('lessons')
    .select('id, starts_at, ends_at, duration_minutes, status, payment_status, price, students(name, email)')
    .eq('tutor_id', caller.tutorId)
    .order('starts_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const lessons = (data ?? []).map((l: any) => ({
    id: l.id,
    starts_at: l.starts_at,
    ends_at: l.ends_at,
    duration_minutes: l.duration_minutes,
    status: l.status,
    payment_status: l.payment_status,
    price: l.price,
    student_name: l.students?.name ?? null,
    student_email: l.students?.email ?? null,
  }))
  return NextResponse.json({ lessons })
}
