// "Get ready for the tutor directory" on the tutor dashboard (T-1043): a tutor who has not finished the three steps (free hours, an introduction of 80
// characters or more, a language) sees a card with progress and one button to the right place; a tutor who has finished them sees nothing; one tutor
// never sees another tutor's progress; it only reads (nothing is written, nothing is sent); and the directory's threshold is not touched.
// The real dashboard page runs over an in-memory database and is rendered to HTML.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

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

const lib = await import('@/lib/directory-setup.ts')
const directory = await import('@/lib/directory.ts')
const { DirectorySetupCard } = await import('@/components/dashboard/DirectorySetupCard.tsx')
const { DashboardHome } = await import('@/components/dashboard/DashboardHome.tsx')
type Page = { props: { data: { setup: ReturnType<typeof lib.buildDirectorySetup>; tutorId: string } } }
const DashboardPage = (await import('@/app/(dashboard)/dashboard/page.tsx')).default as () => Promise<Page>

beforeEach(() => { currentUser = null })

const ME = 'tutor-me'
const OTHER = 'tutor-other'
const TESTID = 'data-testid="directory-setup"'
const LONG_BIO = 'I teach English to adults who want to speak with confidence at work. Lessons are relaxed, practical and built around your goals.'
const hour = (tutor: string, id = 'a1') => ({ id, tutor_id: tutor, day_of_week: 1, start_time: '09:00', end_time: '17:00' })

/** I have done nothing yet; the other tutor has done all three. */
function world(): FakeDb {
  return createFakeDb({
    tutors: [
      { id: ME, name: 'Mia Test', email: 'me@example.com', slug: 'me-slug', subscription_status: 'free', bio: null, languages: null },
      { id: OTHER, name: 'Omar Test', email: 'other@example.com', slug: 'other-slug', subscription_status: 'free', bio: LONG_BIO, languages: ['English', 'Spanish'] },
    ],
    availability: [hour(OTHER)],
  })
}

// ---- the rule: three steps, in order -------------------------------------------------------------

test('nothing done: three open steps, 0 of 3, the first button goes to the hours; all done: no card at all', () => {
  const s = lib.buildDirectorySetup({ availabilityRows: 0, bio: null, languages: null })!
  assert.deepEqual(s.steps.map(x => [x.id, x.done]), [['hours', false], ['intro', false], ['languages', false]])
  assert.equal(s.doneCount, 0)
  assert.equal(s.total, 3)
  assert.equal(s.next.id, 'hours')
  assert.equal(s.next.href, '/availability')
  assert.equal(lib.buildDirectorySetup({ availabilityRows: 1, bio: LONG_BIO, languages: ['English'] }), null)
})

test('the next button always goes to the first step still open, and each button opens the field of its own step', () => {
  const next = (f: Parameters<typeof lib.buildDirectorySetup>[0]) => lib.buildDirectorySetup(f)!.next
  assert.equal(next({ availabilityRows: 3, bio: null, languages: null }).href, '/settings?tab=profile&focus=intro')
  assert.equal(next({ availabilityRows: 3, bio: LONG_BIO, languages: [] }).href, '/settings?tab=profile&focus=languages')
  assert.equal(next({ availabilityRows: 0, bio: LONG_BIO, languages: ['English'] }).href, '/availability')
  assert.equal(next({ availabilityRows: 0, bio: LONG_BIO, languages: ['English'] }).id, 'hours')
})

test('the introduction counts from 80 characters, the same count the directory uses', () => {
  const at = (n: number) => 'x'.repeat(n)
  assert.equal(directory.MIN_INTRO_CHARS, 80)
  for (const [n, done] of [[0, false], [79, false], [80, true], [200, true]] as const) {
    const step = lib.buildDirectorySetup({ availabilityRows: 1, bio: at(n), languages: [] })!.steps.find(x => x.id === 'intro')!
    assert.equal(step.done, done, `${n} characters`)
    // the directory's own rule says the same about the same text
    const listed = directory.checkListing({ booking_url_active: true, name: 'Mia', bio: at(n), timezone: 'UTC' }, 1).checks.find(c => c.id === 'intro')!.ok
    assert.equal(step.done, listed, `directory rule at ${n}`)
  }
  assert.equal(lib.buildDirectorySetup({ availabilityRows: 1, bio: `   ${at(79)}   `, languages: [] })!.steps[1].done, false, 'spaces at the ends do not count')
  assert.match(lib.buildDirectorySetup({ availabilityRows: 1, bio: at(41), languages: [] })!.steps[1].hint, /Yours is 41 characters/)
})

