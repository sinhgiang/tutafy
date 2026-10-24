// T-0735: the Reviewer caught the same mistake twice (key absolute-comment-claim; reports of T-0703 and T-0724): a comment or a document said a filter blocks
// "made-up addresses" in general, while the pattern blocked only some endings, and a test said another example ending (.example) could be mailed.
// Here the pattern is PROBED with the endings people really use, the comment above it must list what it blocks and what it does not, and the two must agree;
// a comment or a document line that says "all" or "every" about a filter of made-up addresses without pointing at the list is refused.
// The self-checks feed the check the wrong sentence of the review, and mutations of the right one, and every one of them must come back red.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PROBES, absoluteClaimLines, blockedEndings, docLineProblems, filterProblems, findAddressFilters } from './support/address-claims.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (r: string) => readFileSync(path.join(ROOT, r), 'utf8')
function filesUnder(dir: string, test: (f: string) => boolean): string[] {
  return readdirSync(path.join(ROOT, dir)).flatMap(n => {
    const r = `${dir}/${n}`
    return statSync(path.join(ROOT, r)).isDirectory() ? filesUnder(r, test) : test(r) ? [r] : []
  })
}
const sourceFiles = () => filesUnder('src', f => /\.(ts|tsx)$/.test(f))
const docFiles = () => ['docs/welcome-emails.md', 'docs/feature-map.md', 'README.md', 'CLAUDE.md', 'AGENTS.md'].filter(f => { try { statSync(path.join(ROOT, f)); return true } catch { return false } })

const WELCOME = 'src/lib/welcome-series.ts'
const welcomeFilter = () => {
  const found = findAddressFilters(read(WELCOME), WELCOME).find(f => f.name === 'TEST_DOMAIN')
  assert.ok(found, 'the scanner finds the real TEST_DOMAIN pattern')
  return found
}

// ---- the real code ---------------------------------------------------------------------------------------------------------------

test('the probe: which realistic endings the real made-up-address filter blocks, measured on the real pattern', () => {
  const f = welcomeFilter()
  const table = Object.fromEntries(PROBES.map(p => [p, blockedEndings(f.pattern).includes(p)]))
  assert.deepEqual(table, { 'example.com': true, 'example.org': true, 'example.net': true, '.test': true, '.invalid': true, '.localhost': true, '.example': false, '.local': false })
})

test('every address filter in src has a comment that lists exactly what its pattern blocks and what it lets through', () => {
  const all = sourceFiles().flatMap(f => findAddressFilters(read(f), f))
  assert.ok(all.length >= 1, 'the scan found at least the welcome series filter (it is not looking at nothing)')
  assert.deepEqual(all.flatMap(filterProblems), [])
})

test('no comment in src and no line of the documents says a filter covers ALL made-up addresses without pointing at the list', () => {
  const lines = [...sourceFiles(), ...docFiles()].flatMap(f => absoluteClaimLines(read(f), f))
  assert.deepEqual(lines.map(l => `${l.file}:${l.line}: ${l.text}`), [])
})

test('the documents that say made-up addresses are left out name every blocked ending, or point at TEST_DOMAIN', () => {
  const blocked = blockedEndings(welcomeFilter().pattern)
  assert.deepEqual(docFiles().flatMap(f => docLineProblems(read(f), f, blocked)), [])
  assert.match(read('docs/welcome-emails.md'), /\.example and \.local\) are NOT filtered/, 'the document says out loud what is let through')
})

test('the welcome series test and the filter agree about .example: the address the test says is mailable is one the comment says is NOT blocked', () => {
  const f = welcomeFilter()
  assert.match(f.comment, /Not blocked: .*\.example/)
  assert.match(read('tests/welcome-series.test.ts'), /'maria@school\.example'/)
  assert.equal(f.pattern.test('maria@school.example'), false)
})

// ---- the check itself: the wrong sentence of the review, and mutations of the right one ----------------------------------------------

const REAL = () => readFileSync(path.join(ROOT, WELCOME), 'utf8').replace(/\r\n/g, '\n')
const withComment = (comment: string) => REAL().replace(/\/\*\*[\s\S]*?\*\/\nconst TEST_DOMAIN/, `${comment}\nconst TEST_DOMAIN`)
const problemsOf = (text: string) => findAddressFilters(text, WELCOME).filter(f => f.name === 'TEST_DOMAIN').flatMap(filterProblems)

test('SELF-CHECK: the real comment passes', () => {
  assert.deepEqual(problemsOf(REAL()), [])
})

test('SELF-CHECK: the sentence the Reviewer caught (a one-line "never mailed" claim with no list) is refused', () => {
  const wrong = problemsOf(withComment('/** Addresses that are made up (examples, tests): never mailed. */'))
  assert.equal(wrong.length, 1)
  assert.match(wrong[0], /does not list the endings the pattern blocks/)
  assert.match(wrong[0], /example\.com, example\.org, example\.net, \.test, \.invalid, \.localhost/, 'and it says what the pattern really blocks')
})

test('SELF-CHECK: a comment that says .example is blocked (the review\'s exact case) is refused', () => {
  const p = problemsOf(withComment('/**\n * Blocked: example.com, example.org, example.net, .test, .invalid, .localhost, .example\n * Not blocked: .local\n */'))
  assert.deepEqual(p.map(x => x.replace(/^.*?: /, '')), ['the comment says .example is blocked but the pattern lets it through', 'the pattern lets .example through but the comment does not say "Not blocked: .example"'])
})

