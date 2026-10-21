// `npm run line-refs`: check the line citations of the Markdown files of the repository.
// `npm run line-refs -- <file>`: check the citations of any file (the project's status file in the Helme Brain is outside this
// repository, so npm test does not read it unless LINE_REFS_STATUS_FILE names it). Exit code 1 when a citation is past the end of
// its file. A file that is not in this checkout is listed but is not a failure.
import { readFileSync } from 'node:fs'
import { lineRefReport, markdownFilesToCheck, realLookup } from './line-refs.ts'

const given = process.argv[2]
const files = given ? [given] : markdownFilesToCheck()
let bad = 0
let checked = 0
for (const f of files) {
  // a file given by hand is the status-style kind (it talks about several branches), so a longer copy on another branch passes
  const report = lineRefReport(readFileSync(f, 'utf8').replace(/\r\n/g, '\n'), f, realLookup(Boolean(given)))
  checked += report.checked
  bad += report.problems.length
  for (const p of report.problems) console.log(p)
  if (given) for (const u of report.unresolved) console.log(`not in this checkout (not checked): ${f}:${u.line}: ${u.file}`)
}
console.log(bad ? `${bad} line citation(s) past the end of their file in ${given ?? 'the Markdown files of the repository'}` : `every line citation of ${given ?? 'the Markdown files of the repository'} is inside its file (${checked} checked)`)
process.exit(bad ? 1 : 0)
