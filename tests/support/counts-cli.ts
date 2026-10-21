// `npm run counts`: the numbers of the counted lists now, to copy into a report as [count: NAME=N] markers.
// `npm run counts -- <file>`: check EVERY [count: ...] marker of any file (for example the project's status file in the Helme Brain,
// which is outside this repository) against the code of the branch that is checked out; exit code 1 when one is wrong.
// `npm run counts -- <file> --branch <name>`: check only the entries of the file that name that branch (`helme/...` in backticks),
// and also report a number written bare in front of the words of a counted list ("51 test files"); that is what npm test does with
// the status file (tests/status-counts.test.ts, T-0704).
import { readFileSync } from 'node:fs'
import { COUNTED_LISTS, countProblems, currentCounts } from './counted-lists.ts'
import { entriesForBranch, statusCountProblems } from './status-counts.ts'

const args = process.argv.slice(2)
const at = args.indexOf('--branch')
const branch = at >= 0 ? args[at + 1] : undefined
if (at >= 0 && !branch) { console.log('--branch needs a branch name, for example --branch helme/old-rule-wording'); process.exit(2) }
const file = args.find((a, i) => !a.startsWith('--') && (at < 0 || i !== at + 1))
if (file) {
  const text = readFileSync(file, 'utf8')
  const problems = branch ? await statusCountProblems(text, branch, file) : await countProblems(text, file)
  for (const p of problems) console.log(p)
  const scope = branch ? `the ${entriesForBranch(text, branch).length} entries of ${file} that name ${branch}` : file
  console.log(problems.length ? `${problems.length} count(s) wrong in ${scope}` : `every [count: ...] marker of ${scope} matches the code`)
  process.exit(problems.length ? 1 : 0)
}
const width = Math.max(...Object.keys(COUNTED_LISTS).map(n => n.length))
for (const c of await currentCounts()) {
  console.log(`${`[count: ${c.name}=${c.count ?? '?'}]`.padEnd(width + 12)}  ${c.count === null ? `CANNOT COUNT: ${c.problem}` : c.what}`)
}
