import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cronGate } from '@/lib/secrets'
import { runWelcomeSeries, welcomeMode } from '@/lib/welcome-send'
import { hasMailKey, resendSender } from '@/lib/welcome-mailer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// The daily run of the welcome series (T-0737): the day-2 nudge and the day-7 check-in. Closed unless CRON_SECRET is set and sent
// (Vercel Cron does so by itself). With the switches off (the default) it answers { mode: 'off' } and touches nothing; in dry-run it
// answers counts only, with no address, and never calls the mail service. See src/lib/welcome-send.ts and docs/welcome-emails.md.
export async function GET(request: Request) {
  const denied = cronGate(request)
  if (denied) return denied

  const mode = welcomeMode()
  if (mode.kind === 'off') return NextResponse.json({ mode: 'off' })

  const key = process.env.RESEND_API_KEY
  if (mode.kind === 'live' && !hasMailKey(key)) return NextResponse.json({ skipped: 'RESEND_API_KEY not configured' })

  try {
    const report = await runWelcomeSeries({ db: createAdminClient(), send: resendSender() })
    return NextResponse.json(report)
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
