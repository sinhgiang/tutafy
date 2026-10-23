// `npm run updates-entry`: warn when the branch changes what a user sees but adds no Updates entry (see updates-entry.ts).
// The base is the pull request's target (BASE_REF, for example master) or origin/master; the comparison is the three-dot form,
// so only the branch's own changes count. Always exits 0: it is a warning, shown on the pull request as a GitHub annotation.
import { execFileSync } from 'node:child_process'
import { entryWarning, parseNameStatus } from './updates-entry.ts'

const base = process.env.BASE_REF ? `origin/${process.env.BASE_REF}` : 'origin/master'
let text = ''
try {
  text = execFileSync('git', ['diff', '--name-status', `${base}...HEAD`], { encoding: 'utf8' })
} catch {
  console.log(`not checked: git could not compare with ${base}`)
  process.exit(0)
}
const warning = entryWarning(parseNameStatus(text))
if (warning) console.log(`::warning title=No Updates entry::${warning}`)
else console.log('Updates entry: nothing to add, or an entry is in this pull request')
