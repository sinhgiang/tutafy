// T-0704: a count in the project's status file is written as a [count: NAME=N] marker and checked against the code of the branch.
// Read tests/support/status-counts.ts first. This file: runs the check over the real status file when it can be found (on the
// agent's machine the Helme Brain sits beside the checkout; the pull request check on GitHub has no Brain, and says so), and proves
// the checker itself on fixtures: a wrong number is red, the right number is green, a bare count is red, another branch's entry is
// left alone, line numbers are those of the whole file, and the new list of units counts what the code has.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { COUNTED_LISTS, alternativesIn, currentCounts } from './support/counted-lists.ts'
import { bareCountProblems, currentBranch, entriesForBranch, entriesOf, findStatusFile, readStatusFile, statusCountProblems } from './support/status-counts.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

const real = await currentCounts()
const now = (name: string) => real.find(c => c.name === name)!.count!

// ---- the real status file, for the branch that is checked out ----------------------------------------------------------------

test('the [count: ...] markers in the status-file entries of this branch match the code of this branch', async t => {
  const file = findStatusFile()
  const branch = currentBranch()
  if (!file) { t.skip('no status file here: it lives in the Helme Brain, which the pull request check on GitHub does not have'); return }
  if (!branch) { t.skip('the branch cannot be told here'); return }
  const text = readStatusFile(file)
  assert.deepEqual(await statusCountProblems(text, branch, 'status file'), [], `entries of the status file that name ${branch}`)
})

// ---- the checker, on a status file written for the test --------------------------------------------------------------------------

const UNITS = now('LINE_REF_UNITS')
const FILES = now('TEST_FILES')
const STATUS = [
  '# Project', '', '## Done', '',
  `- T-0001 (first thing): done. Branch \`helme/first\`, commit abc.`,
  `  - The check has [count: LINE_REF_UNITS=${UNITS}] units and [count: TEST_FILES=${FILES}] test files.`,
  `- T-0002 (second thing): done. Branch \`helme/second\`, commit def.`,
  `  - Old numbers from a time the lists were shorter: [count: LINE_REF_UNITS=${UNITS - 2}] and [count: TEST_FILES=${FILES - 3}].`,
  `- T-0003 (third thing): done. Branches \`helme/first\` and \`helme/third\`.`,
  `  - Nothing counted here.`,
  '', '## Notes', '', '- A note that names `helme/first`: [count: TEST_FILES=1].',
].join('\n')

test('entries are the top-level items of the file, with the first and last line of each, and a heading ends one', () => {
  const e = entriesOf(STATUS)
  assert.deepEqual(e.map(x => [x.start, x.end]), [[5, 6], [7, 8], [9, 11], [14, 14]])
  assert.deepEqual(entriesForBranch(STATUS, 'helme/first').map(x => x.start), [5, 9, 14])
  assert.deepEqual(entriesForBranch(STATUS, 'helme/nothing'), [])
  assert.deepEqual(entriesForBranch(STATUS, 'helme/fir'), [], 'a branch name is matched whole, in backticks')
})

test('right counts pass; a wrong count turns red, naming the line of the whole file and both numbers; right again, it passes', async () => {
  assert.deepEqual(await statusCountProblems(STATUS.replace(/\n- A note.*$/, ''), 'helme/first', 'status', real), [])
  const wrong = STATUS.replace(`LINE_REF_UNITS=${UNITS}]`, `LINE_REF_UNITS=${UNITS - 2}]`)
  const problems = await statusCountProblems(wrong.replace(/\n- A note.*$/, ''), 'helme/first', 'status', real)
  assert.deepEqual(problems, [`status:6: [count: LINE_REF_UNITS=${UNITS - 2}] but the code has ${UNITS}`])
  // the same text with the number put back is green
  assert.deepEqual(await statusCountProblems(wrong.replace(/\n- A note.*$/, '').replace(`LINE_REF_UNITS=${UNITS - 2}]`, `LINE_REF_UNITS=${UNITS}]`), 'helme/first', 'status', real), [])
})

