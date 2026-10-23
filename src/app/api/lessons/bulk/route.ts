import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/list-params'

const MAX_IDS = 100
const ACTIONS: Record<string, Record<string, string>> = {
  mark_paid: { payment_status: 'paid' },
  mark_completed: { status: 'completed' },
}

// Bulk update from the Lessons list. T-0822: the ids are checked (uuids, at most 100), and the answer counts the rows really
// changed (only the signed-in tutor's own lessons: the tutor id is the session's, in the same update).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null) as { lesson_ids?: unknown; action?: unknown } | null
  const ids = body?.lesson_ids
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_IDS || !ids.every(isUuid)) {
    return NextResponse.json({ error: 'Choose between 1 and 100 lessons' }, { status: 400 })
  }
  const patch = typeof body?.action === 'string' ? ACTIONS[body.action] : undefined
  if (!patch) return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  const { data, error } = await supabase.from('lessons').update(patch).in('id', ids).eq('tutor_id', user.id).select('id')
  if (error) return NextResponse.json({ error: 'Could not update the lessons' }, { status: 500 })
  return NextResponse.json({ ok: true, updated: (data ?? []).length })
}
