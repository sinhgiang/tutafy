// T-0769: the tutor directory rule and its helpers. The REAL code runs here (src/lib/directory.ts): the four conditions of the "bookable" rule with
// every boundary, the free times (1 hour lead, 14 days, blocked days, saved lessons, buffer), the card a visitor receives, the filters in the
// address, the price buckets (approximate rates), the day and time-of-day filters in the VISITOR's time zone, sorting and the states.
// Nothing here reaches a service. All names, prices and times are made up.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CARD_KEYS, DIRECTORY_OPENS_AT, FEW_TUTORS_BELOW, HORIZON_DAYS, LEAD_MINUTES, MAX_CARD_SLOTS, MAX_LISTED, MIN_INTRO_CHARS, NO_FILTERS, PRICE_BUCKETS,
  applyFilters, approxUsd, buildCard, checkListing, cleanLanguage, directoryIsOpen, filtersToQuery, headlineOf, isListable, languageCounts, listingSlots, nextAvailableText,
  parseFilters, realZone, refreshCards, relaxations, slotFits, sortCards, stateOf, thinSlots, type DirectoryCard, type Filters,
} from '@/lib/directory.ts'

const NOW = new Date('2026-10-22T12:00:00Z') // a Thursday
const min = (iso: string) => Date.parse(iso) / 60000
const BIO80 = 'I teach English to adults and children, one to one, with a plan for every lesson and clear homework.'
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6].map(d => ({ day_of_week: d, start_time: '09:00', end_time: '17:00' }))
const base = { availability: EVERY_DAY, timezone: 'UTC', lessonDurations: null, defaultLessonDuration: null, bufferMinutes: 0, blockedDates: [] as string[], busy: [], now: NOW }
const facts = { booking_url_active: true, name: 'Maya Reyes', bio: BIO80, timezone: 'UTC' }

// ---- the rule: each condition decides on its own -------------------------------------------------------------------------------------

test('a tutor who passes all four conditions is listed', () => {
  assert.equal(isListable(facts, 1), true)
})

test('condition 1, the booking page: only a real "on" lists a tutor', () => {
  for (const v of [false, null, undefined, 'true', 1]) assert.equal(isListable({ ...facts, booking_url_active: v }, 5), false, `value ${String(v)}`)
})

test('condition 2, the name: 2 characters once spaces are trimmed', () => {
  assert.equal(isListable({ ...facts, name: 'Li' }, 1), true)
  assert.equal(isListable({ ...facts, name: ' Li ' }, 1), true)
  assert.equal(isListable({ ...facts, name: 'L' }, 1), false)
  assert.equal(isListable({ ...facts, name: '   ' }, 1), false)
  assert.equal(isListable({ ...facts, name: null }, 1), false)
})

test('condition 3, the introduction: 79 characters fail, 80 pass, the ends are trimmed first', () => {
  assert.equal(BIO80.length >= 80, true)
  assert.equal(isListable({ ...facts, bio: BIO80.slice(0, MIN_INTRO_CHARS - 1) }, 1), false)
  assert.equal(isListable({ ...facts, bio: BIO80.slice(0, MIN_INTRO_CHARS) }, 1), true)
  assert.equal(isListable({ ...facts, bio: `   ${BIO80.slice(0, MIN_INTRO_CHARS - 1)}   ` }, 1), false)
  assert.equal(isListable({ ...facts, bio: `  ${BIO80.slice(0, MIN_INTRO_CHARS)}  ` }, 1), true)
  assert.equal(isListable({ ...facts, bio: null }, 1), false)
  assert.equal(checkListing({ ...facts, bio: 'Short.' }, 1).introChars, 6)
})

test('condition 4, a free time: none fails; a time zone that is not real fails even with free times counted', () => {
  assert.equal(isListable(facts, 0), false)
  for (const tz of ['Mars/Olympus_Mons', '', null, undefined, 42]) assert.equal(isListable({ ...facts, timezone: tz }, 5), false, `zone ${String(tz)}`)
  assert.equal(checkListing({ ...facts, timezone: 'Nowhere/Land' }, 5).zoneOk, false)
  assert.equal(realZone('America/New_York'), 'America/New_York')
  assert.equal(realZone('Nowhere/Land'), null)
})

