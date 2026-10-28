// T-1032: the languages a tutor teaches. The column tutors.languages has been in the schema from the start and every public page reads it, but nothing in the app wrote it
// until this field (Settings, Profile) and this route. The REAL code runs here:
//   - the rule (src/lib/tutor-languages.ts): letters only, six at most, none twice, tidied into capitals;
//   - the route /api/tutors/languages over an in-memory database: who may write (only the signed-in tutor, only their own row, a second tutor never), what is refused
//     (the server side of the same rule), what is stored (the clean list, not the typed text), what happens when the database fails;
//   - the read of the tutor's own list, which never returns another tutor's;
//   - the field in the page: its box, its button, its status line;
//   - the public effect: a language saved here is what the directory card and the language filter read.
// Nothing here reaches a service. All names are made up.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readFileSync } from 'node:fs'
import { NextRequest } from 'next/server.js'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import { MAX_LANGUAGES, languagesToText, parseLanguages } from '@/lib/tutor-languages.ts'
import { buildCard, languageCounts } from '@/lib/directory.ts'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const ORIGIN = 'https://www.tutafy.test'
const AT = '@' // joined into addresses below, so no line of this file reads as an email address (rule 4b)

let db: FakeDb
let session: { id: string; email: string } | null = null
let dbError: { code?: string; message: string } | null = null

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: {
    createClient: async () => ({
      auth: { getUser: async () => ({ data: { user: session } }) },
      // the tutor's own session: it can only change a row that is its own (what row level security does on the real database)
      from: (table: string) => {
        const q = db.from(table) as unknown as Record<string, (...a: unknown[]) => unknown>
        if (table !== 'tutors') return q
        return new Proxy(q, {
          get(target, prop) {
            if (prop === 'update') return (patch: Record<string, unknown>) => {
              if (dbError) return { eq: () => ({ select: async () => ({ data: null, error: dbError }) }) }
              const u = (target.update as (p: unknown) => Record<string, (...a: unknown[]) => unknown>)(patch)
              return { eq: (col: string, v: unknown) => (u.eq as (c: string, v: unknown) => unknown)(col, col === 'id' && v !== session?.id ? '__nobody__' : v) }
            }
            return Reflect.get(target, prop)
          },
        })
      },
    }),
    createAdminClient: () => { throw new Error('the languages route never needs the server key') },
  },
})

// The limit is kept in memory per tutor for 10 minutes: each test starts a day later, so one test never uses up the next one's calls.
let fakeNow = Date.parse('2026-10-28T12:00:00Z')
mock.method(Date, 'now', () => fakeNow)

const route = await import('@/app/api/tutors/languages/route.ts')

beforeEach(() => {
  fakeNow += 24 * 60 * 60 * 1000
  db = createFakeDb({ tutors: [{ id: A, email: 'a@example.com', name: 'Ana', slug: 'ana', languages: [] }, { id: B, email: 'b@example.com', name: 'Ben', slug: 'ben', languages: ['German'] }] })
  session = { id: A, email: 'a@example.com' }
  dbError = null
})

const row = (id: string) => db.tables.tutors.find(t => t.id === id)!
const HEADERS = { origin: ORIGIN, host: 'www.tutafy.test' }
const post = (b: unknown, headers: Record<string, string> = HEADERS) =>
  route.POST(new NextRequest(`${ORIGIN}/api/tutors/languages`, { method: 'POST', headers, body: typeof b === 'string' ? b : JSON.stringify(b) }))
const get = () => route.GET()

// ---- the rule --------------------------------------------------------------------------------------------------------------------------------

test('a typed list becomes the clean list: commas, semicolons and lines separate, capitals are tidied, repeats and empty parts go, names from any alphabet and with a hyphen or space are kept', () => {
  assert.deepEqual(parseLanguages('english, SPANISH ; brazilian portuguese,\nenglish,, '), { ok: true, languages: ['English', 'Spanish', 'Brazilian Portuguese'] })
  assert.deepEqual(parseLanguages('swiss-german, Zhōngwén, русский, 日本語, Español'), { ok: true, languages: ['Swiss-German', 'Zhōngwén', 'Русский', '日本語', 'Español'] })
  assert.deepEqual(parseLanguages(''), { ok: true, languages: [] }, 'an empty text empties the list')
  assert.deepEqual(parseLanguages(['french', 'French ', 'FRENCH']), { ok: true, languages: ['French'] }, 'a list from a program is cleaned the same way')
  assert.equal(languagesToText(['English', 'Spanish']), 'English, Spanish')
})

