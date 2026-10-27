// T-0765: the profile-completion card on the tutor dashboard, and the introduction templates in Settings.
// The percentage is worked out from fields a tutor already has (free hours, introduction, price, photo, reviews); nothing is stored.
// The REAL code runs here: src/lib/profile-completion.ts (the percentage and the steps), src/lib/intro-templates.ts, the card as HTML,
// the real dashboard page over an in-memory database (one tutor never sees another's numbers), and the Settings source (the save guard).
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import { settingsSource } from './support/settings-source.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(SRC, rel), 'utf8').replace(/\r\n/g, '\n')
const code = (rel: string) => read(rel).split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')

let db: { from(table: string): unknown } = createFakeDb({})
let currentUser: { id: string; email: string } | null = null
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: {
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) }, from: (t: string) => db.from(t) }),
  },
})

const lib = await import('@/lib/profile-completion.ts')
const tpl = await import('@/lib/intro-templates.ts')
const { ProfileCompletionView } = await import('@/components/dashboard/ProfileCompletionCard.tsx')
const { IntroEditor } = await import('@/components/IntroEditor.tsx')
const { DashboardHome } = await import('@/components/dashboard/DashboardHome.tsx')
type Page = { props: { data: { profile: ReturnType<typeof lib.buildProfileCompletion> | null; tutorId: string } } }
const DashboardPage = (await import('@/app/(dashboard)/dashboard/page.tsx')).default as () => Promise<Page>

beforeEach(() => { currentUser = null })

const LONG = 'I teach English to busy professionals. '.repeat(6) // 234 characters
const none = { slug: 'maya', bio: null, avatarUrl: null, defaultLessonPrice: null, reviewCount: 0, availabilityRows: 0 }
// `ready` false is the switch OFF (PHOTO_UPLOAD_READY false: the photo row says "Coming soon" and counts for nothing); the tests of the switch ON use true
const pct = (f: Partial<typeof none>, ready = false) => lib.buildProfileCompletion({ ...none, ...f }, ready).percent

// ---- the percentage ------------------------------------------------------------------------------------------------------------------

test('with the photo switch off: nothing filled in is 0%; each step adds its own share; the four other steps are 100%', () => {
  assert.equal(pct({}), 0)
  assert.equal(pct({ availabilityRows: 1 }), 30)
  assert.equal(pct({ bio: LONG }), 25)
  assert.equal(pct({ defaultLessonPrice: 25 }), 25)
  assert.equal(pct({ reviewCount: 1 }), 20)
  assert.equal(pct({ availabilityRows: 1, bio: LONG }), 55)
  assert.equal(pct({ availabilityRows: 3, bio: LONG, defaultLessonPrice: '25' }), 80)
  assert.equal(pct({ availabilityRows: 1, bio: LONG, defaultLessonPrice: 25, reviewCount: 4 }), 100)
})

test('the weights always add up to 100, with and without the photo step', () => {
  for (const ready of [false, true]) {
    const all = lib.buildProfileCompletion({ slug: 's', bio: LONG, avatarUrl: 'https://x.example/p.jpg', defaultLessonPrice: 1, reviewCount: 1, availabilityRows: 1 }, ready)
    assert.equal(all.steps.reduce((a, s) => a + s.weight, 0), 100, `photo upload ready: ${ready}`)
    assert.equal(all.percent, 100)
    assert.equal(all.complete, true)
  }
})

test('with a photo upload (when it exists) the photo is worth 20 and the others share the rest', () => {
  assert.equal(pct({ avatarUrl: 'https://x.example/p.jpg' }, true), 20)
  assert.equal(pct({ availabilityRows: 1 }, true), 25)
  assert.equal(pct({ bio: LONG }, true), 20)
  assert.equal(pct({ defaultLessonPrice: 10 }, true), 20)
  assert.equal(pct({ reviewCount: 1 }, true), 15)
  assert.equal(pct({ availabilityRows: 1, bio: LONG, defaultLessonPrice: 10, reviewCount: 1 }, true), 80, 'no photo yet: 80')
})

