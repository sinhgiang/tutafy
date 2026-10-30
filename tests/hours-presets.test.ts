// T-1105: one-tap free hours. A tutor with no weekly hours picks a ready-made week on the dashboard card (or the empty Availability page) and the hours are written.
// The REAL route and the REAL rule run over an in-memory database: who may write (the signed-in tutor, only their own hours, only when they have none), what
// is refused (a preset that is not on the fixed list, another site's Origin, no session), what happens when a write fails or two presses race, and that the
// card shows the buttons only to a tutor with no hours. Nothing here reaches a service. All names are made up.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextRequest } from 'next/server.js'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(SRC, rel), 'utf8').replace(/\r\n/g, '\n')

const ME = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const ORIGIN = 'https://www.tutafy.test'

let db: FakeDb
let session: { id: string; email: string } | null = null

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: {
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: session } }) }, from: (t: string) => db.from(t) }),
  },
})

const lib = await import('@/lib/hours-presets.ts')
const route = await import('@/app/api/availability/preset/route.ts')
const setupLib = await import('@/lib/directory-setup.ts')
const { DirectorySetupCard } = await import('@/components/dashboard/DirectorySetupCard.tsx')

const hour = (tutor: string, id: string, day = 1) => ({ id, tutor_id: tutor, day_of_week: day, start_time: '10:00', end_time: '12:00' })
const rowsOf = (tutor: string) => db.tables.availability.filter(r => r.tutor_id === tutor)

