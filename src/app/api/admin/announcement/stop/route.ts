import { NextResponse } from 'next/server'
import { adminApiGate, sameOriginGate } from '@/lib/admin-guard'
import { createAdminClient } from '@/lib/supabase/server'
import { realMailer, stopAnnouncement } from '@/lib/tutor-announcement-run'
import { campaignOf } from '@/lib/tutor-announcement'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * POST /api/admin/announcement/stop  { campaign?: <the letter> } (T-1064, T-1115). Stops the run of that letter (the profile letter when none is named):
 * every mail not yet handed over is cancelled, and the mail service is asked to take back every mail whose time has not come. Only the platform admin may call it (checked here, on the server).
 */
export async function POST(request: Request) {
  const denied = await adminApiGate()
  if (denied) return denied
  const crossSite = sameOriginGate(request)
  if (crossSite) return crossSite

  const campaign = campaignOf(await request.json().catch(() => null))
  if (!campaign) return NextResponse.json({ error: 'unknown campaign' }, { status: 400 })

  const result = await stopAnnouncement({ db: createAdminClient(), mailer: realMailer(), campaign })
  if (!result.ok) return NextResponse.json({ error: 'stop_refused', reason: result.why }, { status: result.why === 'read-failed' ? 500 : 503 })
  return NextResponse.json(result)
}
