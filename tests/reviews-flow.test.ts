// T-0898: real reviews after the first lesson (designs A, A, A of T-0876), behind REVIEWS_FLOW=on. The REAL code runs here over an in-memory database of
// made-up students, tutors and lessons (the migration's own rules are run on a real Postgres in tests/reviews-flow-migration.test.ts).
// One test for each rule of the owner's answer W-2747:
//   - only a student who had a lesson with the tutor may review (a made-up link, another student's lesson, a lesson not yet held, a lesson not completed);
//   - one review per student per tutor, edited for 7 days and then closed; an old review counts as the student's one review;
//   - the tutor answers once, only on their own review, and the answer is never edited;
//   - the name shown is "Maria K."; text is cleaned; tags are the six known ones;
//   - the switch: with it off every new route answers 404, no invitation goes out and the old form and the old route work as they did;
//   - the invitation: once, only after the FIRST lesson, with five links that only open the form, one reminder, "stop reminders" remembered.
// Nothing here reaches a service. All names, addresses and times are made up.
import { test, mock, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const SRC = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'src')

let db: FakeDb
let user: { id: string } | null = null
let adminFails = false
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    createAdminClient: () => { if (adminFails) throw new Error('not configured'); return db },
    createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user } }) } }),
  },
})
mock.module('next/navigation', { namedExports: { notFound: () => { throw new Error('NEXT_NOT_FOUND') }, useRouter: () => ({ push() {}, refresh() {} }), useSearchParams: () => new URLSearchParams() } })

