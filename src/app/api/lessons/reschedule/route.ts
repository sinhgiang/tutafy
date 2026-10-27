// Moves a lesson to a new start (T-0823): the Calendar's drag and drop, and its "Move to" form for phones and keyboards.
// The lesson must be the signed-in tutor's own and still scheduled (the tutor id is the session's, in the same update).
// If the new time overlaps another lesson of the tutor the answer is 409 with the lessons it overlaps, and nothing is
// changed until the tutor sends the move again with force: true. Cancelled lessons take no time and never conflict.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/list-params'
import { conflictsFor, takesTime } from '@/lib/calendar'

const YEAR = 365 * 86_400_000

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null) as { lesson_id?: unknown; starts_at?: unknown; force?: unknown } | null
  const id = body?.lesson_id
  if (!isUuid(id)) return NextResponse.json({ error: 'Unknown lesson' }, { status: 400 })
  const startsAt = typeof body?.starts_at === 'string' ? new Date(body.starts_at) : null
  if (!startsAt || Number.isNaN(startsAt.getTime()) || Math.abs(startsAt.getTime() - Date.now()) > 3 * YEAR) {
    return NextResponse.json({ error: 'Choose a valid date and time' }, { status: 400 })
  }

  const { data: lesson } = await supabase.from('lessons').select('id, starts_at, duration_minutes, status')
    .eq('id', id).eq('tutor_id', user.id).maybeSingle()
  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  if (lesson.status !== 'scheduled') return NextResponse.json({ error: 'Only a scheduled lesson can be moved' }, { status: 409 })

  const duration = Number(lesson.duration_minutes) || 60
  const dayBefore = new Date(startsAt.getTime() - 86_400_000).toISOString()
  const dayAfter = new Date(startsAt.getTime() + 86_400_000 + duration * 60_000).toISOString()
  const { data: near, error: nearError } = await supabase.from('lessons').select('id, starts_at, duration_minutes, status, students(name)')
    .eq('tutor_id', user.id).gte('starts_at', dayBefore).lt('starts_at', dayAfter)
  if (nearError) return NextResponse.json({ error: 'Could not check the schedule' }, { status: 500 })

  type Near = { id: string; starts_at: string; duration_minutes: number; status: string; students: { name: string } | { name: string }[] | null }
  const others = ((near ?? []) as Near[]).filter(n => takesTime(n.status))
  const hits = conflictsFor(
    others.map(o => ({ id: o.id, startsAt: new Date(o.starts_at), durationMinutes: Number(o.duration_minutes) || 60 })),
    { id, start: startsAt, durationMinutes: duration },
  )
  if (hits.length > 0 && body?.force !== true) {
    const byId = new Map(others.map(o => [o.id, o]))
    return NextResponse.json({
      error: 'overlap',
      conflicts: hits.map(h => {
        const o = byId.get(h.id)!
        const s = Array.isArray(o.students) ? o.students[0] : o.students
        return { id: h.id, starts_at: o.starts_at, duration_minutes: h.durationMinutes, student: s?.name ?? 'Another lesson' }
      }),
    }, { status: 409 })
  }

  const { data, error } = await supabase.from('lessons').update({ starts_at: startsAt.toISOString(), ends_at: new Date(startsAt.getTime() + duration * 60_000).toISOString() })
    .eq('id', id).eq('tutor_id', user.id).eq('status', 'scheduled').select('id')
  if (error) return NextResponse.json({ error: 'Could not move the lesson' }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  return NextResponse.json({ ok: true, starts_at: startsAt.toISOString() })
}