test('with the photo switch off, the photo step cannot hold a tutor below 100%: it says "Coming soon" and counts for nothing', () => {
  const c = lib.buildProfileCompletion({ ...none, bio: LONG, defaultLessonPrice: 10, reviewCount: 1, availabilityRows: 1 }, false)
  const photo = c.steps.find(s => s.id === 'photo')!
  assert.deepEqual([photo.weight, photo.soon, photo.done], [0, true, false])
  assert.match(photo.hint, /Coming soon/)
  assert.equal(c.complete, true)
  // a photo that is already there is just done
  const has = lib.buildProfileCompletion({ ...none, avatarUrl: 'https://x.example/p.jpg' }, false).steps.find(s => s.id === 'photo')!
  assert.deepEqual([has.done, has.soon], [true, false])
})

test('T-0766: the photo switch is ON, so the photo step counts (20 of 100), is open until a photo is added, and sends the tutor to Settings, Profile', () => {
  assert.equal(lib.PHOTO_UPLOAD_READY, true)
  const none20 = lib.buildProfileCompletion(none)
  const photo = none20.steps.find(s => s.id === 'photo')!
  assert.deepEqual([photo.weight, photo.soon, photo.done, photo.href, photo.action], [20, false, false, '/settings?tab=profile', 'Add photo'])
  assert.doesNotMatch(photo.hint, /Coming soon/)
  assert.equal(none20.steps.reduce((a, s) => a + s.weight, 0), 100)
  // by default the steps are worth hours 25, photo 20, introduction 20, price 20, review 15
  assert.equal(lib.buildProfileCompletion({ ...none, avatarUrl: 'https://x.example/p.jpg' }).percent, 20)
  assert.equal(lib.buildProfileCompletion({ ...none, availabilityRows: 1 }).percent, 25)
  // the four other steps are no longer 100%: without the photo a tutor stops at 80
  const four = { availabilityRows: 1, bio: LONG, defaultLessonPrice: 10, reviewCount: 1 }
  assert.deepEqual([lib.buildProfileCompletion({ ...none, ...four }).percent, lib.buildProfileCompletion({ ...none, ...four }).complete], [80, false])
  assert.deepEqual([lib.buildProfileCompletion({ ...none, ...four, avatarUrl: 'https://x.example/p.jpg' }).percent, lib.buildProfileCompletion({ ...none, ...four, avatarUrl: 'https://x.example/p.jpg' }).complete], [100, true])
  // a blank or spaces-only address is no photo
  assert.equal(lib.buildProfileCompletion({ ...none, ...four, avatarUrl: '   ' }).complete, false)
})

test('an introduction counts from 200 characters, trimmed, and not while a template\'s [bracketed part] is still in it', () => {
  const of = (n: number) => 'x'.repeat(n)
  assert.equal(lib.hasIntroduction(of(199)), false)
  assert.equal(lib.hasIntroduction(of(200)), true)
  assert.equal(lib.hasIntroduction('   ' + of(150) + '   '), false, 'spaces at the ends do not count')
  assert.equal(lib.hasIntroduction(null), false)
  assert.equal(lib.hasIntroduction(undefined), false)
  assert.equal(lib.hasIntroduction(42), false)
  for (const t of tpl.INTRO_TEMPLATES) assert.equal(lib.hasIntroduction(t.text), false, `the template "${t.name}" as it stands is not an introduction`)
  assert.equal(lib.hasIntroduction(of(200) + ' [your name]'), false)
  assert.equal(lib.hasIntroduction(of(200) + ' [fine, filled in] and (round) {braces}'.replace('[fine, filled in]', 'fine')), true)
})

test('a price counts when it is a number above zero; blank, zero, negative or text do not', () => {
  for (const ok of [1, 0.5, '25', ' 12.5 ']) assert.equal(lib.hasPrice(ok), true, String(ok))
  for (const bad of [0, '0', '', '  ', null, undefined, -5, 'abc', NaN]) assert.equal(lib.hasPrice(bad), false, String(bad))
  assert.equal(lib.hasPrice(Infinity), false)
})

