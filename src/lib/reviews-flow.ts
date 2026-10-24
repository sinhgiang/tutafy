// Real reviews after the first lesson (T-0898, designs A, A, A of T-0876). The rules, the switch and the small pure helpers; the reads and writes are
// in src/lib/reviews-data.ts and the mail in src/lib/review-invites.ts. Plain .ts with no browser, React or database imports, so the node tests can load it.
//
// THE SWITCH: the whole flow is OFF until the owner sets REVIEWS_FLOW=on on the server (docs/reviews-flow.md). Off means: no invitation goes out, the
// daily run does nothing, the new form, the answer box and the new cards on a profile do not exist (their routes answer 404), and the old review form of
// the student page and the old reviews list of a profile stay exactly as they were.
//
// THE RULES (the owner's answer W-2747: 1): only a student who had a lesson with the tutor writes a review; one review per student per tutor; the tutor
// answers once and can neither edit nor hide it; the student edits it for 7 days; the name shown is the first name and the initial of the last name
// ("Maria K."); old reviews stay; "lessons taught" counts only lessons that took place; a low rating is shown like any other; Tutafy removes a review
// only for abuse (by hand, with the server's key). The database says the same in supabase/migrations/027_reviews_flow.sql.
import { cleanText } from '@/lib/tutor-seo'

type Env = Record<string, string | undefined>

/** True only for the exact value "on": a typo, "true", "1" or nothing all mean off. */
export function reviewsFlowOn(env: Env = process.env): boolean {
  return (env.REVIEWS_FLOW ?? '').trim() === 'on'
}

export const MAX_COMMENT = 500
export const MAX_REPLY = 500
export const MAX_TAGS = 3
export const EDIT_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

/** What a student can say stood out. The ids are the ones the database accepts (the check in migration 027). */
export const REVIEW_TAGS = [
  { id: 'patient', label: 'Patient' },
  { id: 'clear_explanations', label: 'Clear explanations' },
  { id: 'well_prepared', label: 'Well prepared' },
  { id: 'fun', label: 'Fun' },
  { id: 'good_value', label: 'Good value' },
  { id: 'friendly', label: 'Friendly' },
] as const
export type ReviewTagId = (typeof REVIEW_TAGS)[number]['id']
export const tagLabel = (id: string): string => REVIEW_TAGS.find(t => t.id === id)?.label ?? ''

/** "Maria Kowalski" becomes "Maria K."; one name stays as it is; nothing becomes "A student". Never an email address. */
export function publicName(name: unknown): string {
  const words = cleanText(typeof name === 'string' ? name : '', 60).split(' ').filter(Boolean)
  if (words.length === 0) return 'A student'
  if (words.length === 1) return words[0]
  const initial = [...words[words.length - 1]][0]?.toUpperCase() ?? ''
  return /\p{L}/u.test(initial) ? `${words[0]} ${initial}.` : words[0]
}

/** Control characters out, white space tidied; kept at its length. Shown through reviewText (no email or phone number) on the page. */
export function tidyText(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return ''
  return raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max)
}

export type ReviewInput = { rating: number; tags: ReviewTagId[]; comment: string | null }

/** The body of a review request, checked. A wrong value is an error, never quietly changed into another one. */
export function parseReviewInput(raw: unknown): { ok: true; value: ReviewInput } | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'Send the review as an object.' }
  const b = raw as Record<string, unknown>
  const rating = typeof b.rating === 'number' ? b.rating : Number.NaN
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: 'Choose 1 to 5 stars.' }
  const tagsIn = b.tags === undefined || b.tags === null ? [] : b.tags
  if (!Array.isArray(tagsIn)) return { ok: false, error: 'Tags must be a list.' }
  const tags: ReviewTagId[] = []
  for (const t of tagsIn) {
    const known = REVIEW_TAGS.find(x => x.id === t)
    if (!known) return { ok: false, error: 'One of the tags is not one we know.' }
    if (!tags.includes(known.id)) tags.push(known.id)
  }
  if (tags.length > MAX_TAGS) return { ok: false, error: `Choose at most ${MAX_TAGS} tags.` }
  if (b.comment !== undefined && b.comment !== null && typeof b.comment !== 'string') return { ok: false, error: 'The text must be text.' }
  const comment = tidyText(b.comment, MAX_COMMENT + 1)
  if (comment.length > MAX_COMMENT) return { ok: false, error: `Keep the text to ${MAX_COMMENT} characters.` }
  return { ok: true, value: { rating, tags, comment: comment || null } }
}

/** A tutor's answer, checked: some text, at most MAX_REPLY characters. */
export function parseReply(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== 'string') return { ok: false, error: 'Write an answer.' }
  const text = tidyText(raw, MAX_REPLY + 1)
  if (!text) return { ok: false, error: 'Write an answer.' }
  if (text.length > MAX_REPLY) return { ok: false, error: `Keep the answer to ${MAX_REPLY} characters.` }
  return { ok: true, value: text }
}

/** The moment a student can no longer edit a review written at `createdAt`. */
export const editsUntil = (createdAt: string | Date): Date => new Date(new Date(createdAt).getTime() + EDIT_DAYS * DAY_MS)
export const editOpen = (createdAt: string | Date, now: Date): boolean => now.getTime() <= editsUntil(createdAt).getTime()

/** The stars of the stars-in-the-link of an invitation (?stars=4): 1 to 5 or null. Opening the link only shows the form with this chosen; it saves nothing. */
export function starsFromAddress(raw: unknown): number | null {
  const v = Array.isArray(raw) ? raw[0] : raw
  return typeof v === 'string' && /^[1-5]$/.test(v) ? Number(v) : null
}

export type Summary = { count: number; average: number; percent: Record<1 | 2 | 3 | 4 | 5, number> }

/** The average (one decimal) and, for each number of stars, the share of reviews (whole percent). A review with a rating outside 1 to 5 is not counted. */
export function summarize(ratings: number[]): Summary {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let sum = 0
  let count = 0
  for (const r of ratings) {
    if (!Number.isInteger(r) || r < 1 || r > 5) continue
    counts[r] += 1
    sum += r
    count += 1
  }
  const pct = (n: number) => (count === 0 ? 0 : Math.round((n / count) * 100))
  return { count, average: count === 0 ? 0 : Math.round((sum / count) * 10) / 10, percent: { 1: pct(counts[1]), 2: pct(counts[2]), 3: pct(counts[3]), 4: pct(counts[4]), 5: pct(counts[5]) } }
}

/** "today", "3 days ago", "2 weeks ago", "a month ago", "2 months ago", "a year ago": how long ago a review was written, for the list on a profile. */
export function agoLabel(createdAt: string | Date, now: Date): string {
  const days = Math.floor((now.getTime() - new Date(createdAt).getTime()) / DAY_MS)
  if (!Number.isFinite(days) || days < 1) return 'today'
  if (days < 7) return days === 1 ? 'yesterday' : `${days} days ago`
  if (days < 30) { const w = Math.floor(days / 7); return w === 1 ? 'a week ago' : `${w} weeks ago` }
  if (days < 365) { const m = Math.floor(days / 30); return m === 1 ? 'a month ago' : `${m} months ago` }
  const y = Math.floor(days / 365)
  return y === 1 ? 'a year ago' : `${y} years ago`
}