test('what is not a language name is refused with a sentence: digits, markup, an address, a phone number, a very long name, a seventh language, a value that is not text', () => {
  const bad = ['English 101', '<script>alert(1)</script>', `me${AT}example.com`, 'https://evil.example', '0900 000 000', 'a'.repeat(31), '1', '-English', '"English"', 'English!', 'drop table']
  for (const b of bad.slice(0, 10)) {
    const r = parseLanguages(b)
    assert.equal(r.ok, false, b)
    assert.ok(!r.ok && r.error.length > 10 && !/undefined|null/.test(r.error), b)
  }
  const six = ['English', 'Spanish', 'French', 'German', 'Italian', 'Japanese']
  assert.equal(MAX_LANGUAGES, 6)
  assert.deepEqual(parseLanguages(six.join(',')), { ok: true, languages: six })
  const seven = parseLanguages([...six, 'Korean'].join(','))
  assert.ok(!seven.ok && /up to 6/i.test(seven.error))
  for (const b of [5, {}, [1], [null], [['English']], true]) assert.equal(parseLanguages(b).ok, false, JSON.stringify(b))
})

// ---- the route -------------------------------------------------------------------------------------------------------------------------------

test('the signed-in tutor\'s list is saved on their own row as the clean list and not the typed text; the other tutor is untouched', async () => {
  const res = await post({ languages: 'english, SPANISH ; brazilian portuguese, english' })
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { languages: ['English', 'Spanish', 'Brazilian Portuguese'] })
  assert.deepEqual(row(A).languages, ['English', 'Spanish', 'Brazilian Portuguese'])
  assert.deepEqual(row(B).languages, ['German'], 'the other tutor is untouched')
  assert.equal((await post({ languages: ['French'] })).status, 200, 'a list is accepted too')
  assert.deepEqual(row(A).languages, ['French'])
  assert.equal((await post({ languages: '' })).status, 200)
  assert.deepEqual(row(A).languages, [], 'an empty text empties the list')
})

test('SERVER SIDE: every bad value is refused with a sentence and nothing is stored', async () => {
  row(A).languages = ['English']
  const bad = ['English 101', '<script>alert(1)</script>', `me${AT}example.com`, 'https://evil.example', 'a'.repeat(31), 'English, Spanish, French, German, Italian, Japanese, Korean']
  for (const languages of bad) {
    const res = await post({ languages })
    assert.equal(res.status, 400, languages)
    const body = await res.json() as { error: string }
    assert.ok(body.error.length > 10 && !/undefined|null/.test(body.error), languages)
    assert.deepEqual(row(A).languages, ['English'], `${languages}: the saved list did not change`)
  }
  for (const body of [{}, { languages: 5 }, { languages: null }, { languages: { a: 1 } }, { languages: [1, 2] }, { language: 'French' }, [], 'x', null]) {
    assert.equal((await post(body as never)).status, 400, JSON.stringify(body))
  }
  assert.equal((await post('{not json')).status, 400)
  assert.deepEqual(row(A).languages, ['English'])
})

test('SECOND TUTOR: B cannot write A\'s languages, however the body is worded; only the session\'s own row changes', async () => {
  session = { id: B, email: 'b@example.com' }
  const res = await post({ languages: 'Korean', tutorId: A, tutor_id: A, id: A, userId: A, user_id: A })
  assert.equal(res.status, 200)
  assert.deepEqual(row(B).languages, ['Korean'])
  assert.deepEqual(row(A).languages, [], 'A\'s row is untouched')
})

