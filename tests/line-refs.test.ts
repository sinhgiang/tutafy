// T-0684: a line citation ("file dòng N-M", "file:N-M") must not point past the end of its file.
// The table of rules is tests/support/line-refs.ts (read its header first). What this file checks:
//   - the citations of the Markdown files of the repository (README.md, docs/, the files in the root) are inside their files;
//   - the reader finds every form of citation the reports use, and leaves URLs, plain numbers and prose alone;
//   - the check itself: a citation past the end, a reversed range, line 0 turn it red, a corrected citation turns it green, a
//     file longer on another branch is not a mistake, a file that is not here is listed and not a failure;
//   - `npm run line-refs -- <file>` (the way to check the status file, which is outside this repository) exits 1 and 0 as it should;
//   - the pull request workflow exists, starts on pull requests and runs the type check, the tests and this check.
// The status file of the project lives in the Helme Brain, outside the repository: npm test does not read it by default (it does
// not exist in another checkout). Set LINE_REFS_STATUS_FILE to a path to check it here too.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  ROOT, lineCount, lineRefProblems, lineRefReport, lineRefsIn, markdownFilesToCheck, realLookup, type Lookup,
} from './support/line-refs.ts'

const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

/** A made-up checkout: file path -> number of lines. */
const fake = (files: Record<string, number>, elsewhere?: Record<string, number[]>): Lookup => ({
  here: file => Object.entries(files).filter(([p]) => p === file || p.endsWith(`/${file}`)).map(([p, lines]) => ({ path: p, lines })),
  elsewhere: elsewhere ? rel => elsewhere[rel] ?? [] : undefined,
})

// ---- the real files -----------------------------------------------------------------------------------------------

test('every line citation in the Markdown files of the repository is inside its file', () => {
  const files = markdownFilesToCheck()
  assert.ok(files.includes('docs/feature-map.md'))
  for (const f of files) assert.deepEqual(lineRefProblems(read(f), f), [], f)
})

test('the status file, when LINE_REFS_STATUS_FILE names it, has no citation past the end of its file', { skip: !process.env.LINE_REFS_STATUS_FILE }, () => {
  const file = process.env.LINE_REFS_STATUS_FILE!
  assert.ok(existsSync(file), `${file} does not exist`)
  const report = lineRefReport(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), file, realLookup(true))
  assert.ok(report.checked > 0, 'no citation was found in the status file')
  assert.deepEqual(report.problems, [])
})

// ---- the reader ---------------------------------------------------------------------------------------------------

test('the reader finds every form of citation the reports use', () => {
  const text = [
    'The function is in `src/lib/role-switch.ts` dòng 73-82 and it checks.',
    'See src/app/api/bookings/route.ts:211-278 for the rest.',
    'Single: `src/lib/updates.ts` dòng 121, and also tests/email.test.ts:5.',
    'Brackets and parens: `src/app/(dashboard)/settings/page.tsx` dòng 458-466, `src/app/book/[slug]/BookingForm.tsx:180–185`.',
    'English: src/lib/blog.ts line 12 and src/lib/blog.ts lines 3-9.',
    'A bare name: StudentForm.tsx dòng 33 and (`settings/page.tsx`, dòng 170).',
    'Written with the closing tick before the colon: `src/lib/email-config.ts`:65',
    'Em dash: docs/feature-map.md:8—9',
  ].join('\n')
  assert.deepEqual(
    lineRefsIn(text).map(r => [r.file, r.from, r.to, r.line]),
    [
      ['src/lib/role-switch.ts', 73, 82, 1],
      ['src/app/api/bookings/route.ts', 211, 278, 2],
      ['src/lib/updates.ts', 121, 121, 3],
      ['tests/email.test.ts', 5, 5, 3],
      ['src/app/(dashboard)/settings/page.tsx', 458, 466, 4],
      ['src/app/book/[slug]/BookingForm.tsx', 180, 185, 4],
      ['src/lib/blog.ts', 12, 12, 5],
      ['src/lib/blog.ts', 3, 9, 5],
      ['StudentForm.tsx', 33, 33, 6],
      ['settings/page.tsx', 170, 170, 6],
      ['src/lib/email-config.ts', 65, 65, 7],
      ['docs/feature-map.md', 8, 9, 8],
    ],
  )
})

