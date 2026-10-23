import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/list-params'

export const dynamic = 'force-dynamic'

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/

// A student asking to be told when a tutor has room (the public booking page calls this, so it is open to visitors). T-0825: what
// it stores is checked: the tutor id must be an id, the name 1 to 80 characters, the email an address, the message up to 500.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { tutor_id?: unknown; name?: unknown; email?: unknown; message?: unknown } | null
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!isUuid(body?.tutor_id) || !name || name.length > 80 || !EMAIL.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  const message = typeof body?.message === 'string' && body.message.trim() ? body.message.trim().slice(0, 500) : null

  const supabase = createAdminClient()
  const { error } = await supabase.from('waitlist').upsert({ tutor_id: body!.tutor_id as string, name, email, message }, { onConflict: 'tutor_id,email' })
  if (error) return NextResponse.json({ error: 'Could not join the waitlist' }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null) as { id?: unknown } | null
  if (!isUuid(body?.id)) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { data } = await supabase.from('waitlist').delete().eq('id', body!.id as string).eq('tutor_id', user.id).select('id')
  if (!data || data.length === 0) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
