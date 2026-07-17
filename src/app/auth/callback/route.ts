import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

function generateSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Math.random().toString(36).slice(2, 6)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // Role + next are carried in short-lived cookies (set right before the OAuth
  // redirect) rather than query params, because Supabase doesn't reliably keep
  // extra query params on the redirectTo — it would bounce to the Site URL
  // (homepage) and drop role=student, sending students into the tutor flow.
  const roleCookie = request.cookies.get('tutafy_oauth_role')?.value
  const nextCookie = request.cookies.get('tutafy_oauth_next')?.value
  const role = roleCookie ?? searchParams.get('role') // 'student' from booking/student area
  const next = (nextCookie ? decodeURIComponent(nextCookie) : searchParams.get('next'))
    ?? (role === 'student' ? '/student/dashboard' : '/dashboard')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const cookieStore = await cookies()
  // Clear the hand-off cookies so they don't leak into the next login
  cookieStore.set('tutafy_oauth_role', '', { maxAge: 0, path: '/' })
  cookieStore.set('tutafy_oauth_next', '', { maxAge: 0, path: '/' })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  const user = data.user
  const admin = createAdminClient()

  // Student login: link this Google account to their existing enrolment(s) by
  // email, then hand off to the existing token-based student dashboard.
  // Do NOT create a tutor profile.
  if (role === 'student') {
    const email = (user.email ?? '').toLowerCase()
    if (email) {
      try {
        await admin.from('students')
          .update({ auth_user_id: user.id })
          .ilike('email', email)
          .is('auth_user_id', null)
      } catch { /* auth_user_id column missing — dashboard falls back to email match */ }
    }
    // If the login was started from a booking page, go back there (the form
    // reads the session to pre-fill name + email). Otherwise open the dashboard.
    if (next.startsWith('/book/')) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    const { signStudentToken } = await import('@/lib/student-auth')
    const token = signStudentToken(email)
    return NextResponse.redirect(`${origin}/student/dashboard?token=${token}`)
  }

  // Not an explicit student login. Check for an existing tutor profile.
  const { data: existing } = await admin.from('tutors').select('id').eq('id', user.id).single()

  if (existing) {
    // Existing tutor — go to the dashboard (never a student/booking path)
    const dest = (next.startsWith('/student') || next.startsWith('/book/')) ? '/dashboard' : next
    return NextResponse.redirect(`${origin}${dest}`)
  }

  // No tutor profile yet. ONLY create one when the login explicitly came from the
  // tutor sign-up/login (role === 'tutor'). Anything else is treated as a student
  // so a student who lost the role cookie is NEVER turned into a tutor by mistake.
  if (role !== 'tutor') {
    const sEmail = (user.email ?? '').toLowerCase()
    if (sEmail) {
      try {
        await admin.from('students').update({ auth_user_id: user.id })
          .ilike('email', sEmail).is('auth_user_id', null)
      } catch { /* ignore */ }
      const { signStudentToken } = await import('@/lib/student-auth')
      return NextResponse.redirect(`${origin}/student/dashboard?token=${signStudentToken(sEmail)}`)
    }
    return NextResponse.redirect(`${origin}/student/login`)
  }

  {
    // New user via Google — create tutor profile
    const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Tutor'
    const email = user.email ?? ''

    await admin.from('tutors').insert({
      id: user.id,
      email,
      name,
      slug: generateSlug(name),
    })

    // Send welcome email
    try {
      const { Resend } = await import('resend')
      if (process.env.RESEND_API_KEY?.startsWith('re_')) {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: 'Tutafy <noreply@tutafy.com>',
          to: email,
          subject: 'Welcome to Tutafy! 🎉',
          html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
            <h1 style="color:#6366f1;">Welcome to Tutafy, ${name}! 🎉</h1>
            <p>Your account is ready. Complete your setup to start accepting students.</p>
            <a href="https://tutafy.com/onboarding" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Complete setup →</a>
          </div>`,
        })
      }
    } catch { /* non-critical */ }

    return NextResponse.redirect(`${origin}/onboarding`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