test('a review counts from one; a missing or odd count does not', () => {
  for (const ok of [1, 2, '3', 40]) assert.equal(lib.hasReview(ok), true, String(ok))
  for (const bad of [0, '0', null, undefined, '', 'x', -1, NaN, 0.5]) assert.equal(lib.hasReview(bad), false, String(bad))
})

test('a photo counts when the address is text with something in it', () => {
  assert.equal(lib.hasPhoto('https://x.example/p.jpg'), true)
  for (const bad of ['', '   ', null, undefined, 0, {}]) assert.equal(lib.hasPhoto(bad), false, String(bad))
})

// ---- the list ------------------------------------------------------------------------------------------------------------------------

test('the list: open steps first (the biggest gain first), then what is done, then what cannot be done yet; one next action at the top', () => {
  const ids = (f: Partial<typeof none>) => lib.buildProfileCompletion({ ...none, ...f }, false).steps.map(s => s.id)
  assert.deepEqual(ids({}), ['hours', 'intro', 'prices', 'review', 'photo'])
  assert.deepEqual(ids({ availabilityRows: 1 }), ['intro', 'prices', 'review', 'hours', 'photo'])
  assert.deepEqual(ids({ availabilityRows: 1, bio: LONG, defaultLessonPrice: 5, reviewCount: 1 }), ['hours', 'intro', 'prices', 'review', 'photo'])
  // with a photo upload the photo is a normal step of 20, like the introduction and the price (same weight: the list order stays)
  assert.deepEqual(lib.buildProfileCompletion({ ...none, reviewCount: 2 }, true).steps.map(s => s.id), ['hours', 'intro', 'prices', 'photo', 'review'])
})

test('each open step has a button that opens the page where it is done', () => {
  const hrefs = Object.fromEntries(lib.buildProfileCompletion(none).steps.map(s => [s.id, [s.href, s.action]]))
  assert.deepEqual(hrefs.hours, ['/availability', 'Set free hours'])
  assert.deepEqual(hrefs.intro, ['/settings?tab=profile', 'Use a template'])
  assert.deepEqual(hrefs.prices, ['/settings?tab=booking', 'Set price'])
  assert.deepEqual(hrefs.review, ['/students', 'Open students'])
})

test('the public link: the main site address and the slug, or none when the tutor has no slug', () => {
  const c = lib.buildProfileCompletion(none)
  assert.equal(c.profileUrl, 'https://www.tutafy.com/tutors/maya')
  assert.equal(c.profilePath, '/tutors/maya')
  const noSlug = lib.buildProfileCompletion({ ...none, slug: null })
  assert.deepEqual([noSlug.profileUrl, noSlug.profilePath], [null, null])
})

// ---- the card as HTML ----------------------------------------------------------------------------------------------------------------

const view = (f: Partial<typeof none>, extra: Record<string, unknown> = {}, ready = false) => renderToStaticMarkup(createElement(ProfileCompletionView, { card: lib.buildProfileCompletion({ ...none, ...f }, ready), ...extra }))

test('the card at 30%: the percent, a progress bar with its numbers, the next step first and highlighted, "+25%" on what is open, "Done" on what is done', () => {
  const html = view({ availabilityRows: 1 })
  assert.match(html, /data-testid="profile-percent">30%</)
  assert.match(html, /role="progressbar" aria-valuenow="30" aria-valuemin="0" aria-valuemax="100" aria-label="Profile 30% complete"/)
  assert.match(html, /data-step="hours" data-done="true"[\s\S]*?Done/)
  assert.match(html, /data-step="intro" data-done="false"[\s\S]*?\+25%/)
  const go = /<a [^>]*data-testid="go-intro"[^>]*>Use a template<\/a>/.exec(html)
  assert.ok(go, 'the button of the next step')
  assert.match(go[0], /href="\/settings\?tab=profile"/)
  assert.match(html, /data-testid="preview-profile"/)
  assert.match(html, /tutafy\.com\/tutors\/maya/)
  assert.ok(html.indexOf('data-step="intro"') < html.indexOf('data-step="hours"'), 'open before done')
  assert.equal((html.match(/bg-indigo-600 hover:bg-indigo-700/g) ?? []).length, 1, 'exactly one primary action: the next step')
})

