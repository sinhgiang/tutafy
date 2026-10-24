import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { parseReply, reviewsFlowOn } from '@/lib/reviews-flow'
import { replyToReview } from '@/lib/reviews-data'
import type { FlowClient } from '@/lib/reviews-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// A tutor answers a review of theirs, once (T-0898). The tutor is the signed-in account; the review must be theirs; the answer is written only where
// there is none yet, and the database refuses a second one (supabase/migrations/027_reviews_flow.sql). Closed (404) while the switch is off.
export async function POST(request: Request) {
  if (!reviewsFlowOn()) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Send JSON.' }, { status: 400 }) }
  const rec = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
  const reply = parseReply(rec.reply)
  if (!reply.ok) return NextResponse.json({ error: reply.error }, { status: 400 })

  let db: FlowClient
  try { db = createAdminClient() as unknown as FlowClient } catch { return NextResponse.json({ error: 'Not available right now.' }, { status: 503 }) }
  const out = await replyToReview(db, { tutorId: user.id, reviewId: rec.review_id, text: reply.value, now: new Date() })
  if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status })
  return NextResponse.json({ ok: true })
}
