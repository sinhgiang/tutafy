// The words of a tutor's public profile that are written for people asking a search engine or an AI assistant (T-0915): a first sentence that answers
// "who is this tutor, what do they teach, what does a lesson cost", and a short list of questions with answers. Pure, built only from what the page
// already shows. The FAQ is drawn on the page AND put in its FAQPage markup from the same list, so the markup never says more than the page.
import { cleanText } from '@/lib/tutor-seo'
import { cleanLanguages } from '@/lib/directory'
import { firstNameOf, hasTrial, priceLabel, safeZone, zoneCity } from '@/lib/tutor-profile'
import { describeDurations } from '@/lib/lesson-durations'
import { ESTABLISHED_LESSONS, ESTABLISHED_TITLE } from '@/lib/established'
import { absoluteUrl } from '@/lib/site-url'
import type { VideoProvider } from '@/lib/intro-video'

export type FaqItem = { q: string; a: string }

type ProfileFacts = {
  name: string | null
  languages: unknown
  timezone: unknown
  default_lesson_price: unknown
  currency: unknown
  trial_enabled: boolean | null
  trial_price: unknown
  durations: number[]
}

const joinList = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`)

/** One or two sentences that answer the question first: who, what, where, how much. Nothing is said about a fact the tutor has not set. */
export function profileSummary(t: ProfileFacts): string {
  const name = cleanText(t.name, 80) || 'This tutor'
  const langs = cleanLanguages(t.languages)
  const price = priceLabel(t.default_lesson_price, t.currency)
  const trial = hasTrial({ trial_enabled: t.trial_enabled, trial_price: t.trial_price }) ? priceLabel(t.trial_price, t.currency) : null
  const teaches = langs.length ? `${name} teaches ${joinList(langs)} online` : `${name} is an online tutor on Tutafy`
  const city = zoneCity(safeZone(t.timezone))
  let text = `${teaches}, in ${city} time.`
  if (price) text += ` A lesson costs ${price} (${describeDurations(t.durations)}).`
  if (trial) text += ` The first lesson is ${trial}.`
  return text
}

type FaqInput = ProfileFacts & {
  cancellation_hours: unknown
  bookable: boolean
  established: boolean
  video: VideoProvider | null
}

/** The questions people ask about this tutor, with real answers. Each item exists only when its answer is true for this tutor. */
export function profileFaq(t: FaqInput): FaqItem[] {
  const name = cleanText(t.name, 80) || 'this tutor'
  const first = firstNameOf(t.name)
  const price = priceLabel(t.default_lesson_price, t.currency)
  const cancel = Number(t.cancellation_hours)
  const items: FaqItem[] = []
  if (t.bookable) {
    items.push({ q: `How do I book a lesson with ${name}?`, a: `Press “Book a lesson”, pick a free time (shown in your own time zone), and enter your name and email. You do not need an account.` })
  }
  if (price) items.push({ q: `How much does a lesson with ${first} cost?`, a: `A lesson costs ${price}, whichever length you choose (${describeDurations(t.durations)}).` })
  if (t.bookable && Number.isFinite(cancel) && cancel > 0) {
    items.push({ q: `Can I cancel a lesson with ${first}?`, a: `Yes. You can cancel for free up to ${cancel} ${cancel === 1 ? 'hour' : 'hours'} before the lesson.` })
  }
  if (t.video) {
    items.push({ q: `Can I watch ${first}’s intro video before I book?`, a: `Yes. Press play at the top of the page. The video is on ${t.video === 'youtube' ? 'YouTube' : 'Vimeo'}, and Tutafy loads it only when you press play.` })
  }
  if (t.established) {
    items.push({
      q: `What does the “${ESTABLISHED_TITLE.replace(' on Tutafy', '')}” badge mean?`,
      a: `Tutafy gives it automatically from its own records when a tutor has confirmed their sign-in email, has a live booking page, has written an introduction and has taught ${ESTABLISHED_LESSONS} or more lessons on Tutafy. It is not an identity or qualification check: Tutafy does not check IDs, diplomas or qualifications.`,
    })
  }
  return items
}

/** FAQPage structured data for exactly these questions. */
export function profileFaqJsonLd(items: FaqItem[], slug: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${absoluteUrl(`/tutors/${slug}`)}#faq`,
    mainEntity: items.map(i => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
  }
}
