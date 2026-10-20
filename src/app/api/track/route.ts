import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createLimiter } from '@/lib/rate-limit-memory'
import {
  VISITOR_COOKIE, VISITOR_COOKIE_MAX_AGE, countryFromHeader, forgetVisitor,
  parseTrackBody, recordVisitorEvent, validVisitorId,
} from '@/lib/visitor-tracking'

// First-party visitor journey (supabase/migrations/015_visitor_tracking.sql).
// Consent: the browser calls this only after the visitor accepted cookies, the body
// must say so, and the cookie is created here only then. No IP address is read:
// the country is the code Vercel adds in a header. Limits live in this instance's memory.
const perVisitor = createLimiter({ max: 120, windowMs: 10 * 60 * 1000 })
const newVisitors = createLimiter({ max: 60, windowMs: 60 * 1000 })

/** Same-origin calls only: the Origin header must name the host this request was sent to. */
function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

function noContent(headers?: Record<string, string>) {
  return new NextResponse(null, { status: 204, headers })
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
  const parsed = parseTrackBody(json)
  // Without an explicit "accepted" nothing is read, written or set.
  if (!parsed.ok) return NextResponse.json({ error: 'bad request' }, { status: 400 })

  const existing = validVisitorId(req.cookies.get(VISITOR_COOKIE)?.value)
  const visitorId = existing ?? randomUUID()
  if (!perVisitor.hit(visitorId)) return NextResponse.json({ error: 'slow down' }, { status: 429 })
  if (!existing && !newVisitors.hit('new')) return NextResponse.json({ error: 'slow down' }, { status: 429 })

  // The signed-in tutor (if any) comes from the session cookie, never from the body.
  let userId: string | null = null
  if (parsed.data.kind === 'identify' || parsed.data.kind === 'checkout_click') {
    const { data: { user } } = await (await createClient()).auth.getUser()
    userId = user?.id ?? null
  }

  try {
    await recordVisitorEvent(createAdminClient(), {
      visitorId,
      body: parsed.data,
      country: countryFromHeader(req.headers.get('x-vercel-ip-country')),
      userId,
    })
  } catch {
    // Tracking must never break the page; a lost event is acceptable.
  }

  const res = noContent()
  if (!existing) {
    res.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: VISITOR_COOKIE_MAX_AGE,
    })
  }
  return res
}

// The visitor declined or withdrew: delete their rows and the cookie.
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const visitorId = validVisitorId(req.cookies.get(VISITOR_COOKIE)?.value)
  if (visitorId) {
    try {
      await forgetVisitor(createAdminClient(), visitorId)
    } catch { /* nothing more to do */ }
  }
  const res = noContent()
  res.cookies.set(VISITOR_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
