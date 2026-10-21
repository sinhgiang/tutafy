// T-0693: a text must not say a pull request is waiting to be merged ("chờ gộp", "chưa gộp") after GitHub has merged it.
// The rules are in tests/support/pr-status.ts (read its header first). What this file checks:
//   - the reader finds the pull request numbers written near a waiting phrase and leaves the rest alone (a number with "đã gộp"
//     next to it, a number far from the phrase, "chờ" without "gộp", a colour like #6366f1);
//   - the check turns red when GitHub says MERGED, stays green for OPEN and CLOSED, and skips (never fails) when GitHub cannot say;
//     GitHub is replaced by a pretend gh in every test, so no test touches the network;
//   - `npm run pr-status -- <file>` (the way to check the status file, which is outside this repository) exits 1 and 0 as it should,
//     with the pretend gh given as a script, and exits 0 when gh is not logged in;
//   - the Markdown files of the repository do not say a merged pull request is waiting (asked only when one of them has such a
//     phrase, so a checkout with none never goes to the network);
//   - the pull request workflow runs this check.
// The status file of the project lives in the Helme Brain, outside the repository: npm test does not read it by default (it does
// not exist in another checkout and it needs GitHub). Set MERGED_PR_STATUS_FILE to a path to check it here too.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ROOT, markdownFilesToCheck } from './support/line-refs.ts'
import { GithubUnavailable, ghStateOf, mergedWaitingReport, repoSlug, waitingMentionsIn, type PrState } from './support/pr-status.ts'

const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const stateTable = (table: Record<number, PrState>) => (pr: number): PrState => table[pr] ?? 'UNKNOWN'
const prs = (text: string) => waitingMentionsIn(text).map(m => m.pr)

// ---- the reader ---------------------------------------------------------------------------------------------------

test('the reader finds a pull request written near "chờ gộp", "chưa gộp" and their English forms', () => {
  assert.deepEqual(prs('Pull request #37 (chưa gộp, đích master).'), [37])
  assert.deepEqual(prs('Việc chờ gộp #30: Chief tạo.'), [30])
  assert.deepEqual(prs('pull request #35 đích master (https://github.com/sinhgiang/tutafy/pull/35). Việc chờ gộp: W-2064.'), [35])
  assert.deepEqual(prs('PR 12 is waiting to be merged'), [12])
  assert.deepEqual(prs('PR #12 awaiting merge'), [12])
  assert.deepEqual(prs('#13 is not yet merged'), [13])
  assert.deepEqual(prs('xong, chờ chủ gộp pull request #21'), [21])
  assert.deepEqual(prs('Ngược lại #28 CHƯA GỘP (PR còn mở)'), [28])
  assert.deepEqual(prs('chờ gộp #27, #28 và #29'), [27, 28, 29])
  assert.deepEqual(waitingMentionsIn('a\nb\nPR #5 chờ gộp')[0], { pr: 5, line: 3, phrase: 'chờ gộp' })
})

test('the reader leaves alone what does not say a pull request is waiting', () => {
  // the text itself says it is merged
  assert.deepEqual(prs('#35 đã gộp, #36 xong'), [])
  assert.deepEqual(prs('chờ gộp trước đó; nay đã gộp #35'), [])
  assert.deepEqual(prs('pull request #35 is merged, hết chờ gộp'), [])
  // far from the phrase on its line; in another paragraph; in another list item; more than MAX_LINES lines away in the item
  assert.deepEqual(prs(`pull request #41 ${'x'.repeat(200)} chờ gộp`), [])
  assert.deepEqual(prs('pull request #41\n\nchờ gộp'), [])
  assert.deepEqual(prs('- T-1: pull request #41 đích master\n- T-2: chờ gộp'), [])
  assert.deepEqual(prs(`- T-1: chờ gộp\n${'  - dòng\n'.repeat(6)}  - pull request #41`), [])
  // "chủ đã gộp" is the past, not a waiting phrase
  assert.deepEqual(prs('W-1844: chủ đã gộp pull request #1'), [])
  // "chờ" is not "chờ gộp"; no phrase, no number; a colour is not a pull request
  assert.deepEqual(prs('pull request #37 vẫn chờ review, chờ Chief xem'), [])
  assert.deepEqual(prs('gộp pull request #37 sau khi chủ tạo hộp thư'), [])
  assert.deepEqual(prs('chờ gộp'), [])
  assert.deepEqual(prs('nút màu #6366f1 chưa gộp vào thiết kế'), [])
  assert.deepEqual(prs('commit 92044a7 chờ gộp, W-2092'), [])
})