test('the result names the failing conditions, so the dashboard card can say what to fix', () => {
  const r = checkListing({ booking_url_active: false, name: 'A', bio: 'x', timezone: 'UTC' }, 0)
  assert.equal(r.listed, false)
  assert.deepEqual(r.checks.filter(c => !c.ok).map(c => c.id).sort(), ['intro', 'name', 'page', 'times'])
})

// ---- the free times ------------------------------------------------------------------------------------------------------------------

test('a free time must start at least 1 hour from now: 59 minutes is too soon, 61 is fine', () => {
  assert.equal(LEAD_MINUTES, 60)
  const only9 = [{ day_of_week: 4, start_time: '09:00', end_time: '10:00' }] // Thursdays, one slot at 09:00
  const at = (iso: string) => listingSlots({ ...base, availability: only9, now: new Date(iso) })[0]?.at
  assert.equal(at('2026-10-22T08:01:00Z'), '2026-10-29T09:00:00.000Z', '59 minutes before: today is skipped')
  assert.equal(at('2026-10-22T07:59:00Z'), '2026-10-22T09:00:00.000Z', '61 minutes before: today counts')
  assert.equal(at('2026-10-22T08:00:00Z'), '2026-10-22T09:00:00.000Z', 'exactly 60 minutes before counts')
})

test('only the next 14 days count: with every earlier day blocked, day 14 is free and day 15 is not', () => {
  assert.equal(HORIZON_DAYS, 14)
  const upTo = (last: number) => Array.from({ length: last + 1 }, (_, i) => new Date(Date.UTC(2026, 9, 22 + i)).toISOString().slice(0, 10))
  const now = new Date('2026-10-22T10:00:00Z') // the window ends Nov 5 at 10:00, so Nov 5 09:00 is inside it and Nov 6 09:00 is not
  const day14 = listingSlots({ ...base, now, blockedDates: upTo(13) }) // days 0..13 blocked, day 14 (Nov 5) open
  assert.equal(day14[0]?.at, '2026-11-05T09:00:00.000Z')
  assert.equal(listingSlots({ ...base, now, blockedDates: upTo(14) }).length, 0, 'days 0..14 blocked: day 15 is beyond the window')
})

test('a blocked day gives no free time on that day', () => {
  const s = listingSlots({ ...base, blockedDates: ['2026-10-22'] })
  assert.ok(s.length > 0 && s.every(x => x.date !== '2026-10-22'))
})

test('a saved lesson takes its slot, a lesson that only touches the slot does not, and a cancelled one is not passed in', () => {
  const free = (busy: { starts_at: string; ends_at: string }[]) => listingSlots({ ...base, now: new Date('2026-10-22T07:00:00Z'), busy }).slice(0, 3).map(s => s.time)
  assert.deepEqual(free([]), ['09:00', '10:00', '11:00'])
  assert.deepEqual(free([{ starts_at: '2026-10-22T09:00:00Z', ends_at: '2026-10-22T10:00:00Z' }]), ['10:00', '11:00', '12:00'])
  assert.deepEqual(free([{ starts_at: '2026-10-22T08:00:00Z', ends_at: '2026-10-22T09:00:00Z' }]), ['09:00', '10:00', '11:00'], 'a lesson that ends when the slot starts')
  assert.deepEqual(free([{ starts_at: '2026-10-22T10:00:00Z', ends_at: '2026-10-22T10:30:00Z' }]), ['09:00', '11:00', '12:00'], 'a lesson inside a slot takes the slot')
})