test('the reader leaves alone what is not a citation: URLs, plain numbers, versions, a path with no line', () => {
  const text = [
    'See https://example.com/a/b.ts:12 and http://localhost:3000/x.json:9.',
    'The file src/lib/x.ts has 120 lines and a path src/lib/y.ts is mentioned with no number.',
    'Version v1.2.3 at line 40 of the log, port :8080, time 12:30-13:45, file.ts then 12-30.',
    'Prose: lines 3-9 of nothing, dòng 33 of the page.',
    'Not source: image.png:4-5 and notes.docx dòng 3.',
  ].join('\n')
  assert.deepEqual(lineRefsIn(text), [])
})

test('lineCount: a closing newline does not start another line, CRLF is one line break', () => {
  assert.deepEqual(['', 'a', 'a\n', 'a\nb', 'a\nb\n', '\n'].map(lineCount), [0, 1, 1, 2, 2, 1])
})

// ---- the check ----------------------------------------------------------------------------------------------------

test('a citation past the end of its file is wrong; the corrected citation is right', () => {
  const files = { 'src/lib/role-switch.ts': 82 }
  const wrong = lineRefProblems('the check is in `src/lib/role-switch.ts` dòng 73-84', 'status.md', fake(files))
  assert.equal(wrong.length, 1)
  assert.match(wrong[0], /^status\.md:1: .*cites lines 73-84 but src\/lib\/role-switch\.ts has only 82 lines/)
  assert.deepEqual(lineRefProblems('the check is in `src/lib/role-switch.ts` dòng 73-82', 'status.md', fake(files)), [])
  // the same on the form path:N-M and for a single line
  assert.equal(lineRefProblems('src/lib/role-switch.ts:80-83', 'x', fake(files)).length, 1)
  assert.equal(lineRefProblems('src/lib/role-switch.ts:83', 'x', fake(files)).length, 1)
  assert.deepEqual(lineRefProblems('src/lib/role-switch.ts:82', 'x', fake(files)), [])
})

test('a reversed range and line 0 are wrong, whatever the file', () => {
  const files = { 'src/a.ts': 100 }
  assert.match(lineRefProblems('src/a.ts:30-20', 'x', fake(files))[0], /not a range of lines/)
  assert.match(lineRefProblems('src/a.ts:0', 'x', fake(files))[0], /not a range of lines/)
  assert.match(lineRefProblems('src/a.ts dòng 0-5', 'x', fake(files))[0], /not a range of lines/)
})

test('the line number of the problem is the line of the text that holds the citation', () => {
  const text = 'ok\nok\nsrc/a.ts:5-9 is fine\nbut src/a.ts:50-90 is not'
  const problems = lineRefProblems(text, 'notes.md', fake({ 'src/a.ts': 10 }))
  assert.equal(problems.length, 1)
  assert.match(problems[0], /^notes\.md:4: /)
})

test('a bare name or the end of a path is wrong only when it is too short for EVERY file it names', () => {
  const files = { 'src/app/a/page.tsx': 20, 'src/app/b/page.tsx': 200 }
  assert.deepEqual(lineRefProblems('page.tsx dòng 150', 'x', fake(files)), [])
  assert.deepEqual(lineRefProblems('a/page.tsx dòng 15', 'x', fake(files)), [])
  assert.equal(lineRefProblems('a/page.tsx dòng 25', 'x', fake(files)).length, 1)
  assert.equal(lineRefProblems('page.tsx dòng 250', 'x', fake(files)).length, 1)
})

