import { NextResponse } from 'next/server'
import { requireApiPlan } from '@/lib/api-guard'
import { isStripeEnabled } from '@/lib/stripe/availability'

// GET /api/stripe/connect/status
// Lets Settings decide whether to show the "Connect Stripe account" button.
// Signed-in tutors only (any plan); answers with a yes/no, never the key itself.
export async function GET() {
  const gate = await requireApiPlan('free')
  if ('error' in gate) return gate.error
  return NextResponse.json({ enabled: isStripeEnabled() })
}