function post(body: unknown, headers: Record<string, string> = { origin: ORIGIN, host: 'www.tutafy.test' }): NextRequest {
  return new NextRequest(`${ORIGIN}/api/availability/preset`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

beforeEach(() => {
  db = createFakeDb({ availability: [hour(OTHER, 'o1', 2)] })
  session = { id: ME, email: 'me@example.com' }
})

// ---- the list and the rule ----------------------------------------------------------------------

test('the four presets are real weeks: days 0 to 6 once each, a start before the end, whole or half hours, one id each', () => {
  assert.equal(lib.HOURS_PRESETS.length, 4)
  assert.equal(new Set(lib.HOURS_PRESETS.map(p => p.id)).size, 4)
  for (const p of lib.HOURS_PRESETS) {
    assert.ok(p.days.length > 0 && new Set(p.days).size === p.days.length, p.id)
    assert.ok(p.days.every(d => Number.isInteger(d) && d >= 0 && d <= 6), p.id)
    assert.match(p.start, /^([01]\d|2[0-3]):[0-5]\d$/)
    assert.match(p.end, /^([01]\d|2[0-3]):[0-5]\d$/)
    assert.ok(p.start < p.end, p.id)
    assert.ok(p.detail.includes(p.start) && p.detail.includes(p.end), `${p.id}: the button says the times it sets`)
  }
  assert.deepEqual(lib.presetRows(ME, lib.parseHoursPreset('weekday-evenings')!).map(r => [r.day_of_week, r.start_time, r.end_time]),
    [1, 2, 3, 4, 5].map(d => [d, '18:00', '21:00']))
  assert.deepEqual(lib.presetRows(ME, lib.parseHoursPreset('weekends')!).map(r => r.day_of_week), [0, 6])
})

test('only the exact id of a preset is a preset', () => {
  for (const p of lib.HOURS_PRESETS) assert.equal(lib.parseHoursPreset(p.id)?.id, p.id)
  for (const bad of ['', 'WEEKDAYS', ' weekdays', 'weekdays ', 'weekdays\n', '__proto__', 'constructor', 'toString', 'all', null, undefined, 3, ['weekdays'], { id: 'weekdays' }]) {
    assert.equal(lib.parseHoursPreset(bad), null, JSON.stringify(bad))
  }
})

test('applyHoursPreset writes one row a day for a tutor with none, with the tutor id and the real columns only', async () => {
  const r = await lib.applyHoursPreset(db, ME, 'weekday-evenings')
  assert.deepEqual(r.ok && r.saved, 5)
  const mine = rowsOf(ME)
  assert.equal(mine.length, 5)
  assert.deepEqual(mine.map(x => x.day_of_week).sort(), [1, 2, 3, 4, 5])
  for (const row of mine) {
    assert.equal(row.start_time, '18:00')
    assert.equal(row.end_time, '21:00')
    assert.deepEqual(Object.keys(row).filter(k => !['id', 'tutor_id', 'day_of_week', 'start_time', 'end_time'].includes(k)), [], 'no column that the table does not have')
  }
})

test('a tutor who already has hours gets 409 and nothing is written or removed', async () => {
  db = createFakeDb({ availability: [hour(ME, 'm1', 3), hour(OTHER, 'o1', 2)] })
  const r = await lib.applyHoursPreset(db, ME, 'weekdays')
  assert.deepEqual(r, { ok: false, status: 409, message: lib.HAVE_HOURS_MESSAGE })
  assert.deepEqual(db.tables.availability.map(x => x.id).sort(), ['m1', 'o1'])
  assert.equal(db.log.filter(l => l.table === 'availability' && l.op !== 'select').length, 0)
})

test("another tutor's hours never count as mine: I still get my week, and theirs stay as they were", async () => {
  const r = await lib.applyHoursPreset(db, ME, 'weekends')
  assert.equal(r.ok, true)
  assert.equal(rowsOf(ME).length, 2)
  assert.deepEqual(rowsOf(OTHER).map(x => x.id), ['o1'])
})

test('a preset that is not on the list is refused before the database is touched', async () => {
  const r = await lib.applyHoursPreset(db, ME, 'every-hour')
  assert.deepEqual(r, { ok: false, status: 400, message: 'Choose one of the schedules.' })
  assert.equal(db.log.length, 0)
})

test('a failed read, a failed write and a half-written week all leave the tutor with nothing new', async () => {
  const stub = (parts: { readError?: boolean; insert?: 'error' | 'short' }) => {
    const store: { id: string }[] = []
    return {
      store,
      from: () => ({
        select: () => ({ eq: async () => ({ data: parts.readError ? null : [...store], error: parts.readError ? { message: 'down' } : null }) }),
        insert: (rows: unknown[]) => ({
          select: async () => {
            if (parts.insert === 'error') return { data: null, error: { message: 'boom' } }
            const made = (parts.insert === 'short' ? rows.slice(0, 2) : rows).map((_, i) => ({ id: `n${i}` }))
            store.push(...made)
            return { data: made, error: null }
          },
        }),
        delete: () => ({ in: async (_c: string, ids: string[]) => { for (const id of ids) { const i = store.findIndex(s => s.id === id); if (i >= 0) store.splice(i, 1) } return { error: null } } }),
      }),
    }
  }
  for (const parts of [{ readError: true }, { insert: 'error' as const }, { insert: 'short' as const }]) {
    const s = stub(parts)
    const r = await lib.applyHoursPreset(s, ME, 'weekdays')
    assert.deepEqual(r, { ok: false, status: 500, message: lib.PRESET_FAILED_MESSAGE }, JSON.stringify(parts))
    assert.equal(s.store.length, 0, `${JSON.stringify(parts)}: what did get in was taken back`)
  }
})

test('two presses at once (two tabs): when more rows than mine are there afterwards, mine are taken back and the answer is 409', async () => {
  let raced = false
  const racing = {
    from: (t: string) => {
      const q = db.from(t) as unknown as { insert: (r: unknown) => unknown }
      if (t !== 'availability') return q
      return new Proxy(q, {
        get(target, prop, recv) {
          if (prop === 'insert') return (rows: unknown) => {
            if (!raced) { raced = true; db.tables.availability.push(hour(ME, 'other-tab', 4)) } // the other tab's write lands first
            return (target.insert as (r: unknown) => unknown)(rows)
          }
          return Reflect.get(target, prop, recv)
        },
      })
    },
  }
  const r = await lib.applyHoursPreset(racing, ME, 'weekdays')
  assert.equal(r.ok, false)
  assert.equal(!r.ok && r.status, 409)
  assert.deepEqual(rowsOf(ME).map(x => x.id), ['other-tab'], 'only the other tab’s row is left; the rows of this press are gone')
})

// ---- the route -----------------------------------------------------------------------------------

test('the route: a signed-in tutor presses a preset and gets their own week; the answer names what was set', async () => {
  const res = await route.POST(post({ preset: 'weekday-mornings' }))
  assert.equal(res.status, 200)
  const body = await res.json() as { ok: boolean; saved: number; label: string; detail: string }
  assert.equal(body.ok, true)
  assert.equal(body.saved, 5)
  assert.equal(body.label, 'Weekday mornings')
  assert.match(body.detail, /08:00 to 12:00/)
  assert.equal(rowsOf(ME).length, 5)
  assert.ok(rowsOf(ME).every(r => r.start_time === '08:00' && r.end_time === '12:00'))
})

test('the route: nobody signed in gets 401 and nothing is written', async () => {
  session = null
  const res = await route.POST(post({ preset: 'weekdays' }))
  assert.equal(res.status, 401)
  assert.equal(db.tables.availability.length, 1)
})

test('the route: a call from another site, or with no Origin, gets 403 and nothing is written', async () => {
  for (const headers of [{ origin: 'https://evil.example', host: 'www.tutafy.test' }, { host: 'www.tutafy.test' }, { origin: 'not a url', host: 'www.tutafy.test' }]) {
    const res = await route.POST(post({ preset: 'weekdays' }, headers))
    assert.equal(res.status, 403, JSON.stringify(headers))
  }
  assert.equal(db.tables.availability.length, 1)
})

test('the route: a body that is not JSON, not an object or names no preset gets 400', async () => {
  for (const body of ['{oops', '[]', '"weekdays"', 'null', {}, { preset: 'nope' }, { preset: ['weekdays'] }, { preset: 5 }]) {
    const res = await route.POST(post(body))
    assert.equal(res.status, 400, JSON.stringify(body))
  }
  assert.equal(db.tables.availability.length, 1)
})

test("the route: a body that names another tutor's id writes for the session's tutor only (the second-person test)", async () => {
  const res = await route.POST(post({ preset: 'weekdays', tutor_id: OTHER, tutorId: OTHER, id: OTHER, user: { id: OTHER } }))
  assert.equal(res.status, 200)
  assert.equal(rowsOf(ME).length, 5)
  assert.deepEqual(rowsOf(OTHER).map(x => x.id), ['o1'], "the other tutor's hours are unchanged and nothing was added to them")
})

test('the route: a second press by a tutor who now has hours gets 409 and the week is not doubled', async () => {
  assert.equal((await route.POST(post({ preset: 'weekdays' }))).status, 200)
  const again = await route.POST(post({ preset: 'weekends' }))
  assert.equal(again.status, 409)
  assert.equal(rowsOf(ME).length, 5)
})

test('the route: a body over 512 bytes is refused before it is read', async () => {
  const res = await route.POST(post({ preset: 'weekdays' }, { origin: ORIGIN, host: 'www.tutafy.test', 'content-length': '5000' }))
  assert.equal(res.status, 413)
})

test('the route never reads the tutor from the request: its id comes from the session', () => {
  const src = read('app/api/availability/preset/route.ts').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n')
  assert.match(src, /auth\.getUser\(\)/)
  assert.match(src, /applyHoursPreset\(supabase, user\.id, preset\)/)
  assert.doesNotMatch(src, /tutor_?id/i, 'the route does not name a tutor id taken from the body')
  assert.doesNotMatch(src, /createAdminClient|service_role/, 'it writes with the tutor’s own session, so row level security applies')
})

// ---- the card ------------------------------------------------------------------------------------

test('the dashboard card shows the four buttons and the time zone to a tutor with no hours, and none to a tutor who has hours', () => {
  const open = setupLib.buildDirectorySetup({ availabilityRows: 0, bio: null, languages: null, timezone: 'Asia/Ho_Chi_Minh' })!
  const html = renderToStaticMarkup(createElement(DirectorySetupCard, { setup: open }))
  assert.ok(html.includes('data-testid="quick-hours"'))
  for (const p of lib.HOURS_PRESETS) {
    assert.ok(html.includes(`data-testid="preset-${p.id}"`), p.id)
    assert.ok(html.includes(p.detail), `the button says what it sets: ${p.detail}`)
  }
  assert.match(html, /Asia\/Ho Chi Minh/, 'the tutor’s time zone is named')
  assert.match(html, /href="\/availability"[^>]*>Set your own hours/, 'a way to set other hours stays')

  const done = setupLib.buildDirectorySetup({ availabilityRows: 2, bio: null, languages: null, timezone: 'Asia/Ho_Chi_Minh' })!
  assert.ok(!renderToStaticMarkup(createElement(DirectorySetupCard, { setup: done })).includes('quick-hours'))
})

test('a tutor with no saved time zone still gets the buttons, with words that do not name a zone', () => {
  const s = setupLib.buildDirectorySetup({ availabilityRows: 0, bio: null, languages: null })!
  assert.equal(s.timezone, null)
  const html = renderToStaticMarkup(createElement(DirectorySetupCard, { setup: s }))
  assert.ok(html.includes('data-testid="preset-weekday-evenings"'))
  assert.match(html, /Times are in your time zone\./)
})

test('the empty Availability page offers the same buttons and reloads its list after one is saved', () => {
  const page = read('app/(dashboard)/availability/page.tsx')
  assert.match(page, /slots\.length === 0 && <div[^>]*><QuickHours onSaved=\{\(\) => \{ void load\(\) \}\} \/><\/div>/)
  const comp = read('components/availability/QuickHours.tsx')
  assert.match(comp, /fetch\('\/api\/availability\/preset', \{\s*method: 'POST'/)
  assert.match(comp, /window\.location\.reload\(\)/)
  assert.doesNotMatch(comp, /next\/navigation/, 'no router: the card draws in any page and in a test')
})