test('a file longer on another branch is not a mistake when the text speaks about several branches; without that it is', () => {
  const files = { 'src/lib/x.ts': 50 }
  const elsewhere = { 'src/lib/x.ts': [50, 120] }
  assert.deepEqual(lineRefProblems('src/lib/x.ts:100-110', 'status.md', fake(files, elsewhere)), [])
  assert.equal(lineRefProblems('src/lib/x.ts:100-110', 'doc.md', fake(files)).length, 1)
  // still wrong when no branch is long enough
  assert.equal(lineRefProblems('src/lib/x.ts:100-130', 'status.md', fake(files, elsewhere)).length, 1)
})

test('a file that is not in this checkout is listed, not failed; on another branch it is checked', () => {
  const none = lineRefReport('src/lib/new.ts:1-999', 'x', fake({}))
  assert.deepEqual([none.problems, none.unresolved.map(u => u.file), none.checked], [[], ['src/lib/new.ts'], 0])
  const onBranch = { 'src/lib/new.ts': [40] }
  assert.deepEqual(lineRefReport('src/lib/new.ts:1-40', 'x', fake({}, onBranch)).problems, [])
  assert.equal(lineRefReport('src/lib/new.ts:1-41', 'x', fake({}, onBranch)).problems.length, 1)
})

test('the real lookup reads this checkout: a citation up to the last line of a real file is right and one line more is wrong', () => {
  const rel = 'tests/support/line-refs.ts'
  const n = lineCount(read(rel))
  assert.ok(n > 50)
  assert.deepEqual(lineRefProblems(`\`${rel}\` dòng 1-${n}`, 'x'), [])
  assert.deepEqual(lineRefProblems(`${rel}:${n}`, 'x'), [])
  const wrong = lineRefProblems(`\`${rel}\` dòng 1-${n + 1}`, 'x')
  assert.equal(wrong.length, 1)
  assert.ok(wrong[0].includes(`has only ${n} lines`), wrong[0])
  // a bare file name finds the file anywhere in the repository
  assert.deepEqual(lineRefProblems(`line-refs.test.ts dòng 1-5`, 'x'), [])
  assert.equal(lineRefProblems(`line-refs.test.ts dòng 1-99999`, 'x').length, 1)
})

// ---- npm run line-refs --------------------------------------------------------------------------------------------

function runCli(file?: string) {
  return spawnSync(process.execPath, [
    '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
    '--import', './tests/register.mjs', 'tests/support/line-refs-cli.ts', ...(file ? [file] : []),
  ], { cwd: ROOT, encoding: 'utf8' })
}

test('npm run line-refs exits 0 on the repository and 1 on a file with a citation past the end (a copy of the status file is checked the same way)', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'tutafy-line-refs-'))
  const n = lineCount(read('package.json'))
  const good = path.join(dir, 'good.md')
  const bad = path.join(dir, 'bad.md')
  writeFileSync(good, `- the scripts are in \`package.json\` dòng 1-${n}\n- not here: src/never-merged.ts dòng 1-999\n`)
  writeFileSync(bad, `- fine: package.json:1-${n}\n- wrong: \`package.json\` dòng 1-${n + 7}\n`)
  const repo = runCli()
  assert.equal(repo.status, 0, repo.stdout + repo.stderr)
  assert.match(repo.stdout, /is inside its file/)
  const ok = runCli(good)
  assert.equal(ok.status, 0, ok.stdout + ok.stderr)
  assert.match(ok.stdout, /not in this checkout \(not checked\).*never-merged\.ts/)
  const wrong = runCli(bad)
  assert.equal(wrong.status, 1, wrong.stdout + wrong.stderr)
  assert.match(wrong.stdout, new RegExp(`bad\\.md:2: .*cites lines 1-${n + 7} but package\\.json has only ${n} lines`))
})

// ---- the pull request workflow ------------------------------------------------------------------------------------

