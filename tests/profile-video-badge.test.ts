// T-0915: the tutor profile with the intro video first and the "Established" badge beside the name (design A). The REAL page is rendered to HTML over an
// in-memory database (the same set-up as tests/tutor-profile.test.ts), the REAL readers (src/lib/established-data.ts) run over fake clients, and the REAL
// cards of the directory are drawn. Nothing here reaches a service. All names and links are made up.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

const T_VIDEO = '70000000-0000-4000-8000-000000000011'
const T_PLAIN = '70000000-0000-4000-8000-000000000012'
const BIO = 'Hi, I coach IELTS and business English. Lessons are practical: we work from your own material.'
const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

let db: FakeDb
let viewer: string | null = null
/** What the facts function answers, by tutor id; `rpcFails` makes it answer an error (the function is not on the database yet). */
let facts: Record<string, { email_confirmed_at: string | null; completed_lessons: number; tenth_lesson_at: string | null }> = {}
let rpcFails: { code: string } | null = null
let videoColumnMissing = false
let rpcAsked: string[][] = []

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    createAdminClient: () => ({
      from: (table: string) => {
        const q = db.from(table)
        return {
          select: (cols: string, o?: { head?: boolean }) => {
            if (table === 'tutors' && cols === 'id, intro_video_url' && videoColumnMissing) {
              return { in: async () => ({ data: null, error: { code: '42703', message: 'column does not exist' } }) }
            }
            return q.select(cols, o)
          },
        }
      },
      rpc: async (fn: string, args: { ids: string[] }) => {
        assert.equal(fn, 'tutor_established_facts')
        rpcAsked.push(args.ids)
        if (rpcFails) return { data: null, error: rpcFails }
        return { data: args.ids.filter(id => facts[id]).map(id => ({ tutor_id: id, ...facts[id] })), error: null }
      },
    }),
    createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: viewer ? { id: viewer } : null } }) } }),
  },
})
mock.module('next/navigation', { namedExports: { notFound: () => { throw new Error('NEXT_NOT_FOUND') }, useRouter: () => ({ push() {}, replace() {} }), useSearchParams: () => new URLSearchParams() } })

const page = (await import('@/app/tutors/[slug]/page.tsx')).default as (p: { params: Promise<{ slug: string }> }) => Promise<React.ReactElement>
const { IntroVideo } = await import('@/components/profile/IntroVideo.tsx')
const { EstablishedName, EstablishedChip } = await import('@/components/profile/EstablishedBadge.tsx')
const { loadEstablished, loadIntroVideos, loadBadgeFacts } = await import('@/lib/established-data.ts')
const { profileFaq, profileFaqJsonLd, profileSummary } = await import('@/lib/profile-answers.ts')
const { TutorCard } = await import('@/components/directory/TutorCard.tsx')
const directory = await import('@/lib/directory.ts')

const ALWAYS = (tutor_id: string) => [1, 2, 3, 4, 5, 6, 0].map(d => ({ id: `${tutor_id}-${d}`, tutor_id, day_of_week: d, start_time: '09:00', end_time: '17:00' }))
const TUTOR = {
  subscription_status: 'free', hide_branding: true, booking_url_active: true, currency: 'USD', default_lesson_price: 40, trial_enabled: true, trial_price: 10, timezone: 'America/Toronto',
  languages: ['English', 'Spanish'], cancellation_hours: 24, buffer_minutes: 0, bio: BIO, avatar_url: null, average_rating: 0, review_count: 0, created_at: '2026-03-01T10:00:00Z',
}
const GOOD_FACTS = { email_confirmed_at: '2026-03-03T10:00:00Z', completed_lessons: 12, tenth_lesson_at: '2026-09-09T15:00:00Z' }

beforeEach(() => {
  db = createFakeDb({
    tutors: [
      { ...TUTOR, id: T_VIDEO, name: 'Maya Reyes', slug: 'maya-reyes', intro_video_url: YT },
      { ...TUTOR, id: T_PLAIN, name: 'Priya Nair', slug: 'priya-nair', intro_video_url: null },
    ],
    availability: [T_VIDEO, T_PLAIN].flatMap(ALWAYS),
  })
  viewer = null; facts = { [T_VIDEO]: GOOD_FACTS, [T_PLAIN]: GOOD_FACTS }; rpcFails = null; videoColumnMissing = false; rpcAsked = []
})

const render = async (slug: string) => renderToStaticMarkup(await page({ params: Promise.resolve({ slug }) }))
const setVideo = (id: string, url: unknown) => { db.tables.tutors.find(t => t.id === id)!.intro_video_url = url }
const ldBlocks = (html: string) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]) as Record<string, unknown>)

