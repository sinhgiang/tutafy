import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cronGate } from '@/lib/secrets'
import { runPolarExpiry } from '@/lib/polar-expiry'
import { noticeOwner } from '@/lib/polar-state'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// The daily safety check for cancelled subscriptions (T-1074, src/lib/polar-expiry.ts): a tutor whose paid period ended and for whom Polar sent no
// `subscription.revoked` goes back to Free. Closed unless CRON_SECRET is set and sent (Vercel Cron does so by itself). The answer holds counts and
// tutor ids only, never an address.
export async function GET(request: Request) {
  const denied = cronGate(request)
  if (denied) return denied
  const result = await runPolarExpiry(createAdminClient(), new Date(), noticeOwner)
  return NextResponse.json({ ...result, downgraded: result.downgraded.length })
}