test('a workflow runs on every pull request: type check, the tests and the line-citation check', () => {
  const wf = read('.github/workflows/pull-request.yml')
  assert.match(wf, /^on:\s*\n\s+pull_request:/m, 'it must start on pull_request')
  assert.match(wf, /npm ci/)
  assert.match(wf, /run: npm run typecheck/)
  assert.match(wf, /run: npm test/)
  assert.match(wf, /run: npm run line-refs/)
  const pkg = JSON.parse(read('package.json')).scripts as Record<string, string>
  assert.match(pkg.typecheck, /tsc --noEmit/)
  assert.match(pkg['line-refs'], /tests\/support\/line-refs-cli\.ts/)
  assert.match(pkg.test, /tests\/\*\.test\.ts/, 'npm test runs every test file, so this file is in it')
})

// ---- lists of lines and "lines N-M of file" (review of T-0684) --------------------------------------------------------

test('a list of lines is read to the last number: "dòng 64 và 99", "dòng 75, 88", "dòng 163 và 280-281", "dòng 1, 2 và 3"', () => {
  const pick = (t: string) => lineRefsIn(t).map(r => `${r.file}:${r.from}-${r.to}`)
  assert.deepEqual(pick('`src/app/auth/callback/route.ts` dòng 64 và 99'), ['src/app/auth/callback/route.ts:64-64', 'src/app/auth/callback/route.ts:99-99'])
  assert.deepEqual(pick('`tests/x.test.ts` dòng 75, 88'), ['tests/x.test.ts:75-75', 'tests/x.test.ts:88-88'])
  assert.deepEqual(pick('`src/app/api/bookings/route.ts` dòng 163 và 280-281'), ['src/app/api/bookings/route.ts:163-163', 'src/app/api/bookings/route.ts:280-281'])
  assert.deepEqual(pick('`a.ts` dòng 1, 2 và 3'), ['a.ts:1-1', 'a.ts:2-2', 'a.ts:3-3'])
  assert.deepEqual(pick('`a.ts` dòng 1, và 3'), ['a.ts:1-1', 'a.ts:3-3'])
  assert.deepEqual(pick('a.ts lines 4 and 9-12'), ['a.ts:4-4', 'a.ts:9-12'])
  assert.deepEqual(pick('a.ts:64 và 99'), ['a.ts:64-64', 'a.ts:99-99'])
  assert.deepEqual(pick('a.ts:10-12, 40'), ['a.ts:10-12', 'a.ts:40-40'])
  // a number that counts something else is not a line
  assert.deepEqual(pick('`a.ts` dòng 12 và 300 test khác'), ['a.ts:12-12'])
  assert.deepEqual(pick('a.ts:12, 3 files changed'), ['a.ts:12-12'])
  assert.deepEqual(pick('a.ts dòng 12, rồi 300'), ['a.ts:12-12'])
})

test('"dòng N-M của file" and "lines N-M of file" are read, with a list, a path or a bare name', () => {
  const pick = (t: string) => lineRefsIn(t).map(r => `${r.file}:${r.from}-${r.to}`)
  assert.deepEqual(pick('dòng 75-93 của `tests/accessibility.test.ts`'), ['tests/accessibility.test.ts:75-93'])
  assert.deepEqual(pick('(dòng 75-93 của tests/accessibility.test.ts)'), ['tests/accessibility.test.ts:75-93'])
  assert.deepEqual(pick('Dòng 64 và 99 của `src/lib/x.ts`'), ['src/lib/x.ts:64-64', 'src/lib/x.ts:99-99'])
  assert.deepEqual(pick('lines 3-9 of src/lib/x.ts'), ['src/lib/x.ts:3-9'])
  assert.deepEqual(pick('line 12 in src/lib/x.ts'), ['src/lib/x.ts:12-12'])
  assert.deepEqual(pick('dòng 30 trong tệp `settings/page.tsx`'), ['settings/page.tsx:30-30'])
  assert.deepEqual(pick('dòng 5 ở file role-switch.ts'), ['role-switch.ts:5-5'])
  // no path: nothing to check
  assert.deepEqual(pick('dòng 75-93 của trang đăng nhập; lines 3-9 of the log'), [])
  // a citation is read once: "path dòng N" followed by "của path" is not read twice
  assert.deepEqual(pick('`a.ts` dòng 3 và 5 của `b.ts`'), ['a.ts:3-3', 'a.ts:5-5'])
})

