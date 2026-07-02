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

  if (!user && (isDashboardPage || isAdminPage)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isAdminPage && user.email !== ADMIN_EMAIL) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (user && isAuthPage) {
    const dest = user.email === ADMIN_EMAIL ? '/admin' : '/dashboard'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|book|api|portal|onboarding|sw.js|manifest.webmanifest|offline|icon-).*)'],
}
