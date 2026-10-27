import { NextResponse } from 'next/server'
import { requireApiPlan } from '@/lib/api-guard'

// POST /api/team/assign — assign (or unassign) a lesson to a team member.
// Body: { lessonId, memberId }  (memberId null/empty = unassign)
export async function POST(request: Request) {
  const gate = await requireApiPlan('academy')
  if ('error' in gate) return gate.error
  const { supabase, userId: user } = gate

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const lessonId = (body?.lessonId ?? '').toString()
  const memberId = body?.memberId ? String(body.memberId) : null
  if (!lessonId) return NextResponse.json({ error: 'lessonId is required' }, { status: 400 })

  // The member (if any) must belong to this owner.
  if (memberId) {
    const { data: m } = await supabase.from('team_members').select('id').eq('id', memberId).eq('owner_id', user).maybeSingle()
    if (!m) return NextResponse.json({ error: 'team member not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('lessons')
    .update({ assigned_to: memberId })
    .eq('id', lessonId)
    .eq('tutor_id', user)
    .select('id, assigned_to')
    .maybeSingle() // a lesson that is not this owner's is a 404 below, not a database error (T-0841)
  if (error) return NextResponse.json({ error: 'Could not assign the lesson' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'lesson not found' }, { status: 404 })
  return NextResponse.json({ ok: true, lesson: data })
}
