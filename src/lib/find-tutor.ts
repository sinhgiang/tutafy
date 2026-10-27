// "Find me a tutor" (T-0897, design option A of T-0864): a student answers a few questions on one screen and gets the three tutors that fit best.
// There is no second rule for who may be shown. The cards are the public directory cards (src/lib/directory.ts: only tutors who can be booked
// today, a fixed list of keys), the answers are the directory's own filters (language, level, price, time of day, trial lesson, time zone), and
// the order is the directory's "Recommended" order. This file only picks the top three and writes, for each, the reasons that are TRUE of that
// tutor (a reason is printed only when the card really has it). Plain .ts with no browser, React or database imports, so the node tests can load it.
import {
  NO_FILTERS, PRICE_BUCKETS, TOD_OPTIONS, activeFilters, applyFilters, nextAvailableText, relaxations, slotFits, sortCards,
  type DirectoryCard, type Filters, type ViewContext,
} from '@/lib/directory'
import { LEVEL_OPTIONS } from '@/lib/tutor-levels'
import { priceLabel } from '@/lib/tutor-profile'
import { TRIAL_NAME } from '@/lib/trial'

/** How many tutors the finder suggests. */
export const SUGGESTED = 3

/** The questions the form asks. Every other filter of the directory (search words, day, "near me", sort) is not asked here, so an address cannot set it silently. */
export function formFilters(f: Filters): Filters {
  return { ...NO_FILTERS, lang: f.lang, level: f.level, price: f.price, tod: f.tod, trial: f.trial, tz: f.tz }
}

export type FindResult = {
  /** How many tutors fit all the answers (the three shown are the best of these). */
  total: number
  picks: DirectoryCard[]
  /** When fewer than three fit: what to drop to get more (best first), with how many tutors that would give. */
  relax: ReturnType<typeof relaxations>
}

export function findTutors(cards: DirectoryCard[], filters: Filters, ctx: ViewContext): FindResult {
  const matching = sortCards(applyFilters(cards, filters, ctx), 'recommended', ctx.now)
  const picks = matching.slice(0, SUGGESTED)
  const relax = matching.length < SUGGESTED && activeFilters(filters).length > 0 ? relaxations(cards, filters, ctx) : []
  return { total: matching.length, picks, relax }
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/**
 * Up to three reasons this tutor was picked. Each one is a fact about THIS card and the answers given: the language and level it was
 * matched on, the time of day when a free time really falls in it (in the visitor's time zone), the price range, the trial lesson, and
 * then plain facts (rating, next free time) to fill the list.
 */
export function whyThisTutor(card: DirectoryCard, filters: Filters, ctx: ViewContext): string[] {
  const why: string[] = []
  const add = (s: string | null) => { if (s && !why.includes(s) && why.length < 3) why.push(s) }

  if (filters.lang) add(`Teaches ${card.languages.find(l => l.toLowerCase() === filters.lang!.toLowerCase()) ?? filters.lang}`)
  else if (card.languages.length > 0) add(`Teaches ${card.languages.slice(0, 2).join(' and ')}`)

  const level = LEVEL_OPTIONS.find(o => o.id === filters.level)
  if (level && card.levels.includes(level.id)) add(`Teaches ${lower(level.label)} students`)

  const tod = TOD_OPTIONS.find(o => o.id === filters.tod)
  if (tod && ctx.zone && card.slots.some(m => slotFits(m, { when: null, tod: tod.id }, ctx.zone!, ctx.now))) add(`Free this ${tod.id} in your time`)

  const bucket = PRICE_BUCKETS.find(b => b.id === filters.price)
  const price = priceLabel(card.price, card.currency)
  if (bucket && price) add(`${price} a lesson, in your ${bucket.label} range`)

  const trial = card.trialPrice !== null ? priceLabel(card.trialPrice, card.currency) : null
  if (trial) add(`${TRIAL_NAME} for ${trial}`)

  if (card.rating !== null && card.reviews > 0) add(`Rated ${card.rating.toFixed(1)} from ${card.reviews} ${card.reviews === 1 ? 'review' : 'reviews'}`)
  add(`Next free time: ${nextAvailableText(card, ctx.zone ?? card.tz, ctx.now)}`)
  return why
}