test('saved lessons are read the way the booking page writes them: the tutor\'s wall-clock time stored as if it were UTC', () => {
  // a New York tutor, 9 AM: the booking route saves starts_at "2026-10-23T09:00:00Z" for it (not the real 13:00Z)
  const ny = { ...base, timezone: 'America/New_York', now: new Date('2026-10-22T07:00:00Z'), availability: [{ day_of_week: 5, start_time: '09:00', end_time: '11:00' }] }
  const friday = (busy: { starts_at: string; ends_at: string }[]) => listingSlots({ ...ny, busy }).filter(s => s.date === '2026-10-23').map(s => s.time)
  assert.deepEqual(friday([{ starts_at: '2026-10-23T09:00:00Z', ends_at: '2026-10-23T10:00:00Z' }]), ['10:00'])
  assert.deepEqual(friday([{ starts_at: '2026-10-23T13:00:00Z', ends_at: '2026-10-23T14:00:00Z' }]), ['09:00', '10:00'])
})

test('the lesson length and the buffer set the step, like the booking page: a 30-minute lesson fits a 30-minute window, a 60-minute one does not', () => {
  const win = [{ day_of_week: 4, start_time: '10:00', end_time: '10:30' }, { day_of_week: 5, start_time: '10:00', end_time: '10:30' }]
  const now = new Date('2026-10-22T07:00:00Z')
  assert.equal(listingSlots({ ...base, availability: win, now, defaultLessonDuration: 60 }).length, 0)
  assert.ok(listingSlots({ ...base, availability: win, now, lessonDurations: [30], defaultLessonDuration: 30 }).length > 0)
  const buf = listingSlots({ ...base, now, availability: [{ day_of_week: 4, start_time: '09:00', end_time: '11:30' }], bufferMinutes: 30 })
  assert.deepEqual(buf.slice(0, 2).map(s => s.time), ['09:00', '10:30'])
  // a tutor who chose lengths [45, 90] with no default is booked from 45 first: the directory follows the booking page
  const chose = listingSlots({ ...base, now, availability: [{ day_of_week: 4, start_time: '09:00', end_time: '10:45' }], lessonDurations: [45, 90], defaultLessonDuration: null })
  assert.deepEqual(chose.slice(0, 2).map(s => s.time), ['09:00', '09:45'])
})

test('no hours, or a time zone that is not real, gives no free time', () => {
  assert.deepEqual(listingSlots({ ...base, availability: [] }), [])
  assert.deepEqual(listingSlots({ ...base, timezone: 'Mars/Olympus_Mons' }), [])
  assert.deepEqual(listingSlots({ ...base, timezone: null }), [])
})

// ---- the card a visitor receives -----------------------------------------------------------------------------------------------------

const slotsFor = (iso: string[]) => iso.map(at => ({ at: new Date(at).toISOString(), date: at.slice(0, 10), time: at.slice(11, 16) }))
const source = {
  slug: 'maya-reyes', name: 'Maya Reyes', bio: `${BIO80} Write to maya.reyes@example.com or call 0900 000 000.`, avatar_url: 'https://example.com/maya.jpg', languages: ['english ', 'SPANISH', 'English'],
  timezone: 'America/New_York', average_rating: 4.9, review_count: 38, default_lesson_price: 22, currency: 'usd', trial_enabled: true, trial_price: 10,
}

test('a card carries a fixed list of keys and nothing else of the tutor row', () => {
  const rich = { ...source, email: 'maya.reyes@example.com', phone: '0900 000 000', address: '1 Example Street', stripe_account_id: 'acct_1', payment_link: 'https://example.com/pay', id: 'secret-id' }
  const card = buildCard(rich, slotsFor(['2026-10-23T14:00:00Z']))!
  assert.deepEqual(Object.keys(card).sort(), [...CARD_KEYS].sort())
  const json = JSON.stringify(card)
  for (const leak of ['@', 'maya.reyes', '0900', 'Example Street', 'acct_1', 'secret-id', 'pay']) assert.ok(!json.includes(leak), `the card must not carry "${leak}"`)
})

test('the headline is one cleaned sentence; languages are tidied and unique; a plain-http photo is dropped', () => {
  const card = buildCard({ ...source, avatar_url: 'http://example.com/maya.jpg' }, slotsFor(['2026-10-23T14:00:00Z']))!
  assert.equal(card.photo, null)
  assert.deepEqual(card.languages, ['English', 'Spanish'])
  assert.ok(card.headline.length <= 120 && !card.headline.includes('@'))
  assert.equal(headlineOf('Hi. I teach English and German to adults. More text follows here.'), 'Hi. I teach English and German to adults.')
  assert.equal(cleanLanguage('  fRENCH  '), 'French')
  assert.equal(cleanLanguage('swiss german'), 'Swiss German')
})