test('only the entries that name the checked branch are checked; another branch\'s old numbers do not fail this one', async () => {
  const text = STATUS.replace(/\n- A note.*$/, '')
  assert.deepEqual(await statusCountProblems(text, 'helme/first', 'status', real), [])
  const second = await statusCountProblems(text, 'helme/second', 'status', real)
  assert.deepEqual(second, [`status:8: [count: LINE_REF_UNITS=${UNITS - 2}] but the code has ${UNITS}`, `status:8: [count: TEST_FILES=${FILES - 3}] but the code has ${FILES}`])
  assert.deepEqual(await statusCountProblems(text, 'helme/third', 'status', real), [], 'an entry with nothing counted passes')
})

test('a note under another heading that names the branch is checked too; a marker that names no list, or is written wrongly, is reported', async () => {
  const withNote = await statusCountProblems(STATUS, 'helme/first', 'status', real)
  assert.deepEqual(withNote, [`status:14: [count: TEST_FILES=1] but the code has ${FILES}`])
  const bad = ['- T-9 `helme/x`: [count: NOT_A_LIST=3] and [count: test_files=2] and [count TEST_FILES=4].'].join('\n')
  const out = await statusCountProblems(bad, 'helme/x', 'status', real)
  assert.equal(out.length, 3)
  assert.ok(out.some(p => p.includes('names no list of tests/support/counted-lists.ts')))
  assert.equal(out.filter(p => p.includes('is not written as [count: NAME=N]')).length, 2)
})

test('a number written bare in front of the words of a counted list is reported, with the number to write; a marker on the line lets it stand', async () => {
  const bare = '- T-5 `helme/x`: the check reads 51 test files and 31 units, and 2 tệp test and 33 đơn vị.'
  const found = bareCountProblems(bare, 'status')
  assert.equal(found.length, 4)
  assert.ok(found.some(p => p.includes('[count: TEST_FILES=51]')) && found.some(p => p.includes('[count: LINE_REF_UNITS=33]')))
  assert.deepEqual(found.map(p => p.split(':')[1]), ['1', '1', '1', '1'])
  assert.deepEqual(bareCountProblems(`- T-5 \`helme/x\`: 51 test files, [count: TEST_FILES=51], and 3 units, [count: LINE_REF_UNITS=${UNITS}]`, 'status'), [], 'the marker for the list is on the line')
  for (const fine of ['the test files of the project', 'two test files were added', 'version 3 of the units list', '[count: TEST_FILES=51] test files', 'ran 805 tests', 'counts 7 files of src']) {
    assert.deepEqual(bareCountProblems(fine, 'status'), [], fine)
  }
  // and the whole check sees it, with the line of the whole file
  const text = ['# P', '', '## Done', '', '- T-5 `helme/x`: done.', '  - It reads 51 test files.'].join('\n')
  assert.deepEqual(await statusCountProblems(text, 'helme/x', 'status', real), ['status:6: "51 test files" counts a list but has no marker: write it as [count: TEST_FILES=51] (the number the code has now; npm run counts prints it)'])
})

test('MUTATION on the real status file: this branch\'s marker changed to a wrong number is red, put back it is green', async t => {
  const file = findStatusFile()
  const branch = currentBranch()
  // when there is no status file here (GitHub), the same is shown on the fixture
  const text = file && branch && /\[count: [A-Z_]+=\d+\]/.test(entriesForBranch(readStatusFile(file), branch).map(e => e.text).join('\n'))
    ? { text: readStatusFile(file), branch }
    : { text: STATUS.replace(/\n- A note.*$/, ''), branch: 'helme/first' }
  const entries = entriesForBranch(text.text, text.branch)
  const marker = entries.map(e => e.text).join('\n').match(/\[count: ([A-Z_]+)=(\d+)\]/)!
  const wrong = text.text.replace(marker[0], `[count: ${marker[1]}=${Number(marker[2]) + 1}]`)
  assert.notDeepEqual(await statusCountProblems(wrong, text.branch, 'status', real), [], 'a wrong number is red')
  assert.deepEqual(await statusCountProblems(wrong.replace(`[count: ${marker[1]}=${Number(marker[2]) + 1}]`, marker[0]), text.branch, 'status', real), [], 'put back, green')
  void t
})

