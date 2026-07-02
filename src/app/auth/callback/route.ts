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
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const cookieStore = await cookies()
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

  // Check if tutor profile exists
  const { data: existing } = await admin.from('tutors').select('id').eq('id', user.id).single()

  if (!existing) {
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
          from: 'Tutafy <onboarding@resend.dev>',
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
