import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminGateTarget, isAdminEmail } from '@/lib/admin'

/**
 * Server-side admin check for admin layouts and pages. A layout alone is not a
 * safe gate (Next does not re-render layouts on every navigation), so each page
 * that reads other people's data calls this itself, before it queries anything.
 * Signed out goes to /login; any other account goes to /dashboard.
 */
export async function requireAdminPage(): Promise<void> {
  const supabase = await createClient({ real: true })
  const { data: { user } } = await supabase.auth.getUser()
  const target = adminGateTarget(user)
  if (target) redirect(target)
}

/**
 * The same admin check for an API route (no redirect, a JSON answer instead): 401 when signed out,
 * 403 for any account that is not the admin, null when the caller may go on.
 */
export async function adminApiGate(): Promise<Response | null> {
  const supabase = await createClient({ real: true })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminEmail(user.email)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

/**
 * For an admin API that changes something: the request must come from this site's own pages (the Origin header, when the browser sends one,
 * must be our own host). null when it may go on, a 403 otherwise. Used after adminApiGate(), never instead of it.
 */
export function sameOriginGate(request: Request): Response | null {
  const origin = request.headers.get('origin')
  if (!origin) return null
  let host = ''
  try { host = new URL(origin).host } catch { /* not a URL: refused below */ }
  return host === request.headers.get('host') ? null : Response.json({ error: 'Forbidden' }, { status: 403 })
}
