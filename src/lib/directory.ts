// The tutor directory (/tutors) and the "Your listing" card in the dashboard (T-0769). Design: docs/directory-design (T-0764, approved).
//
// ONE rule decides who can be booked, and this file is its only home. checkListing() takes a tutor row and the number of free times the
// booking page would offer; listingSlots() works those free times out. The directory (src/lib/directory-data.ts) and the dashboard card
// (src/lib/listing-status.ts) both call these two functions and nothing else, so the directory and the card cannot disagree.
// tests/directory-rule.test.ts runs the rule on a throwaway Postgres (PGlite) beside the owner's count query
// (docs/directory-design/eligible-tutors-count.sql) so the code and the count cannot drift apart.
//
// A tutor is listed when ALL FOUR hold: the booking page is on; the name has 2+ characters; the introduction has 80+ characters;
// at least one free time starts between 1 hour from now and 14 days from now. A photo and a price are NOT needed.
//
// Plain .ts with no browser, React or database imports, so the node tests can load it.
import { nextFreeSlots, safeZone, formatClock, dayLabel, type FreeSlot } from '@/lib/tutor-profile'
import { type AvailabilityRow, type LessonWindow } from '@/lib/booking-slots'
import { resolveDurationConfig } from '@/lib/lesson-durations'
import { normalizeCurrency } from '@/lib/currency'
import { cleanText, httpsImage } from '@/lib/tutor-seo'

// ---- the rule ------------------------------------------------------------------------------------------------------------------------

export const MIN_NAME_CHARS = 2
export const MIN_INTRO_CHARS = 80
/** A free time that starts sooner than this from now is not a promise. */
export const LEAD_MINUTES = 60
/** The directory looks this many days ahead. */
export const HORIZON_DAYS = 14
/** Fewer listed tutors than this is the "few tutors" state (an honest note and an invitation to tutors). */
export const FEW_TUTORS_BELOW = 6
/**
 * The directory shows cards only when at least this many tutors are listed (T-0803, the owner's choice W-2547). Below it /tutors shows the
 * empty state with an invitation to tutors, and the list the page and /api/tutors/public carry holds no card. The rule that lists a tutor
 * is unchanged. Equal to FEW_TUTORS_BELOW today, so the "few tutors" state cannot be reached until the two are set apart.
 */
export const DIRECTORY_OPENS_AT = 6
/** The most cards one answer carries; a longer list is cut here and says so (a cursor page is the next step). */
export const MAX_LISTED = 120
/** Cards drawn at first, and added by each "Show more". */
export const PAGE_SIZE = 24
/** The most free times one card carries for the "Free times" filter. */
export const MAX_CARD_SLOTS = 96

export type ListingFacts = { booking_url_active: unknown; name: unknown; bio: unknown; timezone: unknown }
export type ListingCheckId = 'page' | 'name' | 'intro' | 'times'
export type ListingCheck = { id: ListingCheckId; ok: boolean }
export type ListingResult = {
  listed: boolean
  checks: ListingCheck[]
  /** Characters of the introduction once the ends are trimmed: the tutor card shows "yours is 41 characters". */
  introChars: number
  /** False when the tutor's time zone is empty or not a real one: no free time can be counted for them. */
  zoneOk: boolean
}

const chars = (v: unknown): number => (typeof v === 'string' ? Array.from(v.trim()).length : 0)

/** The tutor's time zone when the runtime knows it, else null: a made-up zone is NOT quietly turned into UTC here (a card must not promise times in a wrong zone). */
export function realZone(tz: unknown): string | null {
  if (typeof tz !== 'string' || !tz.trim()) return null
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz.trim() })
    return tz.trim()
  } catch {
    return null
  }
}

/** THE RULE. `freeTimes` is how many free times listingSlots() found. */
export function checkListing(t: ListingFacts, freeTimes: number): ListingResult {
  const zoneOk = realZone(t.timezone) !== null
  const introChars = chars(t.bio)
  const checks: ListingCheck[] = [
    { id: 'page', ok: t.booking_url_active === true },
    { id: 'name', ok: chars(t.name) >= MIN_NAME_CHARS },
    { id: 'times', ok: zoneOk && freeTimes > 0 },
    { id: 'intro', ok: introChars >= MIN_INTRO_CHARS },
  ]
  return { listed: checks.every(c => c.ok), checks, introChars, zoneOk }
}

export const isListable = (t: ListingFacts, freeTimes: number): boolean => checkListing(t, freeTimes).listed

