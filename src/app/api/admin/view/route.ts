import { NextResponse, type NextRequest } from 'next/server'
import { adminApiGate } from '@/lib/admin-guard'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { openViewSession } from '@/lib/view-session'
import { VIEW_COOKIE, VIEW_FLAG_COOKIE, VIEW_TTL_MS, isUuid } from '@/lib/view-as'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/view  (form field: tutor_id). The platform admin opens the read-only view of one tutor (T-0708).
 * - Only the admin account may do it (the same gate as every admin API), and only from this site (the Origin must be our own host).
 * - The log row is written FIRST; if it cannot be (the table is not there yet), no view is opened and the admin is sent back with a
 *   reason. The row's id is the view: it goes to the browser in an httpOnly cookie, nothing about the tutor's login is ever used.
 */
export async function POST(request: NextRequest) {
  const denied = await adminApiGate()
  if (denied) return denied

  const origin = request.headers.get('origin')
  if (origin) {
    let host = ''
    try { host = new URL(origin).host } catch { /* not a URL: refused below */ }
    if (host !== request.headers.get('host')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const form = await request.formData().catch(() => null)
  const tutorId = String(form?.get('tutor_id') ?? '')
  if (!isUuid(tutorId)) return NextResponse.redirect(new URL('/admin/tutors', request.url), 303)

  const { data: { user } } = await (await createClient({ real: true })).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const opened = await openViewSession(createAdminClient(), user.id, tutorId)
  if (!opened.ok) return NextResponse.redirect(new URL(`/admin/tutors/${tutorId}?view=${opened.reason}`, request.url), 303)

  const res = NextResponse.redirect(new URL('/dashboard', request.url), 303)
  const common = { sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: Math.floor(VIEW_TTL_MS / 1000) }
  res.cookies.set(VIEW_COOKIE, opened.session.id, { ...common, httpOnly: true })
  // Not trusted for anything: it only tells the browser pages to read through the server while a view may be open.
  res.cookies.set(VIEW_FLAG_COOKIE, '1', { ...common, httpOnly: false })
  return res
}
