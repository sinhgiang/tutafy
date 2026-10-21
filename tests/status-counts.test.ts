// T-0704: a count in the project's status file is written as a [count: NAME=N] marker and checked against the code of the branch.
// Read tests/support/status-counts.ts first. This file: runs the check over the real status file when it can be found (on the
// agent's machine the Helme Brain sits beside the checkout; the pull request check on GitHub has no Brain, and says so), and proves
// the checker itself on fixtures: a wrong number is red, the right number is green, a bare count is red, an entry that another
// branch OWNS (or that only mentions this branch as a target, a base, a "not touched") is left alone, line numbers are those of
// the whole file, and the two lists a sentence can mean by "đơn vị" are told apart.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { COUNTED_LISTS, alternativesIn, currentCounts } from './support/counted-lists.ts'
import { bareCountProblems, currentBranch, entriesForBranch, entriesOf, findStatusFile, ownerBranch, readStatusFile, statusCountProblems } from './support/status-counts.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

const real = await currentCounts()
const now = (name: string) => real.find(c => c.name === name)!.count!
const countOf = (name: string) => real.find(c => c.name === name)?.count ?? null

// ---- the real status file, for the branch that is checked out ----------------------------------------------------------------

test('the [count: ...] markers in the status-file entries of this branch match the code of this branch', async t => {
  const file = findStatusFile()
  const branch = currentBranch()
  if (!file) { t.skip('no status file here: it lives in the Helme Brain, which the pull request check on GitHub does not have'); return }
  if (!branch) { t.skip('the branch cannot be told here'); return }
  const text = readStatusFile(file)
  assert.deepEqual(await statusCountProblems(text, branch, 'status file'), [], `entries of the status file that ${branch} owns`)
})

// ---- the checker, on a status file written for the test --------------------------------------------------------------------------

const UNITS = now('LINE_REF_UNITS')
const FILES = now('TEST_FILES')
const STATUS = [
  '# Project', '', '## Done', '',
  `- T-0001 (first thing): done. Nhánh \`helme/first\`, commit abc.`,
  `  - The check has [count: LINE_REF_UNITS=${UNITS}] units and [count: TEST_FILES=${FILES}] test files.`,
  `- T-0002 (second thing): done. Nhánh \`helme/second\`, commit def.`,
  `  - Old numbers from a time the lists were shorter: [count: LINE_REF_UNITS=${UNITS - 2}] and [count: TEST_FILES=${FILES - 3}].`,
  `- T-0003 (third thing): done. Nhánh \`helme/third\` (tách từ \`helme/first\`, không đụng \`helme/second\`, đích \`master\`).`,
  `  - Nothing counted here.`,
  '', '## Notes', '', '- A note of the branch. Nhánh `helme/first`: [count: TEST_FILES=1].',
].join('\n')

