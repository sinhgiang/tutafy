import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createLimiter } from '@/lib/rate-limit-memory'
import { parseReviewInput, reviewsFlowOn } from '@/lib/reviews-flow'
import { submitFlowReview } from '@/lib/reviews-data'
import type { FlowClient } from '@/lib/reviews-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// A student writes or edits their review of a tutor (T-0898). Who is asking is the portal link the student holds (portal_token); the tutor and the student
// are read from the database, never from the body. Closed (404) while the switch is off. The limit counts every call to this route together (per server
// instance), not per address: an address, a link or a field the caller makes up cannot get round it. Reviews are rare, so the number is generous, and the
// portal link is long and random, so guessing one at this speed is not possible.
const limiter = createLimiter({ max: 300, windowMs: 10 * 60 * 1000 })

export async function POST(request: Request) {
  if (!reviewsFlowOn()) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!limiter.hit('all')) return NextResponse.json({ error: 'Too many tries. Please wait a few minutes.' }, { status: 429 })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Send JSON.' }, { status: 400 }) }
  const rec = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
  const input = parseReviewInput(rec)
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 })

  let db: FlowClient
  try { db = createAdminClient() as unknown as FlowClient } catch { return NextResponse.json({ error: 'Reviews are not available right now.' }, { status: 503 }) }
  const out = await submitFlowReview(db, { portalToken: rec.portal_token, lessonId: rec.lesson_id, input: input.value, now: new Date() })
  if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status })
  return NextResponse.json({ ok: true, edited: out.edited })
}
