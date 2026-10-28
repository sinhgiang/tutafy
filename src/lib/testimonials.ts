// Tutor stories for /customers (T-1032): the frame for two or three tutors with real names. Nothing is invented and nothing is shown without the tutor's
// written consent: an entry appears on the page only when it passes publishable() below, and TESTIMONIALS stays EMPTY until the owner has asked a real tutor, got an
// answer in writing, and added the entry (how: docs/testimonials.md). The page shows its honest "be the first" state while the list is empty.
// Plain .ts with no browser, React or database imports, so the node tests can load it.
import { cleanText, httpsImage, isPublicSlug } from '@/lib/tutor-seo'

export type Testimonial = {
  /** Lower-case letters, digits and hyphens: the anchor of the card on the page. */
  id: string
  /** The tutor's real name, as they want it shown. */
  name: string
  /** One short line: what they teach and where, for example "English tutor, Lagos". */
  role: string
  /** The tutor's profile address part on Tutafy (/tutors/<slug>) when they have a public profile; the card then links to it. */
  tutorSlug?: string
  /** A photo of the tutor, https only, that the tutor sent for this page. */
  photo?: string
  /** What the tutor said, in their own words, 40 to 600 characters, no address or phone number. */
  quote: string
  /** Facts the tutor confirmed themselves (for example "Students: 14"), at most three. Never a number the owner worked out. */
  facts?: { label: string; value: string }[]
  /** The tutor's agreement to be named and quoted here: when it was given (YYYY-MM-DD) and how (for example "email reply kept by the owner"). */
  consent: { given: true; on: string; how: string }
}

/** The stories the owner has added, with the tutors' consent. Empty on purpose. */
export const TESTIMONIALS: Testimonial[] = []

/** At most this many cards: two or three real stories are worth more than a wall of them. */
export const MAX_TESTIMONIALS = 3
export const QUOTE_MIN = 40
export const QUOTE_MAX = 600

const ID = /^[a-z0-9][a-z0-9-]{0,59}$/
const DAY = /^\d{4}-\d{2}-\d{2}$/
const same = (a: string, b: string) => a.replace(/\s+/g, ' ').trim() === b

/** Why an entry may not be shown, or null when it may. The first failing rule is the one named. */
export function problemWith(t: Testimonial, today: Date = new Date()): string | null {
  if (!t || typeof t !== 'object') return 'not an entry'
  if (!ID.test(String(t.id))) return 'id'
  const c = t.consent as { given?: unknown; on?: unknown; how?: unknown } | undefined
  if (!c || c.given !== true) return 'no consent'
  if (typeof c.on !== 'string' || !DAY.test(c.on) || !Number.isFinite(Date.parse(c.on)) || Date.parse(c.on) > today.getTime()) return 'consent date'
  if (typeof c.how !== 'string' || c.how.trim().length < 10) return 'consent how'
  if (typeof t.name !== 'string' || t.name.trim().length < 2 || t.name.length > 60 || !same(t.name, cleanText(t.name, 60))) return 'name'
  if (typeof t.role !== 'string' || t.role.trim().length < 5 || t.role.length > 80 || !same(t.role, cleanText(t.role, 80))) return 'role'
  if (typeof t.quote !== 'string') return 'quote'
  const q = t.quote.trim()
  if (q.length < QUOTE_MIN || q.length > QUOTE_MAX || !same(q, cleanText(q, QUOTE_MAX)) || /https?:\/\/|www\./i.test(q)) return 'quote'
  if (t.tutorSlug !== undefined && !isPublicSlug(t.tutorSlug)) return 'profile address'
  if (t.photo !== undefined && httpsImage(t.photo) === undefined) return 'photo'
  if (t.facts !== undefined) {
    if (!Array.isArray(t.facts) || t.facts.length > 3) return 'facts'
    for (const f of t.facts) if (!f || typeof f.label !== 'string' || typeof f.value !== 'string' || !f.label.trim() || !f.value.trim() || f.label.length > 30 || f.value.length > 30) return 'facts'
  }
  return null
}

/** The entries that may be shown, in the order they were added, at most MAX_TESTIMONIALS. An entry that fails any rule is left out, never repaired. */
export function publishable(list: readonly Testimonial[], today: Date = new Date()): Testimonial[] {
  const seen = new Set<string>()
  const out: Testimonial[] = []
  for (const t of list) {
    if (problemWith(t, today) !== null || seen.has(t.id)) continue
    seen.add(t.id)
    out.push({ ...t, quote: t.quote.trim(), name: t.name.trim(), role: t.role.trim() })
    if (out.length === MAX_TESTIMONIALS) break
  }
  return out
}
