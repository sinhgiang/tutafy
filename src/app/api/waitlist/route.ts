import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/list-params'
import { clientIp } from '@/lib/client-ip'
import { createLimiter } from '@/lib/rate-limit-memory'

export const dynamic = 'force-dynamic'

// T-0841: the public form is open to anyone, so it is limited three ways. Each limit lives in one server instance's memory (the limiter
// keeps nothing on disk), so across several instances the real cap is a few times higher. The only thing a caller can influence is the
// address header, which Vercel sets itself (src/lib/client-ip.ts); the cap per tutor holds whatever address a caller claims. The price of
// that cap: someone using many addresses can use up one tutor's hour, and then real students see "try again in a few minutes" until it
// is over (the rows already written stay).
//   - per address: 5 sign-ups in 10 minutes (a student joining a few tutors' lists, or a shared school address, still fits);
//   - per tutor: 30 sign-ups an hour, so nobody can fill one tutor's waitlist with rubbish;
//   - overall: 300 a minute, a ceiling for the whole route.
const perAddress = createLimiter({ max: 5, windowMs: 10 * 60 * 1000 })
const perTutor = createLimiter({ max: 30, windowMs: 60 * 60 * 1000 })
const overall = createLimiter({ max: 300, windowMs: 60 * 1000 })
const WAITLIST_TOO_MANY = 'Too many sign-ups right now. Please try again in a few minutes.'

/** True when this sign-up may go on. Counts it on every limit it passes; a refused address does not use up the tutor's cap. */
function waitlistAllowed(ip: string, tutorId: string): boolean {
  if (!overall.hit('all')) return false
  if (ip && !perAddress.hit(ip)) return false
  return perTutor.hit(tutorId)
}

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
  // T-0841: the limits (src/lib/waitlist-limits.ts) come after the input check and before the database is touched
  if (!waitlistAllowed(clientIp(req.headers), body!.tutor_id as string)) {
    return NextResponse.json({ error: WAITLIST_TOO_MANY }, { status: 429, headers: { 'Retry-After': '600' } })
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