test('a language counts only when it is a real name from the stored list: empty, blank, wrong shape and a bare string do not', () => {
  const langDone = (languages: unknown) => lib.buildDirectorySetup({ availabilityRows: 1, bio: LONG_BIO, languages })?.steps.find(x => x.id === 'languages')?.done ?? true
  assert.equal(langDone(['English']), true)
  for (const bad of [null, undefined, [], [''], ['   '], 'English', 7, { 0: 'English' }]) assert.equal(langDone(bad), false, JSON.stringify(bad))
})

test('the words are English, and a step that is done says so', () => {
  const s = lib.buildDirectorySetup({ availabilityRows: 1, bio: null, languages: null })!
  assert.equal(lib.SETUP_TITLE, 'Get ready for the tutor directory')
  assert.deepEqual(s.steps.map(x => x.action), ['Choose free hours', 'Write introduction', 'Add languages'])
  assert.equal(s.doneCount, 1)
})

// ---- the card as the tutor sees it ---------------------------------------------------------------

test('the card shows progress, one primary button and a button for every other open step; done steps have none', () => {
  const html = renderToStaticMarkup(createElement(DirectorySetupCard, { setup: lib.buildDirectorySetup({ availabilityRows: 1, bio: null, languages: null })! }))
  assert.ok(html.includes(TESTID))
  assert.match(html, /1 of 3 done/)
  assert.match(html, /role="progressbar"[^>]*aria-valuenow="1"[^>]*aria-valuemax="3"/)
  assert.match(html, /2 steps left/)
  assert.match(html, /<a [^>]*href="\/settings\?tab=profile&amp;focus=intro"[^>]*data-testid="directory-setup-next"|data-testid="directory-setup-next"[^>]*href="\/settings\?tab=profile&amp;focus=intro"/)
  assert.match(html, /data-testid="directory-setup-go-languages"/)
  assert.doesNotMatch(html, /directory-setup-go-hours/, 'hours is done: no button')
  assert.doesNotMatch(html, /directory-setup-go-intro/, 'intro is the primary button, not repeated')
  assert.equal((html.match(/<a /g) ?? []).length, 2, 'the primary button and the languages button')
  assert.match(html, /data-step="hours" data-done="true"/)
})

test('one step left says so', () => {
  const html = renderToStaticMarkup(createElement(DirectorySetupCard, { setup: lib.buildDirectorySetup({ availabilityRows: 1, bio: LONG_BIO, languages: [] })! }))
  assert.match(html, /One step left/)
  assert.match(html, /2 of 3 done/)
})

test('the buttons lead to pages that exist and to fields that exist on them', () => {
  assert.ok(existsSync(path.join(SRC, 'app/(dashboard)/availability/page.tsx')))
  assert.ok(existsSync(path.join(SRC, 'app/(dashboard)/settings/page.tsx')))
  const profile = read('components/settings/sections/ProfileSection.tsx')
  const settings = read('app/(dashboard)/settings/page.tsx')
  for (const id of lib.SETTINGS_FOCUS_IDS) {
    assert.match(profile, new RegExp(`focusAnchorId\\('${id}'\\)`), `the Profile section marks the ${id} field`)
  }
  assert.match(settings, /parseSettingsFocus\(searchParams\.get\('focus'\)\)/)
  assert.match(settings, /searchParams\.get\('tab'\) !== 'profile'/, 'the field is looked for on the Profile tab only')
  // the address names a field from a fixed list and nothing else
  assert.equal(lib.parseSettingsFocus('intro'), 'intro')
  assert.equal(lib.parseSettingsFocus('languages'), 'languages')
  for (const bad of ['', 'INTRO', 'intro ', '#intro', 'a"b', '__proto__', 'constructor', null, undefined, 3, ['intro']]) assert.equal(lib.parseSettingsFocus(bad), null, String(bad))
})

// ---- the data: only this tutor's rows ------------------------------------------------------------

