// What the public booking page (/book/<slug>) says about a tutor, worked out from the fields the page already reads (T-0810).
// No table or column is added: the title, the description, the questions and the facts row are made from the name, languages,
// price, trial, cancellation window, time zone and lesson lengths. A fact the tutor has not set is left out, never made up.
// Plain .ts with no browser or React imports, so the node tests run it.
import { cleanText } from '@/lib/tutor-seo'
import { describeDurations } from '@/lib/lesson-durations'
import { firstNameOf, hasTrial, priceLabel, safeZone, zoneCity } from '@/lib/tutor-profile'
import { cardPaymentUrl, paypalUrl } from '@/lib/payment-methods'
import { SITE_URL } from '@/lib/site-url'

export const BOOKING_TITLE_MAX = 60
export const BOOKING_DESCRIPTION_MAX = 155

/** The fields of a tutor row this file looks at. */
export type BookingTutor = {
  name: string | null
  languages?: string[] | null
  timezone?: string | null
  default_lesson_price?: unknown
  currency?: unknown
  trial_enabled?: boolean | null
  trial_price?: unknown
  cancellation_hours?: number | null
}

function langsOf(t: BookingTutor): string[] {
  const out: string[] = []
  for (const raw of Array.isArray(t.languages) ? t.languages : []) {
    const l = cleanText(raw, 30)
    if (l && !out.some(o => o.toLowerCase() === l.toLowerCase())) out.push(l)
    if (out.length === 3) break
  }
  return out
}

/** The hours of the free-cancellation window, or 0 when the tutor set none. */
export function cancelHoursOf(t: Pick<BookingTutor, 'cancellation_hours'>): number {
  const h = Number(t.cancellation_hours)
  return Number.isFinite(h) && h > 0 ? h : 0
}

/** The title and description of /book/<slug>: its own words (the profile at /tutors/<slug> has its own), from facts the tutor set. */
export function bookingSeoText(t: BookingTutor): { title: string; description: string } {
  const name = cleanText(t.name, 60) || 'Tutafy tutor'
  const langs = langsOf(t)
  const titles = [
    langs.length ? `Book ${name}: ${langs[0]} Lessons | Tutafy` : '',
    `Book a Lesson with ${name} | Tutafy`,
    `Book ${name} | Tutafy`,
  ].filter(Boolean)
  let title = titles.find(x => x.length <= BOOKING_TITLE_MAX)
  if (!title) {
    const suffix = ' | Tutafy'
    title = `Book ${name.slice(0, BOOKING_TITLE_MAX - suffix.length - 6).trimEnd()}…${suffix}`
  }

  const price = priceLabel(t.default_lesson_price, t.currency)
  const trial = hasTrial({ trial_enabled: t.trial_enabled ?? null, trial_price: t.trial_price }) ? priceLabel(t.trial_price, t.currency) : null
  const cancel = cancelHoursOf(t)
  const lessons = langs.length ? `online ${langs.join(', ').replace(/, ([^,]*)$/, ' & $1')} lessons` : 'online lessons'
  const facts = [price ? `${price} per lesson` : '', trial ? `trial lesson ${trial}` : '', cancel ? `free cancellation up to ${cancel}h` : ''].filter(Boolean)
  const lead = `Book 1-on-1 ${lessons} with ${name}.`
  const tail = 'Pick a time and book, no account needed.'
  // drop facts from the end until it fits, so the sentence stays whole
  let description = ''
  for (let n = facts.length; n >= 0; n--) {
    const candidate = [lead, n ? `${facts.slice(0, n).join(', ').replace(/^./, c => c.toUpperCase())}.` : '', tail].filter(Boolean).join(' ')
    if (candidate.length <= BOOKING_DESCRIPTION_MAX) { description = candidate; break }
  }
  if (!description) description = `Book 1-on-1 online lessons with ${name.slice(0, 30).trimEnd()}… ${tail}`
  return { title, description }
}

export type FaqItem = { q: string; a: string }

/** The questions shown on the page and put in its FAQPage markup: the same list, so the markup never says more than the page. */
export function bookingFaq(t: BookingTutor & { durations: number[] }): FaqItem[] {
  const name = cleanText(t.name, 80) || 'this tutor'
  const first = firstNameOf(t.name)
  const price = priceLabel(t.default_lesson_price, t.currency)
  const trial = hasTrial({ trial_enabled: t.trial_enabled ?? null, trial_price: t.trial_price }) ? priceLabel(t.trial_price, t.currency) : null
  const cancel = cancelHoursOf(t)
  const tz = safeZone(t.timezone)
  const items: FaqItem[] = [
    { q: `How do I book a lesson with ${name}?`, a: `Choose a lesson length, pick a day and a time in the calendar, then enter your name and email. Your confirmation arrives by email. You do not need an account.` },
    { q: 'What time zone are the times in?', a: `The calendar uses ${first}'s time zone, ${zoneCity(tz)} (${tz}). When your own time zone is different, each time also shows the time for you.` },
  ]
  if (price) items.push({ q: `How much does a lesson with ${first} cost?`, a: `A lesson costs ${price}, whichever length you choose (${describeDurations(t.durations)}).` })
  if (trial) items.push({ q: 'How does the trial lesson work?', a: `Your first lesson with ${first} costs ${trial}. Switch on “Trial lesson” when you book. It is for a first lesson only.` })
  items.push({
    q: 'What if I need to cancel?',
    a: cancel
      ? `You can cancel for free up to ${cancel} ${cancel === 1 ? 'hour' : 'hours'} before the lesson.`
      : `${first} has not set a free-cancellation window. Ask before you book if you may need to change the time.`,
  })
  items.push({ q: 'How do I pay?', a: `You pay ${first} directly. Tutafy does not process lesson payments. After you book, the page shows the payment options ${first} has set up.` })
  return items
}

/** FAQPage structured data for exactly these questions. */
export function faqJsonLd(items: FaqItem[], slug: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/book/${slug}#faq`,
    mainEntity: items.map(i => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
  }
}

/** Where "Buy" goes for a lesson package: the tutor's PayPal (with the amount) first, else their own card link, else nothing. Only a safe address. */
export function packageBuyUrl(tutor: { paypal_link?: string | null; paddle_checkout_link?: string | null }, price: number): string | null {
  if (tutor.paypal_link) return `${paypalUrl(tutor.paypal_link)}/${price.toFixed(2)}`
  return cardPaymentUrl(tutor)
}