test('rating, price and trial: a tutor with no reviews has no rating; no price is null; a trial needs a price above zero', () => {
  const none = buildCard({ ...source, review_count: 0, average_rating: 0, default_lesson_price: 0, trial_price: 0 }, slotsFor(['2026-10-23T14:00:00Z']))!
  assert.equal(none.rating, null)
  assert.equal(none.price, null)
  assert.equal(none.trialPrice, null)
  assert.equal(none.complete, 1, 'only the photo')
  const full = buildCard(source, slotsFor(['2026-10-23T14:00:00Z']))!
  assert.deepEqual([full.rating, full.reviews, full.price, full.trialPrice, full.currency], [4.9, 38, 22, 10, 'USD'])
  assert.equal(full.complete, 3, 'photo, price, trial (the introduction is under 200 characters)')
})

test('a tutor with no free time gets no card', () => {
  assert.equal(buildCard(source, []), null)
})

test('long lists of free times are thinned to at most MAX_CARD_SLOTS, keeping the soonest ones', () => {
  const many = Array.from({ length: 600 }, (_, i) => new Date(Date.UTC(2026, 9, 22, 12, 0) + i * 30 * 60000).toISOString())
  const thin = thinSlots(slotsFor(many))
  assert.ok(thin.length <= MAX_CARD_SLOTS && thin.length >= 12)
  assert.equal(thin[0], min(many[0]))
  assert.deepEqual(thin, [...thin].sort((a, b) => a - b))
})

test('free times that have passed are dropped when the page is drawn, and a card with none left disappears', () => {
  const a: DirectoryCard = card({ slug: 'a', slots: [min('2026-10-22T12:30:00Z'), min('2026-10-22T15:00:00Z')] })
  const b: DirectoryCard = card({ slug: 'b', slots: [min('2026-10-22T12:30:00Z')] })
  const out = refreshCards([a, b], new Date('2026-10-22T12:00:00Z'))
  assert.deepEqual(out.map(c => [c.slug, c.slots.length]), [['a', 1]])
  assert.equal(refreshCards([a], new Date('2026-10-22T12:00:00Z'))[0].slots[0], min('2026-10-22T15:00:00Z'))
})

// ---- filters, sorting, the states ----------------------------------------------------------------------------------------------------

function card(o: Partial<DirectoryCard> & { slug: string }): DirectoryCard {
  return {
    name: o.slug, photo: null, languages: ['English'], headline: 'A tutor.', rating: null, reviews: 0, price: 20, currency: 'USD', trialPrice: null, tz: 'UTC', levels: [], groups: [], complete: 0,
    slots: [min('2026-10-22T20:00:00Z')], ...o,
  }
}
const ctx = { zone: 'UTC', now: NOW }
const slugs = (cs: DirectoryCard[]) => cs.map(c => c.slug)

test('filters in the address: only fixed values are accepted, everything else is dropped or cut', () => {
  const f = parseFilters({ lang: 'french', price: '15-30', when: '3days', tod: 'evening', trial: '1', sort: 'soonest', q: 'maya' })
  assert.deepEqual(f, { q: 'maya', lang: 'French', price: '15-30', when: '3days', tod: 'evening', trial: true, level: null, near: false, tz: null, sort: 'soonest', group: null, min: null, max: null })
  assert.deepEqual(parseFilters({ price: '999', when: 'tomorrow', tod: 'night', trial: 'yes', sort: 'random' }), NO_FILTERS)
  assert.deepEqual(parseFilters({ lang: ['german', 'french'], q: ['a', 'b'] }), { ...NO_FILTERS, lang: 'German', q: 'a' }, 'the first value of a repeated key')
  const evil = parseFilters({ q: `<script>alert(1)</script>${'x'.repeat(200)}`, lang: '<img src=x onerror=alert(1)>' })
  assert.ok(evil.q.length <= 60 && !evil.q.includes('\u0000'))
})

