// `npm run counts`: the numbers of the counted lists now, to copy into a report as [count: NAME=N] markers.
// `npm run counts -- <file>`: check the [count: ...] markers of any file (for example the project's status file in the
// Helme Brain, which is outside this repository and so not read by npm test); exit code 1 when one is wrong.
import { readFileSync } from 'node:fs'
import { COUNTED_LISTS, countProblems, currentCounts } from './counted-lists.ts'

const file = process.argv[2]
if (file) {
  const problems = await countProblems(readFileSync(file, 'utf8'), file)
  for (const p of problems) console.log(p)
  console.log(problems.length ? `${problems.length} marker(s) wrong in ${file}` : `every [count: ...] marker of ${file} matches the code`)
  process.exit(problems.length ? 1 : 0)
}
const width = Math.max(...Object.keys(COUNTED_LISTS).map(n => n.length))
for (const c of await currentCounts()) {
  console.log(`${`[count: ${c.name}=${c.count ?? '?'}]`.padEnd(width + 12)}  ${c.count === null ? `CANNOT COUNT: ${c.problem}` : c.what}`)
}
