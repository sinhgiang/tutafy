import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createLimiter } from '@/lib/rate-limit-memory'
import { reviewsFlowOn } from '@/lib/reviews-flow'
import { stopReminders } from '@/lib/review-invites'
import type { FlowClient } from '@/lib/reviews-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// "Stop reminders" (T-0898): a button on the review page (a POST: opening the link in the mail changes nothing). Known by the portal link. All calls
// are counted together (per server instance), so nothing the caller makes up gets round the limit.
const limiter = createLimiter({ max: 120, windowMs: 10 * 60 * 1000 })

export async function POST(request: Request) {
  if (!reviewsFlowOn()) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!limiter.hit('all')) return NextResponse.json({ error: 'Too many tries. Please wait a few minutes.' }, { status: 429 })
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Send JSON.' }, { status: 400 }) }
  const rec = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
  let db: FlowClient
  try { db = createAdminClient() as unknown as FlowClient } catch { return NextResponse.json({ error: 'Not available right now.' }, { status: 503 }) }
  const ok = await stopReminders(db, { portalToken: rec.portal_token, lessonId: rec.lesson_id })
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Not found' }, { status: 404 })
}