test('the address and the filters are one thing: filtersToQuery then parseFilters gives the same filters back', () => {
  const f: Filters = { q: 'maya', lang: 'Spanish', price: '30-50', when: 'weekend', tod: 'morning', trial: true, level: null, near: false, tz: null, sort: 'price-low', group: null, min: null, max: null }
  const query = filtersToQuery(f)
  assert.deepEqual(parseFilters(Object.fromEntries(new URLSearchParams(query))), f)
  assert.equal(filtersToQuery(NO_FILTERS), '')
})

test('language, search and trial filters', () => {
  const cs = [card({ slug: 'a', name: 'Maya Reyes', languages: ['English', 'Spanish'], trialPrice: 5 }), card({ slug: 'b', name: 'Daniel Weiss', languages: ['German'] })]
  assert.deepEqual(slugs(applyFilters(cs, { ...NO_FILTERS, lang: 'Spanish' }, ctx)), ['a'])
  assert.deepEqual(slugs(applyFilters(cs, { ...NO_FILTERS, lang: 'german' }, ctx)), ['b'])
  assert.deepEqual(slugs(applyFilters(cs, { ...NO_FILTERS, q: 'weiss' }, ctx)), ['b'])
  assert.deepEqual(slugs(applyFilters(cs, { ...NO_FILTERS, q: 'span' }, ctx)), ['a'], 'search reads languages too')
  assert.deepEqual(slugs(applyFilters(cs, { ...NO_FILTERS, trial: true }, ctx)), ['a'])
  assert.deepEqual(languageCounts(cs), [{ language: 'English', count: 1 }, { language: 'German', count: 1 }, { language: 'Spanish', count: 1 }])
})

test('price buckets use approximate dollars; a tutor with no price or an unknown currency is in no bucket', () => {
  assert.equal(PRICE_BUCKETS.length, 4)
  const cs = [
    card({ slug: 'usd12', price: 12 }), card({ slug: 'usd15', price: 15 }), card({ slug: 'usd16', price: 16 }), card({ slug: 'usd30', price: 30 }), card({ slug: 'usd50', price: 50 }),
    card({ slug: 'usd51', price: 51 }), card({ slug: 'eur20', price: 20, currency: 'EUR' }), card({ slug: 'vnd', price: 500000, currency: 'VND' }),
    card({ slug: 'chf', price: 10, currency: 'CHF' }), card({ slug: 'none', price: null }),
  ]
  const ids = (price: Filters['price']) => slugs(applyFilters(cs, { ...NO_FILTERS, price }, ctx))
  assert.deepEqual(ids('up15'), ['usd12', 'usd15'])
  assert.deepEqual(ids('15-30'), ['usd16', 'usd30', 'eur20', 'vnd'], 'EUR 20 is about $21.6 and VND 500,000 about $20')
  assert.deepEqual(ids('30-50'), ['usd50'])
  assert.deepEqual(ids('50plus'), ['usd51'])
  assert.equal(approxUsd(cs.find(c => c.slug === 'chf')!), null)
  assert.equal(approxUsd(cs.find(c => c.slug === 'none')!), null)
})

test('free times are read in the VISITOR\'s time zone: the same instant is "today" in one zone and "tomorrow" in another', () => {
  const t = min('2026-10-23T01:00:00Z') // 6 PM on Oct 22 in Los Angeles, 10 AM on Oct 23 in Tokyo
  assert.equal(slotFits(t, { when: 'today', tod: null }, 'America/Los_Angeles', NOW), true)
  assert.equal(slotFits(t, { when: 'today', tod: null }, 'Asia/Tokyo', NOW), false)
  assert.equal(slotFits(t, { when: null, tod: 'evening' }, 'America/Los_Angeles', NOW), true)
  assert.equal(slotFits(t, { when: null, tod: 'morning' }, 'Asia/Tokyo', NOW), true)
  assert.equal(slotFits(t, { when: '3days', tod: 'morning' }, 'Asia/Tokyo', NOW), true)
  assert.equal(slotFits(t, { when: '3days', tod: 'evening' }, 'Asia/Tokyo', NOW), false, 'both conditions must hold on the SAME free time')
})