test('a visitor who is not signed in is refused (401) and nothing is stored or read', async () => {
  session = null
  assert.equal((await post({ languages: 'French' })).status, 401)
  assert.equal((await get()).status, 401)
  assert.deepEqual(row(A).languages, [])
  assert.deepEqual(row(B).languages, ['German'])
})

test('a call from another site is refused (403): the Origin must name this host', async () => {
  for (const headers of [{ origin: 'https://evil.example', host: 'www.tutafy.test' }, { host: 'www.tutafy.test' }, { origin: ORIGIN }, {}]) {
    assert.equal((await post({ languages: 'French' }, headers)).status, 403, JSON.stringify(headers))
  }
  assert.deepEqual(row(A).languages, [])
})

test('the read gives the tutor their own list, cleaned, and never another tutor\'s; stored garbage is cleaned on the way out', async () => {
  row(A).languages = ['english', ' ', 'English', 'x'.repeat(60), 'Spanish']
  const mine = await (await get()).json() as { languages: string[] }
  assert.ok(mine.languages.includes('English') && mine.languages.includes('Spanish') && mine.languages.filter(l => l === 'English').length === 1)
  assert.ok(mine.languages.every(l => l.length <= 30 && l.trim() !== ''))
  session = { id: B, email: 'b@example.com' }
  assert.deepEqual(await (await get()).json(), { languages: ['German'] })
})

test('a database failure answers 500 with no database text; a signed-in account with no tutor row cannot save (nothing is created)', async () => {
  dbError = { code: 'XX000', message: 'boom with a secret detail' }
  const res = await post({ languages: 'French' })
  assert.equal(res.status, 500)
  assert.doesNotMatch(JSON.stringify(await res.json()), /boom|secret/)
  dbError = null
  session = { id: '33333333-3333-4333-8333-333333333333', email: 'c@example.com' }
  assert.equal((await post({ languages: 'French' })).status, 500)
  assert.equal(db.tables.tutors.length, 2)
})

test('a body over 4 KB is refused before it is read, and the calls of one tutor are limited', async () => {
  assert.equal((await post({ languages: 'x'.repeat(5000) }, { ...HEADERS, 'content-length': '5000' })).status, 413)
  let last = 200
  for (let i = 0; i < 40 && last !== 429; i++) last = (await post({ languages: 'French' })).status
  assert.equal(last, 429, 'the 31st call in ten minutes is refused')
  session = { id: B, email: 'b@example.com' }
  assert.equal((await post({ languages: 'French' })).status, 200, 'the limit is per tutor')
})

// ---- the public effect and the field ----------------------------------------------------------------------------------------------------------

test('what the route saves is what the directory reads: the card carries the languages and the language filter lists them', async () => {
  await post({ languages: 'english, spanish' })
  const source = { slug: 'ana', name: 'Ana', bio: 'x'.repeat(100), avatar_url: null, languages: row(A).languages, timezone: 'UTC', average_rating: 0, review_count: 0, default_lesson_price: 20, currency: 'USD', trial_enabled: false, trial_price: null }
  const card = buildCard(source as never, [{ at: '2026-11-02T14:00:00Z', label: '', zone: 'UTC' } as never])!
  assert.deepEqual(card.languages, ['English', 'Spanish'])
  assert.deepEqual(languageCounts([card]).map(l => l.language), ['English', 'Spanish'])
})

test('the field is in Settings, Profile, labelled, with a status line a screen reader reads out, and checks the same rule in the browser before it sends', () => {
  const field = readFileSync(path.join(SRC, 'components/settings/LanguagesField.tsx'), 'utf8')
  const profile = readFileSync(path.join(SRC, 'components/settings/sections/ProfileSection.tsx'), 'utf8')
  assert.match(profile, /<LanguagesField \/>/)
  assert.match(field, /htmlFor="settings-languages"/)
  assert.match(field, /role="status" aria-live="polite"/)
  assert.match(field, /parseLanguages\(text\)/, 'the rule runs in the browser before anything is sent')
  assert.match(field, /fetch\('\/api\/tutors\/languages'/)
  assert.doesNotMatch(field, /dangerouslySetInnerHTML/)
})