test('a number named twice on a line is asked once; the same number on two lines is reported on both', () => {
  assert.equal(prs('PR #7 và pull request 7 chưa gộp').length, 1)
  assert.deepEqual(waitingMentionsIn('PR #7 chưa gộp\nPR #7 chờ gộp').map(m => m.line), [1, 2])
})

// ---- the check ----------------------------------------------------------------------------------------------------

test('a merged pull request still written as waiting is a problem; open, closed and unknown are not', () => {
  const text = 'pull request #35 chờ gộp\npull request #36 chờ gộp\npull request #37 chưa gộp\npull request #38 chờ gộp'
  const asked: number[] = []
  const report = mergedWaitingReport(text, 'status.md', pr => { asked.push(pr); return stateTable({ 35: 'MERGED', 36: 'OPEN', 37: 'CLOSED' })(pr) })
  assert.deepEqual(report.problems, ['status.md:1: pull request #35 is MERGED on GitHub but the text still says "chờ gộp" near it'])
  assert.deepEqual(asked, [35, 36, 37, 38])
  assert.deepEqual(report.skipped, ['status.md:4: #38 (GitHub did not say)'])
})

test('the corrected text is green: the merged pull request is written as merged', () => {
  const stale = 'pull request #35 đích master. Việc chờ gộp: W-2064.'
  const fixed = 'pull request #35 đích master, ĐÃ GỘP (commit gộp 8058001). Việc gộp W-2064 đã xong.'
  const merged = stateTable({ 35: 'MERGED' })
  assert.equal(mergedWaitingReport(stale, 'status.md', merged).problems.length, 1)
  assert.deepEqual(mergedWaitingReport(fixed, 'status.md', merged), { problems: [], asked: [], skipped: [] })
})

test('every merged pull request near the phrase is reported, each on its line, a number asked once', () => {
  const text = 'chờ gộp #27, #28\nPR #27 chưa gộp'
  let calls = 0
  const report = mergedWaitingReport(text, 's.md', pr => { calls++; return pr === 28 ? 'OPEN' : 'MERGED' })
  assert.equal(report.problems.length, 2)
  assert.match(report.problems[1], /^s\.md:2: pull request #27/)
  assert.equal(calls, 2)
})

test('when GitHub cannot be reached nothing fails: the first failure stops the asking and every number is listed as skipped', () => {
  let calls = 0
  const report = mergedWaitingReport('PR #1 chờ gộp\nPR #2 chờ gộp\nPR #3 chờ gộp', 'status.md', () => { calls++; throw new GithubUnavailable('gh is not logged in') })
  assert.deepEqual(report.problems, [])
  assert.equal(calls, 1)
  assert.equal(report.skipped.length, 3)
  assert.match(report.skipped[2], /not asked: gh is not logged in/)
  // any other error is a bug and is not swallowed
  assert.throws(() => mergedWaitingReport('PR #1 chờ gộp', 'x', () => { throw new Error('boom') }), /boom/)
})

// ---- the pretend gh ------------------------------------------------------------------------------------------------

function pretendGh(script: string): { env: NodeJS.ProcessEnv; dir: string } {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'tutafy-pr-status-'))
  const file = path.join(dir, 'gh.mjs')
  writeFileSync(file, script)
  return { env: { ...process.env, PR_STATUS_GH_SCRIPT: file }, dir }
}
const GH_TABLE = `
  const a = process.argv.slice(2)
  if (a[0] !== 'pr' || a[1] !== 'view' || a[3] !== '--repo' || a[4] !== 'sinhgiang/tutafy' || a[5] !== '--json' || a[6] !== 'state') { console.error('unexpected arguments: ' + a.join(' ')); process.exit(2) }
  const states = { 37: 'MERGED', 38: 'OPEN', 39: 'CLOSED' }
  const s = states[a[2]]
  if (!s) { console.error('GraphQL: Could not resolve to a PullRequest with the number of ' + a[2]); process.exit(1) }
  console.log(JSON.stringify({ state: s }))
`