export type SlotInput = {
  availability: AvailabilityRow[]
  timezone: unknown
  /** tutors.lesson_durations and tutors.default_lesson_duration as stored: the first length the booking page selects is used. */
  lessonDurations: unknown
  defaultLessonDuration: unknown
  bufferMinutes?: number | null
  /** Days the tutor blocked ("YYYY-MM-DD" on their own calendar). */
  blockedDates: string[]
  /** Saved lessons that are not cancelled and are on the tutor's own calendar. */
  busy: LessonWindow[]
  now: Date
}

/**
 * The free times the booking page would offer, from 1 hour to 14 days from now, soonest first. Counted by the same code as the public
 * profile (nextFreeSlots, which uses getSlots and overlappingLesson of the booking page). Empty for a time zone that is not real.
 */
export function listingSlots(i: SlotInput): FreeSlot[] {
  const tz = realZone(i.timezone)
  if (!tz || i.availability.length === 0) return []
  const duration = resolveDurationConfig(i.lessonDurations, i.defaultLessonDuration).defaultDuration
  const until = i.now.getTime() + HORIZON_DAYS * 86400000
  return nextFreeSlots({
    availability: i.availability, timezone: tz, durationMinutes: duration, bufferMinutes: Number(i.bufferMinutes) > 0 ? Number(i.bufferMinutes) : 0,
    blockedDates: i.blockedDates, busy: i.busy, now: i.now, days: HORIZON_DAYS + 1, maxSlots: 1000, leadMinutes: LEAD_MINUTES,
  }).filter(s => Date.parse(s.at) <= until)
}

// ---- the card ------------------------------------------------------------------------------------------------------------------------

/** What one card carries to the browser. A test fixes this list of keys: nothing else of a tutor row (never an email, phone or payment field) is sent. */
export const CARD_KEYS = ['slug', 'name', 'photo', 'languages', 'headline', 'rating', 'reviews', 'price', 'currency', 'trialPrice', 'tz', 'complete', 'slots'] as const

export type DirectoryCard = {
  slug: string
  name: string
  photo: string | null
  languages: string[]
  headline: string
  /** Average of the public reviews, or null for a tutor with none. */
  rating: number | null
  reviews: number
  /** The lesson price in the tutor's own currency, or null ("Ask for price"). */
  price: number | null
  currency: string
  trialPrice: number | null
  tz: string
  /** 0 to 4: photo, an introduction of 200+ characters, a price, a trial lesson. Only used to rank. */
  complete: number
  /** Free times as minutes since 1970 (UTC), soonest first, at most MAX_CARD_SLOTS. */
  slots: number[]
}

export type CardSource = {
  slug: unknown; name: unknown; bio: unknown; avatar_url: unknown; languages: unknown; timezone: unknown
  average_rating: unknown; review_count: unknown; default_lesson_price: unknown; currency: unknown; trial_enabled: unknown; trial_price: unknown
}

/** "Fr" "french " " ENGLISH" become "French" / "English": the stored values are free text, so display and matching use one cleaned form. */
export function cleanLanguage(raw: unknown): string {
  const s = cleanText(typeof raw === 'string' ? raw : '', 30).toLowerCase()
  return s.replace(/(^|[\s-])(\p{L})/gu, (_m, sep: string, c: string) => sep + c.toUpperCase())
}

export function cleanLanguages(raw: unknown): string[] {
  const out: string[] = []
  for (const r of Array.isArray(raw) ? raw : []) {
    const l = cleanLanguage(r)
    if (l && !out.includes(l)) out.push(l)
  }
  return out.slice(0, 6)
}

/** One sentence of the introduction for the card: the first sentence, cleaned of anything that looks like an email or a phone number, at most 120 characters. */
export function headlineOf(bio: unknown): string {
  const text = cleanText(typeof bio === 'string' ? bio : '', 400)
  const m = /^(.{20,}?[.!?])(?:\s|$)/.exec(text)
  return cleanText(m ? m[1] : text, 120)
}

const positive = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.trim()) : Number(v)
  return v !== null && v !== '' && Number.isFinite(n) && n > 0 ? n : null
}

/** Thin a long list of free times for the browser: keep every time of the first days, then one per hour, never more than MAX_CARD_SLOTS. */
export function thinSlots(slots: FreeSlot[]): number[] {
  const out: number[] = []
  let lastHour = -1
  for (const s of slots) {
    const min = Math.floor(Date.parse(s.at) / 60000)
    const hour = Math.floor(min / 60)
    if (out.length < 12 || hour !== lastHour) out.push(min)
    lastHour = hour
    if (out.length >= MAX_CARD_SLOTS) break
  }
  return out
}

