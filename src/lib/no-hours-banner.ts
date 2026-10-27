// The "no free hours yet" banner at the top of the tutor dashboard (T-0739).
//
// A tutor with no weekly free-hours row has a booking page that nobody can book (the page needs at least
// one `availability` row). Most older accounts are in that state, because the hours step of onboarding
// failed silently before T-0728. This banner tells the tutor and opens the page where they pick their hours.
//
// It only READS and it only reads the signed-in tutor's own rows: the session client, `tutor_id` named in
// the query. It writes nothing, sends nothing and never guesses hours for the tutor. The booking page counts
// the same rows (`app/book/[slug]/page.tsx` reads `availability` by `tutor_id`), so the banner is shown
// exactly when that page has no hours. It is gone as soon as one row exists.
import type { BuyersClient } from '@/lib/buyers-data'

export type NoHoursBanner = {
  title: string
  text: string
  action: string // the button's words
  href: string // the page the button opens: the weekly hours page
}

export const NO_HOURS_BANNER: NoHoursBanner = {
  title: 'Your booking page has no hours yet',
  text: 'Students cannot book you until you add the days and times you teach.',
  action: 'Add your hours',
  href: '/availability',
}

/** The banner for a tutor with this many free-hours rows; null when they have some, or when the count is unknown. */
export function buildNoHoursBanner(availabilityRows: number | null): NoHoursBanner | null {
  return availabilityRows === 0 ? NO_HOURS_BANNER : null
}

/**
 * Count this tutor's free-hours rows and build the banner. A failed read gives no banner, so a broken read
 * never tells a tutor with hours that they have none.
 */
export async function loadNoHoursBanner(db: BuyersClient, tutorId: string): Promise<NoHoursBanner | null> {
  const { count, error } = await db.from('availability').select('id', { count: 'exact', head: true }).eq('tutor_id', tutorId)
  if (error || count == null) return null
  return buildNoHoursBanner(count)
}
