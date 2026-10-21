// T-0646: a number that counts a list in the code is written as a [count: NAME=N] marker and checked against the code.
// The table is tests/support/counted-lists.ts (read its header first). What this file checks:
//   - the markers of the Markdown files in the repository (docs/, README.md) match the real counts;
//   - the counters count what they say (fixtures), and every list of the table can be counted in this checkout;
//   - the checks themselves: a wrong number, a name the table does not know, a marker written wrongly, and a file added to a
//     list without changing the number all turn them red;
//   - `npm run counts -- <file>` (the way to check the status file, which is outside this repository) really exits 1 on a wrong
//     marker and 0 on a right one.
// The status file of the project lives in the Helme Brain, outside the repository: npm test does not read it by default (it does
// not exist in another checkout, and it speaks about several branches at once). Set COUNTS_STATUS_FILE to a path to check it here too.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  COUNTED_LISTS, arrayLiteralLength, countMarkers, countProblems, currentCounts, markdownFiles, testsIn,
} from './support/counted-lists.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

// ---- the real markers ---------------------------------------------------------------------------------------------

test('every [count: ...] marker in the Markdown files of the repository matches the code', async () => {
  const files = markdownFiles()
  assert.ok(files.includes('docs/feature-map.md'))
  for (const f of files) assert.deepEqual(await countProblems(read(f), f), [], f)
})

test('the feature map explains the convention and carries markers for the lists the reviews found wrong', () => {
  const map = read('docs/feature-map.md')
  assert.ok(map.includes('[count: NAME=N]') && map.includes('npm run counts'))
  const named = new Set(countMarkers(map).map(m => m.name))
  for (const n of ['PUBLIC_PAGES', 'PUBLIC_TEXT_FILES', 'CLAIMS', 'PROMISES']) assert.ok(named.has(n), `docs/feature-map.md has no marker for ${n}`)
})

test('every list of the table can be counted here, to a whole number above zero', async () => {
  const counts = await currentCounts()
  assert.equal(counts.length, Object.keys(COUNTED_LISTS).length)
  for (const c of counts) {
    assert.equal(c.problem, undefined, `${c.name}: ${c.problem}`)
    assert.ok(Number.isInteger(c.count) && c.count! > 0, `${c.name} counted ${c.count}`)
  }
  for (const [name, list] of Object.entries(COUNTED_LISTS)) {
    assert.match(name, /^[A-Z][A-Z0-9_]*$/)
    assert.ok(existsSync(path.join(ROOT, list.file)), `${name}: ${list.file} is gone`)
  }
})

test('the status file is checked here when COUNTS_STATUS_FILE names it (it lives outside the repository, so it is opt in)', async () => {
  const file = process.env.COUNTS_STATUS_FILE
  if (!file) return
  assert.deepEqual(await countProblems(readFileSync(file, 'utf8'), file), [])
})

// ---- the counters ----------------------------------------------------------------------------------------------------

test('arrayLiteralLength counts the items of an array literal and nothing else', () => {
  const n = (src: string) => arrayLiteralLength(src, 'LIST')
  assert.equal(n('const LIST = []'), 0)
  assert.equal(n("const LIST = ['a']"), 1)
  assert.equal(n("const LIST = ['a', 'b',]"), 2)
  assert.equal(n("const LIST = [\n  'a',\n  'b',\n  'c',\n]\nconst OTHER = ['x']"), 3)
  assert.equal(n("const LIST = ['a, b', \"c]\", `d,[e`]"), 3, 'a comma or bracket inside a string is not an item')
  assert.equal(n("const LIST = [\n  // 'not an item',\n  'a', /* 'nor this', */\n  'b',\n]"), 2, 'comments are not items')
  assert.equal(n("const LIST: Row[] = [\n  { id: 'a', xs: [1, 2, 3] },\n  { id: 'b', xs: [] },\n  { id: 'c' },\n]"), 3, 'nested arrays and objects are one item each')
  assert.equal(n("export const LIST = [ 'a' ]\nconst LIST2 = ['b', 'c']"), 1, 'a longer name is another list')
  assert.throws(() => n('const OTHER = []'), /no "const LIST = \["/)
  assert.throws(() => n("const LIST = ['a'"), /not closed/)
})

test('testsIn counts the test( calls at the start of a line', () => {
  assert.equal(testsIn("test('a', () => {})\ntest('b', async () => {})\n  test('indented', () => {})\n// test('comment')\nconst x = 'test(y)'"), 2)
  assert.equal(testsIn("test.skip('a', () => {})\ntest('b', () => {})"), 2)
})

