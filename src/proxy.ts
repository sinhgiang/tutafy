import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { isAdminEmail } from '@/lib/admin'
import { viewBlock } from '@/lib/view-proxy'
import { findViewSession } from '@/lib/view-session'
import { parsePaidPlan, registerHref, upgradeHref } from '@/lib/plan-list'

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // "View as this tutor" (T-0708): while a valid view is open the whole app is read-only. Needs no work at all when there is no view cookie.
  const blocked = await viewBlock(request, async sessionId => {
    if (!supabaseUrl || !supabaseKey) return { valid: false }
    const probe = createServerClient(supabaseUrl, supabaseKey, { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } })
    const { data: { user } } = await probe.auth.getUser()
    if (!user || !isAdminEmail(user.email)) return { valid: false }
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return { valid: false }
    const admin = createSupabaseClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    return { valid: Boolean(await findViewSession(admin, sessionId, user.id)) }
  })
  if (blocked) return blocked
  // API routes are in the matcher only for the check above; they have no other work here.
  if (request.nextUrl.pathname === '/api' || request.nextUrl.pathname.startsWith('/api/')) return NextResponse.next({ request })


  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your_')) {
    return NextResponse.next({ request })
  }

  // White-label: if request comes from a custom domain, route to /book/[slug]
  const hostname = request.headers.get('host') ?? ''
  const isMain = hostname.includes('tutafy.com') || hostname.includes('localhost') || hostname.startsWith('127.')

  if (!isMain) {
    try {
      // T-0774: a visitor's key cannot read the tutors table, so this lookup is made with the server's key (this file runs on the
      // server only). It asks for the slug only, and only for a tutor whose booking page is on, as the old policy allowed.
      const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!serverKey) throw new Error('no server key')
      const res = await fetch(
        `${supabaseUrl}/rest/v1/tutors?custom_domain=eq.${encodeURIComponent(hostname)}&booking_url_active=eq.true&select=slug&limit=1`,
        { headers: { apikey: serverKey, Authorization: `Bearer ${serverKey}` } }
      )
      const rows = await res.json() as { slug: string }[]
      if (rows.length > 0 && rows[0].slug) {
        const url = request.nextUrl.clone()
        url.pathname = `/book/${rows[0].slug}`
        return NextResponse.rewrite(url)
      }
    } catch { /* fail open */ }
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  const isAuthPage = path.startsWith('/login') || path.startsWith('/register')
  const isDashboardPage = path.startsWith('/dashboard') ||
    path.startsWith('/students') ||
    path.startsWith('/calendar') ||
    path.startsWith('/lessons') ||
    path.startsWith('/payments') ||
    path.startsWith('/earnings') ||
    path.startsWith('/reports') ||
    path.startsWith('/availability') ||
    path.startsWith('/ai') ||
    path.startsWith('/settings') ||
    path.startsWith('/referral') ||
    path.startsWith('/subscriptions') ||
    path.startsWith('/packages') ||
    path.startsWith('/import') ||
    path.startsWith('/messages') ||
    path.startsWith('/upgrade')
  const isAdminPage = path.startsWith('/admin') || path === '/super-admin' || path.startsWith('/super-admin/')

  // Helper: carry session cookies through redirects to prevent refresh-token loop
  function redirect(dest: string) {
    const res = NextResponse.redirect(new URL(dest, request.url))
    supabaseResponse.cookies.getAll().forEach(c => res.cookies.set(c.name, c.value, c))
    return res
  }

  if (!user && (isDashboardPage || isAdminPage)) {
    // T-1052: somebody who pressed "Go Pro" or "Start Academy" while signed out goes to SIGN-UP with that plan kept
    // (never to a blank sign-in); only the exact words "pro" and "academy" are kept, anything else is a plain sign-in.
    const picked = path === '/upgrade' ? parsePaidPlan(request.nextUrl.searchParams.get('plan')) : null
    return redirect(picked ? registerHref(picked) : '/login')
  }

  // Admin bypass — the admin account can reach everything.
  if (user && isAdminEmail(user.email)) {
    if (isAuthPage) return redirect('/admin')
    return supabaseResponse
  }

  if (user && isAdminPage) {
    return redirect('/dashboard')
  }

  // Is this signed-in account actually a tutor? A logged-in NON-tutor (e.g. a
  // student who signed in with Google) must never be pushed into the tutor
  // dashboard — the dashboard layout would redirect them back to /login, and
  // the /login→/dashboard rule below would send them back again: an infinite
  // ERR_TOO_MANY_REDIRECTS loop.
  let isTutor = true
  if (user && (isDashboardPage || isAuthPage)) {
    try {
      // T-0774: asked with the signed-in account's own session (the policy "Tutors can view own profile"), never with the public key:
      // that key cannot read the tutors table, and, before, it saw only tutors whose booking page is on.
      const { data: own, error } = await supabase.from('tutors').select('id').eq('id', user.id).maybeSingle()
      isTutor = error ? true : !!own
    } catch {
      isTutor = true // fail open: never lock a real tutor out on a transient error
    }
  }

  // Signed in but not a tutor → send to the student sign-in, not the tutor area.
  if (user && isDashboardPage && !isTutor) {
    return redirect('/student/login')
  }

  // Only bounce real tutors away from the login/register pages.
  if (user && isAuthPage && isTutor) {
    // An account that is already signed in and arrives with a plan picked (a sign-up link with ?plan=) goes on to that plan.
    const picked = parsePaidPlan(request.nextUrl.searchParams.get('plan'))
    return redirect(picked ? upgradeHref(picked) : '/dashboard')
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|book|api|portal|onboarding|sw.js|manifest.webmanifest|offline|icon-|icon\\.svg|apple-icon|brand/).*)', '/api/:path*'],
}