test('the card tells a screen reader what each row is (Done, Coming soon or To do) and has no button for what cannot be done', () => {
  const html = view({ availabilityRows: 1 })
  assert.match(html, /<span class="sr-only">Done: <\/span>Set your free hours/)
  assert.match(html, /<span class="sr-only">To do: <\/span>Write your introduction/)
  assert.match(html, /<span class="sr-only">Coming soon: <\/span>Add a clear photo of your face/)
  assert.doesNotMatch(html, /data-testid="go-photo"/)
  assert.doesNotMatch(html, /\+0%/)
})

test('at 100% the card shrinks to one line with the link and the copy button; no list, no progress bar', () => {
  const full = { availabilityRows: 2, bio: LONG, defaultLessonPrice: 20, reviewCount: 3 }
  const html = view(full)
  assert.match(html, /data-testid="profile-completion-done"/)
  assert.match(html, /Your profile is complete/)
  assert.match(html, /data-testid="copy-profile-link"[^>]*>[\s\S]*?Copy link/)
  assert.doesNotMatch(html, /role="progressbar"|data-step=|<ol/)
  assert.match(view(full, { copied: true }), /Copied/)
  assert.doesNotMatch(view({ ...full, slug: null }), /copy-profile-link/, 'no slug, no link to copy')
})

test('T-0766: with the photo switch on the card shows the photo as a task with a button, and a tutor without a photo does not get the one-line card', () => {
  const html = view({ availabilityRows: 1, bio: LONG, defaultLessonPrice: 20, reviewCount: 1 }, {}, true)
  assert.match(html, /data-testid="profile-percent">80%</)
  assert.match(html, /<span class="sr-only">To do: <\/span>Add a clear photo of your face/)
  const go = /<a [^>]*data-testid="go-photo"[^>]*>Add photo<\/a>/.exec(html)
  assert.ok(go, 'the photo has a button')
  assert.match(go[0], /href="\/settings\?tab=profile"/)
  assert.doesNotMatch(html, /Coming soon/)
  assert.doesNotMatch(html, /profile-completion-done/)
  const done = view({ availabilityRows: 1, bio: LONG, defaultLessonPrice: 20, reviewCount: 1, avatarUrl: 'https://x.example/p.jpg' }, {}, true)
  assert.match(done, /profile-completion-done/)
})

test('99% is not complete: only a whole 100 shrinks the card', () => {
  for (const f of [{ availabilityRows: 1, bio: LONG, defaultLessonPrice: 20 }, { bio: LONG, defaultLessonPrice: 20, reviewCount: 1 }]) {
    assert.equal(lib.buildProfileCompletion({ ...none, ...f }).complete, false)
    assert.doesNotMatch(view(f), /profile-completion-done/)
  }
})

// ---- the real dashboard page ---------------------------------------------------------------------------------------------------------

const ME = 'tutor-me'
const OTHER = 'tutor-other'

function world(): FakeDb {
  return createFakeDb({
    tutors: [
      { id: ME, name: 'Mia Test', email: 'me@example.com', slug: 'mia', subscription_status: 'free', bio: null, avatar_url: null, default_lesson_price: null, review_count: 0 },
      { id: OTHER, name: 'Omar Test', email: 'other@example.com', slug: 'omar', subscription_status: 'free', bio: LONG, avatar_url: 'https://x.example/o.jpg', default_lesson_price: 30, review_count: 5 },
    ],
    availability: [{ id: 'a1', tutor_id: OTHER, day_of_week: 1, start_time: '09:00', end_time: '17:00' }],
  })
}

