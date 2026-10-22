import { NextResponse, type NextRequest } from 'next/server'
import { adminApiGate } from '@/lib/admin-guard'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { closeViewSession, findViewSession } from '@/lib/view-session'
import { VIEW_COOKIE, VIEW_FLAG_COOKIE, isUuid } from '@/lib/view-as'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/view/exit  (the Exit button of the strip, T-0708). Writes the closing time of the admin's own open view, clears the
 * two cookies and sends the admin back to that tutor's page. It is the one write the proxy lets through while a view is open.
 */
export async function POST(request: NextRequest) {
  const denied = await adminApiGate()
  if (denied) return denied

  const sessionId = request.cookies.get(VIEW_COOKIE)?.value
  const { data: { user } } = await (await createClient({ real: true })).auth.getUser()
  let back = '/admin/tutors'
  if (user && sessionId) {
    const admin = createAdminClient()
    const session = await findViewSession(admin, sessionId, user.id)
    if (session && isUuid(session.tutorId)) back = `/admin/tutors/${session.tutorId}`
    await closeViewSession(admin, sessionId, user.id)
  }

  const res = NextResponse.redirect(new URL(back, request.url), 303)
  for (const name of [VIEW_COOKIE, VIEW_FLAG_COOKIE]) res.cookies.set(name, '', { path: '/', maxAge: 0 })
  return res
}
