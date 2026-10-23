// T-0826 (G7): the account menu (View as student, Send feedback, Settings, Appearance, Sign out), Refer and earn with a table of the tutors
// you invited, API and webhooks, and Upgrade in the shared page head. The pure rules, the REAL referral and key routes over an in-memory
// Supabase with two tutors (a second tutor sees none of the first tutor's referrals or keys, and the list never carries an email, an id or a
// full name), and what makes the menu hold.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import { referredRow, shortName } from '@/lib/referral'
import { FeedbackButton } from '@/components/FeedbackButton'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

// ---- pure rules ------------------------------------------------------------------------------------------------------------

test('a referred tutor is shown as a first name and the first letter of the last name, a join date and whether they pay', () => {
  assert.equal(shortName('Anna Maria Lopez'), 'Anna L.')
  assert.equal(shortName('  anna   lopez '), 'anna L.')
  assert.equal(shortName('Madonna'), 'Madonna')
  assert.equal(shortName(''), 'A new tutor')
  assert.equal(shortName(null), 'A new tutor')
  assert.equal(shortName('X'.repeat(60) + ' Yang'), 'X'.repeat(20) + ' Y.')
  assert.deepEqual(referredRow({ name: 'Bo Chen', created_at: '2026-10-01T00:00:00Z', subscription_status: 'pro' }), { name: 'Bo C.', joined: '2026-10-01T00:00:00Z', paid: true })
  assert.equal(referredRow({ name: 'Bo', created_at: 'x', subscription_status: 'academy' }).paid, true)
  assert.equal(referredRow({ name: 'Bo', created_at: 'x', subscription_status: 'free' }).paid, false)
  assert.equal(referredRow({ name: 'Bo', created_at: 'x', subscription_status: null }).paid, false)
})

// ---- the real routes over an in-memory Supabase ----------------------------------------------------------------------------------

const A = 'a0000000-0000-4000-8000-00000000000a'
const B = 'a0000000-0000-4000-8000-00000000000b'
const FREE = 'a0000000-0000-4000-8000-0000000000f1'
let db: FakeDb
let session: { id: string } | null
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: { createAdminClient: () => db, createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: session } }) } }) },
})
const referral = await import('@/app/api/referral/route.ts')
const keys = await import('@/app/api/keys/route.ts')
const keyId = await import('@/app/api/keys/[id]/route.ts')

beforeEach(() => {
  db = createFakeDb({
    tutors: [
      { id: A, name: 'Alice Owner', slug: 'alice', referral_credits: 2, subscription_status: 'pro', email: 'alice.private@example.com' },
      { id: B, name: 'Bob Other', slug: 'bob', referral_credits: 0, subscription_status: 'pro', email: 'bob.private@example.com' },
      { id: FREE, name: 'Free Tutor', slug: 'free', referral_credits: 0, subscription_status: 'free', email: 'free@example.com' },
      { id: 'r1', name: 'Anna Maria Lopez', slug: 'anna', referred_by: A, created_at: '2026-10-02T00:00:00Z', subscription_status: 'pro', email: 'anna.secret@example.com' },
      { id: 'r2', name: 'Chen', slug: 'chen', referred_by: A, created_at: '2026-10-05T00:00:00Z', subscription_status: 'free', email: 'chen.secret@example.com' },
      { id: 'r3', name: 'Dora Banks', slug: 'dora', referred_by: B, created_at: '2026-10-06T00:00:00Z', subscription_status: 'pro', email: 'dora.secret@example.com' },
    ],
    api_keys: [
      { id: 'k-a', tutor_id: A, name: 'API key', key_prefix: 'tk_aaaa', key_hash: 'HASH-A', last_used_at: null, created_at: '2026-10-01T00:00:00Z' },
      { id: 'k-b', tutor_id: B, name: 'API key', key_prefix: 'tk_bbbb', key_hash: 'HASH-B', last_used_at: null, created_at: '2026-10-01T00:00:00Z' },
    ],
  })
  session = { id: A }
})
const status = <T extends { status: number }>(p: Promise<T>) => p.then(r => r.status)

test('referral route: the tutors you invited as short names, newest first, with no email, id or full name; the link and the counts are yours', async () => {
  const res = await referral.GET()
  assert.equal(res.status, 200)
  const text = JSON.stringify(await res.clone().json())
  const body = await res.json()
  assert.deepEqual(body.referred.map((r: { name: string }) => r.name), ['Chen', 'Anna L.'])
  assert.deepEqual(body.referred.map((r: { paid: boolean }) => r.paid), [false, true])
  assert.equal(body.referral_count, 2)
  assert.equal(body.credits, 2)
  assert.match(body.referral_link, /\/register\?ref=alice$/)
  for (const leak of ['secret@example.com', 'Maria', 'Lopez', 'r1', 'r2', 'Dora', 'HASH']) assert.ok(!text.includes(leak), `the answer leaks ${leak}`)
  assert.deepEqual(Object.keys(body.referred[0]).sort(), ['joined', 'name', 'paid'])
})