test('time of day: morning is before 12, afternoon 12 to 5 PM, evening from 5 PM', () => {
  const h = (hh: string) => min(`2026-10-22T${hh}:00Z`)
  const fit = (hh: string, tod: 'morning' | 'afternoon' | 'evening') => slotFits(h(hh), { when: null, tod }, 'UTC', new Date('2026-10-22T00:00:00Z'))
  assert.deepEqual(['11:59', '12:00'].map(x => fit(x, 'morning')), [true, false])
  assert.deepEqual(['11:59', '12:00', '16:59', '17:00'].map(x => fit(x, 'afternoon')), [false, true, true, false])
  assert.deepEqual(['16:59', '17:00', '23:30'].map(x => fit(x, 'evening')), [false, true, true])
})

test('"Next 3 days" and "This weekend" on the visitor\'s calendar', () => {
  const day = (d: string) => min(`${d}T10:00:00Z`)
  const f = (d: string, when: 'today' | '3days' | 'weekend', now = NOW) => slotFits(day(d), { when, tod: null }, 'UTC', now)
  assert.deepEqual(['2026-10-22', '2026-10-24', '2026-10-25'].map(d => f(d, '3days')), [true, true, false], 'Thursday + 2 days = Saturday')
  assert.deepEqual(['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-31'].map(d => f(d, 'weekend')), [false, true, true, false, false], 'Thursday: the coming Saturday and Sunday')
  assert.equal(f('2026-10-25', 'weekend', new Date('2026-10-25T08:00:00Z')), true, 'on a Sunday, today is the weekend')
  assert.equal(f('2026-10-31', 'weekend', new Date('2026-10-25T08:00:00Z')), false, 'on a Sunday, next Saturday is not "this" weekend')
  assert.equal(f('2026-10-31', 'weekend', new Date('2026-10-24T08:00:00Z')), false, 'on a Saturday: today and tomorrow only')
  assert.equal(f('2026-10-25', 'weekend', new Date('2026-10-24T08:00:00Z')), true)
})

test('until the visitor\'s zone is known (the server\'s first draw) the day and time filters are left out, never guessed', () => {
  const cs = [card({ slug: 'morning', slots: [min('2026-10-23T08:00:00Z')] }), card({ slug: 'evening', slots: [min('2026-10-23T19:00:00Z')] })]
  const f: Filters = { ...NO_FILTERS, tod: 'evening' }
  assert.deepEqual(slugs(applyFilters(cs, f, { zone: null, now: NOW })), ['morning', 'evening'])
  assert.deepEqual(slugs(applyFilters(cs, f, ctx)), ['evening'])
})

test('when a list is short, each filter says how many tutors there would be without it, best first', () => {
  const cs = [
    card({ slug: 'a', languages: ['French'], price: 10, slots: [min('2026-10-23T19:00:00Z')] }),
    card({ slug: 'b', languages: ['French'], price: 40, slots: [min('2026-10-23T19:00:00Z')] }),
    card({ slug: 'c', languages: ['French'], price: 45, slots: [min('2026-10-23T19:00:00Z')] }),
  ]
  const f: Filters = { ...NO_FILTERS, lang: 'French', price: 'up15', tod: 'morning' }
  assert.equal(applyFilters(cs, f, ctx).length, 0)
  const r = relaxations(cs, f, ctx)
  assert.deepEqual(r.map(x => [x.key, x.count]), [['tod', 1]], 'dropping only the price still leaves nobody in the morning')
  const r2 = relaxations(cs, { ...f, tod: null }, ctx)
  assert.deepEqual(r2.map(x => [x.key, x.count]), [['price', 3]])
})

