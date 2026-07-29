import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasPlan, type Plan } from '@/lib/plans'

/**
 * Server-side plan gate for API routes (mutating endpoints, exports, etc).
 * Mirrors the page-level `requireFeature()` in `guard.tsx` — pages hide the UI,
 * this stops the request. Always re-reads the plan from the DB, never trusts
 * a client-supplied value.
 */
export async function requireApiPlan(minPlan: Plan) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) } as const
  }
  const { data: tutor } = await supabase.from('tutors').select('subscription_status').eq('id', user.id).single()
  if (!hasPlan(tutor?.subscription_status, minPlan)) {
    return { error: NextResponse.json({ error: 'upgrade_required' }, { status: 403 }) } as const
  }
  return { supabase, userId: user.id, plan: (tutor?.subscription_status ?? 'free') as Plan } as const
}