test('SELF-CHECK: a list that forgets an ending the pattern blocks, or forgets to say what it lets through, is refused', () => {
  assert.deepEqual(problemsOf(withComment('/**\n * Blocked: example.com, example.org, .test, .invalid, .localhost\n * Not blocked: .example, .local\n */')).map(x => x.replace(/^.*?: /, '')), ['the pattern blocks example.net but the comment does not say so'])
  assert.deepEqual(problemsOf(withComment('/**\n * Blocked: example.com, example.org, example.net, .test, .invalid, .localhost\n * Not blocked: .example\n */')).map(x => x.replace(/^.*?: /, '')), ['the pattern lets .local through but the comment does not say "Not blocked: .local"'])
  assert.deepEqual(problemsOf(withComment('/**\n * Blocked: example.com, example.org, example.net, .test, .invalid, .localhost\n * Not blocked: .example, .local, .test\n */')).map(x => x.replace(/^.*?: /, '')), ['the comment says .test is not blocked but the pattern blocks it'])
})

test('SELF-CHECK: undoing the fix the other way, the pattern changed (it now blocks .example) while the comment stays, is refused', () => {
  const widened = REAL().replace('example\\.(?:com|org|net)', 'example(?:\\.(?:com|org|net))?')
  assert.notEqual(widened, REAL(), 'the mutation changed the pattern')
  assert.deepEqual(problemsOf(widened).map(x => x.replace(/^.*?: /, '')), ['the pattern blocks .example but the comment does not say so', 'the comment says .example is not blocked but the pattern blocks it'])
  const narrowed = REAL().replace('|[a-z0-9-]+\\.test', '')
  assert.notEqual(narrowed, REAL())
  assert.deepEqual(problemsOf(narrowed).map(x => x.replace(/^.*?: /, '')), ['the comment says .test is blocked but the pattern lets it through', 'the pattern lets .test through but the comment does not say "Not blocked: .test"'])
})

test('SELF-CHECK: a comment that names an ending no probe tests is refused (so every claimed ending is measured)', () => {
  const p = problemsOf(withComment('/**\n * Blocked: example.com, example.org, example.net, .test, .invalid, .localhost, .internal\n * Not blocked: .example, .local\n */'))
  assert.deepEqual(p.map(x => x.replace(/^.*?: /, '')), ['the comment names .internal, which no probe tests (add it to PROBES in tests/support/address-claims.ts)'])
})

test('SELF-CHECK: an absolute sentence about a filter of made-up addresses is refused, in a comment and in a document, unless it points at the list', () => {
  const bad = [
    '// The filter blocks all made-up addresses.',
    ' * Every fake or example address is refused here.',
    '/** Skips any example domain, so no test address is ever mailed. */',
  ]
  for (const line of bad) assert.equal(absoluteClaimLines(line, 'src/x.ts').length, 1, line)
  assert.equal(absoluteClaimLines('The filter blocks every made-up address.', 'docs/x.md').length, 1)
  // the same sentences pointing at the list are fine
  for (const line of ['// The filter blocks all made-up addresses listed under Blocked: below.', '// TEST_DOMAIN blocks every made-up address of the list.']) assert.equal(absoluteClaimLines(line, 'src/x.ts').length, 0, line)
  // plain code is never read as a claim
  assert.equal(absoluteClaimLines('const msg = "we block all made-up addresses"', 'src/x.ts').length, 0)
})

test('SELF-CHECK: ordinary sentences with the same words are not mistaken for a claim', () => {
  const fine = [
    '// every test address in this file uses example.com',
    '// Any made-up email in a fixture is written as ten@example.com.',
    '// All fake data stays in memory.',
    '// the filter blocks the day-two mail until the tutor has a lesson',
    '// tests use made-up addresses and the series never sends anything',
    '// Blocks all lessons that overlap a break.',
  ]
  for (const line of fine) assert.equal(absoluteClaimLines(line, 'src/x.ts').length, 0, line)
})

test('SELF-CHECK: the sentence of the old document, "not a made-up example.com or .test address", is refused; the fixed sentence passes', () => {
  const blocked = blockedEndings(welcomeFilter().pattern)
  const old = '2. The address is a real, plain address (not a made-up `example.com` or `.test` address) and has **not unsubscribed**.'
  const p = docLineProblems(old, 'docs/welcome-emails.md', blocked)
  assert.equal(p.length, 1)
  assert.match(p[0], /does not name example\.org, example\.net, \.invalid, \.localhost/)
  const fixed = read('docs/welcome-emails.md').split('\n').find(l => /TEST_DOMAIN/.test(l) && /made-up/.test(l))
  assert.ok(fixed)
  assert.deepEqual(docLineProblems(fixed, 'docs/welcome-emails.md', blocked), [])
  assert.deepEqual(docLineProblems('A made-up address with a long list: example.com, example.org, example.net, .test, .invalid, .localhost are never mailed.', 'x.md', blocked), [])
})

test('SELF-CHECK: a filter pattern with no comment at all is refused, and a pattern that is not about made-up endings is left alone', () => {
  const bare = 'const FAKE_ADDRESS = /@example\\.com$/i\n'
  const [f] = findAddressFilters(bare, 'src/x.ts')
  assert.equal(filterProblems(f).length, 1)
  assert.deepEqual(findAddressFilters('const PLAIN = /^[a-z]+@[a-z]+\\.[a-z]+$/i\n', 'src/x.ts'), [], 'no made-up ending in it')
  assert.deepEqual(findAddressFilters('const SLUG = /^[a-z0-9-]+$/\n', 'src/x.ts'), [], 'no @ in it')
})

test('the example endings used in tests of the project are written as the project rule says (no real address)', () => {
  const text = read('tests/absolute-claims.test.ts') + read('tests/support/address-claims.ts')
  const real = [...text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/g)].map(m => m[0]).filter(a => !/@(school|mail|example)\.(example|test|com|org|net)$|@example\./.test(a) && !/@mail\./.test(a))
  assert.deepEqual(real, [])
})
