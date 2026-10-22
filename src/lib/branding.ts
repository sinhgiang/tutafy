// The small "Made with Tutafy" line at the foot of a tutor's public pages (T-0717): the booking pages /book/<slug> and
// /book/<slug>/<member>, the embed window /embed/<slug>, and (T-0765) the public profile /tutors/<slug>.
//
// Who sees it: every tutor on the Free plan, always. A tutor on Pro or Academy sees it too until they turn it off in Settings
// (Booking page tab); the choice is the column tutors.hide_branding (migration 021). The PLAN decides first, on the server, from the
// tutor's real plan: a Free tutor who writes the column anyway still shows the line.
// No imports from the app except the plan table and the site address, so the node tests can load it.
import { hasPlan } from '@/lib/plans'
import { SITE_URL } from '@/lib/site-url'

export const MADE_WITH_TEXT = 'Made with Tutafy'

/** Where the line is shown; it becomes the `ref` of the link, so the visits it brings can be counted by surface. */
export type BrandingSurface = 'booking-page' | 'booking-embed' | 'profile-page'

/**
 * The address the line points to: the home page, with the source in `ref` (the examples the owner gave) and the same source as the
 * utm parameters the visitor tracking already records (src/lib/track-client.ts reads utm_source, utm_medium and utm_campaign), so
 * the visits can be counted from the visitors table. Plain letters, digits and dashes only.
 */
export function madeWithHref(surface: BrandingSurface): string {
  const p = new URLSearchParams({ ref: surface, utm_source: 'made-with-tutafy', utm_medium: surface, utm_campaign: 'tutor-badge' })
  return `${SITE_URL}/?${p.toString()}`
}

/** True when the line is shown: the tutor is not on a paid plan, or has not turned it off. */
export function showMadeWithBadge(input: { plan: string | null | undefined; hideBranding: boolean | null | undefined }): boolean {
  const paid = hasPlan(input.plan, 'pro')
  return !(paid && input.hideBranding === true)
}

// Only the part of the Supabase client this file calls.
type Reader = { from(table: string): { select(cols: string): { eq(col: string, val: string): { single(): PromiseLike<{ data: Record<string, unknown> | null; error?: unknown }> } } } }

/**
 * Whether to show the line for this tutor. The plan and the column are read in two separate reads, so a database without the
 * column (migration 021 not applied yet) still works: a missing column means "keep the line", and so does any failed read.
 */
export async function loadShowMadeWith(db: unknown, tutorId: string): Promise<boolean> {
  const client = db as Reader
  let plan: string | null = null
  try {
    const { data } = await client.from('tutors').select('subscription_status').eq('id', tutorId).single()
    plan = typeof data?.subscription_status === 'string' ? data.subscription_status : null
  } catch { /* an unreadable plan counts as Free: the line stays */ }
  let hide = false
  try {
    const { data, error } = await client.from('tutors').select('hide_branding').eq('id', tutorId).single()
    hide = !error && data?.hide_branding === true
  } catch { /* the column is missing: the line stays */ }
  return showMadeWithBadge({ plan, hideBranding: hide })
}