/** The card for a tutor the rule listed. Returns null when there is no free time (a card without one is never drawn). */
export function buildCard(t: CardSource, slots: FreeSlot[]): DirectoryCard | null {
  const thin = thinSlots(slots)
  if (thin.length === 0 || typeof t.slug !== 'string' || typeof t.name !== 'string') return null
  const price = positive(t.default_lesson_price)
  const trialPrice = t.trial_enabled === true ? positive(t.trial_price) : null
  const photo = httpsImage(typeof t.avatar_url === 'string' ? t.avatar_url : null) ?? null
  const reviews = Math.max(0, Math.floor(Number(t.review_count) || 0))
  const rating = reviews > 0 && Number(t.average_rating) > 0 ? Math.min(5, Number(t.average_rating)) : null
  return {
    slug: t.slug,
    name: cleanText(t.name, 60),
    photo,
    languages: cleanLanguages(t.languages),
    headline: headlineOf(t.bio),
    rating,
    reviews,
    price,
    currency: normalizeCurrency(t.currency),
    trialPrice,
    tz: realZone(t.timezone) ?? 'UTC',
    complete: (photo ? 1 : 0) + (chars(t.bio) >= 200 ? 1 : 0) + (price ? 1 : 0) + (trialPrice ? 1 : 0),
    slots: thin,
  }
}

/** Free times that are still in the future with the lead time, at the moment the page is drawn (the list is cached for a few minutes). */
export function refreshCards(cards: DirectoryCard[], now: Date): DirectoryCard[] {
  const from = Math.floor((now.getTime() + LEAD_MINUTES * 60000) / 60000)
  const out: DirectoryCard[] = []
  for (const c of cards) {
    const slots = c.slots.filter(m => m >= from)
    if (slots.length > 0) out.push(slots.length === c.slots.length ? c : { ...c, slots })
  }
  return out
}

// ---- approximate prices --------------------------------------------------------------------------------------------------------------

/** Dollars for one unit of a currency. APPROXIMATE, only for the price filter and price sort (a card always shows the tutor's own currency). */
export const APPROX_USD: Record<string, number> = {
  USD: 1, EUR: 1.08, GBP: 1.27, AUD: 0.65, CAD: 0.73, SGD: 0.74, JPY: 0.0067, INR: 0.012, BRL: 0.18, MXN: 0.055, VND: 0.00004,
}
export const APPROX_RATES_NOTE = 'Other currencies are converted at approximate rates.'

/** A card's price in approximate dollars, or null when there is no price or the currency has no rate. */
export function approxUsd(c: Pick<DirectoryCard, 'price' | 'currency'>): number | null {
  const rate = APPROX_USD[c.currency]
  return c.price !== null && rate ? c.price * rate : null
}

export const PRICE_BUCKETS = [
  { id: 'up15', label: 'Up to $15', test: (usd: number) => usd <= 15 },
  { id: '15-30', label: '$15 to $30', test: (usd: number) => usd > 15 && usd <= 30 },
  { id: '30-50', label: '$30 to $50', test: (usd: number) => usd > 30 && usd <= 50 },
  { id: '50plus', label: '$50+', test: (usd: number) => usd > 50 },
] as const
export type PriceBucketId = (typeof PRICE_BUCKETS)[number]['id']

// ---- filters and sorting -------------------------------------------------------------------------------------------------------------

export const WHEN_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: '3days', label: 'Next 3 days' },
  { id: 'weekend', label: 'This weekend' },
] as const
export const TOD_OPTIONS = [
  { id: 'morning', label: 'Morning', hint: 'before 12' },
  { id: 'afternoon', label: 'Afternoon', hint: '12 to 5 PM' },
  { id: 'evening', label: 'Evening', hint: 'after 5 PM' },
] as const
export const SORT_OPTIONS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'soonest', label: 'Soonest available' },
  { id: 'price-low', label: 'Price: low to high' },
  { id: 'price-high', label: 'Price: high to low' },
  { id: 'rating', label: 'Rating' },
] as const

export type WhenId = (typeof WHEN_OPTIONS)[number]['id']
export type TodId = (typeof TOD_OPTIONS)[number]['id']
export type SortId = (typeof SORT_OPTIONS)[number]['id']

