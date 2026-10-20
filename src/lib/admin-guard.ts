import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminGateTarget } from '@/lib/admin'

/**
 * Server-side admin check for admin layouts and pages. A layout alone is not a
 * safe gate (Next does not re-render layouts on every navigation), so each page
 * that reads other people's data calls this itself, before it queries anything.
 * Signed out goes to /login; any other account goes to /dashboard.
 */
export async function requireAdminPage(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const target = adminGateTarget(user)
  if (target) redirect(target)
}
