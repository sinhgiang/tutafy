// T-0774: the lists of tutor columns the public pages may read (src/lib/public-tutor-columns.ts) and the way the pages use them.
// The pages themselves, over a database that refuses a visitor, are in tests/public-tutor-reads.test.ts; the scan of all the code is in
// tests/public-tutor-scan.test.ts. Here: the lists are what they say they are, and every public page asks for its list and nothing else.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BOOKING_PAGE_COLUMNS, COLUMNS_BY_PAGE, EMBED_PAGE_COLUMNS, MEMBER_PAGE_COLUMNS, PAYMENT_COLUMNS, PRIVATE_TUTOR_COLUMNS, PROFILE_PAGE_COLUMNS,
  PUBLIC_TUTOR_COLUMNS, SITEMAP_COLUMNS, STUDENT_PAGE_COLUMNS, splitColumns,
} from '@/lib/public-tutor-columns.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').split('\r\n').join('\n')

const PUBLIC = new Set<string>([...PUBLIC_TUTOR_COLUMNS, ...PAYMENT_COLUMNS])

test('every list holds only public columns, each once, and no private column; the payment columns are on the booking pages only', () => {
  const booking = new Set<string>(['/book/[slug]', '/book/[slug]/[member]', '/embed/[slug]'])
  for (const [page, list] of Object.entries(COLUMNS_BY_PAGE)) {
    const cols = splitColumns(list)
    assert.equal(new Set(cols).size, cols.length, `${page}: a column twice`)
    for (const c of cols) {
      assert.ok(PUBLIC.has(c), `${page}: ${c} is not a public column`)
      assert.equal((PRIVATE_TUTOR_COLUMNS as readonly string[]).includes(c), false, `${page}: ${c} is private`)
      assert.notEqual(c, '*')
    }
    for (const c of PAYMENT_COLUMNS) assert.equal(cols.includes(c), booking.has(page), `${page}: ${c} ${booking.has(page) ? 'is shown where the student pays and signs' : 'does not belong on this page'}`)
  }
  assert.deepEqual(PUBLIC_TUTOR_COLUMNS.filter(c => (PRIVATE_TUTOR_COLUMNS as readonly string[]).includes(c)), [], 'a column cannot be both')
})

test('the private columns are the ones the exposure test (T-0767) found readable: nothing it lists as private is public here', () => {
  const exposure = read('tests/tutors-read-exposure.test.ts')
  const block = /const PRIVATE: Record<string, string> = \{([\s\S]*?)\n\}/.exec(exposure)![1]
  const found = [...block.matchAll(/^\s+([a-z_]+):/gm)].map(m => m[1])
  assert.ok(found.length >= 15, `read the list of the exposure test (${found.length})`)
  for (const c of found) {
    if ((PAYMENT_COLUMNS as readonly string[]).includes(c)) continue // shown to the student on the booking pages, on purpose; see the first test
    assert.equal(PUBLIC.has(c), false, `${c} was readable by a visitor and must not be a public column`)
  }
  for (const c of ['email', 'stripe_account_id', 'google_calendar_refresh_token', 'google_calendar_id', 'push_subscription', 'polar_subscription_id', 'polar_checkout_id', 'subscription_status', 'custom_domain']) {
    assert.ok((PRIVATE_TUTOR_COLUMNS as readonly string[]).includes(c), `${c} is in the private list`)
  }
})

test('a page that gives a tutor to loadPublicTutor needs the id and the flag in its list (the page-off rule reads them)', () => {
  for (const list of [BOOKING_PAGE_COLUMNS, MEMBER_PAGE_COLUMNS, EMBED_PAGE_COLUMNS, PROFILE_PAGE_COLUMNS]) {
    const cols = splitColumns(list)
    assert.ok(cols.includes('id') && cols.includes('booking_url_active'))
  }
  assert.equal(SITEMAP_COLUMNS, 'slug')
  assert.equal(STUDENT_PAGE_COLUMNS, 'id, name, avatar_url, slug')
})

test('each public page asks for its own list: loadPublicTutor is called with a *_COLUMNS name, never with a text of columns, never with *', () => {
  const pages: [string, string][] = [
    ['src/app/book/[slug]/page.tsx', 'BOOKING_PAGE_COLUMNS'], ['src/app/book/[slug]/[member]/page.tsx', 'MEMBER_PAGE_COLUMNS'],
    ['src/app/embed/[slug]/page.tsx', 'EMBED_PAGE_COLUMNS'], ['src/app/tutors/[slug]/page.tsx', 'PROFILE_PAGE_COLUMNS'],
  ]
  for (const [file, list] of pages) {
    const source = read(file).replace(/^\s*\/\/.*$/gm, '')
    const calls = [...source.matchAll(/loadPublicTutor\(((?:[^()]|\([^()]*\))*)\)/g)].map(m => m[1].split(',').map(s => s.trim()))
    assert.equal(calls.length, 1, `${file}: one call`)
    assert.equal(calls[0][2], list, `${file}: the third argument is ${list}`)
    assert.match(source, new RegExp(String.raw`import \{ ${list} \} from '@/lib/public-tutor-columns'`))
  }
  assert.match(read('src/app/student/dashboard/page.tsx'), /\.select\(STUDENT_PAGE_COLUMNS\)/)
})

test('no public page reads the tutor row with select(*) or with a text of columns typed in the page', () => {
  for (const file of ['src/app/book/[slug]/page.tsx', 'src/app/book/[slug]/[member]/page.tsx', 'src/app/embed/[slug]/page.tsx', 'src/app/tutors/[slug]/page.tsx', 'src/lib/public-tutor.ts']) {
    const source = read(file).replace(/^\s*\/\/.*$/gm, '')
    // (the weekly hours of the page are a public table and are read with select('*'); the tutor row never is)
    assert.doesNotMatch(source, /\.from\(['"]tutors['"]\)\s*\.select\(\s*['"`]/, `${file}: a text of columns, or *, typed in the page for the tutor row`)
  }
})

test('the admin client is never handed to the browser: the public pages give a client component the row, not the client', () => {
  for (const file of ['src/app/book/[slug]/page.tsx', 'src/app/book/[slug]/[member]/page.tsx', 'src/app/embed/[slug]/page.tsx']) {
    const source = read(file)
    assert.doesNotMatch(source, /<BookingForm[^>]*\badmin=/, file)
    assert.doesNotMatch(source, /<BookingForm[^>]*\bsupabase=/, file)
  }
})
