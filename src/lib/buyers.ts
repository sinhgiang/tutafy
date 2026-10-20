// Paid plans on the admin Buyers page. A "buyer" is a tutor whose
// tutors.subscription_status is one of these (written by the Polar webhook).
// Import-free so the node tests can load it.

export const BUYER_PLANS = ['pro', 'academy'] as const
export type BuyerPlan = (typeof BUYER_PLANS)[number]

export const POLAR_DASHBOARD_URL = 'https://polar.sh/dashboard'

export function isBuyerPlan(status: string | null | undefined): status is BuyerPlan {
  return (BUYER_PLANS as readonly string[]).includes(status ?? '')
}

export function planLabel(status: string | null | undefined): string {
  const s = status && status.length > 0 ? status : 'free'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Tailwind classes for a plan badge; unknown values look like Free. */
export function planBadgeClass(status: string | null | undefined): string {
  if (status === 'academy') return 'bg-purple-100 text-purple-700'
  if (status === 'pro') return 'bg-indigo-100 text-indigo-700'
  return 'bg-gray-100 text-gray-500'
}
