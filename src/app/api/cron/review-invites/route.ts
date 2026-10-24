import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cronGate } from '@/lib/secrets'
import { createMailer } from '@/lib/email'
import { reviewsFlowOn } from '@/lib/reviews-flow'
import { runReviewInvites } from '@/lib/review-invites'
import type { FlowClient } from '@/lib/reviews-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// The daily run of the review invitations (T-0898, src/lib/review-invites.ts). Closed unless CRON_SECRET is set and sent (Vercel Cron does so by
// itself). With REVIEWS_FLOW not "on" it reads nothing and sends nothing. The answer holds only counts, never an address.
export async function GET(request: Request) {
  const denied = cronGate(request)
  if (denied) return denied
  if (!reviewsFlowOn()) return NextResponse.json({ skipped: 'off', invited: 0, reminded: 0 })
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_API_KEY.startsWith('re_')) return NextResponse.json({ skipped: 'RESEND_API_KEY not configured' })

  const mailer = createMailer(process.env.RESEND_API_KEY, 'bookings')
  const result = await runReviewInvites(createAdminClient() as unknown as FlowClient, mail => mailer.emails.send(mail), new Date())
  return NextResponse.json(result)
}