test('the last number of a list is checked: "src/lib/role-switch.ts dòng 73 và 84" on a file of 82 lines is wrong', () => {
  const files = { 'src/lib/role-switch.ts': 82 }
  const wrong = lineRefProblems('`src/lib/role-switch.ts` dòng 73 và 84', 'status.md', fake(files))
  assert.equal(wrong.length, 1)
  assert.match(wrong[0], /cites line 84 but src\/lib\/role-switch\.ts has only 82 lines/)
  assert.deepEqual(lineRefProblems('`src/lib/role-switch.ts` dòng 73 và 82', 'status.md', fake(files)), [])
  // every form of the list, each red when its last number is past the end and green when it is not
  for (const [bad, good] of [
    ['`a.ts` dòng 10, 83', '`a.ts` dòng 10, 82'],
    ['`a.ts` dòng 10, và 83', '`a.ts` dòng 10, và 82'],
    ['`a.ts` dòng 10, 20 và 83', '`a.ts` dòng 10, 20 và 82'],
    ['`a.ts` dòng 60 và 80-83', '`a.ts` dòng 60 và 80-82'],
    ['a.ts lines 3 and 83', 'a.ts lines 3 and 82'],
    ['a.ts:10, 83', 'a.ts:10, 82'],
    ['dòng 70-83 của `a.ts`', 'dòng 70-82 của `a.ts`'],
    ['dòng 10 và 83 của a.ts', 'dòng 10 và 82 của a.ts'],
    ['lines 3-83 of a.ts', 'lines 3-82 of a.ts'],
  ]) {
    assert.equal(lineRefProblems(bad, 'x', fake({ 'a.ts': 82 })).length, 1, bad)
    assert.deepEqual(lineRefProblems(good, 'x', fake({ 'a.ts': 82 })), [], good)
  }
})

test('a list in a file given to the CLI: the last number past the end exits 1', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'tutafy-line-refs-list-'))
  const n = lineCount(read('package.json'))
  const bad = path.join(dir, 'list.md')
  writeFileSync(bad, `- first fine, last past the end: \`package.json\` dòng 1 và ${n + 3}\n- and: dòng 1-${n + 50} của \`package.json\`\n`)
  const out = runCli(bad)
  assert.equal(out.status, 1, out.stdout + out.stderr)
  assert.match(out.stdout, new RegExp(`list\.md:1: .*cites line ${n + 3} but package\.json has only ${n} lines`))
  assert.match(out.stdout, new RegExp(`list\.md:2: .*cites lines 1-${n + 50} but package\.json`))
})

// ---- a word after the last number does not let it off (second review of T-0684) ------------------------------------------------