async function renderFor(id: string, d: FakeDb): Promise<{ html: string; page: Page }> {
  db = d
  currentUser = { id, email: `${id}@example.com` }
  const page = await DashboardPage()
  return { html: renderToStaticMarkup(createElement(DashboardHome, { data: page.props.data as never })), page }
}

test('the real dashboard: each tutor sees their OWN percentage, and it follows their data from one load to the next', async () => {
  const d = world()
  const mine = await renderFor(ME, d)
  assert.equal(mine.page.props.data.profile?.percent, 0)
  assert.match(mine.html, /data-testid="profile-completion-card"/)
  assert.match(mine.html, /data-testid="profile-percent">0%</)
  assert.match(mine.html, /tutafy\.com\/tutors\/mia/)
  assert.doesNotMatch(mine.html, /tutors\/omar/, 'never another tutor\'s link')

  const theirs = await renderFor(OTHER, d)
  assert.equal(theirs.page.props.data.profile?.percent, 100, 'hours 25 + photo 20 + introduction 20 + price 20 + a review 15')
  assert.match(theirs.html, /data-testid="profile-completion-done"/, 'at 100% the card is one line')
  assert.doesNotMatch(theirs.html, /data-testid="profile-completion-card"|tutors\/mia/)
})

test('loadProfileCompletion: every read names the tutor, a failed read gives no card (never a wrong 0%), and nothing is written', async () => {
  const d = world()
  const ok = await lib.loadProfileCompletion(d as never, OTHER)
  assert.equal(ok?.percent, 100, 'hours, a long introduction, a price, a review and a photo')
  assert.equal(ok?.complete, true)
  const mine = await lib.loadProfileCompletion(d as never, ME)
  assert.equal(mine?.percent, 0, 'the other tutor\'s hours, price and photo do not count for me')
  d.tables.availability.push({ id: 'a2', tutor_id: ME, day_of_week: 2, start_time: '10:00', end_time: '12:00' })
  assert.equal((await lib.loadProfileCompletion(d as never, ME))?.percent, 25, 'hours are worth 25 now that the photo counts')

  const broken = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'boom' } }), then: (r: (v: unknown) => unknown) => r({ count: null, error: { message: 'boom' } }) }) }) }) }
  assert.equal(await lib.loadProfileCompletion(broken as never, ME), null)
  assert.equal(await lib.loadProfileCompletion(createFakeDb({}) as never, 'nobody'), null, 'no such tutor: no card')
  assert.deepEqual([...new Set(d.log.map(l => l.op))].filter(op => op !== 'select'), [])

  const queries = read('lib/profile-completion.ts').match(/db\.from\([^)]*\)[^\n]*/g) ?? []
  assert.equal(queries.length, 2)
  for (const q of queries) assert.match(q, /\.eq\('(id|tutor_id)', tutorId\)/, q)
  assert.match(read('app/(dashboard)/dashboard/page.tsx'), /loadProfileCompletion\(supabase, user!\.id\)/, 'the id comes from the session, never from the request')
  assert.doesNotMatch(code('lib/profile-completion.ts'), /resend|sendMail|\bfetch\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/i)
})

// ---- introduction templates ----------------------------------------------------------------------------------------------------------

test('templates: four, in English, each answers who you help / what a lesson is / why you, and each has bracketed parts to replace', () => {
  assert.deepEqual(tpl.INTRO_TEMPLATES.map(t => t.id), ['beginner', 'exam', 'work', 'kids'])
  for (const t of tpl.INTRO_TEMPLATES) {
    assert.ok(t.name && t.summary)
    assert.ok(tpl.unfilledParts(t.text).length >= 3, `${t.id}: parts to replace`)
    assert.ok(t.text.length >= 300 && t.text.length <= 900, `${t.id}: ${t.text.length} characters, inside the advised 400-900 once filled in`)
    assert.ok(t.text.includes('\n\n'), `${t.id}: paragraphs`)
    assert.doesNotMatch(t.text, /[^\x00-\x7f]/, `${t.id}: plain ASCII, so it saves anywhere`)
    assert.doesNotMatch(t.text, /@|https?:|\d{5,}/, `${t.id}: no address, link or phone-like number`)
  }
  assert.equal(new Set(tpl.INTRO_TEMPLATES.map(t => t.text)).size, 4)
})