export type Filters = { q: string; lang: string | null; price: PriceBucketId | null; when: WhenId | null; tod: TodId | null; trial: boolean; sort: SortId }
export const NO_FILTERS: Filters = { q: '', lang: null, price: null, when: null, tod: null, trial: false, sort: 'recommended' }

type Params = Record<string, string | string[] | undefined>
const one = (p: Params, k: string): string => { const v = p[k]; return (Array.isArray(v) ? v[0] : v) ?? '' }
const pick = <T extends string>(v: string, options: readonly { id: T }[]): T | null => options.find(o => o.id === v)?.id ?? null

/** The filters in an address. Every value is checked against a fixed list (or cut to a short length), so an address typed by hand only ever gives a valid state. */
export function parseFilters(p: Params): Filters {
  return {
    q: cleanText(one(p, 'q'), 60),
    lang: cleanLanguage(one(p, 'lang')) || null,
    price: pick(one(p, 'price'), PRICE_BUCKETS),
    when: pick(one(p, 'when'), WHEN_OPTIONS),
    tod: pick(one(p, 'tod'), TOD_OPTIONS),
    trial: one(p, 'trial') === '1',
    sort: pick(one(p, 'sort'), SORT_OPTIONS) ?? 'recommended',
  }
}

/** The address query for a set of filters ("" when none): the same filters again with parseFilters. */
export function filtersToQuery(f: Filters): string {
  const q = new URLSearchParams()
  if (f.q) q.set('q', f.q)
  if (f.lang) q.set('lang', f.lang.toLowerCase())
  if (f.price) q.set('price', f.price)
  if (f.when) q.set('when', f.when)
  if (f.tod) q.set('tod', f.tod)
  if (f.trial) q.set('trial', '1')
  if (f.sort !== 'recommended') q.set('sort', f.sort)
  const s = q.toString()
  return s ? `?${s}` : ''
}

export type FilterKey = 'q' | 'lang' | 'price' | 'when' | 'tod' | 'trial'
export function activeFilters(f: Filters): FilterKey[] {
  return (['lang', 'price', 'when', 'tod', 'trial', 'q'] as const).filter(k => (k === 'trial' ? f.trial : Boolean(f[k])))
}
export function withoutFilter(f: Filters, key: FilterKey): Filters {
  return { ...f, [key]: key === 'trial' ? false : key === 'q' ? '' : null }
}
export function filterLabel(f: Filters, key: FilterKey): string {
  switch (key) {
    case 'lang': return f.lang ?? ''
    case 'price': return PRICE_BUCKETS.find(b => b.id === f.price)?.label ?? ''
    case 'when': return WHEN_OPTIONS.find(o => o.id === f.when)?.label ?? ''
    case 'tod': return TOD_OPTIONS.find(o => o.id === f.tod)?.label ?? ''
    case 'trial': return 'Trial lesson'
    case 'q': return `“${f.q}”`
  }
}

type ViewerClock = (ms: number) => { day: string; hour: number }
const clocks = new Map<string, ViewerClock>()
/** A fast "which calendar day and hour is this instant, in this zone" (one formatter per zone). */
function viewerClock(tz: string): ViewerClock {
  let c = clocks.get(tz)
  if (!c) {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit' })
    c = ms => {
      const p = f.formatToParts(new Date(ms))
      const get = (t: string) => p.find(x => x.type === t)?.value ?? '00'
      return { day: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) % 24 }
    }
    clocks.set(tz, c)
  }
  return c
}

const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / 86400000

/** True when one free time (minutes since 1970) fits the day and time-of-day filters on the VIEWER's calendar. */
export function slotFits(min: number, f: Pick<Filters, 'when' | 'tod'>, zone: string, now: Date): boolean {
  const clock = viewerClock(zone)
  const { day, hour } = clock(min * 60000)
  if (f.tod) {
    if (f.tod === 'morning' && hour >= 12) return false
    if (f.tod === 'afternoon' && (hour < 12 || hour >= 17)) return false
    if (f.tod === 'evening' && hour < 17) return false
  }
  if (f.when) {
    const today = dayNumber(clock(now.getTime()).day)
    const offset = dayNumber(day) - today
    if (f.when === 'today' && offset !== 0) return false
    if (f.when === '3days' && (offset < 0 || offset > 2)) return false
    if (f.when === 'weekend') {
      const dow = new Date(dayNumber(day) * 86400000).getUTCDay()
      const todayDow = new Date(today * 86400000).getUTCDay()
      const lastSunday = todayDow === 0 ? 0 : 7 - todayDow
      if (!(dow === 6 || dow === 0) || offset < 0 || offset > lastSunday) return false
    }
  }
  return true
}

