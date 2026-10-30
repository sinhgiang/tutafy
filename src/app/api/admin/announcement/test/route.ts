import { NextResponse } from 'next/server'
import { adminApiGate, sameOriginGate } from '@/lib/admin-guard'
import { isAdminEmail } from '@/lib/admin'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { realMailer, sendTestMail } from '@/lib/tutor-announcement-run'
import { campaignOf } from '@/lib/tutor-announcement'
import { createLimiter } from '@/lib/rate-limit-memory'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// A slip of the finger on the button must not become a pile of mail: at most 3 test mails a minute from this server.
const limiter = createLimiter({ max: 3, windowMs: 60_000 })

/**
 * POST /api/admin/announcement/test  { campaign?: <the letter> } (T-1064, T-1115). Sends ONE test copy of the chosen tutor letter (the profile letter when none is named) to the admin who is signed in: the address is the one on their
 * session, nothing in the request can change it. Only the platform admin may call it (checked here, on the server).
 */
export async function POST(request: Request) {
  const denied = await adminApiGate()
  if (denied) return denied
  const crossSite = sameOriginGate(request)
  if (crossSite) return crossSite

  const { data: { user } } = await (await createClient({ real: true })).auth.getUser()
  if (!user || !isAdminEmail(user.email) || !user.email) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!limiter.hit(user.id)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const campaign = campaignOf(await request.json().catch(() => null))
  if (!campaign) return NextResponse.json({ error: 'unknown campaign' }, { status: 400 })

  const result = await sendTestMail({ db: createAdminClient(), mailer: realMailer(), to: user.email, campaign })
  if (!result.ok) return NextResponse.json({ error: 'test_refused', reason: result.why }, { status: result.why === 'refused' ? 502 : 503 })
  return NextResponse.json({ ok: true })
}