test('ghStateOf asks gh read-only (pr view, --json state) and maps its answers', () => {
  const { env } = pretendGh(GH_TABLE)
  const stateOf = ghStateOf('sinhgiang/tutafy', env)
  assert.deepEqual([37, 38, 39, 40].map(stateOf), ['MERGED', 'OPEN', 'CLOSED', 'UNKNOWN'])
})

test('ghStateOf: not logged in, no network or no gh at all is "GitHub unavailable", not a failure of the check', () => {
  for (const message of ['To get started with GitHub CLI, please run:  gh auth login', 'error connecting to api.github.com', 'HTTP 403: API rate limit exceeded']) {
    const { env } = pretendGh(`console.error(${JSON.stringify(message)}); process.exit(1)`)
    assert.throws(() => ghStateOf('sinhgiang/tutafy', env)(37), GithubUnavailable, message)
  }
  const { env } = pretendGh('console.log("not json")')
  assert.equal(ghStateOf('sinhgiang/tutafy', env)(37), 'UNKNOWN')
  assert.equal(ghStateOf('sinhgiang/tutafy', { ...process.env, PR_STATUS_GH_SCRIPT: path.join(os.tmpdir(), 'no-such-gh-script.mjs') })(37), 'UNKNOWN')
})

test('repoSlug: GITHUB_REPOSITORY wins (CI), otherwise the GitHub address this clone pushes to', () => {
  assert.equal(repoSlug({ GITHUB_REPOSITORY: 'a/b' }), 'a/b')
  const here = repoSlug({})
  assert.ok(here === null || /^[\w.-]+\/[\w.-]+$/.test(here), String(here))
})

// ---- npm run pr-status --------------------------------------------------------------------------------------------

function runCli(file: string | undefined, env: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, [
    '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
    '--import', './tests/register.mjs', 'tests/support/pr-status-cli.ts', ...(file ? [file] : []),
  ], { cwd: ROOT, encoding: 'utf8', env: { ...env, GITHUB_REPOSITORY: 'sinhgiang/tutafy' } })
}

