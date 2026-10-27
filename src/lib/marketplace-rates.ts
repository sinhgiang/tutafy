// What Preply and iTalki really take from a tutor, written ONCE (T-0962). The home page, the switch page and the blog posts that name a
// platform's own rate use these words, and tests/marketplace-rates.test.ts fails when a page says something else (an iTalki "flat 15%",
// a "20–33%" range) or when a post that states a platform's rate has no "rates checked" note with the official links.
//
// Source of the numbers: the two official help pages below, checked on RATES_CHECKED. Both pages answered 403 to a script on that day, so the
// figures were read from the search results of the official pages and from the owner's Chief of Staff; re-read the pages by hand when you change them.
//   Preply: the first (trial) lesson with each new student is kept 100% by Preply; every later lesson starts at 33% for a new tutor and
//           falls to 18% as the tutor's total teaching hours grow.
//   iTalki: 0% on a trial lesson; 21% on a single lesson; 19% on a 5-lesson package; 17% on 10; 15% on 15 and on 20; 30% on a group class.
// The range for both together on an ordinary lesson is 15–33%.

/** The day the numbers were checked, as written on the pages. */
export const RATES_CHECKED = '25 Oct 2026'
export const PREPLY_RATES_URL = 'https://help.preply.com/en/articles/4171383-preply-commission-model'
export const ITALKI_RATES_URL = 'https://support.italki.com/hc/en-us/articles/206352068-How-does-italki-charge-a-commission'

/** The one range for the two platforms together, for an ordinary lesson. */
export const MARKETPLACE_RANGE = '15–33%'
export const PREPLY_RANGE = '18–33%'
export const ITALKI_RANGE = '15–21%'

/** One sentence the home page prints. */
export const HOME_MARKETPLACE_SENTENCE =
  `Marketplaces like Preply and iTalki take ${MARKETPLACE_RANGE} of every lesson, and Preply also keeps 100% of your first trial lesson (iTalki takes 0% of trials).`

/** Plain-text version of the iTalki rate, for a table cell or a stat card. */
export const ITALKI_BY_LESSON_TYPE = `${ITALKI_RANGE} by lesson type`

/** The note a post or page prints under a platform's rates, with the two official links. */
export const RATES_NOTE_TEXT = `Rates checked ${RATES_CHECKED}.`
export const RATES_LINKS = [
  { label: 'Preply commission model', href: PREPLY_RATES_URL },
  { label: 'iTalki commission', href: ITALKI_RATES_URL },
]

/** The blog block that carries the note: `{ type: 'source' }` (see PostBlock in src/lib/blog.ts). */
export const RATES_SOURCE = { type: 'source' as const, text: RATES_NOTE_TEXT, links: RATES_LINKS }