test('sorting: soonest, price (approximate dollars, "Ask for price" last either way), rating', () => {
  const cs = [
    card({ slug: 'late', slots: [min('2026-10-25T10:00:00Z')], price: 30, rating: 4.1, reviews: 5 }),
    card({ slug: 'soon', slots: [min('2026-10-22T14:00:00Z')], price: 50, rating: 5, reviews: 2 }),
    card({ slug: 'none', slots: [min('2026-10-23T10:00:00Z')], price: null }),
    card({ slug: 'eur', slots: [min('2026-10-24T10:00:00Z')], price: 20, currency: 'EUR', rating: 4.8, reviews: 40 }),
  ]
  assert.deepEqual(slugs(sortCards(cs, 'soonest', NOW)), ['soon', 'none', 'eur', 'late'])
  assert.deepEqual(slugs(sortCards(cs, 'price-low', NOW)), ['eur', 'late', 'soon', 'none'])
  assert.deepEqual(slugs(sortCards(cs, 'price-high', NOW)), ['soon', 'late', 'eur', 'none'])
  assert.deepEqual(slugs(sortCards(cs, 'rating', NOW)), ['soon', 'eur', 'late', 'none'])
})

test('"Recommended": a free time within 48 hours first, then a fuller profile, then more reviews; the rest is a stable daily rotation', () => {
  const cs = [
    card({ slug: 'far-full', slots: [min('2026-10-29T10:00:00Z')], complete: 4, reviews: 99 }),
    card({ slug: 'near-bare', slots: [min('2026-10-23T10:00:00Z')], complete: 0 }),
    card({ slug: 'near-full', slots: [min('2026-10-23T11:00:00Z')], complete: 4 }),
    card({ slug: 'near-full-reviews', slots: [min('2026-10-23T12:00:00Z')], complete: 4, reviews: 7 }),
  ]
  assert.deepEqual(slugs(sortCards(cs, 'recommended', NOW)), ['near-full-reviews', 'near-full', 'near-bare', 'far-full'])
  const ties = Array.from({ length: 8 }, (_, i) => card({ slug: `t${i}` }))
  const today = slugs(sortCards(ties, 'recommended', NOW))
  assert.deepEqual(today, slugs(sortCards([...ties].reverse(), 'recommended', NOW)), 'the same day gives the same order whatever the input order')
  assert.deepEqual([...today].sort(), slugs(ties).sort(), 'nobody is lost')
  const days = new Set([0, 1, 2, 3, 4, 5].map(d => slugs(sortCards(ties, 'recommended', new Date(NOW.getTime() + d * 86400000))).join()))
  assert.ok(days.size > 1, 'the order of equals rotates from day to day')
})

test('the directory opens at 6 listed tutors: 0 and 5 are the empty state, 6 and more are many (T-0803)', () => {
  assert.equal(DIRECTORY_OPENS_AT, 6, 'the owner chose 6 (W-2547)')
  assert.deepEqual([0, 1, 5, 6, 40].map(stateOf), ['empty', 'empty', 'empty', 'many', 'many'])
  assert.deepEqual([0, 5, 6].map(directoryIsOpen), [false, false, true])
  // the boundary is the named constant, not the number 6 written again
  assert.equal(stateOf(DIRECTORY_OPENS_AT - 1), 'empty')
  assert.equal(stateOf(DIRECTORY_OPENS_AT), DIRECTORY_OPENS_AT < FEW_TUTORS_BELOW ? 'few' : 'many')
  assert.equal(directoryIsOpen(DIRECTORY_OPENS_AT - 1), false)
  assert.equal(directoryIsOpen(DIRECTORY_OPENS_AT), true)
  assert.ok(MAX_LISTED >= 100)
})

test('"Next available" reads the soonest free time on the calendar of the zone it is given', () => {
  const c = card({ slug: 'a', slots: [min('2026-10-23T01:00:00Z')] })
  assert.equal(nextAvailableText(c, 'America/Los_Angeles', NOW), 'Today 6:00 PM')
  assert.equal(nextAvailableText(c, 'Asia/Tokyo', NOW), 'Tomorrow 10:00 AM')
  assert.equal(nextAvailableText(c, 'UTC', NOW), 'Tomorrow 1:00 AM')
})