// ---- the unit list ---------------------------------------------------------------------------------------------------------------

test('LINE_REF_UNITS counts the alternatives of the closed list UNIT in line-refs.ts, by reading it', () => {
  assert.ok(COUNTED_LISTS.LINE_REF_UNITS)
  const n = (src: string) => alternativesIn(src, 'UNIT')
  assert.equal(n("const UNIT = '(?:a|b|c)'"), 3)
  assert.equal(n("const UNIT = '(?:tests?|k[ýí] tự|chars?)'"), 3)
  assert.equal(n("const UNIT = '(?:a(?:b|c)|d)'"), 2, 'an alternation inside a group is one item')
  assert.equal(n("const UNIT = '(?:[|]x|y)'"), 2, 'a | inside brackets is a letter')
  assert.equal(n("const UNIT = '(?:a\\\\|b|c)'"), 2, 'an escaped | is a letter')
  assert.equal(n("const X = 1\nexport const UNIT = '(?:only)'"), 1)
  assert.throws(() => n('const OTHER = 1'), /no "const UNIT/)
  // the real list: counted by reading the real source, and equal to a count made another way
  const source = read('tests/support/line-refs.ts')
  const body = /const UNIT = '\(\?:(.*)\)'/.exec(source)![1]
  assert.equal(now('LINE_REF_UNITS'), body.split('|').length, 'the units listed in line-refs.ts (none of them holds a |)')
  assert.ok(now('LINE_REF_UNITS') > 30)
})

// ---- the way to run it by hand ---------------------------------------------------------------------------------------------------

test('`npm run counts -- <file> --branch <name>` exits 1 on a wrong or bare count of that branch and 0 on a right one, and ignores other branches', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'status-counts-'))
  const file = path.join(dir, 'status.md')
  const run = (...extra: string[]) => spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', '--import', './tests/register.mjs', 'tests/support/counts-cli.ts', file, ...extra], { cwd: ROOT, encoding: 'utf8' })
  const good = `- T-1 \`helme/a\`: [count: LINE_REF_UNITS=${UNITS}]\n- T-2 \`helme/b\`: [count: LINE_REF_UNITS=${UNITS - 1}]\n`
  writeFileSync(file, good)
  const ok = run('--branch', 'helme/a')
  assert.equal(ok.status, 0, ok.stdout + ok.stderr)
  assert.match(ok.stdout, /every \[count: \.\.\.\] marker of the 1 entries of .* that name helme\/a matches the code/)
  const other = run('--branch', 'helme/b')
  assert.equal(other.status, 1)
  assert.match(other.stdout, new RegExp(`status\\.md:2: \\[count: LINE_REF_UNITS=${UNITS - 1}\\] but the code has ${UNITS}`))
  assert.equal(run().status, 1, 'without --branch every marker of the file is checked')
  writeFileSync(file, `- T-1 \`helme/a\`: 51 test files.\n`)
  const bare = run('--branch', 'helme/a')
  assert.equal(bare.status, 1)
  assert.match(bare.stdout, /write it as \[count: TEST_FILES=51\]/)
  assert.equal(run('--branch').status, 2, '--branch with no name is refused')
})

// ---- what the convention says and where it is kept ---------------------------------------------------------------------------------

test('the feature map says how a count is written in a report and how it is checked, and package.json has the command', () => {
  const map = read('docs/feature-map.md')
  assert.match(map, /status file/i)
  assert.match(map, /--branch/)
  assert.match(map, /tests\/status-counts\.test\.ts/)
  assert.match(read('package.json'), /"counts": "[^\n]*counts-cli\.ts"/)
})
