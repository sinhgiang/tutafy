import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your_')) {
    return NextResponse.next({ request })
  }

  // White-label: if request comes from a custom domain, route to /book/[slug]
  const hostname = request.headers.get('host') ?? ''
  const isMain = hostname.includes('tutafy.com') || hostname.includes('localhost') || hostname.startsWith('127.')

  if (!isMain) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/tutors?custom_domain=eq.${encodeURIComponent(hostname)}&select=slug&limit=1`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
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

  const ADMIN_EMAIL = 'tubxeebyajtube@gmail.com'
  const path = request.nextUrl.pathname

  const isAuthPage = path.startsWith('/login') || path.startsWith('/register')
  const isDashboardPage = path.startsWith('/dashboard') ||
    path.startsWith('/students') ||
    path.startsWith('/calendar') ||
    path.startsWith('/lessons') ||
    path.startsWith('/payments') ||
    path.startsWith('/availability') ||
    path.startsWith('/ai') ||
    path.startsWith('/settings') ||
    path.startsWith('/referral') ||
    path.startsWith('/subscriptions') ||
    path.startsWith('/packages') ||
    path.startsWith('/import') ||
    path.startsWith('/messages') ||
    path.startsWith('/upgrade')
  const isAdminPage = path.startsWith('/admin')

  // Helper: carry session cookies through redirects to prevent refresh-token loop
  function redirect(dest: string) {
    const res = NextResponse.redirect(new URL(dest, request.url))
    supabaseResponse.cookies.getAll().forEach(c => res.cookies.set(c.name, c.value, c as any))
    return res
  }

  if (!user && (isDashboardPage || isAdminPage)) {
    return redirect('/login')
  }

  // Admin bypass — the admin account can reach everything.
  if (user && user.email === ADMIN_EMAIL) {
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
      const r = await fetch(
        `${supabaseUrl}/rest/v1/tutors?id=eq.${user.id}&select=id&limit=1`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      )
      const rows = await r.json() as unknown[]
      isTutor = Array.isArray(rows) && rows.length > 0
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
    return redirect('/dashboard')
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|book|api|portal|onboarding|sw.js|manifest.webmanifest|offline|icon-).*)'],
}
