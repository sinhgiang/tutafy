// Central plan / feature-gating config. One source of truth for which tier each
// feature belongs to, used by the sidebar (locks + badges) and the page guards.

export type Plan = 'free' | 'pro' | 'academy'

export const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, academy: 2 }

export const PLAN_LABEL: Record<Plan, string> = { free: 'Free', pro: 'Pro', academy: 'Academy' }
export const PLAN_PRICE: Record<Plan, string> = { free: '$0', pro: '$12/mo', academy: '$29/mo' }

/** True if `current` plan can access something that requires `required`. */
export function hasPlan(current: string | null | undefined, required: Plan): boolean {
  return (PLAN_RANK[(current as Plan)] ?? 0) >= PLAN_RANK[required]
}

/**
 * Minimum plan each dashboard route needs, keyed by the first path segment.
 * Anything not listed is Free (always accessible).
 *   Pro:     AI, full reports, payment links, packages, coupons, subscriptions,
 *            waitlist, import, public API/webhooks.
 *   Academy: team & payroll.
 */
export const FEATURE_PLAN: Record<string, Plan> = {
  ai: 'pro',
  reports: 'pro',
  packages: 'pro',
  coupons: 'pro',
  subscriptions: 'pro',
  waitlist: 'pro',
  import: 'pro',
  developers: 'pro',
  team: 'academy',
}

export function requiredPlanFor(pathname: string): Plan | null {
  const seg = pathname.split('/').filter(Boolean)[0] ?? ''
  return FEATURE_PLAN[seg] ?? null
}

/**
 * Build a Polar hosted-checkout URL prefilled with the tutor's identity so a
 * returning customer can upgrade in as few clicks as Polar allows. The webhook
 * matches the payment back to this tutor via email / external id.
 */
export function polarCheckoutUrl(required: Plan, email: string, tutorId: string): string {
  const raw = required === 'academy'
    ? process.env.NEXT_PUBLIC_POLAR_CHECKOUT_ACADEMY
    : process.env.NEXT_PUBLIC_POLAR_CHECKOUT_PRO
  const url = (raw ?? '').trim()
  if (!url) return '/upgrade' // env not configured → fall back to the pricing page
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutafy.com').replace(/[﻿​\s]/g, '').replace(/\/+$/, '')
  const sep = url.includes('?') ? '&' : '?'
  const params = new URLSearchParams({
    customer_email: email,
    customer_external_id: tutorId,
    success_url: `${appUrl}/upgrade/success`,
  })
  return `${url}${sep}${params.toString()}`
}
