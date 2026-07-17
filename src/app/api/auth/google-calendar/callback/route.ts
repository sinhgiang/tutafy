import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { originFromRequest } from '@/lib/app-url'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state') // tutor user id
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code || !state) {
    return NextResponse.redirect(new URL('/settings?gcal=error', req.url))
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(new URL('/settings?gcal=not-configured', req.url))
  }

  // Must be byte-for-byte identical to the redirect_uri used to start the flow.
  const REDIRECT_URI = `${originFromRequest(req)}/api/auth/google-calendar/callback`

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()
  if (!tokens.refresh_token) {
    return NextResponse.redirect(new URL('/settings?gcal=no-refresh-token', req.url))
  }

  // Get primary calendar ID
  const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const calData = await calRes.json()
  const calendarId = calData.id ?? 'primary'

  // Store refresh_token and calendar_id in tutors table
  const supabase = createAdminClient()
  await supabase
    .from('tutors')
    .update({
      google_calendar_refresh_token: tokens.refresh_token,
      google_calendar_id: calendarId,
    } as any)
    .eq('id', state)

  return NextResponse.redirect(new URL('/settings?gcal=connected', req.url))
}