// ---- the video comes first, and nothing is loaded from the video site until play ------------------------------------------------------

test('the intro video is the first thing in the profile column: before the name card, as a poster with a play button and no frame', async () => {
  const html = await render('maya-reyes')
  assert.ok(html.indexOf('data-testid="intro-video"') > 0)
  assert.ok(html.indexOf('data-testid="intro-video"') < html.indexOf('data-testid="profile-hero"'), 'video before the hero card')
  assert.ok(html.indexOf('data-testid="intro-video-play"') > 0)
  assert.match(html, /aria-label="Play intro video from Maya Reyes"/)
  assert.doesNotMatch(html, /<iframe/i, 'no frame until the visitor presses play')
  // nothing is requested from the video site before play: no thumbnail, no script, no preconnect, no frame source anywhere in the HTML
  assert.doesNotMatch(html, /ytimg|youtube-nocookie|i\.vimeocdn|player\.vimeo|youtube\.com\/(iframe_api|embed)/i)
  assert.match(html, /Hosted on YouTube\. Nothing loads from YouTube until you press play\./)
  assert.match(html, /href="https:\/\/www\.youtube\.com\/watch\?v=dQw4w9WgXcQ"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/)
})

test('a Vimeo link shows the same poster and says Vimeo', async () => {
  setVideo(T_VIDEO, 'https://vimeo.com/123456789/abcdef0123456789')
  const html = await render('maya-reyes')
  assert.match(html, /Hosted on Vimeo\. Nothing loads from Vimeo until you press play\./)
  assert.match(html, /href="https:\/\/vimeo\.com\/123456789\/abcdef0123456789"/)
})

test('a tutor with no video gets no video block and the profile is the page it was', async () => {
  const html = await render('priya-nair')
  assert.doesNotMatch(html, /intro-video|Intro video|press play/)
  assert.match(html, /data-testid="profile-hero"/)
})

test('DISPLAY SIDE: a stored value that is not exactly a canonical YouTube or Vimeo address draws nothing, and the page still opens', async () => {
  const bad: unknown[] = [
    'https://evil.example/watch?v=dQw4w9WgXcQ', 'javascript:alert(1)', 'http://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ', `${YT}&autoplay=1`, ' ' + YT,
    'https://www.youtube.com.evil.example/watch?v=dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', 'data:text/html,<script>alert(1)</script>', '', 42, { a: 1 }, ['x'],
  ]
  for (const value of bad) {
    setVideo(T_VIDEO, value)
    const html = await render('maya-reyes')
    assert.doesNotMatch(html, /intro-video|press play|evil\.example|javascript:/, JSON.stringify(value))
    assert.match(html, /<h1[^>]*>Maya Reyes<\/h1>|Maya Reyes/, 'the profile itself is there')
  }
})

test('a database without the video column (migration 028 not applied) means no video, never an error on the profile', async () => {
  videoColumnMissing = true
  const html = await render('maya-reyes')
  assert.doesNotMatch(html, /intro-video/)
  assert.match(html, /data-testid="profile-hero"/)
})