const flow = await import('@/lib/reviews-flow.ts')
const data = await import('@/lib/reviews-data.ts')
const invites = await import('@/lib/review-invites.ts')
const flowRoute = await import('@/app/api/reviews/flow/route.ts')
const stopRoute = await import('@/app/api/reviews/flow/stop/route.ts')
const replyRoute = await import('@/app/api/reviews/reply/route.ts')
const legacyRoute = await import('@/app/api/reviews/route.ts')
const cronRoute = await import('@/app/api/cron/review-invites/route.ts')
const reviewPage = (await import('@/app/portal/[token]/review/[lessonId]/page.tsx')).default as (p: { params: Promise<{ token: string; lessonId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) => Promise<React.ReactElement>

const NOW = new Date('2026-10-24T09:00:00.000Z')
const iso = (daysAgo: number, hours = 0) => new Date(NOW.getTime() - daysAgo * 86400000 - hours * 3600000).toISOString()
/** The inputs of a page as attribute maps (a bare attribute such as checked reads as ""). */
const inputsOf = (h: string) => (h.match(/<input [^>]*>/g) ?? []).map(t => Object.fromEntries([...t.matchAll(/([a-z-]+)(?:="([^"]*)")?/g)].map(m => [m[1], m[2] ?? ''])))
const client = () => db as unknown as import('@/lib/reviews-data.ts').FlowClient

let reviewSeq = 0 // the database gives a review its own id (a string, like a uuid)
const TA = 'tutor-a'
const TB = 'tutor-b'
const TOKEN_MARIA = 'portal-token-maria-0000000000000001'
const TOKEN_JAMES = 'portal-token-james-0000000000000002'

function world(extra: Record<string, Record<string, unknown>[]> = {}) {
  db = createFakeDb({
    tutors: [{ id: TA, name: 'Tomás Ruiz', average_rating: 0, review_count: 0 }, { id: TB, name: 'Other Tutor', average_rating: 0, review_count: 0 }],
    students: [
      { id: 's-maria', tutor_id: TA, name: 'Maria Kowalski', email: 'maria@example.com', portal_token: TOKEN_MARIA },
      { id: 's-james', tutor_id: TA, name: 'James Tan', email: 'james@example.com', portal_token: TOKEN_JAMES },
    ],
    lessons: [
      { id: 'l-m1', tutor_id: TA, student_id: 's-maria', status: 'completed', starts_at: iso(1) },
      { id: 'l-m0', tutor_id: TA, student_id: 's-maria', status: 'completed', starts_at: iso(20) },
      { id: 'l-mf', tutor_id: TA, student_id: 's-maria', status: 'scheduled', starts_at: iso(-3) },
      { id: 'l-j1', tutor_id: TA, student_id: 's-james', status: 'completed', starts_at: iso(2) },
      { id: 'l-jc', tutor_id: TA, student_id: 's-james', status: 'cancelled', starts_at: iso(4) },
    ],
    reviews: [],
    review_invites: [],
    ...extra,
  }, { reviews: { id: () => `rev-${++reviewSeq}`, created_at: () => NOW.toISOString(), is_public: true, tags: [] }, review_invites: { sent_at: () => NOW.toISOString() } })
}

let envBefore: Record<string, string | undefined> = {}
beforeEach(() => { envBefore = { REVIEWS_FLOW: process.env.REVIEWS_FLOW, CRON_SECRET: process.env.CRON_SECRET, RESEND_API_KEY: process.env.RESEND_API_KEY }; process.env.REVIEWS_FLOW = 'on'; user = null; adminFails = false; world() })
afterEach(() => { for (const [k, v] of Object.entries(envBefore)) { if (v === undefined) delete process.env[k]; else process.env[k] = v } })

const post = (route: { POST: (r: Request) => Promise<Response> }, body: unknown) => route.POST(new Request('http://localhost/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }))
const good = { rating: 5, tags: ['patient', 'well_prepared'], comment: 'Tomás is patient and every lesson has a clear plan.' }
const reviews = () => db.tables.reviews

// ---- the pure rules ---------------------------------------------------------------------------------------------------------------------

test('the switch is on only for the exact value "on"', () => {
  assert.equal(flow.reviewsFlowOn({ REVIEWS_FLOW: 'on' }), true)
  assert.equal(flow.reviewsFlowOn({ REVIEWS_FLOW: ' on ' }), true)
  for (const v of [undefined, '', 'off', 'ON', 'true', '1', 'yes', 'on!']) assert.equal(flow.reviewsFlowOn({ REVIEWS_FLOW: v }), false, String(v))
})

test('the name shown is the first name and the initial of the last name, never an email', () => {
  assert.equal(flow.publicName('Maria Kowalski'), 'Maria K.')
  assert.equal(flow.publicName('Maria de la Cruz'), 'Maria C.')
  assert.equal(flow.publicName('Maria'), 'Maria')
  assert.equal(flow.publicName('  álvaro   ñandú '), 'álvaro Ñ.')
  assert.equal(flow.publicName(''), 'A student')
  assert.equal(flow.publicName(null), 'A student')
  assert.equal(flow.publicName('ana@example.com Smith'), 'Smith', 'an address in a name is dropped by the cleaner')
  assert.doesNotMatch(flow.publicName('Maria Kowalski'), /Kowalski/)
})

test('a review is checked: 1 to 5 whole stars, known tags (at most three), at most 500 characters; nothing wrong is quietly changed', () => {
  const ok = flow.parseReviewInput(good)
  assert.ok(ok.ok && ok.value.rating === 5 && ok.value.tags.length === 2)
  assert.deepEqual(flow.parseReviewInput({ rating: 3 }), { ok: true, value: { rating: 3, tags: [], comment: null } })
  for (const rating of [0, 6, 3.5, '4', null, undefined, NaN]) assert.equal(flow.parseReviewInput({ rating }).ok, false, `rating ${String(rating)}`)
  assert.equal(flow.parseReviewInput({ rating: 5, tags: ['patient', 'rude'] }).ok, false, 'an unknown tag')
  assert.equal(flow.parseReviewInput({ rating: 5, tags: ['patient', 'fun', 'friendly', 'good_value'] }).ok, false, 'four tags')
  assert.equal(flow.parseReviewInput({ rating: 5, tags: 'patient' }).ok, false)
  assert.equal(flow.parseReviewInput({ rating: 5, comment: 'x'.repeat(501) }).ok, false)
  assert.equal(flow.parseReviewInput({ rating: 5, comment: 'x'.repeat(500) }).ok, true)
  assert.equal(flow.parseReviewInput({ rating: 5, comment: 42 }).ok, false)
  assert.equal(flow.parseReviewInput(null).ok, false)
  const dup = flow.parseReviewInput({ rating: 5, tags: ['fun', 'fun'] })
  assert.ok(dup.ok && dup.value.tags.length === 1, 'a tag twice is one tag')
  const messy = flow.parseReviewInput({ rating: 5, comment: '  Hello\u0000  \u0007world \n\n\n\n bye ' })
  assert.ok(messy.ok && messy.value.comment === 'Hello world \n\n bye', JSON.stringify(messy))
})

test('an answer is checked: some text, at most 500 characters', () => {
  assert.deepEqual(flow.parseReply('  Thank you!  '), { ok: true, value: 'Thank you!' })
  for (const bad of ['', '   ', null, 5, 'x'.repeat(501)]) assert.equal(flow.parseReply(bad).ok, false, String(bad))
})

test('the edit window is seven days from the first writing, and the summary counts only real ratings', () => {
  const written = '2026-10-01T10:00:00.000Z'
  assert.equal(flow.editOpen(written, new Date('2026-10-08T10:00:00.000Z')), true)
  assert.equal(flow.editOpen(written, new Date('2026-10-08T10:00:01.000Z')), false)
  const s = flow.summarize([5, 5, 5, 4, 3, 0, 6, 2.5])
  assert.deepEqual([s.count, s.average, s.percent[5], s.percent[4], s.percent[3], s.percent[1]], [5, 4.4, 60, 20, 20, 0])
  assert.deepEqual(flow.summarize([]), { count: 0, average: 0, percent: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } })
  assert.equal(flow.starsFromAddress('4'), 4)
  for (const v of ['0', '6', '4.5', 'x', undefined, '']) assert.equal(flow.starsFromAddress(v), null, String(v))
  assert.equal(flow.agoLabel('2026-10-24T08:00:00.000Z', NOW), 'today')
  assert.equal(flow.agoLabel(iso(14), NOW), '2 weeks ago')
  assert.equal(flow.agoLabel(iso(35), NOW), 'a month ago')
})

// ---- who may review ---------------------------------------------------------------------------------------------------------------------

test('a student with a completed, held lesson reviews the tutor; the tutor\'s stored average and count follow', async () => {
  const r = await data.submitFlowReview(client(), { portalToken: TOKEN_MARIA, lessonId: 'l-m1', input: { rating: 5, tags: ['patient'], comment: 'Great' }, now: NOW })
  assert.ok(r.ok && !r.edited)
  assert.equal(reviews().length, 1)
  assert.deepEqual([reviews()[0].flow, reviews()[0].student_id, reviews()[0].tutor_id, reviews()[0].is_public], [true, 's-maria', TA, true])
  const tutor = db.tables.tutors.find(t => t.id === TA)!
  assert.deepEqual([tutor.average_rating, tutor.review_count], [5, 1])
})

test('who may NOT review: a made-up link, another student\'s lesson, a lesson not completed, a lesson not yet held', async () => {
  const input = { rating: 5, tags: [], comment: null }
  const tries: [string, unknown, unknown, number][] = [
    ['a made-up link', 'no-such-link-00000000000000', 'l-m1', 401],
    ['no link', undefined, 'l-m1', 400],
    ['no lesson', TOKEN_MARIA, undefined, 400],
    ['another student\'s lesson (the second person)', TOKEN_MARIA, 'l-j1', 404],
    ['a lesson that does not exist', TOKEN_MARIA, 'l-none', 404],
    ['a cancelled lesson', TOKEN_JAMES, 'l-jc', 400],
    ['a lesson booked for later', TOKEN_MARIA, 'l-mf', 400],
  ]
  for (const [why, token, lesson, status] of tries) {
    const r = await data.submitFlowReview(client(), { portalToken: token, lessonId: lesson, input, now: NOW })
    assert.ok(!r.ok && r.status === status, `${why}: ${JSON.stringify(r)}`)
  }
  assert.equal(reviews().length, 0, 'nothing was written')
})

test('a completed lesson whose time is still ahead does not count as held', async () => {
  db.tables.lessons.push({ id: 'l-early', tutor_id: TA, student_id: 's-maria', status: 'completed', starts_at: iso(-1) })
  const r = await data.submitFlowReview(client(), { portalToken: TOKEN_MARIA, lessonId: 'l-early', input: { rating: 5, tags: [], comment: null }, now: NOW })
  assert.ok(!r.ok && r.status === 400)
})

test('one review per student per tutor: a second write is an edit of the first, never a second review', async () => {
  await data.submitFlowReview(client(), { portalToken: TOKEN_MARIA, lessonId: 'l-m1', input: { rating: 5, tags: [], comment: 'first' }, now: NOW })
  const again = await data.submitFlowReview(client(), { portalToken: TOKEN_MARIA, lessonId: 'l-m0', input: { rating: 3, tags: ['fun'], comment: 'changed my mind' }, now: NOW })
  assert.ok(again.ok && again.edited)
  assert.equal(reviews().length, 1)
  assert.deepEqual([reviews()[0].rating, reviews()[0].comment, reviews()[0].lesson_id], [3, 'changed my mind', 'l-m1'])
  assert.equal(db.tables.tutors.find(t => t.id === TA)!.average_rating, 3)
  // another student's review is a separate one
  assert.ok((await data.submitFlowReview(client(), { portalToken: TOKEN_JAMES, lessonId: 'l-j1', input: { rating: 4, tags: [], comment: null }, now: NOW })).ok)
  assert.equal(reviews().length, 2)
  assert.deepEqual([db.tables.tutors.find(t => t.id === TA)!.average_rating, db.tables.tutors.find(t => t.id === TA)!.review_count], [3.5, 2])
})

test('the student edits for seven days: day seven is open, day eight is closed and the review stays as written', async () => {
  reviews().push({ id: 'r-old', flow: true, student_id: 's-maria', tutor_id: TA, lesson_id: 'l-m1', rating: 4, comment: 'as written', tags: [], is_public: true, created_at: iso(7, -1) })
  const open = await data.submitFlowReview(client(), { portalToken: TOKEN_MARIA, lessonId: 'l-m1', input: { rating: 5, tags: [], comment: 'day seven' }, now: NOW })
  assert.ok(open.ok)
  reviews()[0].created_at = iso(8)
  const closed = await data.submitFlowReview(client(), { portalToken: TOKEN_MARIA, lessonId: 'l-m1', input: { rating: 1, tags: [], comment: 'too late' }, now: NOW })
  assert.ok(!closed.ok && closed.status === 403)
  assert.equal(reviews()[0].comment, 'day seven')
})

test('an old review (written before the flow) is the student\'s one review: no second one, and the old form\'s review is not edited here', async () => {
  reviews().push({ id: 'r-legacy', flow: false, student_id: 's-maria', tutor_id: TA, lesson_id: 'l-m0', rating: 3, comment: 'old', is_public: true, created_at: iso(30) })
  const r = await data.submitFlowReview(client(), { portalToken: TOKEN_MARIA, lessonId: 'l-m1', input: { rating: 5, tags: [], comment: null }, now: NOW })
  assert.ok(!r.ok && r.status === 409)
  assert.equal(reviews().length, 1)
  assert.equal(reviews()[0].comment, 'old')
})

// ---- the tutor's one answer -------------------------------------------------------------------------------------------------------------

test('a tutor answers a review of theirs once; a second answer, another tutor\'s answer and an answer to a review that is not theirs are refused', async () => {
  await data.submitFlowReview(client(), { portalToken: TOKEN_MARIA, lessonId: 'l-m1', input: { rating: 5, tags: [], comment: 'hi' }, now: NOW })
  const id = String(reviews()[0].id)
  const other = await data.replyToReview(client(), { tutorId: TB, reviewId: id, text: 'I am not the tutor', now: NOW })
  assert.ok(!other.ok && other.status === 404, 'another tutor')
  assert.equal(reviews()[0].tutor_reply ?? null, null)
  assert.ok((await data.replyToReview(client(), { tutorId: TA, reviewId: id, text: 'Thank you, Maria!', now: NOW })).ok)
  assert.equal(reviews()[0].tutor_reply, 'Thank you, Maria!')
  const second = await data.replyToReview(client(), { tutorId: TA, reviewId: id, text: 'Changed', now: NOW })
  assert.ok(!second.ok && second.status === 409)
  assert.equal(reviews()[0].tutor_reply, 'Thank you, Maria!')
  assert.ok(!(await data.replyToReview(client(), { tutorId: TA, reviewId: undefined, text: 'x', now: NOW })).ok)
  reviews().push({ id: 'r-old', flow: false, tutor_id: TA, student_id: 's-james', rating: 5 })
  const legacy = await data.replyToReview(client(), { tutorId: TA, reviewId: 'r-old', text: 'x', now: NOW })
  assert.ok(!legacy.ok && legacy.status === 404, 'an old review has no answer box')
})

test('the reviews of a profile: names as "Maria K.", lessons per student, tags, the answer; nothing that identifies a student more', async () => {
  await data.submitFlowReview(client(), { portalToken: TOKEN_MARIA, lessonId: 'l-m1', input: { rating: 5, tags: ['patient'], comment: 'Lovely' }, now: NOW })
  await data.submitFlowReview(client(), { portalToken: TOKEN_JAMES, lessonId: 'l-j1', input: { rating: 4, tags: [], comment: null }, now: NOW })
  db.tables.reviews.push({ id: 'r-hidden', flow: true, student_id: 's-james', tutor_id: TA, rating: 1, is_public: false, created_at: iso(1) })
  const out = await data.loadProfileReviews(client(), TA)
  assert.equal(out.reviews.length, 2, 'a review that is not public is not listed')
  const maria = out.reviews.find(r => r.name === 'Maria K.')!
  assert.deepEqual([maria.rating, maria.tags, maria.lessons], [5, ['patient'], 2])
  assert.deepEqual(Object.keys(maria).sort(), ['comment', 'createdAt', 'id', 'lessons', 'name', 'rating', 'reply', 'tags'])
  assert.equal(out.summary.count, 2)
  assert.doesNotMatch(JSON.stringify(out), /Kowalski|@example\.com|s-maria|portal-token/)
})

// ---- the routes -------------------------------------------------------------------------------------------------------------------------

test('the review route: saves a good review, says what is wrong with a bad one, and takes the tutor and the student from the database, not from the body', async () => {
  const bad = await post(flowRoute, { portal_token: TOKEN_MARIA, lesson_id: 'l-m1', rating: 9 })
  assert.equal(bad.status, 400)
  const ok = await post(flowRoute, { portal_token: TOKEN_MARIA, lesson_id: 'l-m1', ...good, tutor_id: TB, student_id: 's-james', flow: false, is_public: false })
  assert.equal(ok.status, 200)
  assert.deepEqual([reviews()[0].tutor_id, reviews()[0].student_id, reviews()[0].flow, reviews()[0].is_public], [TA, 's-maria', true, true], 'extra fields in the body change nothing')
  assert.equal((await post(flowRoute, { portal_token: TOKEN_JAMES, lesson_id: 'l-m1', ...good })).status, 404, 'a student cannot review with another student\'s lesson')
  assert.equal((await post(flowRoute, { portal_token: 'x'.repeat(40), lesson_id: 'l-m1', ...good })).status, 401)
  adminFails = true
  assert.equal((await post(flowRoute, { portal_token: TOKEN_MARIA, lesson_id: 'l-m1', ...good })).status, 503)
})

test('the answer route: the tutor is the signed-in account, never a field of the body', async () => {
  await data.submitFlowReview(client(), { portalToken: TOKEN_MARIA, lessonId: 'l-m1', input: { rating: 5, tags: [], comment: 'hi' }, now: NOW })
  const id = String(reviews()[0].id)
  assert.equal((await post(replyRoute, { review_id: id, reply: 'Thanks' })).status, 401, 'nobody signed in')
  user = { id: TB }
  assert.equal((await post(replyRoute, { review_id: id, reply: 'Thanks', tutor_id: TA })).status, 404, 'another tutor, even when the body names the real one')
  user = { id: TA }
  assert.equal((await post(replyRoute, { review_id: id, reply: '   ' })).status, 400)
  assert.equal((await post(replyRoute, { review_id: id, reply: 'Thanks' })).status, 200)
  assert.equal((await post(replyRoute, { review_id: id, reply: 'Again' })).status, 409)
  assert.equal(reviews()[0].tutor_reply, 'Thanks')
})

test('the switch OFF: every new route answers 404 and writes nothing, the invitation run does nothing, and the old route and the old page work as they did', async () => {
  for (const off of [undefined, 'off', 'true']) {
    if (off === undefined) delete process.env.REVIEWS_FLOW; else process.env.REVIEWS_FLOW = off
    assert.equal((await post(flowRoute, { portal_token: TOKEN_MARIA, lesson_id: 'l-m1', ...good })).status, 404, String(off))
    assert.equal((await post(stopRoute, { portal_token: TOKEN_MARIA, lesson_id: 'l-m1' })).status, 404)
    user = { id: TA }
    assert.equal((await post(replyRoute, { review_id: 'x', reply: 'y' })).status, 404)
    assert.equal(reviews().length, 0)
    const sent: unknown[] = []
    const run = await invites.runReviewInvites(client(), async m => { sent.push(m) }, NOW, { REVIEWS_FLOW: off })
    assert.deepEqual([run.skipped, run.invited, run.reminded, sent.length], ['off', 0, 0, 0])
    process.env.CRON_SECRET = 'cron-secret-0123456789abcdef'
    process.env.RESEND_API_KEY = 're_test_key_0000'
    const cron = await cronRoute.GET(new Request('http://localhost/api/cron/review-invites', { headers: { authorization: 'Bearer cron-secret-0123456789abcdef' } }))
    assert.equal((await cron.json() as { skipped?: string }).skipped, 'off')
    await assert.rejects(() => reviewPage({ params: Promise.resolve({ token: TOKEN_MARIA, lessonId: 'l-m1' }), searchParams: Promise.resolve({}) }), /NEXT_NOT_FOUND/)
    // the old route still takes a review the old way
    const old = await post(legacyRoute, { portal_token: TOKEN_MARIA, lesson_id: 'l-m1', rating: 4, comment: 'old way' })
    assert.equal(old.status, 200)
    reviews().length = 0
  }
})

test('the switch ON: the old route no longer takes new reviews (one review per tutor, written on the new page)', async () => {
  const r = await post(legacyRoute, { portal_token: TOKEN_MARIA, lesson_id: 'l-m1', rating: 4 })
  assert.equal(r.status, 410)
  assert.equal(reviews().length, 0)
})

// ---- the invitation ---------------------------------------------------------------------------------------------------------------------

type Sent = { to: string; subject: string; html: string }
const mailer = () => { const sent: Sent[] = []; return { sent, m: async (x: Sent) => { sent.push(x) } } }

test('the invitation: once, after the FIRST completed lesson with that tutor, to a student with an address and no review; with five links that open the form', async () => {
  // Maria: first lesson with TA was 20 days ago (too old for the window); her second, yesterday, is not her first. James: first and only lesson 2 days ago.
  const { sent, m } = mailer()
  const run = await invites.runReviewInvites(client(), m, NOW)
  assert.deepEqual([run.invited, run.errors], [1, 0])
  assert.equal(sent.length, 1)
  assert.equal(sent[0].to, 'james@example.com')
  assert.match(sent[0].subject, /How was your first lesson with Tomás\?/)
  const stars = [...sent[0].html.matchAll(/href="([^"]*\/review\/l-j1\?stars=(\d))"/g)]
  assert.deepEqual(stars.map(s => s[2]), ['1', '2', '3', '4', '5'])
  for (const s of stars) assert.match(s[1], new RegExp(`^https://www\\.tutafy\\.com/portal/${TOKEN_JAMES}/review/l-j1\\?stars=\\d$`))
  assert.match(sent[0].html, /Stop reminders/)
  assert.match(sent[0].html, /one reminder if you do not answer/)
  assert.equal(db.tables.review_invites.length, 1)
  // a second run the same day sends nothing
  const again = await invites.runReviewInvites(client(), m, NOW)
  assert.deepEqual([again.invited, again.reminded, sent.length], [0, 0, 1])
})

test('no invitation to a student who has reviewed, has no address, or whose lesson is too fresh or too old; none after a failed claim', async () => {
  db.tables.reviews.push({ id: 'r1', flow: true, student_id: 's-james', tutor_id: TA, rating: 5 })
  const { sent, m } = mailer()
  assert.equal((await invites.runReviewInvites(client(), m, NOW)).invited, 0, 'already reviewed')
  reviews().length = 0
  db.tables.students.find(s => s.id === 's-james')!.email = ''
  assert.equal((await invites.runReviewInvites(client(), m, NOW)).invited, 0, 'no address')
  db.tables.students.find(s => s.id === 's-james')!.email = 'james@example.com'
  db.tables.lessons.find(l => l.id === 'l-j1')!.starts_at = iso(0, 2)
  assert.equal((await invites.runReviewInvites(client(), m, NOW)).invited, 0, 'the lesson ended less than six hours ago')
  db.tables.lessons.find(l => l.id === 'l-j1')!.starts_at = iso(5)
  assert.equal((await invites.runReviewInvites(client(), m, NOW)).invited, 0, 'older than three days')
  assert.equal(sent.length, 0)
})

test('a failed send gives the claim back, so the next run can try again', async () => {
  let fail = true
  const sent: Sent[] = []
  const m = async (x: Sent) => { if (fail) throw new Error('mail service down'); sent.push(x) }
  const first = await invites.runReviewInvites(client(), m, NOW)
  assert.deepEqual([first.invited, first.errors, db.tables.review_invites.length], [0, 1, 0])
  fail = false
  const second = await invites.runReviewInvites(client(), m, NOW)
  assert.deepEqual([second.invited, sent.length], [1, 1])
})

test('one reminder three days later if there is still no review; none after a review or after "stop reminders"; never a second reminder', async () => {
  const { sent, m } = mailer()
  await invites.runReviewInvites(client(), m, NOW)
  assert.equal(sent.length, 1)
  const later = new Date(NOW.getTime() + 3 * 86400000 + 3600000)
  // the lesson is now older than the invitation window, so only the reminder part can act
  const r = await invites.runReviewInvites(client(), m, later)
  assert.deepEqual([r.invited, r.reminded, sent.length], [0, 1, 2])
  assert.match(sent[1].subject, /Reminder/)
  assert.match(sent[1].html, /Still thinking about your lesson/)
  const third = await invites.runReviewInvites(client(), m, new Date(later.getTime() + 86400000))
  assert.deepEqual([third.reminded, sent.length], [0, 2])

  // reviewed in between: no reminder
  world()
  const b = mailer()
  await invites.runReviewInvites(client(), b.m, NOW)
  db.tables.reviews.push({ id: 'r1', flow: true, student_id: 's-james', tutor_id: TA, rating: 5 })
  assert.equal((await invites.runReviewInvites(client(), b.m, later)).reminded, 0)

  // stopped: no reminder
  world()
  const c = mailer()
  await invites.runReviewInvites(client(), c.m, NOW)
  assert.equal((await post(stopRoute, { portal_token: TOKEN_JAMES, lesson_id: 'l-j1' })).status, 200)
  assert.ok(db.tables.review_invites[0].stopped_at)
  assert.equal((await invites.runReviewInvites(client(), c.m, later)).reminded, 0)
  assert.equal((await post(stopRoute, { portal_token: TOKEN_MARIA, lesson_id: 'l-j1' })).status, 404, 'another student\'s lesson cannot stop a reminder')
})

test('the invitation mail escapes a name, and the star links only open the form: the page saves nothing', async () => {
  const mail = invites.renderInviteMail({ tutorName: 'Tom <script>alert(1)</script> Ruiz', portalToken: TOKEN_JAMES, lessonId: 'l-j1', reminder: false })
  assert.doesNotMatch(mail.html, /<script>/)
  assert.match(mail.subject, /Tom/)
  const page = renderToStaticMarkup(await reviewPage({ params: Promise.resolve({ token: TOKEN_JAMES, lessonId: 'l-j1' }), searchParams: Promise.resolve({ stars: '4' }) }))
  assert.match(page, /Review Tomás Ruiz/)
  assert.equal(reviews().length, 0, 'opening the link of a star saved nothing')
  assert.equal(db.log.filter(l => l.op !== 'select').length, 0)
})

// ---- the pages --------------------------------------------------------------------------------------------------------------------------

test('the review page: only for the student\'s own completed lesson; the form with the stars chosen from the address; closed after seven days; a stop page', async () => {
  const open = async (token: string, lesson: string, q: Record<string, string> = {}) => renderToStaticMarkup(await reviewPage({ params: Promise.resolve({ token, lessonId: lesson }), searchParams: Promise.resolve(q) }))
  for (const [t, l] of [[TOKEN_JAMES, 'l-m1'], ['no-such-link', 'l-j1'], [TOKEN_MARIA, 'l-mf'], [TOKEN_JAMES, 'l-jc']]) await assert.rejects(() => open(t, l), /NEXT_NOT_FOUND/, `${t} ${l}`)
  const form = await open(TOKEN_JAMES, 'l-j1', { stars: '4' })
  assert.match(form, /data-testid="review-form"/)
  assert.match(form, /Your public name is|public with your first name and last initial \(James T\.\)/)
  assert.deepEqual(inputsOf(form).filter(i => i.name === 'rating' && 'checked' in i).map(i => i.value), ['4'])
  assert.doesNotMatch(form, /Tan\b/, 'the last name is not on the page')
  assert.equal(inputsOf(form).filter(i => i.type === 'radio' && i.name === 'rating').length, 5)
  assert.equal(inputsOf(form).filter(i => i.type === 'checkbox').length, 6)
  assert.match(form, /Tutors cannot edit or remove a review/)
  assert.deepEqual(inputsOf(await open(TOKEN_JAMES, 'l-j1', { stars: '9' })).filter(i => i.name === 'rating' && 'checked' in i), [], 'a made-up star count chooses nothing')

  reviews().push({ id: 'r1', flow: true, student_id: 's-james', tutor_id: TA, lesson_id: 'l-j1', rating: 4, tags: ['fun'], comment: 'good', is_public: true, created_at: iso(1) })
  assert.match(await open(TOKEN_JAMES, 'l-j1'), /Edit your review of Tomás Ruiz[\s\S]*Save changes/)
  reviews()[0].created_at = iso(9)
  assert.match(await open(TOKEN_JAMES, 'l-j1'), /data-testid="review-closed"[\s\S]*can no longer be edited/)
  reviews()[0].flow = false
  assert.match(await open(TOKEN_JAMES, 'l-j1'), /You have already reviewed Tomás Ruiz/)
  assert.match(await open(TOKEN_JAMES, 'l-j1', { stop: '1' }), /data-testid="review-stop"[\s\S]*Stop reminders/)
})

test('the student page shows the new link while the flow is on and the old form while it is off', async () => {
  const src = (await import('node:fs')).readFileSync(path.join(SRC, 'app/portal/[token]/page.tsx'), 'utf8')
  assert.match(src, /reviewsFlowOn\(\)\s*\n?\s*\? <Link href=\{`\/portal\/\$\{token\}\/review\/\$\{lesson\.id\}`\}[\s\S]*?: <ReviewForm lessonId=\{lesson\.id\} portalToken=\{token\} \/>/)
})