/** What the second-person check asks of a loader: my card depends on MY rows, not the other tutor's. */
async function secondPersonOk(load: (db: FakeDb, id: string) => Promise<ReturnType<typeof lib.buildDirectorySetup>>): Promise<boolean> {
  const d = world() // I have nothing, the other has all three
  const mine = await load(d, ME)
  if (mine === null || mine.doneCount !== 0) return false // I must see 0 of 3 although someone else is done
  if ((await load(d, OTHER)) !== null) return false // the other must see no card
  d.tables.availability.push(hour(ME, 'a2'))
  if ((await load(d, ME))?.doneCount !== 1) return false // my own hours move my own bar
  d.tables.tutors.find(t => t.id === ME)!.bio = LONG_BIO
  d.tables.tutors.find(t => t.id === ME)!.languages = ['French']
  return (await load(d, ME)) === null // all three of mine: gone
}

test('loadDirectorySetup reads this tutor only: another tutor\'s hours, introduction and languages neither complete my steps nor show theirs', async () => {
  assert.equal(await secondPersonOk(lib.loadDirectorySetup), true)
})

test('mutation: a loader that does not name the tutor fails the second-person check', async () => {
  const leakyHours = async (d: FakeDb) => { // counts everybody's hours
    const [t, h] = await Promise.all([
      d.from('tutors').select('bio, languages').eq('id', ME).maybeSingle(),
      d.from('availability').select('id', { count: 'exact', head: true }),
    ])
    return lib.buildDirectorySetup({ availabilityRows: h.count ?? 0, bio: t.data?.bio, languages: t.data?.languages })
  }
  assert.equal(await secondPersonOk(leakyHours), false)
  const wrongTutor = async (d: FakeDb) => lib.loadDirectorySetup(d, (d.tables.tutors[0].id as string) === ME ? OTHER : ME) // asks for somebody else
  assert.equal(await secondPersonOk(wrongTutor), false)
})

test('a failing read shows no card, never a wrong one', async () => {
  const ok = world()
  const failing = (table: string) => ({
    from: (t: string) => {
      const b = ok.from(t)
      return t === table ? Object.assign(b, { then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: { message: 'boom' }, count: null }) }) : b
    },
  })
  assert.equal(await lib.loadDirectorySetup(failing('availability'), ME), null)
  assert.equal(await lib.loadDirectorySetup(failing('tutors'), ME), null)
  assert.equal(await lib.loadDirectorySetup(ok, 'nobody-with-this-id'), null, 'no tutor row: no card')
})

// ---- the real dashboard page ---------------------------------------------------------------------

async function renderFor(id: string, d: FakeDb): Promise<{ html: string; page: Page }> {
  db = d
  currentUser = { id, email: `${id}@example.com` }
  const page = await DashboardPage()
  return { html: renderToStaticMarkup(createElement(DashboardHome, { data: page.props.data as never })), page }
}

test('the real dashboard: a tutor who has not finished sees the card with progress and the way to the first open step; a tutor who has finished does not', async () => {
  const d = world()
  const mine = await renderFor(ME, d)
  assert.equal(mine.page.props.data.tutorId, ME)
  assert.ok(mine.html.includes(TESTID), 'I have done nothing: the card')
  assert.match(mine.html, /0 of 3 done/)
  assert.match(mine.html, /<a [^>]*href="\/availability"[^>]*>Choose free hours/)
  assert.ok(mine.html.indexOf(TESTID) < mine.html.indexOf('Hello,'), 'the card is the first thing on the page')

  const theirs = await renderFor(OTHER, d)
  assert.equal(theirs.html.includes(TESTID), false, 'the other tutor finished all three: no card, and mine is not shown to them')
  assert.equal(theirs.page.props.data.setup, null)
})

test('the real dashboard: the bar moves as I finish each step, and the card is gone after the third', async () => {
  const d = world()
  const count = async () => (await renderFor(ME, d)).html.match(/(\d) of 3 done/)?.[1] ?? 'none'
  assert.equal(await count(), '0')
  d.tables.availability.push(hour(ME, 'a2'))
  assert.equal(await count(), '1')
  d.tables.tutors.find(t => t.id === ME)!.bio = LONG_BIO
  assert.equal(await count(), '2')
  assert.match((await renderFor(ME, d)).html, /<a [^>]*href="\/settings\?tab=profile&amp;focus=languages"[^>]*>Add languages/, 'the button now goes to the languages')
  d.tables.tutors.find(t => t.id === ME)!.languages = ['English']
  const done = await renderFor(ME, d)
  assert.equal(done.html.includes(TESTID), false)
  assert.equal(done.page.props.data.setup, null)
})