test('the component draws the frame only for an address the rule built: a bad frame address leaves a disabled button and no frame, whatever state it is in', () => {
  const props = { watchUrl: YT, provider: 'youtube' as const, name: 'Maya Reyes', first: 'Maya' }
  const good = renderToStaticMarkup(createElement(IntroVideo, { ...props, embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0' }))
  assert.doesNotMatch(good, /disabled/)
  for (const embedUrl of ['https://evil.example/embed/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'javascript:alert(1)', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ/../../x']) {
    const html = renderToStaticMarkup(createElement(IntroVideo, { ...props, embedUrl }))
    assert.match(html, /disabled/, embedUrl)
    assert.doesNotMatch(html, /<iframe/, embedUrl)
  }
  // the frame itself: only after a press, sandboxed, with no autoplay of its own and a strict referrer policy
  const src = read('src/components/profile/IntroVideo.tsx')
  assert.match(src, /playing && allowed \?/)
  assert.match(src, /isAllowedEmbedUrl\(embedUrl\)/)
  assert.match(src, /sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"/)
  assert.match(src, /referrerPolicy="strict-origin-when-cross-origin"/)
})

// ---- the badge: beside the name, with what was checked and what it is not -------------------------------------------------------------

test('a tutor who meets the four conditions gets the badge beside the name; the card lists each check with its date and says what it is not', async () => {
  const html = await render('maya-reyes')
  assert.match(html, /data-testid="established-badge"[^>]*>/)
  assert.match(html, /aria-expanded="false"/)
  for (const id of ['email', 'booking', 'intro', 'lessons']) assert.match(html, new RegExp(`data-testid="established-${id}"`), id)
  assert.match(html, /Confirmed Mar 3, 2026/)
  assert.match(html, /12 held, the 10th on Sep 9, 2026/)
  assert.match(html, /Tutafy does not check IDs, diplomas or qualifications/)
  assert.match(html, /<h1[^>]*>Maya Reyes<\/h1>/, 'the name is still the one h1')
  assert.equal((html.match(/<h1/g) ?? []).length, 1)
  // the card is closed to begin with and is a region the badge controls
  assert.match(html, /id="[^"]+" hidden="" data-testid="established-card"/)
})

test('each condition on its own keeps the badge away: 9 lessons, no confirmed email, a short introduction, no facts answered at all', async () => {
  const cases: [string, () => void][] = [
    ['nine lessons', () => { facts[T_VIDEO] = { ...GOOD_FACTS, completed_lessons: 9, tenth_lesson_at: null } }],
    ['email not confirmed', () => { facts[T_VIDEO] = { ...GOOD_FACTS, email_confirmed_at: null } }],
    ['short introduction', () => { db.tables.tutors.find(t => t.id === T_VIDEO)!.bio = 'Hello there.' }],
    ['no facts for this tutor', () => { delete facts[T_VIDEO] }],
  ]
  for (const [label, arrange] of cases) {
    facts = { [T_VIDEO]: GOOD_FACTS, [T_PLAIN]: GOOD_FACTS }
    db.tables.tutors.find(t => t.id === T_VIDEO)!.bio = BIO
    arrange()
    const html = await render('maya-reyes')
    assert.doesNotMatch(html, /established-badge|Established/, label)
    assert.match(html, /<h1[^>]*>Maya Reyes<\/h1>/, label)
  }
})

test('a booking page that is off keeps the badge away (only the tutor sees that page, and it promises nothing)', async () => {
  db.tables.tutors.find(t => t.id === T_VIDEO)!.booking_url_active = false
  viewer = T_VIDEO
  assert.doesNotMatch(await render('maya-reyes'), /established-badge/)
})

test('a database without the facts function (or one that errors) means no badge and a normal page', async () => {
  for (const code of ['42883', 'PGRST202', 'XX000']) {
    rpcFails = { code }
    const html = await render('maya-reyes')
    assert.doesNotMatch(html, /established-badge|Established/, code)
    assert.match(html, /data-testid="profile-hero"/, code)
  }
})

test('the badge is worked out for exactly the tutor of the page (one id asked), and it is not in the structured data', async () => {
  const html = await render('maya-reyes')
  assert.deepEqual(rpcAsked, [[T_VIDEO]])
  const markup = JSON.stringify(ldBlocks(html).filter(b => b['@type'] !== 'FAQPage'))
  assert.doesNotMatch(markup, /Established|badge|verified|intro_video|youtube|vimeo/i, 'the profile markup claims nothing about a badge or a video')
})

test('NO WORD says or hints that a tutor was verified: not on the profile, the card, the questions, the settings field or the code that words them', async () => {
  const html = await render('maya-reyes')
  const visible = html.replace(/<script[\s\S]*?<\/script>/g, '')
  assert.doesNotMatch(visible, /verif|vetted|certified|background check|identity check|ID check(?!s)/i)
  assert.doesNotMatch(JSON.stringify(ldBlocks(html)), /verif|vetted|certified|background check/i)
  for (const file of [
    'src/components/profile/EstablishedBadge.tsx', 'src/components/profile/IntroVideo.tsx', 'src/components/settings/IntroVideoField.tsx', 'src/components/directory/TutorCard.tsx',
    'src/lib/established.ts', 'src/lib/established-data.ts', 'src/lib/profile-answers.ts', 'src/lib/intro-video.ts', 'src/app/tutors/[slug]/page.tsx', 'src/app/api/tutors/intro-video/route.ts',
  ]) {
    const code = read(file).split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*')).join('\n')
    assert.doesNotMatch(code, /verif/i, `${file} says "verified" or "verify"`)
  }
})

test('the name card component: a button that opens a disclosure, with the checks as a list and the disclaimer', () => {
  const checks = [
    { id: 'email' as const, ok: true, title: 'Sign-in email confirmed', detail: 'Confirmed Mar 3, 2026' },
    { id: 'lessons' as const, ok: true, title: '10+ lessons taught on Tutafy', detail: '12 held' },
  ]
  const html = renderToStaticMarkup(createElement(EstablishedName, { name: 'Maya Reyes', checks }))
  assert.match(html, /<button[^>]*type="button"[^>]*aria-expanded="false"[^>]*aria-controls="[^"]+"/)
  assert.match(html, /aria-label="Established on Tutafy"/)
  assert.equal((html.match(/<li /g) ?? []).length, 2)
  const src = read('src/components/profile/EstablishedBadge.tsx')
  assert.match(src, /e\.key === 'Escape'/, 'Escape closes it')
  assert.match(renderToStaticMarkup(createElement(EstablishedChip)), /Established/)
})

// ---- the words for people who ask a search engine or an assistant ------------------------------------------------------------------

test('the profile opens with a sentence that answers who, what, where and how much, and the questions match the FAQPage markup exactly', async () => {
  const html = await render('maya-reyes')
  assert.match(html, /data-testid="profile-summary">Maya Reyes teaches English and Spanish online, in Toronto time\. A lesson costs \$40 \(30, 45, 60 or 90 min sessions\)\. The first lesson is \$10\.</)
  const faqBlock = ldBlocks(html).find(b => b['@type'] === 'FAQPage')!
  assert.ok(faqBlock)
  const asked = (faqBlock.mainEntity as { name: string; acceptedAnswer: { text: string } }[])
  const section = html.slice(html.indexOf('data-testid="profile-faq"'))
  assert.ok(asked.length >= 4)
  for (const q of asked) {
    const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
    assert.ok(decode(section).includes(q.name), `visible question: ${q.name}`)
    assert.ok(decode(section).includes(q.acceptedAnswer.text), `visible answer: ${q.name}`)
  }
  assert.ok(asked.some(q => /intro video/.test(q.name)) && asked.some(q => /Established/.test(q.name)))
})

test('the video question and the badge question exist only when they are true for the tutor', () => {
  const base = { name: 'Maya Reyes', languages: ['English'], timezone: 'UTC', default_lesson_price: 40, currency: 'USD', trial_enabled: false, trial_price: null, durations: [60], cancellation_hours: 24, bookable: true }
  const none = profileFaq({ ...base, established: false, video: null }).map(i => i.q)
  assert.ok(!none.some(q => /intro video|Established/.test(q)))
  assert.ok(profileFaq({ ...base, established: false, video: 'vimeo' }).some(i => /Vimeo/.test(i.a)))
  assert.ok(profileFaq({ ...base, established: true, video: null }).some(i => /does not check IDs, diplomas or qualifications/.test(i.a)))
  assert.deepEqual(profileFaq({ ...base, bookable: false, established: false, video: null }).map(i => i.q), ['How much does a lesson with Maya cost?'])
  assert.equal(profileFaqJsonLd(profileFaq({ ...base, established: false, video: null }), 'maya-reyes')['@id'], 'https://www.tutafy.com/tutors/maya-reyes#faq')
  assert.equal(profileSummary({ ...base, trial_enabled: false }), 'Maya Reyes teaches English online, in UTC time. A lesson costs $40 (60 min sessions).')
  assert.match(profileSummary({ ...base, languages: [], default_lesson_price: null }), /^Maya Reyes is an online tutor on Tutafy, in UTC time\.$/)
})

// ---- the readers behind them -------------------------------------------------------------------------------------------------------

type Ans = { data: unknown; error: { code?: string } | null }
const extras = (opts: { tutors?: Record<string, unknown>[]; videoError?: { code: string }; rpc?: (ids: string[]) => Ans | Promise<Ans> }) => ({
  from: () => ({ select: () => ({ in: async (_c: string, ids: string[]): Promise<Ans> => opts.videoError ? { data: null, error: opts.videoError } : { data: (opts.tutors ?? []).filter(t => ids.includes(String(t.id))), error: null } }) }),
  rpc: async (_fn: string, args: Record<string, unknown>) => (opts.rpc ? opts.rpc(args.ids as string[]) : { data: [], error: null }),
})

test('loadIntroVideos keeps only valid canonical links and answers none for an error, a missing column or nothing asked', async () => {
  const tutors = [{ id: 'a', intro_video_url: YT }, { id: 'b', intro_video_url: 'https://evil.example/x' }, { id: 'c', intro_video_url: null }, { id: 'd', intro_video_url: 'https://vimeo.com/123456789' }]
  const got = await loadIntroVideos(extras({ tutors }) as never, ['a', 'b', 'c', 'd'])
  assert.deepEqual([...got.keys()].sort(), ['a', 'd'])
  assert.equal(got.get('a')!.provider, 'youtube')
  assert.equal((await loadIntroVideos(extras({ videoError: { code: '42703' } }) as never, ['a'])).size, 0)
  assert.equal((await loadIntroVideos(extras({ tutors }) as never, [])).size, 0)
  const throwing = { from: () => { throw new Error('boom') }, rpc: async () => ({ data: [], error: null }) }
  assert.equal((await loadIntroVideos(throwing as never, ['a'])).size, 0)
})

test('loadEstablished: only tutors that earned it are in the answer; ids go to the function 100 at a time; an error, a throw or a wrong shape gives no badge', async () => {
  const now = new Date('2026-10-24T12:00:00Z')
  const row = (id: string, over: Record<string, unknown> = {}) => ({ tutor_id: id, email_confirmed_at: '2026-01-01T00:00:00Z', completed_lessons: 10, tenth_lesson_at: '2026-06-01T00:00:00Z', ...over })
  const tutors = [{ id: 'a', bio: BIO, booking_url_active: true }, { id: 'b', bio: BIO, booking_url_active: true }, { id: 'c', bio: 'short', booking_url_active: true }, { id: 'd', bio: BIO, booking_url_active: false }, { id: 'e', bio: BIO, booking_url_active: true }]
  const got = await loadEstablished(extras({ rpc: () => ({ data: [row('a'), row('b', { completed_lessons: 9 }), row('c'), row('d'), { ...row('zzz') }], error: null }) }) as never, tutors, now)
  assert.deepEqual([...got.keys()], ['a'], 'b has 9 lessons, c a short bio, d the page off, e no facts, zzz is not asked for')
  const many = Array.from({ length: 230 }, (_, i) => ({ id: `t${i}`, bio: BIO, booking_url_active: true }))
  const asked: number[] = []
  await loadEstablished(extras({ rpc: ids => { asked.push(ids.length); return { data: [], error: null } } }) as never, many, now)
  assert.deepEqual(asked, [100, 100, 30])
  for (const bad of [{ data: null, error: { code: '42883' } }, { data: { not: 'a list' }, error: null }, { data: [{ tutor_id: 5 }], error: null }]) {
    assert.equal((await loadEstablished(extras({ rpc: () => bad as Ans }) as never, tutors, now)).size, 0, JSON.stringify(bad))
  }
  const throwing = { from: () => ({}), rpc: async () => { throw new Error('boom') } }
  assert.equal((await loadBadgeFacts(throwing as never, ['a'])).size, 0)
})

// ---- the directory card --------------------------------------------------------------------------------------------------------------

const SOURCE = { slug: 'maya', name: 'Maya Reyes', bio: BIO, avatar_url: null, languages: ['English'], timezone: 'UTC', average_rating: 0, review_count: 0, default_lesson_price: 40, currency: 'USD', trial_enabled: false, trial_price: null }
const SLOTS = [{ at: '2026-10-26T15:00:00.000Z', date: '2026-10-26', time: '15:00' }]

test('a directory card carries two yes/no facts, never the video address, and the card draws a chip and a Video label only when they are true', () => {
  const plain = directory.buildCard(SOURCE, SLOTS)!
  assert.equal(plain.established, false)
  assert.equal(plain.video, false)
  const full = directory.buildCard({ ...SOURCE, established: true, intro_video_url: YT }, SLOTS)!
  assert.equal(full.established, true)
  assert.equal(full.video, true)
  assert.doesNotMatch(JSON.stringify(full), /youtube|dQw4w9WgXcQ/)
  assert.deepEqual(Object.keys(full).sort(), [...directory.CARD_KEYS].sort())
  // a link that is not a valid canonical video is no video; "established" must be exactly true
  assert.equal(directory.buildCard({ ...SOURCE, intro_video_url: 'https://evil.example/x' }, SLOTS)!.video, false)
  assert.equal(directory.buildCard({ ...SOURCE, established: 'yes' }, SLOTS)!.established, false)
  const draw = (card: typeof full) => renderToStaticMarkup(createElement(TutorCard, { card, zone: 'UTC', viewerZone: null, now: new Date('2026-10-24T12:00:00Z') }))
  const withBoth = draw(full)
  assert.match(withBoth, /data-testid="established-chip"/)
  assert.match(withBoth, /data-testid="card-video"/)
  const without = draw(plain)
  assert.doesNotMatch(without, /established-chip|card-video|Established|Video/)
  assert.doesNotMatch(withBoth, /verif/i)
})
