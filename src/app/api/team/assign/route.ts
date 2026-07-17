import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/team/assign — assign (or unassign) a lesson to a team member.
// Body: { lessonId, memberId }  (memberId null/empty = unassign)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const lessonId = (body?.lessonId ?? '').toString()
  const memberId = body?.memberId ? String(body.memberId) : null
  if (!lessonId) return NextResponse.json({ error: 'lessonId is required' }, { status: 400 })

  // The member (if any) must belong to this owner.
  if (memberId) {
    const { data: m } = await supabase.from('team_members').select('id').eq('id', memberId).eq('owner_id', user.id).maybeSingle()
    if (!m) return NextResponse.json({ error: 'team member not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('lessons')
    .update({ assigned_to: memberId })
    .eq('id', lessonId)
    .eq('tutor_id', user.id)
    .select('id, assigned_to')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'lesson not found' }, { status: 404 })
  return NextResponse.json({ ok: true, lesson: data })
}
