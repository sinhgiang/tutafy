import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { originFromRequest } from '@/lib/app-url'
import { GCAL_STATE_COOKIE, GCAL_STATE_MAX_AGE, GCAL_STATE_PATH, newGcalState } from '@/lib/gcal-state'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SCOPES = 'https://www.googleapis.com/auth/calendar'

// GET /api/auth/google-calendar  — initiate OAuth
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  if (!process.env.GOOGLE_CLIENT_ID) {
    // Not enabled on this deployment → send them back with a friendly message
    // instead of a raw JSON 503.
    return NextResponse.redirect(new URL('/settings?tab=integrations&gcal=unavailable', req.url))
  }

  const REDIRECT_URI = `${originFromRequest(req)}/api/auth/google-calendar/callback`

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID)
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  // Not the tutor's id (an address anyone can write): a random value that the browser also holds in a cookie (src/lib/gcal-state.ts).
  const { state, cookie } = newGcalState(user.id)
  url.searchParams.set('state', state)

  const res = NextResponse.redirect(url)
  res.cookies.set(GCAL_STATE_COOKIE, cookie, { httpOnly: true, secure: true, sameSite: 'lax', path: GCAL_STATE_PATH, maxAge: GCAL_STATE_MAX_AGE })
  return res
}
