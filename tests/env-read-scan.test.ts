// T-0631: a claim of the kind "this variable is still read in these places" must come from
// a scan of all the code, not from the pages somebody remembered. Reviewers caught the same
// slip twice (lock status-claim-not-grepped: the T-0619 and T-0623 reports): a list that held
// the pages but not the API routes or the email code.
//
// For each variable that a constant has replaced, this test scans all of `src` and compares
// the files that still read it with an allow-list that gives a reason for every file. It runs
// in `npm test` (no GitHub Actions). A new file that reads the old variable fails the test and
// is named; so does a listed file that no longer reads it, or reads it on more lines.
//
// To use it for another variable: add an entry to REPLACED, with the list of files that still
// read it (run the test; the failure message names every file and its lines).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { findReaders, readerProblems, stripComments, type ReadAllowList } from './support/env-read-scan.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Why these still read NEXT_PUBLIC_APP_URL: T-0623 put ONE main address (SITE_URL, src/lib/site-url.ts) in
// everything a search engine reads (canonical, sitemap, robots, og:url, JSON-LD). The places below build links
// and return addresses for the signed-in app, emails and checkout; they keep the variable (with its own
// https://tutafy.com fallback) until the owner decides to move them. None of them is read by a crawler.
const NEXT_PUBLIC_APP_URL_READERS: ReadAllowList = {
  'src/app/(dashboard)/developers/page.tsx': { lines: 1, reason: 'the API base address shown to a signed-in tutor on the developers page' },
  'src/app/(dashboard)/messages/[studentId]/page.tsx': { lines: 1, reason: 'the student portal link a signed-in tutor copies from the messages page' },
  'src/app/(dashboard)/students/[id]/page.tsx': { lines: 1, reason: 'the student portal link a signed-in tutor copies from the student page' },
  'src/app/api/bookings/route.ts': { lines: 1, reason: 'the base of the links in the booking emails (BOM and spaces removed, see the comment above it)' },
  'src/app/api/referral/route.ts': { lines: 1, reason: 'the referral link a signed-in tutor shares' },
  'src/app/api/stripe/connect/onboard/route.ts': { lines: 1, reason: 'the return address of Stripe Connect onboarding when the request has no host' },
  'src/app/api/student/send-link/route.ts': { lines: 1, reason: 'the sign-in link in the email sent to a student' },
  'src/app/api/subscriptions/checkout/route.ts': { lines: 1, reason: 'the return address of the subscription checkout' },
  'src/lib/app-url.ts': { lines: 1, reason: 'originFromRequest: the answer when a request has no Host header (the host of the request is used first, then this, then SITE_URL)' },
  'src/lib/plans.ts': { lines: 1, reason: 'the success address of the plan checkout built from the plan helpers' },
}

/** Variables that something else has replaced, and who still reads them. Add an entry for the next one. */
const REPLACED: { name: string; replacedBy: string; replacedByFile: string; allow: ReadAllowList }[] = [
  { name: 'NEXT_PUBLIC_APP_URL', replacedBy: 'SITE_URL', replacedByFile: 'src/lib/site-url.ts', allow: NEXT_PUBLIC_APP_URL_READERS },
]

for (const { name, replacedBy, replacedByFile, allow } of REPLACED) {
  test(`${name} (replaced by ${replacedBy}): every file in src that still reads it is on the allow-list with a reason, and the list has nothing else`, () => {
    assert.match(readFileSync(path.join(ROOT, replacedByFile), 'utf8'), new RegExp(`export const ${replacedBy}\\b`), `${replacedBy} must exist in ${replacedByFile}`)
    const readers = findReaders(name, ROOT, ['src', 'next.config.ts'])
    assert.ok(readers.length > 0, 'the scan found no reader at all: it is broken, the variable is read in several files')
    assert.deepEqual(readerProblems(name, readers, allow), [])
  })

  test(`${name}: the files the scan lists include the kinds a hand-made list forgot (API routes, email code, helpers, pages)`, () => {
    const files = findReaders(name, ROOT, ['src']).map(r => r.file)
    assert.ok(files.some(f => f.startsWith('src/app/api/')), 'an API route')
    assert.ok(files.some(f => f.startsWith('src/lib/')), 'a helper in src/lib')
    assert.ok(files.some(f => /\/page\.tsx$/.test(f)), 'a page')
    assert.ok(!files.includes('src/lib/site-url.ts'), 'a file that only mentions it in a comment is not a reader')
  })
}

// ---- the scan itself: negative and edge cases on a throwaway tree ---------------------------

function tree(files: Record<string, string>) {
  const root = mkdtempSync(path.join(tmpdir(), 'env-scan-'))
  for (const [rel, text] of Object.entries(files)) {
    const abs = path.join(root, rel)
    mkdirSync(path.dirname(abs), { recursive: true })
    writeFileSync(abs, text)
  }
  return { root, done: () => rmSync(root, { recursive: true, force: true }) }
}