test('unfilledParts finds the [bracketed parts] left, templateIdOf tells an untouched template from the tutor\'s own words', () => {
  assert.deepEqual(tpl.unfilledParts('Hi, I\'m [your name] and I teach [subject].'), ['[your name]', '[subject]'])
  assert.deepEqual(tpl.unfilledParts('No brackets, (round) and {curly}.'), [])
  assert.deepEqual(tpl.unfilledParts('[]'), [], 'an empty pair is not a part')
  assert.deepEqual(tpl.unfilledParts('[line\nbreak]'), [], 'a part never spans lines')
  assert.deepEqual(tpl.unfilledParts(null), [])
  assert.deepEqual(tpl.unfilledParts('[' + 'x'.repeat(200) + ']'), [], 'a very long bracket is the tutor\'s own text, not a part')
  assert.equal(tpl.templateIdOf(tpl.INTRO_TEMPLATES[1].text), 'exam')
  assert.equal(tpl.templateIdOf('  ' + tpl.INTRO_TEMPLATES[1].text + '\n'), 'exam', 'spaces at the ends do not matter')
  assert.equal(tpl.templateIdOf(tpl.INTRO_TEMPLATES[1].text.replace('[your name]', 'Ana')), null, 'once edited it is the tutor\'s own')
  assert.equal(tpl.templateIdOf(''), null)
})

test('Settings: the introduction box offers the templates, and a CHANGED bio that still has a [bracketed part] is not saved; an untouched old bio is never judged', () => {
  const settings = settingsSource()
  assert.match(settings, /<IntroEditor value=\{form\.bio\} onChange=\{bio => setForm\(f => \(\{ \.\.\.f, bio \}\)\)\} \/>/)
  assert.match(settings, /form\.bio !== savedBio && unfilledParts\(form\.bio\)\.length > 0/)
  assert.ok(settings.indexOf('form.bio !== savedBio') < settings.indexOf('saveTutorSettings(supabase'), 'the check is before anything is written (the writes live in src/lib/settings-save.ts since T-0717)')
  const guard = settings.slice(settings.indexOf('form.bio !== savedBio'), settings.indexOf('form.bio !== savedBio') + 400)
  assert.match(guard, /return/, 'it stops the save')
  const editor = renderToStaticMarkup(createElement(IntroEditor as never, { value: '', onChange: () => {} }))
  for (const t of tpl.INTRO_TEMPLATES) assert.ok(editor.includes(`data-testid="intro-template-${t.id}"`), t.id)
  assert.match(editor, /Start from a template, then replace the parts in \[square brackets\]\./)
  assert.match(editor, /<label for="[^"]*-bio"/, 'the box has a real label')
})

test('the editor warns about the parts still to fill in, counts the characters and explains the 200 rule; a finished bio shows no warning', () => {
  const html = (value: string) => renderToStaticMarkup(createElement(IntroEditor as never, { value, onChange: () => {} }))
  const t = tpl.INTRO_TEMPLATES[0].text
  assert.match(html(t), /data-testid="intro-unfilled"[\s\S]*?parts are\s*still in \[square brackets\]/)
  assert.match(html(t), new RegExp(`${t.trim().length} characters\\. Aim for 400 to 900\\.<`), 'a template is over 200 characters: no 200 note')
  assert.match(html('Hi [name]'), /9 characters\. Aim for 400 to 900\. An introduction counts toward your profile from 200\./)
  assert.doesNotMatch(html(LONG + LONG), /data-testid="intro-unfilled"|counts toward your profile from/)
  assert.match(html('Hi [name]'), /1 part is\s*still in/)
})
