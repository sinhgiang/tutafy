import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { lesson_ids, action } = await req.json()

  if (!Array.isArray(lesson_ids) || lesson_ids.length === 0) {
    return NextResponse.json({ error: 'No lessons selected' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (action === 'mark_paid') {
    const { error } = await supabase
      .from('lessons')
      .update({ payment_status: 'paid' })
      .in('id', lesson_ids)
      .eq('tutor_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, updated: lesson_ids.length })
  }

  if (action === 'mark_completed') {
    const { error } = await supabase
      .from('lessons')
      .update({ status: 'completed' })
      .in('id', lesson_ids)
      .eq('tutor_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, updated: lesson_ids.length })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