test('second tutor: sees only the tutors they invited; a tutor nobody invited through gets an empty table; no session is refused', async () => {
  session = { id: B }
  const b = await (await referral.GET()).json()
  assert.deepEqual(b.referred.map((r: { name: string }) => r.name), ['Dora B.'])
  assert.equal(b.referral_count, 1)
  session = { id: FREE }
  const f = await (await referral.GET()).json()
  assert.deepEqual(f.referred, [])
  assert.equal(f.referral_count, 0)
  session = null
  assert.equal(await status(referral.GET()), 401)
})

test('API keys: your own only, Pro only, and another tutor\'s key cannot be revoked; a key hash is never listed', async () => {
  const mine = await (await keys.GET()).json()
  assert.deepEqual(mine.keys.map((k: { id: string }) => k.id), ['k-a'])
  // the stand-in database ignores a column list, so the list route's own select is read: it names no hash
  assert.ok(read('src/app/api/keys/route.ts').includes(".select('id, name, key_prefix, last_used_at, created_at')"))
  assert.doesNotMatch(read('src/app/api/keys/route.ts').slice(0, read('src/app/api/keys/route.ts').indexOf('export async function POST')), /key_hash/)
  session = { id: B }
  await keyId.DELETE(new Request('http://x') as never, { params: Promise.resolve({ id: 'k-a' }) })
  assert.ok(db.tables.api_keys.some(k => k.id === 'k-a'), 'B revoked nothing of A\'s')
  await keyId.DELETE(new Request('http://x') as never, { params: Promise.resolve({ id: 'k-b' }) })
  assert.ok(!db.tables.api_keys.some(k => k.id === 'k-b'), 'their own can be revoked')
  session = { id: FREE }
  assert.equal(await status(keys.GET()), 403)
  assert.equal(await status(keys.POST(new Request('http://x', { method: 'POST', body: '{}' }))), 403)
  session = null
  assert.equal(await status(keys.GET()), 401)
})

// ---- the account menu and the pages ---------------------------------------------------------------------------------------------

test('the account menu holds View as student (only when told to), Send feedback, Settings, Appearance and Sign out; the top bar no longer has loose buttons for them', () => {
  const header = read('src/components/layout/Header.tsx')
  const menu = header.slice(header.indexOf('<DropdownMenuContent'), header.indexOf('</DropdownMenuContent>'))
  assert.match(menu, /\{canViewAsStudent && \([\s\S]*?View as student/)
  for (const must of ['Send feedback', 'Settings', 'Appearance', 'Sign out', 'feedback-menu-item', "'Light'", "'Dark'", "'Use system setting'"]) assert.ok(menu.includes(must), must)
  assert.match(menu, /onClick=\{handleSignOut\}/)
  const bar = header.slice(header.indexOf('<header className="dash-top"'), header.indexOf('<DropdownMenu>'))
  assert.doesNotMatch(bar, /View as student|<FeedbackButton|theme-toggle/)
  assert.match(header, /aria-checked=\{pref === value\}/, 'the chosen appearance is marked')
})

test('the feedback box can be opened from the menu: the button is optional and the box can be controlled', () => {
  assert.doesNotMatch(renderToStaticMarkup(createElement(FeedbackButton, { hideTrigger: true })), /data-testid="feedback-button"/)
  assert.match(renderToStaticMarkup(createElement(FeedbackButton, {})), /data-testid="feedback-button"/, 'the student page keeps its button')
  const src = read('src/components/FeedbackButton.tsx')
  assert.match(src, /const open = openProp \?\? innerOpen/)
  assert.match(src, /onOpenChange\?\.\(next\)/)
})

test('the pages sit in the shared head: Refer and earn, API and webhooks and Upgrade use dash-head, no width of their own, an error state for a failed read', () => {
  for (const f of ['src/app/(dashboard)/referral/page.tsx', 'src/app/(dashboard)/developers/DevelopersClient.tsx', 'src/app/(dashboard)/upgrade/page.tsx']) {
    const src = read(f)
    assert.match(src, /className="dash-head"/, f)
    assert.doesNotMatch(src, /max-w-\[|py-10 px-4|mx-auto/, f)
  }
  assert.match(read('src/app/(dashboard)/referral/page.tsx'), /data-testid="referral-error"/)
  assert.match(read('src/app/(dashboard)/referral/page.tsx'), /data-testid="referral-table"/)
  assert.match(read('src/app/(dashboard)/referral/page.tsx'), /data-testid="referral-empty"/)
  assert.match(read('src/app/(dashboard)/developers/DevelopersClient.tsx'), /data-testid="keys-error"/)
  assert.match(read('src/app/(dashboard)/upgrade/page.tsx'), /grid grid-cols-1 lg:grid-cols-3 gap-5 mb-12/, 'the plan cards are unchanged')
  assert.match(read('src/app/(dashboard)/developers/DevelopersClient.tsx'), /Copy your new API key now/)
})
