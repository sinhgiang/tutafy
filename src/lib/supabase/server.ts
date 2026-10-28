import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { isAdminEmail } from '@/lib/admin'
import { VIEW_COOKIE } from '@/lib/view-as'
import { findViewSession } from '@/lib/view-session'
import { createViewClient } from '@/lib/supabase/view-client'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const isConfigured =
  SUPABASE_URL.startsWith('http') && !SUPABASE_URL.includes('your_')

/** The client of the account that is really signed in. Admin checks and the "View as this tutor" start and exit use this one. */
async function createRealClient() {
  const cookieStore = await cookies()

  if (!isConfigured) {
    throw new Error('Supabase is not configured. Please fill in .env.local')
  }

  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {}
      },
    },
  })
}

/**
 * The tutor whose dashboard the signed-in ADMIN has open in the read-only view (T-0708), or null. Cheap when no view is open: without
 * the cookie nothing is read. With it, the view counts only if the really signed-in account is the admin AND the cookie names a log
 * row of that admin that is open and has not run out (src/lib/view-session.ts). Anything else is no view at all.
 */
export async function activeViewTutor(): Promise<{ id: string; email: string; name: string; sessionId: string } | null> {
  const sessionId = (await cookies()).get(VIEW_COOKIE)?.value
  if (!sessionId || !isConfigured || !SERVICE_ROLE_KEY) return null
  const { data: { user } } = await (await createRealClient()).auth.getUser()
  if (!user || !isAdminEmail(user.email)) return null
  const admin = createAdminClient()
  const session = await findViewSession(admin, sessionId, user.id)
  if (!session) return null
  const { data: tutor } = await admin.from('tutors').select('id, email, name').eq('id', session.tutorId).maybeSingle()
  return tutor ? { id: tutor.id, email: tutor.email, name: tutor.name, sessionId } : null
}

/**
 * The client of a page or an API route. Normally the signed-in account's own. While the admin has a valid "View as this tutor" open it
 * is the read-only view of that tutor instead (src/lib/supabase/view-client.ts), so every dashboard page runs unchanged and can only
 * read. `real: true` always gives the signed-in account's own client: the admin gates use it so the admin is still the admin in a view.
 */
export async function createClient(opts?: { real?: boolean }) {
  if (!opts?.real) {
    const view = await activeViewTutor()
    if (view) return createViewClient(view, { url: SUPABASE_URL, serviceKey: SERVICE_ROLE_KEY })
  }
  return createRealClient()
}

// Bypasses RLS — admin use only
export function createAdminClient() {
  if (!isConfigured || !SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin client is not configured')
  }
  return createSupabaseClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
