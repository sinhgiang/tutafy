import { NextResponse } from 'next/server'
import { adminApiGate, sameOriginGate } from '@/lib/admin-guard'
import { createAdminClient } from '@/lib/supabase/server'
import { realMailer, startAnnouncement, type StartResult } from '@/lib/tutor-announcement-run'
import { MAX_RECIPIENTS } from '@/lib/tutor-announcement'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// One mail is handed to the mail service about every 0.6 s, so a full list of 60 takes about 40 s.
export const maxDuration = 120

const STATUS: Record<Extract<StartResult, { ok: false }>['why'], number> = {
  'no-mail-key': 503, 'no-unsubscribe-secret': 503, 'tables-missing': 503, 'read-failed': 500,
  'test-first': 409, 'too-many': 409, nothing: 409, 'count-changed': 409, 'already-started': 409,
}

/**
 * POST /api/admin/announcement/start  { expected: <the number the confirm box showed> } (T-1064). Queues the tutor letter for every eligible
 * tutor who has not had it, one every three minutes. Only the platform admin may call it (checked here, on the server). Nothing is queued unless
 * the test mail went out in the last seven days and `expected` is the real number; a tutor already queued is never queued again.
 */
export async function POST(request: Request) {
  const denied = await adminApiGate()
  if (denied) return denied
  const crossSite = sameOriginGate(request)
  if (crossSite) return crossSite

  const body = await request.json().catch(() => null) as { expected?: unknown } | null
  const expected = body?.expected
  if (typeof expected !== 'number' || !Number.isInteger(expected) || expected < 1 || expected > MAX_RECIPIENTS) {
    return NextResponse.json({ error: 'expected must be a whole number from 1 to ' + MAX_RECIPIENTS }, { status: 400 })
  }

  const result = await startAnnouncement({ db: createAdminClient(), mailer: realMailer(), expected })
  if (!result.ok) return NextResponse.json({ error: 'start_refused', reason: result.why, actual: result.actual ?? null }, { status: STATUS[result.why] })
  return NextResponse.json(result)
}
