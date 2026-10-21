// `npm run pr-status`: check the Markdown files of the repository for a pull request that is MERGED on GitHub but still written
// next to "chờ gộp" / "chưa gộp".
// `npm run pr-status -- <file>`: check any file (the project's status file in the Helme Brain is outside this repository, so
// npm test does not read it unless MERGED_PR_STATUS_FILE names it). Exit code 1 when a merged pull request is still waiting.
// GitHub is asked read-only with gh; with no gh, no login or no network the numbers are listed as skipped and the exit code is 0.
import { readFileSync } from 'node:fs'
import { markdownFilesToCheck } from './line-refs.ts'
import { ghStateOf, mergedWaitingReport, repoSlug, waitingMentionsIn } from './pr-status.ts'

const given = process.argv[2]
const files = given ? [given] : markdownFilesToCheck()
const slug = repoSlug()
let bad = 0
let asked = 0
let skipped = 0
for (const f of files) {
  const text = readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
  if (waitingMentionsIn(text).length === 0) continue
  if (!slug) { console.log(`not asked (no GitHub repository found for this clone): ${f}`); skipped++; continue }
  const report = mergedWaitingReport(text, f, ghStateOf(slug))
  bad += report.problems.length
  asked += report.asked.length
  skipped += report.skipped.length
  for (const p of report.problems) console.log(p)
  for (const s of report.skipped) console.log(`skipped: ${s}`)
}
const what = given ?? 'the Markdown files of the repository'
console.log(bad
  ? `${bad} pull request(s) still written as waiting to merge after GitHub merged them, in ${what}`
  : `no merged pull request is written as waiting to merge in ${what} (${asked} asked${skipped ? `, ${skipped} skipped` : ''})`)
process.exit(bad ? 1 : 0)
