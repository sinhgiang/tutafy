// T-0915: the "Established" badge rule (src/lib/established.ts). Four conditions, all of them needed, each tested on its own edge; and no word on the card
// says or hints that a tutor was verified or checked as a person.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ESTABLISHED_BIO_MIN, ESTABLISHED_LESSONS, ESTABLISHED_NOTE, ESTABLISHED_TITLE, bioLength, dayLabel, establishedBadge, type EstablishedFacts } from '@/lib/established.ts'

const NOW = new Date('2026-10-24T12:00:00Z')
const BIO = 'Friendly English and Spanish tutor with ten years of experience helping adults speak with confidence.'
const GOOD: EstablishedFacts = { emailConfirmedAt: '2026-03-03T10:00:00Z', completedLessons: 12, tenthLessonAt: '2026-09-09T15:00:00Z', bookingActive: true, bio: BIO }
const status = (f: EstablishedFacts) => Object.fromEntries(establishedBadge(f, NOW).checks.map(c => [c.id, c.ok]))

test('a tutor who meets all four conditions is Established, and the card lists each with its date', () => {
  const r = establishedBadge(GOOD, NOW)
  assert.equal(r.earned, true)
  assert.deepEqual(r.checks.map(c => c.id), ['email', 'booking', 'intro', 'lessons'])
  assert.ok(r.checks.every(c => c.ok))
  assert.deepEqual(r.checks.map(c => c.detail), ['Confirmed Mar 3, 2026', 'Checked Oct 24, 2026', 'Checked Oct 24, 2026', '12 held, the 10th on Sep 9, 2026'])
  assert.deepEqual(r.checks.map(c => c.title), ['Sign-in email confirmed', 'Booking page is live', 'Introduction written', '10+ lessons taught on Tutafy'])
})

test('condition 1: the sign-in email must be confirmed (a missing or unreadable date is not confirmed)', () => {
  for (const emailConfirmedAt of [null, '', 'not a date']) {
    const f = { ...GOOD, emailConfirmedAt }
    assert.equal(establishedBadge(f, NOW).earned, false, String(emailConfirmedAt))
    assert.deepEqual(status(f), { email: false, booking: true, intro: true, lessons: true })
  }
  assert.equal(establishedBadge(GOOD, NOW).earned, true)
})

test('condition 2: the booking page must be live (only a true value counts)', () => {
  assert.equal(establishedBadge({ ...GOOD, bookingActive: false }, NOW).earned, false)
  assert.deepEqual(status({ ...GOOD, bookingActive: false }), { email: true, booking: false, intro: true, lessons: true })
  for (const odd of [undefined, null, 'true', 1]) assert.equal(establishedBadge({ ...GOOD, bookingActive: odd as unknown as boolean }, NOW).earned, false, String(odd))
})

test('condition 3: the introduction must be written, from 40 characters of text; blanks and a single word do not count', () => {
  assert.equal(ESTABLISHED_BIO_MIN, 40)
  const edge = 'x'.repeat(ESTABLISHED_BIO_MIN)
  assert.equal(establishedBadge({ ...GOOD, bio: edge }, NOW).earned, true)
  assert.equal(establishedBadge({ ...GOOD, bio: edge.slice(1) }, NOW).earned, false)
  for (const bio of [null, '', '   ', '\n\n', 'Hi', 'a'.repeat(ESTABLISHED_BIO_MIN - 1), ' '.repeat(100) + 'short ' + ' '.repeat(100), undefined as unknown as string]) {
    assert.equal(establishedBadge({ ...GOOD, bio }, NOW).earned, false, JSON.stringify(bio)?.slice(0, 30))
    assert.deepEqual(status({ ...GOOD, bio }), { email: true, booking: true, intro: false, lessons: true })
  }
  assert.equal(bioLength('  a   b \n c '), 5, 'runs of blanks count once and the ends do not count')
  assert.equal(bioLength(42), 0)
})

test('condition 4: ten lessons taught, not nine; the sentence says how far along a tutor is', () => {
  assert.equal(ESTABLISHED_LESSONS, 10)
  const nine = establishedBadge({ ...GOOD, completedLessons: 9, tenthLessonAt: null }, NOW)
  assert.equal(nine.earned, false)
  assert.equal(nine.checks[3].detail, '9 of 10 so far')
  assert.equal(establishedBadge({ ...GOOD, completedLessons: 10 }, NOW).earned, true)
  assert.equal(establishedBadge({ ...GOOD, completedLessons: 0, tenthLessonAt: null }, NOW).checks[3].detail, '0 of 10 so far')
  for (const n of [-3, Number.NaN, Number.POSITIVE_INFINITY * 0]) assert.equal(establishedBadge({ ...GOOD, completedLessons: n, tenthLessonAt: null }, NOW).earned, false, String(n))
  // ten lessons with no date for the tenth is still earned (the date is detail, not a condition)
  const noDate = establishedBadge({ ...GOOD, completedLessons: 10, tenthLessonAt: null }, NOW)
  assert.equal(noDate.earned, true)
  assert.equal(noDate.checks[3].detail, '10 held')
})

test('failing one condition at a time never earns the badge; failing all four shows four honest lines', () => {
  const failing: Partial<EstablishedFacts>[] = [{ emailConfirmedAt: null }, { bookingActive: false }, { bio: 'short' }, { completedLessons: 3, tenthLessonAt: null }]
  for (const f of failing) assert.equal(establishedBadge({ ...GOOD, ...f }, NOW).earned, false, JSON.stringify(f))
  const none = establishedBadge({ emailConfirmedAt: null, completedLessons: 0, tenthLessonAt: null, bookingActive: false, bio: null }, NOW)
  assert.equal(none.earned, false)
  assert.deepEqual(none.checks.map(c => c.detail), ['Not confirmed yet', 'The booking page is off', 'No introduction yet', '0 of 10 so far'])
})

test('the dates are drawn in UTC, so the same day shows on the server and in a browser', () => {
  assert.equal(dayLabel(new Date('2026-10-24T23:59:59Z')), 'Oct 24, 2026')
  assert.equal(dayLabel(new Date('2026-10-25T00:00:00Z')), 'Oct 25, 2026')
})

test('no word on the card says or hints that a person was verified or their papers checked', () => {
  const all = [ESTABLISHED_TITLE, ESTABLISHED_NOTE, ...establishedBadge(GOOD, NOW).checks.flatMap(c => [c.title, c.detail]), ...establishedBadge({ ...GOOD, bio: null }, NOW).checks.flatMap(c => [c.title, c.detail])].join(' | ')
  assert.doesNotMatch(all, /verif|vetted|certif|background|identity|\bID checked|diploma checked|qualified by|approved by|guarantee/i)
  assert.match(ESTABLISHED_NOTE, /does not check IDs, diplomas or qualifications/)
})
