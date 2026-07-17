import { createClient } from '@/lib/supabase/server'
import { hasPlan, PLAN_RANK, type Plan } from '@/lib/plans'
import { LockedFeature } from '@/components/plan/LockedFeature'

/**
 * Server-side feature gate. Call at the top of a gated page:
 *
 *   const locked = await requireFeature('pro', 'AI Tools')
 *   if (locked) return locked
 *
 * Returns a <LockedFeature> element (blurred preview + one-click upgrade) when
 * the signed-in tutor's plan is below `required`, otherwise null. Because the
 * page returns early, the real feature never renders for an ineligible tutor —
 * gating is enforced on the server, not just hidden in the UI.
 */
export async function requireFeature(required: Plan, feature: string): Promise<React.ReactElement | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null // unauth is handled by the proxy / layout redirect

  const { data: tutor } = await supabase
    .from('tutors')
    .select('subscription_status, polar_subscription_id')
    .eq('id', user.id)
    .single()

  const plan = (tutor?.subscription_status ?? 'free') as Plan
  if (hasPlan(plan, required)) return null

  // A tutor already on a paid Polar subscription has a card on file, so they can
  // be upgraded instantly (charged the prorated difference) without a checkout.
  const canInstantUpgrade = !!tutor?.polar_subscription_id && PLAN_RANK[plan] >= PLAN_RANK.pro

  return (
    <LockedFeature
      required={required}
      plan={plan}
      feature={feature}
      email={user.email ?? ''}
      tutorId={user.id}
      canInstantUpgrade={canInstantUpgrade}
    />
  )
}