test('entries are the top-level items of the file, with the first and last line of each, and a heading ends one', () => {
  const e = entriesOf(STATUS)
  assert.deepEqual(e.map(x => [x.start, x.end]), [[5, 6], [7, 8], [9, 11], [14, 14]])
  assert.deepEqual(entriesForBranch(STATUS, 'helme/first').map(x => x.start), [5, 14])
  assert.deepEqual(entriesForBranch(STATUS, 'helme/second').map(x => x.start), [7], 'T-0003 says "không đụng helme/second": not its entry')
  assert.deepEqual(entriesForBranch(STATUS, 'helme/third').map(x => x.start), [9], 'T-0003 is not helme/first\'s: it only says "tách từ helme/first"')
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

test('only the entries that the checked branch owns are checked; another branch\'s old numbers do not fail this one', async () => {
  const text = STATUS.replace(/\n- A note.*$/, '')
  assert.deepEqual(await statusCountProblems(text, 'helme/first', 'status', real), [])
  const second = await statusCountProblems(text, 'helme/second', 'status', real)
  assert.deepEqual(second, [`status:8: [count: LINE_REF_UNITS=${UNITS - 2}] but the code has ${UNITS}`, `status:8: [count: TEST_FILES=${FILES - 3}] but the code has ${FILES}`])
  assert.deepEqual(await statusCountProblems(text, 'helme/third', 'status', real), [], 'an entry with nothing counted passes')
})

test('a note under another heading that the branch owns is checked too; a marker that names no list, or is written wrongly, is reported', async () => {
  const withNote = await statusCountProblems(STATUS, 'helme/first', 'status', real)
  assert.deepEqual(withNote, [`status:14: [count: TEST_FILES=1] but the code has ${FILES}`])
  const bad = ['- T-9 Nhánh `helme/x`: [count: NOT_A_LIST=3] and [count: test_files=2] and [count TEST_FILES=4].'].join('\n')
  const out = await statusCountProblems(bad, 'helme/x', 'status', real)
  assert.equal(out.length, 3)
  assert.ok(out.some(p => p.includes('names no list of tests/support/counted-lists.ts')))
  assert.equal(out.filter(p => p.includes('is not written as [count: NAME=N]')).length, 2)
})

// ---- who owns an entry (review T-0704, point 1) -----------------------------------------------------------------------------------

// the first lines of entries of the real status file, as written (lines 37, 47, 73, 108, 138 and 153 on 21 Oct 2026): each one
// names `master` or another branch in backticks besides its own
const LINE_37 = '- T-0703 (một danh sách cụm chữ của luật đã bị thay, kiểm trong npm test và CI; thêm bước build vào CI): xong, đã gộp. Nhánh `helme/old-rule-wording` (tách từ `origin/master`), commit `24101e2` và commit ghép master `f9188e0`, đã đẩy; pull request #49 (https://github.com/sinhgiang/tutafy/pull/49, đã gộp vào `master`, commit gộp `0e3bfdb`).'
const LINE_47 = '- T-0699 (trang đầu của /admin thành "Khách hàng của tôi", Revenue đổi tên): xong, chờ Chief xem. Nhánh `helme/admin-my-customers` (tách từ `origin/master` sau khi pull request số 40 vào), commit `2886d00`, đã đẩy; pull request #44 (https://github.com/sinhgiang/tutafy/pull/44, đã gộp vào `master`, commit gộp `a9ca17b`).'
const LINE_73 = '- T-0700 (gia sư tự gõ độ dài buổi học riêng, Custom, chạy đủ mọi nơi): xong, chờ Chief xem. Nhánh `helme/custom-lesson-lengths` (xếp chồng trên `helme/profile-session-lengths` của T-0698), commit `097fcd8`, đã đẩy; pull request #41 (https://github.com/sinhgiang/tutafy/pull/41, base `helme/profile-session-lengths`): ĐÃ GỘP vào nhánh `helme/profile-session-lengths`.'
const LINE_138 = '- T-0686 (Tutafy: đổi người gửi thư, thêm bản chữ thuần, câu nhắc kiểm thư rác): xong, chờ Chief xem. Nhánh `helme/email-sender` (tách từ `origin/master` `cb30090`, không đụng `helme/updates-page`), commit `4050c68`, đã đẩy; pull request #37 đích `master` (https://github.com/sinhgiang/tutafy/pull/37).'
const LINE_153 = '- T-0683 (chủ ĐÃ DUYỆT bố cục hai cột; sửa MÀU và kiểu theo thương hiệu Tutafy): xong, chờ Chief xem. Cùng nhánh `helme/updates-page`, commit `c39c1c2`, đã đẩy; pull request #36 (https://github.com/sinhgiang/tutafy/pull/36) báo MERGEABLE.'
const owner = (line: string) => ownerBranch({ start: 1, end: 1, text: line })

test('an entry belongs to the branch its first line names after "Nhánh"; master, a target, a base and "không đụng" do not own it (the real lines 37, 47, 73, 108, 138, 153)', () => {
  assert.equal(owner(LINE_37), 'helme/old-rule-wording', 'line 37 says `origin/master` and `master`: neither owns it')
  assert.equal(owner(LINE_47), 'helme/admin-my-customers')
  assert.equal(owner(LINE_73), 'helme/custom-lesson-lengths', 'line 73 stacks on and merges into helme/profile-session-lengths: not its entry')
  assert.equal(owner(LINE_138), 'helme/email-sender', 'line 138 says "không đụng helme/updates-page": not its entry')
  assert.equal(owner(LINE_153), 'helme/updates-page', '"Cùng nhánh" names the branch too')
  for (const line of [LINE_37, LINE_47, LINE_73, LINE_138, LINE_153]) {
    for (const other of ['master', 'main', 'origin/master', 'helme/updates-page', 'helme/profile-session-lengths'].filter(b => b !== owner(line))) {
      assert.deepEqual(entriesForBranch(line, other), [], `${other} does not own: ${line.slice(0, 40)}`)
    }
  }
  // the words of context, one by one, in front of a branch that is NOT the owner
  for (const ctx of ['không đụng', 'tách từ', 'xếp chồng trên', 'đích', 'base']) {
    assert.equal(owner(`- T-1 (x): xong. Nhánh \`helme/own\`, ${ctx} \`helme/other\`.`), 'helme/own', ctx)
    assert.equal(owner(`- T-1 (x): xong. ${ctx} nhánh \`helme/other\`, không phải của mục này.`), null, `${ctx} nhánh: context, not the owner`)
  }
  // an entry with no "Nhánh" at all (a note, a read-only task) is owned by nobody
  assert.equal(owner('- T-0674 (kiểm thư; CHỈ ĐỌC): xong. Không nhánh, không commit; báo cáo `inbox/x.md`; đã gộp vào `master`.'), null)
  assert.equal(owner('- Branch `helme/en` is the English form.'), 'helme/en')
  // only the FIRST line of an entry names the owner; a later line that says "nhánh" does not
  assert.equal(ownerBranch({ start: 1, end: 2, text: '- T-1 (x): xong.\n  - Nhánh `helme/late` là chuyện khác.' }), null)
})

test('on master (or main) no entry is checked: "đích master", "đã gộp vào master" and the old right numbers of other tickets never turn it red', async () => {
  const sample = [
    '- T-0001 (a): xong. Nhánh `helme/a` (tách từ `origin/master`), pull request #1 đích `master`.',
    `  - Counted on helme/a when the list was shorter: [count: TEST_FILES=${FILES - 5}].`, '  - It reads 3 test files.',
    '- T-0002 (b): xong, đã gộp vào `master`.', `  - [count: LINE_REF_UNITS=1]`,
  ].join('\n')
  for (const branch of ['master', 'main', 'origin/master']) {
    assert.deepEqual(entriesForBranch(sample, branch), [], branch)
    assert.deepEqual(await statusCountProblems(sample, branch, 'status', real), [], `${branch} owns nothing, so nothing is wrong on it`)
  }
  // and the same sample IS red on the branch that owns the entry, so the green above is not a checker that sees nothing
  assert.equal((await statusCountProblems(sample, 'helme/a', 'status', real)).length, 2)
  // the real status file, when it is here: nothing is wrong for master, whatever the old numbers in it
  const file = findStatusFile()
  if (file) {
    const text = readStatusFile(file)
    for (const branch of ['master', 'main']) assert.deepEqual(await statusCountProblems(text, branch, 'status file'), [], `${branch} on the real status file`)
  }
})

test('a number written bare in front of the words of a counted list is reported, with the number to write; a marker on the line lets it stand', async () => {
  const bare = '- T-5 Nhánh `helme/x`: the check reads 51 test files and 31 units, and 2 tệp test and 33 đơn vị.'
  const found = bareCountProblems(bare, 'status')
  assert.equal(found.length, 4)
  assert.ok(found.some(p => p.includes('[count: TEST_FILES=51]')) && found.some(p => p.includes('[count: LINE_REF_UNITS=33]')) && found.some(p => p.includes('[count: LINE_REF_TEST_UNITS=33]')))
  assert.deepEqual(found.map(p => p.split(':')[1]), ['1', '1', '1', '1'])
  assert.deepEqual(bareCountProblems(`- T-5 Nhánh \`helme/x\`: 51 test files, [count: TEST_FILES=51], and 3 units, [count: LINE_REF_UNITS=${UNITS}]`, 'status'), [], 'the marker for the list is on the line')
  for (const fine of ['the test files of the project', 'two test files were added', 'version 3 of the units list', '[count: TEST_FILES=51] test files', 'ran 805 tests', 'counts 7 files of src']) {
    assert.deepEqual(bareCountProblems(fine, 'status'), [], fine)
  }
  // and the whole check sees it, with the line of the whole file
  const text = ['# P', '', '## Done', '', '- T-5 Nhánh `helme/x`: done.', '  - It reads 51 test files.'].join('\n')
  assert.deepEqual(await statusCountProblems(text, 'helme/x', 'status', real), ['status:6: "51 test files" counts a list but has no marker: write it as [count: TEST_FILES=51] (the number the code has now; npm run counts prints it)'])
})

// ---- "đơn vị" is two lists (review T-0704, point 2) ------------------------------------------------------------------------------

// the wrong sentence of the T-0684 report, as it was written ("31 đơn vị"), in the line it stands on in the status file
const T0684_SENTENCE = '  - ... và thêm từng đơn vị trong danh sách (hai câu cho mỗi đơn vị, 31 đơn vị). Mã đọc cũ (commit `830efab`) chạy cùng test: 2 test đỏ; mã mới: 20 qua.'

test('LINE_REF_TEST_UNITS counts the array of unit words that tests/line-refs.test.ts writes out, by reading it, and is not LINE_REF_UNITS', () => {
  assert.ok(COUNTED_LISTS.LINE_REF_TEST_UNITS)
  const src = read('tests/line-refs.test.ts')
  const literal = /\nconst TEST_UNIT_WORDS = (\[[^\n]*\])\n/.exec(src)![1]
  const words = new Function(`return ${literal}`)() as string[]
  assert.equal(now('LINE_REF_TEST_UNITS'), words.length, 'the array of the test, counted another way (evaluated)')
  assert.ok(src.includes('for (const unit of TEST_UNIT_WORDS)'), 'the test loop walks that very array')
  assert.notEqual(now('LINE_REF_TEST_UNITS'), now('LINE_REF_UNITS'), 'two different lists with two different lengths: the regular expression UNIT also has secs, mins, hours, mb, students, tutors')
  assert.ok(words.includes('test') && words.includes('%'))
})

test('the verbatim "31 đơn vị" of the T-0684 report is reported (it counts an array, not UNIT); the marker of the array passes, the old number is red', async () => {
  const tested = now('LINE_REF_TEST_UNITS')
  const text = `- T-0684 (x): xong. Nhánh \`helme/line-ref-check\`.\n${T0684_SENTENCE}`
  const bare = await statusCountProblems(text, 'helme/line-ref-check', 'status', real)
  assert.equal(bare.length, 1)
  assert.match(bare[0], /^status:2: "31 đơn vị" counts a list but has no marker: write it as \[count: LINE_REF_UNITS=31\] or \[count: LINE_REF_TEST_UNITS=31\]/)
  const fixed = text.replace('31 đơn vị', `[count: LINE_REF_TEST_UNITS=${tested}] đơn vị`)
  assert.deepEqual(await statusCountProblems(fixed, 'helme/line-ref-check', 'status', real), [])
  const stale = text.replace('31 đơn vị', '[count: LINE_REF_TEST_UNITS=31] đơn vị')
  assert.deepEqual(await statusCountProblems(stale, 'helme/line-ref-check', 'status', real), [`status:2: [count: LINE_REF_TEST_UNITS=31] but the code has ${tested}`], 'the number the report gave is not what the array has')
  // the same sentence given to the OTHER list is red too: the 39 of UNIT is not the 33 of the array
  const wrongList = text.replace('31 đơn vị', `[count: LINE_REF_UNITS=${tested}] đơn vị`)
  assert.deepEqual(await statusCountProblems(wrongList, 'helme/line-ref-check', 'status', real), [`status:2: [count: LINE_REF_UNITS=${tested}] but the code has ${UNITS}`])
  // and when the real status file is here, its T-0684 sentence is not bare any more
  const file = findStatusFile()
  if (file) {
    const real0684 = readStatusFile(file).split('\n').filter(l => /hai câu cho mỗi đơn vị/.test(l))
    for (const l of real0684) assert.deepEqual(bareCountProblems(l, 'status file'), [], 'the line of the T-0684 entry that talks about the units')
  }
})

// ---- the mutation -----------------------------------------------------------------------------------------------------------------

test('MUTATION on the real status file: a marker of an entry this branch owns, changed on its own line, is red on exactly that line; put back it is green', async () => {
  const file = findStatusFile()
  const branch = currentBranch()
  // the first marker, in an entry the branch owns, that is right today; when there is none here (GitHub), the same on the fixture
  const find = (text: string, br: string) => {
    for (const e of entriesForBranch(text, br)) {
      const lines = e.text.split('\n')
      for (let k = 0; k < lines.length; k++) {
        const m = /\[count: ([A-Z][A-Z0-9_]*)=(\d+)\]/.exec(lines[k])
        if (m && countOf(m[1]) === Number(m[2])) return { line: e.start + k, marker: m }
      }
    }
    return null
  }
  const realText = file && branch ? readStatusFile(file) : null
  const onReal = realText && branch ? find(realText, branch) : null
  const text = onReal ? realText! : STATUS.replace(/\n- A note.*$/, '')
  const br = onReal ? branch! : 'helme/first'
  const hit = onReal ?? find(text, br)!
  assert.ok(hit, 'a right marker to change')
  const [whole, name, n] = [hit.marker[0], hit.marker[1], Number(hit.marker[2])]
  const lines = text.split('\n')
  const baseline = await statusCountProblems(text, br, 'status', real)
  assert.deepEqual(baseline, [], 'right before the change')
  // change that one marker on its own line (not the first one anywhere in the file)
  lines[hit.line - 1] = lines[hit.line - 1].replace(whole, `[count: ${name}=${n + 1}]`)
  const after = await statusCountProblems(lines.join('\n'), br, 'status', real)
  assert.deepEqual(after, [`status:${hit.line}: [count: ${name}=${n + 1}] but the code has ${n}`], 'red, on the line that was changed and on no other')
  // put back
  lines[hit.line - 1] = lines[hit.line - 1].replace(`[count: ${name}=${n + 1}]`, whole)
  assert.deepEqual(await statusCountProblems(lines.join('\n'), br, 'status', real), [], 'put back, green')
  // the same text inside an entry that another branch owns, changed the same way, does not turn this branch red
  const other = `${text}\n- T-0099 (z): xong. Nhánh \`helme/elsewhere\`, đích \`master\`.\n  - [count: ${name}=${n + 7}]`
  assert.deepEqual(await statusCountProblems(other, br, 'status', real), [], 'another branch\'s entry is not looked at')
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
  const good = `- T-1 Nhánh \`helme/a\`: [count: LINE_REF_UNITS=${UNITS}]\n- T-2 Nhánh \`helme/b\`: [count: LINE_REF_UNITS=${UNITS - 1}]\n`
  writeFileSync(file, good)
  const ok = run('--branch', 'helme/a')
  assert.equal(ok.status, 0, ok.stdout + ok.stderr)
  assert.match(ok.stdout, /every \[count: \.\.\.\] marker of the 1 entries of .* that helme\/a owns matches the code/)
  const other = run('--branch', 'helme/b')
  assert.equal(other.status, 1)
  assert.match(other.stdout, new RegExp(`status\\.md:2: \\[count: LINE_REF_UNITS=${UNITS - 1}\\] but the code has ${UNITS}`))
  assert.equal(run().status, 1, 'without --branch every marker of the file is checked')
  writeFileSync(file, `- T-1 Nhánh \`helme/a\`: 51 test files.\n`)
  const bare = run('--branch', 'helme/a')
  assert.equal(bare.status, 1)
  assert.match(bare.stdout, /write it as \[count: TEST_FILES=51\]/)
  assert.equal(run('--branch').status, 2, '--branch with no name is refused')
  writeFileSync(file, `- T-1 Nhánh \`helme/a\` (đích \`master\`): [count: TEST_FILES=1]\n`)
  assert.equal(run('--branch', 'master').status, 0, 'master owns nothing, so the old number of helme/a is not its mistake')
})

// ---- what the convention says and where it is kept ---------------------------------------------------------------------------------

test('the feature map says how a count is written in a report and how it is checked, and package.json has the command', () => {
  const map = read('docs/feature-map.md')
  assert.match(map, /status file/i)
  assert.match(map, /--branch/)
  assert.match(map, /tests\/status-counts\.test\.ts/)
  assert.match(map, /owns?\b/, 'the map says an entry has ONE owning branch, named after "Nhánh"')
  assert.match(map, /\[count: LINE_REF_TEST_UNITS=\d+\]/, 'the map says that "đơn vị" is two lists')
  assert.match(read('package.json'), /"counts": "[^\n]*counts-cli\.ts"/)
})