test('every number of a list is checked whatever word follows it: only a unit of counting lets a number off', () => {
  const pick = (t: string) => lineRefsIn(t).map(r => `${r.file}:${r.from}-${r.to}`)
  // the real sentences of the status file, with a verb or a noun after the last number
  assert.deepEqual(pick('`BookingForm.tsx` dòng 276 và 353 giữ giá trị đó'), ['BookingForm.tsx:276-276', 'BookingForm.tsx:353-353'])
  assert.deepEqual(pick('`src/lib/role-switch.ts` dòng 73 và 84 kiểm phiên'), ['src/lib/role-switch.ts:73-73', 'src/lib/role-switch.ts:84-84'])
  assert.deepEqual(pick('`a.ts` dòng 67 và 99 kiểm'), ['a.ts:67-67', 'a.ts:99-99'])
  assert.deepEqual(pick('`a.ts` dòng 374, 377 và 379 dùng'), ['a.ts:374-374', 'a.ts:377-377', 'a.ts:379-379'])
  assert.deepEqual(pick('a.ts dòng 10 và 83 kiểm'), ['a.ts:10-10', 'a.ts:83-83'])
  assert.deepEqual(pick('a.ts dòng 10 và 83 rồi'), ['a.ts:10-10', 'a.ts:83-83'])
  assert.deepEqual(pick('a.ts dòng 10, 83 nên'), ['a.ts:10-10', 'a.ts:83-83'])
  assert.deepEqual(pick('a.ts:10 và 83 verifies it'), ['a.ts:10-10', 'a.ts:83-83'])
  assert.deepEqual(pick('a.ts dòng 10 và 83.'), ['a.ts:10-10', 'a.ts:83-83'])
  assert.deepEqual(pick('a.ts dòng 10 và 83'), ['a.ts:10-10', 'a.ts:83-83'])
  // a unit of counting means the number counts something else
  for (const unit of ['test', 'tests', 'ký tự', 'chars', 'characters', 'ms', 'giây', 'seconds', 'phút', 'minutes', 'giờ', 'ngày', 'days', 'tệp', 'files', 'lần', 'times', 'dòng', 'lines', 'bytes', 'KB', 'trang', 'mục', 'items', 'cái', 'chỗ', 'bản', 'người', 'gia sư', 'học sinh', 'buổi', 'lessons', '%']) {
    assert.deepEqual(pick(`a.ts dòng 12 và 300 ${unit} khác`), ['a.ts:12-12'], unit)
    assert.deepEqual(pick(`a.ts dòng 196, 45 ${unit}`), ['a.ts:196-196'], unit)
  }
  assert.deepEqual(pick('a.ts dòng 196, 45 ký tự'), ['a.ts:196-196'])
  assert.deepEqual(pick('a.ts dòng 12 và 300 test khác'), ['a.ts:12-12'])
  assert.deepEqual(pick('a.ts dòng 5 và 40ms'), ['a.ts:5-5'], 'a unit written against the number')
  // a word that only STARTS like a unit is not one
  assert.deepEqual(pick('a.ts dòng 5 và 40 testing'), ['a.ts:5-5', 'a.ts:40-40'])
  assert.deepEqual(pick('a.ts dòng 5 và 40 msg'), ['a.ts:5-5', 'a.ts:40-40'])
})

test('the red case: a list whose last number is past the end is wrong even with a verb after it', () => {
  const files = { 'src/lib/role-switch.ts': 82, 'a.ts': 82 }
  for (const text of ['`src/lib/role-switch.ts` dòng 73 và 84 kiểm phiên', 'a.ts dòng 10 và 83 kiểm', 'a.ts dòng 10, 83 dùng', 'a.ts dòng 10, 20 và 83 giữ']) {
    const problems = lineRefProblems(text, 'status.md', fake(files))
    assert.equal(problems.length, 1, text)
    assert.match(problems[0], /cites line 8[34] but .* has only 82 lines/, text)
  }
  assert.deepEqual(lineRefProblems('a.ts dòng 10 và 82 kiểm', 'status.md', fake(files)), [])
  // and a count of something else beside a good citation is not a problem
  assert.deepEqual(lineRefProblems('a.ts dòng 196, 45 ký tự; a.ts dòng 12 và 300 test khác', 'status.md', fake({ 'a.ts': 250 })), [], '196 is a line (the file has 250), 45 characters and 300 tests are not')
  assert.equal(lineRefProblems('a.ts dòng 196, 45 ký tự', 'status.md', fake({ 'a.ts': 100 })).length, 1, 'but 196 is still checked')
})
