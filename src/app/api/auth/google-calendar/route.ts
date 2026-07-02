import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SCOPES = 'https://www.googleapis.com/auth/calendar'
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutafy.com'}/api/auth/google-calendar/callback`

// GET /api/auth/google-calendar  â€” initiate OAuth
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json({ error: 'Google Calendar not configured' }, { status: 503 })
  }

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID)
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', user.id)

  return NextResponse.redirect(url)
}