export type ViewContext = { zone: string | null; now: Date }

/**
 * Cards that pass the filters. The day and time-of-day filters need the visitor's own time zone; until it is known (the server's first
 * draw) they are left out rather than guessed.
 */
export function applyFilters(cards: DirectoryCard[], f: Filters, ctx: ViewContext): DirectoryCard[] {
  const q = f.q.toLowerCase()
  const langKey = f.lang?.toLowerCase() ?? null
  const bucket = PRICE_BUCKETS.find(b => b.id === f.price)
  return cards.filter(c => {
    if (q && !c.name.toLowerCase().includes(q) && !c.languages.some(l => l.toLowerCase().includes(q))) return false
    if (langKey && !c.languages.some(l => l.toLowerCase() === langKey)) return false
    if (bucket) {
      const usd = approxUsd(c)
      if (usd === null || !bucket.test(usd)) return false
    }
    if (f.trial && c.trialPrice === null) return false
    if ((f.when || f.tod) && ctx.zone) {
      if (!c.slots.some(m => slotFits(m, f, ctx.zone!, ctx.now))) return false
    }
    return true
  })
}

/** Why a list is short or empty: for each active filter, how many cards there would be without it, best first. */
export function relaxations(cards: DirectoryCard[], f: Filters, ctx: ViewContext): { key: FilterKey; label: string; count: number }[] {
  const have = applyFilters(cards, f, ctx).length
  return activeFilters(f)
    .map(key => ({ key, label: filterLabel(f, key), count: applyFilters(cards, withoutFilter(f, key), ctx).length }))
    .filter(r => r.count > have)
    .sort((a, b) => b.count - a.count)
}

/** A small hash with a final mix, so that changing only the last characters (the date) reshuffles the whole order. */
const fnv = (s: string): number => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16
  return h >>> 0
}

export function sortCards(cards: DirectoryCard[], sort: SortId, now: Date): DirectoryCard[] {
  const day = now.toISOString().slice(0, 10)
  const soon = now.getTime() + 48 * 3600000
  const tie = (c: DirectoryCard) => fnv(`${c.slug}|${day}`)
  const first = (c: DirectoryCard) => c.slots[0] * 60000
  const byTie = (a: DirectoryCard, b: DirectoryCard) => tie(a) - tie(b)
  const list = [...cards]
  switch (sort) {
    case 'soonest': return list.sort((a, b) => first(a) - first(b) || byTie(a, b))
    case 'price-low':
    case 'price-high': {
      const dir = sort === 'price-low' ? 1 : -1
      return list.sort((a, b) => {
        const pa = approxUsd(a), pb = approxUsd(b)
        if (pa === null || pb === null) return pa === pb ? byTie(a, b) : pa === null ? 1 : -1 // "Ask for price" last either way
        return (pa - pb) * dir || byTie(a, b)
      })
    }
    case 'rating': return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviews - a.reviews || byTie(a, b))
    default: return list.sort((a, b) => {
      const sa = first(a) <= soon ? 1 : 0, sb = first(b) <= soon ? 1 : 0
      return sb - sa || b.complete - a.complete || b.reviews - a.reviews || byTie(a, b)
    })
  }
}

/** The languages of the listed tutors with how many tutors teach each, most first. */
export function languageCounts(cards: DirectoryCard[]): { language: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const c of cards) for (const l of c.languages) counts.set(l, (counts.get(l) ?? 0) + 1)
  return [...counts].map(([language, count]) => ({ language, count })).sort((a, b) => b.count - a.count || a.language.localeCompare(b.language))
}

export type DirectoryState = 'many' | 'few' | 'empty'
export const stateOf = (listed: number): DirectoryState => (listed < DIRECTORY_OPENS_AT ? 'empty' : listed < FEW_TUTORS_BELOW ? 'few' : 'many')
/** Whether the directory shows cards for this many listed tutors. */
export const directoryIsOpen = (listed: number): boolean => listed >= DIRECTORY_OPENS_AT

// ---- the line "Next available" -------------------------------------------------------------------------------------------------------

/** "Today 6:00 PM": a card's soonest free time on the calendar of `zone` (the visitor's, or the tutor's until the visitor's is known). */
export function nextAvailableText(card: DirectoryCard, zone: string, now: Date): string {
  const ms = card.slots[0] * 60000
  return `${dayLabel(ms, safeZone(zone), now)} ${formatClock(ms, safeZone(zone))}`
}
