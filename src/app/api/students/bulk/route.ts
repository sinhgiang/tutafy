// Bulk change of student status from the Students list (T-0822): set the chosen students to active, paused or inactive.
// Only the signed-in tutor's own students are touched (the tutor id is the session's, in the same update), and the answer
// counts the rows really changed, not the ids that were sent.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/list-params'
import { BULK_STATUS } from '@/lib/student-list'

const MAX_IDS = 100

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null) as { ids?: unknown; status?: unknown } | null
  const ids = body?.ids
  const status = body?.status
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_IDS || !ids.every(isUuid)) {
    return NextResponse.json({ error: 'Choose between 1 and 100 students' }, { status: 400 })
  }
  if (typeof status !== 'string' || !(BULK_STATUS as readonly string[]).includes(status)) {
    return NextResponse.json({ error: 'Unknown status' }, { status: 400 })
  }

  const { data, error } = await supabase.from('students').update({ status }).in('id', ids).eq('tutor_id', user.id).select('id')
  if (error) return NextResponse.json({ error: 'Could not update the students' }, { status: 500 })
  return NextResponse.json({ ok: true, updated: (data ?? []).length })
}