const VAR = 'SOME_OLD_URL'
const allowA: ReadAllowList = { 'src/a.ts': { lines: 1, reason: 'a made-up reason that is long enough' } }

test('a new file that reads the old variable makes the check fail and names the file; taking it away makes it pass', () => {
  const t = tree({ 'src/a.ts': `const u = process.env.${VAR}\n`, 'src/ok.ts': 'export const x = 1\n' })
  try {
    assert.deepEqual(readerProblems(VAR, findReaders(VAR, t.root), allowA), [], 'before: only the listed file')
    mkdirSync(path.join(t.root, 'src/app/api/new'), { recursive: true })
    writeFileSync(path.join(t.root, 'src/app/api/new/route.ts'), `export const base = process.env.${VAR} ?? 'x'\n`)
    const problems = readerProblems(VAR, findReaders(VAR, t.root), allowA)
    assert.equal(problems.length, 1)
    assert.match(problems[0], /src\/app\/api\/new\/route\.ts/, 'the message names the file')
    assert.match(problems[0], /line 1/)
    rmSync(path.join(t.root, 'src/app/api/new'), { recursive: true })
    assert.deepEqual(readerProblems(VAR, findReaders(VAR, t.root), allowA), [], 'after: the file is gone, the check passes')
  } finally { t.done() }
})

test('a listed file that reads it on more lines, or no longer at all, or has no real reason, fails too', () => {
  const t = tree({ 'src/a.ts': `const u = process.env.${VAR}\nconst v = process.env.${VAR}\n` })
  try {
    const more = readerProblems(VAR, findReaders(VAR, t.root), allowA)
    assert.equal(more.length, 1)
    assert.match(more[0], /src\/a\.ts reads .* on 2 line/)
    writeFileSync(path.join(t.root, 'src/a.ts'), 'export const none = 1\n')
    const gone = readerProblems(VAR, findReaders(VAR, t.root), allowA)
    assert.equal(gone.length, 1)
    assert.match(gone[0], /src\/a\.ts is on the allow-list but no longer reads/)
    writeFileSync(path.join(t.root, 'src/a.ts'), `const u = process.env.${VAR}\n`)
    const noReason = readerProblems(VAR, findReaders(VAR, t.root), { 'src/a.ts': { lines: 1, reason: 'todo' } })
    assert.equal(noReason.length, 1)
    assert.match(noReason[0], /needs a reason/)
  } finally { t.done() }
})

test('the scan finds every way of reading a variable and skips what is not one', () => {
  const t = tree({
    'src/dot.ts': `const a = process.env.${VAR}\n`,
    'src/bracket.ts': `const a = process.env['${VAR}']\n`,
    'src/destructure.ts': `const { ${VAR} } = process.env\n`,
    'src/template.tsx': 'const a = `${process.env.' + VAR + '}/x`\n',
    'src/after-url.ts': `const a = 'https://x.example'; const b = process.env.${VAR}\n`,
    'src/after-regex.ts': `const r = /['"]/g; const b = process.env.${VAR}\n`,
    'src/jsx.tsx': `export default function P() { return <a href={process.env.${VAR}}>x</a> }\n`,
    'src/comment-only.ts': `// ${VAR} is not read here\n/* ${VAR}\n   again */\nexport const x = 1\n`,
    'src/in-string-comment.ts': `const url = 'http://example.com' // ${VAR} in a trailing comment\n`,
    'src/longer-name.ts': `const a = process.env.${VAR}_OTHER\nconst b = process.env.MY_${VAR}\n`,
    'next.config.ts': `export default { env: process.env.${VAR} }\n`,
    'node_modules/x/index.js': `process.env.${VAR}\n`,
    'src/notes.md': `${VAR}\n`,
  })
  try {
    const found = findReaders(VAR, t.root, ['src', 'next.config.ts']).map(r => r.file)
    assert.deepEqual(found, ['next.config.ts', 'src/after-regex.ts', 'src/after-url.ts', 'src/bracket.ts', 'src/destructure.ts', 'src/dot.ts', 'src/jsx.tsx', 'src/template.tsx'])
  } finally { t.done() }
})

test('stripComments keeps line numbers and does not mistake a // in a string or a quote in a regular expression for the real thing', () => {
  const src = [
    "const a = 'http://x.example/path' // trailing",
    '/* block',
    '   comment */',
    "const b = /'+/g",
    'const c = `https://y.example/${d}` // tail',
    'const e = 1 / 2 // a division, then a comment',
  ].join('\n')
  const out = stripComments(src)
  assert.equal(out.split('\n').length, src.split('\n').length)
  assert.match(out, /http:\/\/x\.example\/path/)
  assert.doesNotMatch(out, /trailing|comment \*\//)
  assert.match(out, /const b = \/'\+\/g/)
  assert.match(out, /https:\/\/y\.example\/\$\{d\}/)
  assert.doesNotMatch(out, /tail|a division/)
})
