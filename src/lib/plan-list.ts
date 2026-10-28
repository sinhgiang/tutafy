// The one list of plans: what each costs and what it includes. The landing page, /upgrade, /switch,
// /llms.txt, the structured data and the "locked feature" sheet all print from here (T-1052); never type
// a plan feature into another file.
//
// Every line below has code behind it, so a plan never promises more than the app does:
//   Free    10-student cap (migration 012), booking page, built-in video room (components/VideoRoom.tsx),
//           email reminders (api/cron/reminders), the calendar, the PayPal link (settings, Payments).
//   Pro     unlimited students; the 7 AI tools (app/(dashboard)/ai); card payments (api/stripe/checkout);
//           packages, coupons, subscriptions, waitlist, import, reports, accounting export, API and webhooks,
//           custom domain (each behind requireFeature or requireApiPlan('pro')).
//   Academy up to 5 tutors (api/team, MAX_TEAM_SEATS), payroll (lib/payroll.ts), a booking page per member.
// A promise of faster support is not here: there is no queue or process behind it. Add a line only with its code.
// The dollar amounts are what Tutafy shows; the price itself is set in Polar (src/lib/plans.ts keeps the short labels).

export type PlanId = 'free' | 'pro' | 'academy'

export interface PlanListItem {
  id: PlanId
  name: string
  monthlyUsd: number
  tagline: string
  features: string[]
  cta: string
  /** Where the button goes: Free to sign-up, a paid plan to /upgrade?plan=<id> (sign-up first when signed out). */
  href: string
  highlight: boolean
  badge: string
}

export const PLAN_LIST: PlanListItem[] = [
  {
    id: 'free', name: 'Free', monthlyUsd: 0, tagline: 'Everything you need to start',
    features: ['Up to 10 students', 'Booking page', 'Built-in video classroom', 'Email reminders', 'Calendar & scheduling', 'PayPal payment link'],
    cta: 'Start for free', href: '/register', highlight: false, badge: '',
  },
  {
    id: 'pro', name: 'Pro', monthlyUsd: 12, tagline: 'For serious independent tutors',
    features: [
      'Unlimited students',
      'All 7 AI teaching tools',
      'Card payments with Stripe',
      'Lesson packages, coupons & student subscriptions',
      'Waitlist & student import',
      'Reports & accounting export',
      'Public API & webhooks',
      'Custom domain',
    ],
    cta: 'Go Pro', href: '/upgrade?plan=pro', highlight: true, badge: 'Most popular',
  },
  {
    id: 'academy', name: 'Academy', monthlyUsd: 29, tagline: 'For small teams & centers',
    features: ['Everything in Pro', 'Up to 5 tutors', 'Team payroll (per lesson, per hour or revenue share)', 'Booking page per tutor'],
    cta: 'Start Academy', href: '/upgrade?plan=academy', highlight: false, badge: '',
  },
]

/** The two plans somebody can buy. */
export const PAID_PLAN_IDS = ['pro', 'academy'] as const
export type PaidPlanId = (typeof PAID_PLAN_IDS)[number]

/**
 * A plan named in an address (?plan=) or a cookie. Only the two paid plans are accepted, compared as an exact
 * lowercase word; anything else (an array, `__proto__`, "PRO", "pro ", a longer string) is null, so a made-up
 * value can never reach a redirect or a page.
 */
export function parsePaidPlan(value: unknown): PaidPlanId | null {
  return typeof value === 'string' && (PAID_PLAN_IDS as readonly string[]).includes(value) ? (value as PaidPlanId) : null
}

/** The address that takes somebody to the plan they picked: the upgrade page, which asks them to sign up first when needed. */
export function upgradeHref(plan: PaidPlanId): string {
  return `/upgrade?plan=${plan}`
}

/** The plan inside an `upgradeHref()` address, nothing else: "/upgrade?plan=pro" gives "pro"; any other path or query gives null. */
export function planOfUpgradeHref(path: unknown): PaidPlanId | null {
  const m = typeof path === 'string' ? /^\/upgrade\?plan=(pro|academy)$/.exec(path) : null
  return m ? (m[1] as PaidPlanId) : null
}

/** The address of the last onboarding step's way on, and of the way into onboarding, both carrying the plan. */
export function onboardingHref(plan: PaidPlanId | null): string {
  return plan ? `/onboarding?signup=1&plan=${plan}` : '/onboarding?signup=1'
}

/** The sign-up address that remembers the plan. */
export function registerHref(plan: PaidPlanId | null): string {
  return plan ? `/register?plan=${plan}` : '/register'
}

/** The sign-in address that remembers the plan. */
export function loginHref(plan: PaidPlanId | null): string {
  return plan ? `/login?plan=${plan}` : '/login'
}

/** How many lines of a plan the "locked feature" sheet shows: the top of the same list, never its own copy. */
export const LOCKED_SHEET_LINES = 5

export function planById(id: PlanId): PlanListItem {
  return PLAN_LIST.find(p => p.id === id)!
}
