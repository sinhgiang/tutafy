// T-0834: a pull request that changes what a tutor or student sees must add an Updates entry (a new file in content/updates/).
//
// The rule is the owner's (learn/updates-page-every-version.md, T-0683): every visible change has its entry in the SAME pull
// request, with a picture. Agents forgot it; this check says so on the pull request, as a warning (never a failure: some visible
// changes are tiny, and the reviewer decides).
//
// What counts as "a change a user sees": a changed or added file of a page or a component (a .tsx or .css file under src/app,
// src/components or src/styles), except the owner's own admin pages ((admin), super-admin) and the Updates page itself. A change
// to a route (route.ts), a library or a test is not seen. What counts as "an entry": a file ADDED in content/updates/ (a status of
// A, not an edit of an old entry).
//
// NOT caught: a visible change made in a library (a text in src/lib), in a route's answer, in public/ or in an email template;
// a pull request that adds an entry for something else. It is a nudge for the common case, not a proof.
//
// Used by tests/updates.test.ts (the rule on made-up lists of changed files) and `npm run updates-entry` (the pull request
// workflow), which asks git for the changed files.

export type Change = { status: string; path: string }

const VISIBLE = /^src\/(app|components|styles)\/.+\.(tsx|css)$/
const NOT_SEEN = [/^src\/app\/\(admin\)\//, /\/super-admin\//, /^src\/app\/updates\//, /^src\/components\/updates\//]
const ENTRY = /^content\/updates\/\d+\.\d+\.\d+\.md$/

/** The changed files a user can see on a page. */
export function visibleChanges(changes: Change[]): string[] {
  return changes.filter(c => c.status !== 'D' && VISIBLE.test(c.path) && !NOT_SEEN.some(r => r.test(c.path))).map(c => c.path)
}

/** True when the pull request adds a new entry file. */
export function addsEntry(changes: Change[]): boolean {
  return changes.some(c => c.status === 'A' && ENTRY.test(c.path))
}

/** The warning to print, or null when there is nothing to say. */
export function entryWarning(changes: Change[]): string | null {
  const seen = visibleChanges(changes)
  if (seen.length === 0 || addsEntry(changes)) return null
  const shown = seen.slice(0, 5).join(', ') + (seen.length > 5 ? `, and ${seen.length - 5} more` : '')
  return `This pull request changes what a user sees (${shown}) but adds no new file in content/updates/. Add an Updates entry with a picture in this pull request (docs/feature-map.md, "RULE for agents"), or say in the description why none is needed.`
}

/** Reads `git diff --name-status` output (tab separated, renames as R100 old new) into changes. */
export function parseNameStatus(text: string): Change[] {
  const out: Change[] = []
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    const parts = line.split('\t')
    const status = parts[0][0]
    out.push({ status, path: parts[parts.length - 1] })
  }
  return out
}