test('the counters agree with a second way of counting the same lists', () => {
  // the accessibility lists are read as text; count their quoted paths with a different method
  const src = read('tests/accessibility.test.ts')
  const block = (name: string) => src.split(`const ${name} = [`)[1].split('\n]')[0]
  assert.equal(arrayLiteralLength(src, 'PUBLIC_PAGES'), (block('PUBLIC_PAGES').match(/'src\/app\//g) ?? []).length)
  assert.equal(arrayLiteralLength(src, 'PUBLIC_TEXT_FILES'), (block('PUBLIC_TEXT_FILES').match(/'src\//g) ?? []).length)
  assert.equal(testsIn(src), read('tests/accessibility.test.ts').split('\n').filter(l => l.startsWith('test(')).length)
})

// ---- the checks themselves -----------------------------------------------------------------------------------------------

const fake = (counts: Record<string, number | null>) => Object.entries(counts).map(([name, count]) => ({ name, what: name, count, problem: count === null ? 'not counted here' : undefined }))

test('a marker with a different number than the code turns the check red, with the line and both numbers', async () => {
  const text = 'first line\nThe public files [count: PUBLIC_TEXT_FILES=18] no longer hold pale grey.\n'
  const found = await countProblems(text, 'status.md', fake({ PUBLIC_TEXT_FILES: 20 }))
  assert.deepEqual(found, ['status.md:2: [count: PUBLIC_TEXT_FILES=18] but the code has 20'])
  assert.deepEqual(await countProblems(text.replace('18', '20'), 'status.md', fake({ PUBLIC_TEXT_FILES: 20 })), [])
})

test('a marker that names a list the table does not have, or one that cannot be counted here, turns the check red', async () => {
  const unknown = await countProblems('[count: NO_SUCH_LIST=3]', 'x', fake({ PUBLIC_PAGES: 17 }))
  assert.ok(unknown.some(p => p.includes('names no list of tests/support/counted-lists.ts')), unknown.join())
  const missing = await countProblems('[count: CLAIMS=30]', 'x', fake({ CLAIMS: null }))
  assert.ok(missing.some(p => p.includes('cannot be checked here: not counted here')), missing.join())
})

test('a marker written the wrong way is reported, not skipped', async () => {
  for (const bad of ['[count: PUBLIC_PAGES]', '[count: PUBLIC_PAGES=]', '[count: PUBLIC_PAGES=seventeen]', '[count: public_pages=17]', '[count PUBLIC_PAGES=17]', '[count: PUBLIC_PAGES=17', '[count: PUBLIC_PAGES = 17.5]']) {
    const found = await countProblems(`17 pages ${bad} are public`, 'x', fake({ PUBLIC_PAGES: 17 }))
    assert.ok(found.some(p => p.includes('is not written as')), `not reported: ${bad} (${found.join()})`)
  }
  // spaces inside a good marker are fine, and the one example of the convention is not a marker
  assert.deepEqual(await countProblems('[count:  PUBLIC_PAGES = 17 ]', 'x', fake({ PUBLIC_PAGES: 17 })), [])
  assert.deepEqual(await countProblems('write [count: NAME=N] after each number', 'x', fake({})), [])
})

test('ordinary sentences with the word count are not markers', async () => {
  for (const s of ['The count of files is 20.', 'Do a word count: 20.', 'A [count] of nothing', 'accounts [x=1]', 'discount: 20']) {
    assert.deepEqual(await countProblems(s, 'x', fake({})), [], s)
  }
})

test('a file added to a list without changing the number turns the check red (the T-0638 mistake)', async () => {
  const map = read('docs/feature-map.md')
  const before = read('tests/accessibility.test.ts')
  const after = before.replace('const PUBLIC_TEXT_FILES = [\n', "const PUBLIC_TEXT_FILES = [\n  'src/app/added-later/page.tsx',\n")
  assert.notEqual(after, before, 'the list to change was not found')
  const real = await currentCounts()
  const grown = real.map(c => (c.name === 'PUBLIC_TEXT_FILES' ? { ...c, count: arrayLiteralLength(after, 'PUBLIC_TEXT_FILES') } : c))
  assert.equal(grown.find(c => c.name === 'PUBLIC_TEXT_FILES')!.count, real.find(c => c.name === 'PUBLIC_TEXT_FILES')!.count! + 1)
  assert.deepEqual(await countProblems(map, 'docs/feature-map.md', real), [], 'the real list matches the map')
  const found = await countProblems(map, 'docs/feature-map.md', grown)
  assert.ok(found.some(p => p.includes('PUBLIC_TEXT_FILES') && p.includes('but the code has')), found.join())
  // and a test added to a test file
  const moreTests = testsIn(`${before}\ntest('one more', () => {})\n`)
  assert.equal(moreTests, testsIn(before) + 1)
})

// ---- the command that checks any file ---------------------------------------------------------------------------------------

function runCounts(file: string) {
  return spawnSync(process.execPath, [
    '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
    '--import', './tests/register.mjs', 'tests/support/counts-cli.ts', file,
  ], { cwd: ROOT, encoding: 'utf8' })
}

test('npm run counts -- <file> exits 1 on a wrong marker and 0 on a right one (a copy of the status file is checked the same way)', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'tutafy-counts-'))
  const real = (await currentCounts()).find(c => c.name === 'PUBLIC_PAGES')!.count!
  const good = path.join(dir, 'good.md')
  const bad = path.join(dir, 'bad.md')
  writeFileSync(good, `- ${real} public pages [count: PUBLIC_PAGES=${real}]\n`)
  writeFileSync(bad, `- ${real - 1} public pages [count: PUBLIC_PAGES=${real - 1}]\n- one more [count: NO_SUCH_LIST=1]\n`)
  const ok = runCounts(good)
  assert.equal(ok.status, 0, ok.stdout + ok.stderr)
  assert.match(ok.stdout, /matches the code/)
  const wrong = runCounts(bad)
  assert.equal(wrong.status, 1, wrong.stdout + wrong.stderr)
  assert.match(wrong.stdout, new RegExp(`PUBLIC_PAGES=${real - 1}\\] but the code has ${real}`))
  assert.match(wrong.stdout, /NO_SUCH_LIST=1\] names no list/)
})

test('npm run counts is wired in package.json', () => {
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> }
  assert.match(pkg.scripts.counts, /tests\/support\/counts-cli\.ts/)
})
