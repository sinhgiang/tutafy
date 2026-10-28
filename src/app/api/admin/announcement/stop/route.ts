import { NextResponse } from 'next/server'
import { adminApiGate, sameOriginGate } from '@/lib/admin-guard'
import { createAdminClient } from '@/lib/supabase/server'
import { realMailer, stopAnnouncement } from '@/lib/tutor-announcement-run'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * POST /api/admin/announcement/stop (T-1064). Stops the run: every mail not yet handed over is cancelled, and the mail service is asked to take
 * back every mail whose time has not come. Only the platform admin may call it (checked here, on the server).
 */
export async function POST(request: Request) {
  const denied = await adminApiGate()
  if (denied) return denied
  const crossSite = sameOriginGate(request)
  if (crossSite) return crossSite

  const result = await stopAnnouncement({ db: createAdminClient(), mailer: realMailer() })
  if (!result.ok) return NextResponse.json({ error: 'stop_refused', reason: result.why }, { status: result.why === 'read-failed' ? 500 : 503 })
  return NextResponse.json(result)
}