test('loading the dashboard writes nothing for the tutor: only reads reach the database', async () => {
  const d = world()
  const rows = () => JSON.stringify(Object.entries(d.tables).filter(([, r]) => r.length > 0))
  const before = rows()
  await renderFor(ME, d)
  assert.equal(rows(), before, 'no row was added, changed or removed')
  assert.deepEqual([...new Set(d.log.map(l => l.op))].filter(op => op !== 'select'), [])
})

// ---- what it must not do -------------------------------------------------------------------------

test('it sends nothing: no mail, no message, no fetch, no insert, update, upsert, delete or rpc', () => {
  for (const f of ['lib/directory-setup.ts', 'components/dashboard/DirectorySetupCard.tsx']) {
    assert.doesNotMatch(code(f), /resend|sendMail|nodemailer|webhook|push|notification|\bfetch\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/i, f)
  }
})

test('the page asks with the signed-in tutor\'s id, never an id from the request, and every query names the tutor', () => {
  const page = read('app/(dashboard)/dashboard/page.tsx')
  assert.match(page, /loadDirectorySetup\(supabase, user!\.id\)/)
  assert.doesNotMatch(page, /searchParams|params\./, 'the dashboard page reads nothing from the request')
  const queries = code('lib/directory-setup.ts').match(/db\.from\([^)]*\)[^\n]*/g) ?? []
  assert.equal(queries.length, 2)
  assert.match(queries[0], /\.eq\('id', tutorId\)/)
  assert.match(queries[1], /\.eq\('tutor_id', tutorId\)/)
})

test('the directory\'s threshold is not changed by this', () => {
  assert.equal(directory.DIRECTORY_OPENS_AT, 6)
  assert.equal(directory.FEW_TUTORS_BELOW, 6)
  assert.doesNotMatch(code('lib/directory-setup.ts'), /DIRECTORY_OPENS_AT|FEW_TUTORS_BELOW/)
})

// ---- arriving in Settings at the right field -----------------------------------------------------

test('Settings scrolls to the named field once its section has loaded, puts the cursor in it, and stops looking when told to', async () => {
  const { focusSettingsField, focusAnchorId, FOCUS_EVERY_MS } = await import('@/components/settings/focusField.ts')
  const calls: string[] = []
  let present = false
  const input = { focus: (o: unknown) => calls.push(`focus ${JSON.stringify(o)}`) }
  const anchor = { scrollIntoView: (o: unknown) => calls.push(`scroll ${JSON.stringify(o)}`), querySelector: (q: string) => (calls.push(`find ${q}`), input) }
  const g = globalThis as unknown as { document?: unknown }
  const before = g.document
  g.document = { getElementById: (id: string) => (id === focusAnchorId('languages') && present ? anchor : null) }
  try {
    const stop = focusSettingsField('languages')
    await new Promise(r => setTimeout(r, FOCUS_EVERY_MS * 2.5))
    assert.deepEqual(calls, [], 'the section has not loaded yet: nothing happens')
    present = true
    await new Promise(r => setTimeout(r, FOCUS_EVERY_MS * 1.5))
    assert.deepEqual(calls, ['scroll {"block":"center"}', 'find textarea, input', 'focus {"preventScroll":true}'])
    stop()
    // a search that is stopped before the field appears never touches it
    calls.length = 0; present = false
    const stop2 = focusSettingsField('intro')
    stop2()
    present = true
    await new Promise(r => setTimeout(r, FOCUS_EVERY_MS * 2))
    assert.deepEqual(calls, [])
  } finally {
    g.document = before
  }
})

test('the bar fills from the left by how many steps are done, even when the step that is done is the last one', () => {
  const filled = (f: Parameters<typeof lib.buildDirectorySetup>[0]) => [...renderToStaticMarkup(createElement(DirectorySetupCard, { setup: lib.buildDirectorySetup(f)! })).matchAll(/data-filled="(true|false)"/g)].map(m => m[1])
  assert.deepEqual(filled({ availabilityRows: 0, bio: null, languages: null }), ['false', 'false', 'false'])
  assert.deepEqual(filled({ availabilityRows: 0, bio: null, languages: ['English'] }), ['true', 'false', 'false'], 'only the languages step is done: one segment, at the left')
  assert.deepEqual(filled({ availabilityRows: 1, bio: LONG_BIO, languages: null }), ['true', 'true', 'false'])
})