test('npm run pr-status -- <file> exits 1 when the file says a merged pull request is waiting, 0 once it is corrected (pretend gh)', () => {
  const { env, dir } = pretendGh(GH_TABLE)
  const stale = path.join(dir, 'status-stale.md')
  const fixed = path.join(dir, 'status-fixed.md')
  writeFileSync(stale, '- T-9999: xong. Pull request #37 đích master, chờ gộp (việc W-1). Pull request #38 chưa gộp.\n')
  writeFileSync(fixed, '- T-9999: xong. Pull request #37 đích master, đã gộp (commit gộp abc1234). Pull request #38 chưa gộp.\n')
  const bad = runCli(stale, env)
  assert.equal(bad.status, 1, bad.stdout + bad.stderr)
  assert.match(bad.stdout, /status-stale\.md:1: pull request #37 is MERGED on GitHub but the text still says "chờ gộp"/)
  assert.doesNotMatch(bad.stdout, /#38 is MERGED/)
  const ok = runCli(fixed, env)
  assert.equal(ok.status, 0, ok.stdout + ok.stderr)
  assert.match(ok.stdout, /no merged pull request is written as waiting to merge/)
})

test('npm run pr-status -- <file> exits 0 and says it skipped when gh is not logged in', () => {
  const { env, dir } = pretendGh('console.error("To get started with GitHub CLI, please run:  gh auth login"); process.exit(1)')
  const file = path.join(dir, 'status.md')
  writeFileSync(file, 'Pull request #37 chờ gộp.\n')
  const out = runCli(file, env)
  assert.equal(out.status, 0, out.stdout + out.stderr)
  assert.match(out.stdout, /skipped: .*#37 \(not asked: /)
})

// ---- the real files -----------------------------------------------------------------------------------------------

test('the Markdown files of the repository do not say a merged pull request is waiting (GitHub is asked only if one has such a phrase)', () => {
  const slug = repoSlug()
  for (const f of markdownFilesToCheck()) {
    const text = read(f)
    if (waitingMentionsIn(text).length === 0) continue
    if (!slug) continue
    const report = mergedWaitingReport(text, f, ghStateOf(slug))
    assert.deepEqual(report.problems, [], f)
  }
})

test('the status file, when MERGED_PR_STATUS_FILE names it, says no merged pull request is waiting', { skip: !process.env.MERGED_PR_STATUS_FILE }, () => {
  const file = process.env.MERGED_PR_STATUS_FILE!
  assert.ok(existsSync(file), `${file} does not exist`)
  const slug = repoSlug()
  assert.ok(slug, 'no GitHub repository for this clone')
  const report = mergedWaitingReport(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), file, ghStateOf(slug))
  assert.deepEqual(report.problems, [])
})

// ---- the pull request workflow ------------------------------------------------------------------------------------

test('the pull request workflow runs the check, with a token that can only read pull requests', () => {
  const wf = read('.github/workflows/pull-request.yml')
  assert.match(wf, /^on:\s*\n\s+pull_request:/m)
  assert.match(wf, /run: npm run pr-status/)
  assert.match(wf, /GH_TOKEN: \$\{\{ github\.token \}\}/)
  assert.match(wf, /^permissions:\s*\n\s+contents: read\s*\n\s+pull-requests: read/m)
  const pkg = JSON.parse(read('package.json')).scripts as Record<string, string>
  assert.match(pkg['pr-status'], /tests\/support\/pr-status-cli\.ts/)
})

// ---- the sentences the reviews quoted, in the place they stood (review of T-0693) ---------------------------------------

// reports/review/2026-10-20-T-0620-toiuuram.md note 1: the status file said "chờ review rồi chủ gộp (W-1882)" and, on the next
// line of the same entry, "pull request MỚI #17 ... đã đẩy". The words and the number are on two lines.
const T0620_ENTRY = [
  '- T-0620 (Tutafy, trang chủ): xong, chờ review rồi chủ gộp (W-1882).',
  '  - Nhánh `helme/sitemap-fix`, pull request MỚI #17 (https://github.com/sinhgiang/tutafy/pull/17) đã đẩy, commit `bccc1d6`.',
].join('\n')
// reports/review/2026-10-21-T-0680-toiuuram.md note 1: "commit `1bdd003` ... Việc chờ gộp: W-2061", with #34 before it.
const T0680_ENTRY = 'commit `1bdd003`, đã đẩy; pull request #34 đích `master` (https://github.com/sinhgiang/tutafy/pull/34). Việc chờ gộp: W-2061 (kind do, kèm link).'
// the "Đang tắc" line of the status file for W-1844
const W1844_LINE = '- W-1844: chủ gộp pull request #1 của Tutafy (https://github.com/sinhgiang/tutafy/pull/1). Chưa có ảnh chụp giao diện.'

test('the T-0620 sentence is caught: "chờ review rồi chủ gộp" on one line, the number on the next line of the same entry', () => {
  assert.deepEqual(waitingMentionsIn(T0620_ENTRY).map(m => [m.pr, m.line, m.phrase]), [[17, 1, 'chờ review rồi chủ gộp']])
  const report = mergedWaitingReport(T0620_ENTRY, 'status.md', stateTable({ 17: 'MERGED' }))
  assert.deepEqual(report.problems, ['status.md:1: pull request #17 is MERGED on GitHub but the text still says "chờ review rồi chủ gộp" near it'])
  assert.deepEqual(mergedWaitingReport(T0620_ENTRY, 'status.md', stateTable({ 17: 'OPEN' })).problems, [])
  // the same two lines as two separate entries are not tied together
  assert.deepEqual(waitingMentionsIn(T0620_ENTRY.replace('\n  - Nhánh', '\n- Nhánh')), [])
})

test('the T-0680 sentence is caught: "Việc chờ gộp: W-2061" after the number of the pull request', () => {
  const report = mergedWaitingReport(T0680_ENTRY, 'status.md', stateTable({ 34: 'MERGED' }))
  assert.equal(report.problems.length, 1)
  assert.match(report.problems[0], /pull request #34 is MERGED .*"chờ gộp"/)
})

test('"W-1844: chủ gộp pull request #1" is caught with no "chờ" in front of it, and cleared when the line says it is merged', () => {
  assert.deepEqual(waitingMentionsIn(W1844_LINE).map(m => [m.pr, m.phrase]), [[1, 'chủ gộp']])
  assert.equal(mergedWaitingReport(W1844_LINE, 'status.md', stateTable({ 1: 'MERGED' })).problems.length, 1)
  assert.deepEqual(mergedWaitingReport(W1844_LINE, 'status.md', stateTable({ 1: 'OPEN' })).problems, [])
  const fixed = '- W-1844: pull request #1 đã gộp (commit gộp a8aee67), việc gộp xong. Chưa có ảnh chụp giao diện.'
  assert.deepEqual(waitingMentionsIn(fixed), [])
})

test('"chờ ... gộp" with a few words between, and "chủ gộp" in the middle of a sentence', () => {
  assert.deepEqual(prs('xong, chờ Chief xem rồi chủ gộp pull request #9'), [9])
  assert.deepEqual(prs('đã review approve, chờ chủ gộp. PR #9'), [9])
  assert.deepEqual(prs('chờ một, hai, ba, bốn, năm, sáu từ rồi gộp #9'), []) // more than five words between
  assert.deepEqual(prs('chờ review lại rồi chủ gộp #9'), [9])
})

test('a "đã gộp" belongs to the number it stands next to: "PR #38 đã gộp, PR #39 chờ gộp" still asks about #39', () => {
  const merged = stateTable({ 38: 'MERGED', 39: 'MERGED' })
  for (const line of ['PR #38 đã gộp, PR #39 chờ gộp', 'pull request #39 chờ gộp sau #38 (đã gộp)', '- T-1: #38 đã gộp.\n  - #39 chờ gộp sau #38']) {
    assert.deepEqual(prs(line), [39], line)
    const report = mergedWaitingReport(line, 's.md', merged)
    assert.equal(report.problems.length, 1, line)
    assert.match(report.problems[0], /pull request #39 is MERGED/)
  }
  // and when #39 itself says it is merged it is not asked
  assert.deepEqual(prs('PR #38 đã gộp, PR #39 đã gộp, chờ gộp #40'), [40])
  assert.deepEqual(prs('pull request #39 chờ gộp sau #38 (đã gộp); nay #39 đã gộp'), [])
})

test('npm run pr-status -- <file> exits 1 on "chủ gộp pull request #N" and on a number on the line after the words (pretend gh)', () => {
  const { env, dir } = pretendGh(GH_TABLE)
  const file = path.join(dir, 'status-items.md')
  writeFileSync(file, '## Đang tắc\n\n- W-1: chủ gộp pull request #37 của Tutafy.\n\n- T-2: xong, chờ review rồi chủ gộp (W-3).\n  - Nhánh x, pull request MỚI #37 đã đẩy.\n')
  const out = runCli(file, env)
  assert.equal(out.status, 1, out.stdout + out.stderr)
  assert.match(out.stdout, /status-items\.md:3: pull request #37 is MERGED .*"chủ gộp"/)
  assert.match(out.stdout, /status-items\.md:5: pull request #37 is MERGED .*"chờ review rồi chủ gộp"/)
})
