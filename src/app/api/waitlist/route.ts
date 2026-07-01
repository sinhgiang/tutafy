import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { tutor_id, name, email, message } = await req.json()
  if (!tutor_id || !name || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('waitlist').upsert({
    tutor_id, name, email: email.toLowerCase(), message: message ?? null,
  }, { onConflict: 'tutor_id,email' })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await supabase.from('waitlist').delete().eq('id', id).eq('tutor_id', user.id)
  return NextResponse.json({ ok: true })
}
