// The [count: NAME=N] markers of the project's STATUS FILE, checked in npm test (T-0704).
//
// The mistake it stops (lock count-claim-not-recounted; the T-0684 and T-0686 reviews): the status file said "31 units" for a list
// of 33, and "337 citations" that nobody counted again. T-0646 made the marker ([count: NAME=N], tests/support/counted-lists.ts) and
// `npm run counts -- <file>`, but only for the Markdown files of the repository; the status file lives in the Helme Brain, outside
// the repository, so nothing read it unless someone ran the command by hand.
//
// What this adds, with the same markers and the same table (no second mechanism):
//   1. A status file speaks about many branches at once, and a count is only true on the branch it was counted on. So a branch's
//      markers are those inside the ENTRIES of the status file that name the branch in backticks (`helme/old-rule-wording`); an
//      entry is a top-level "- " item. statusCountProblems(text, branch) checks exactly those, against the code of the branch that
//      is checked out, with the line numbers of the whole file.
//   2. A number written bare in front of the words of a counted list ("51 test files", "31 units") in such an entry, with no marker
//      for that list on the same line, is reported: write it as [count: NAME=N]. Only the lists of BARE_WORDS are looked for; a
//      list the table has no words for here is still only checked when someone writes the marker.
//   3. tests/status-counts.test.ts runs it over the status file wherever it is found (STATUS_FILE, or the Helme Brain next to this
//      checkout), for the current branch. In a place without the Brain (the pull request check on GitHub) there is no status file to
//      read; the test says so and the self-checks of the checker still run.
//   4. `npm run counts -- <file> --branch <name>` does the same by hand; without --branch it checks every marker of the file.
import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { countProblems, currentCounts } from './counted-lists.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const lf = (s: string) => s.replace(/\r\n/g, '\n')

export type Entry = { start: number; end: number; text: string }

/** The top-level "- " items of a status file, with the line each starts on (1-based) and the line it ends on. */
export function entriesOf(text: string): Entry[] {
  const lines = lf(text).split('\n')
  const starts: number[] = []
  lines.forEach((l, i) => { if (/^- /.test(l)) starts.push(i) })
  return starts.map((s, k) => {
    // an entry ends before the next top-level item or the next heading
    let e = k + 1 < starts.length ? starts[k + 1] : lines.length
    for (let i = s + 1; i < e; i++) if (/^#{1,6} /.test(lines[i])) { e = i; break }
    return { start: s + 1, end: e, text: lines.slice(s, e).join('\n') }
  })
}

/** The entries that name the branch (written in backticks, as the status file writes branches). */
export function entriesForBranch(text: string, branch: string): Entry[] {
  const needle = `\`${branch}\``
  return entriesOf(text).filter(e => e.text.includes(needle))
}

/** The words each counted list is called in a report, so a bare number in front of them can be told from a marker. */
export const BARE_WORDS: { name: string; words: RegExp }[] = [
  { name: 'TEST_FILES', words: /(?<![\w`[-])(\d+)\s+(?:test files|tệp test)(?![\w])/giu },
  { name: 'LINE_REF_UNITS', words: /(?<![\w`[-])(\d+)\s+(?:units|đơn vị)(?![\w])/giu },
]

/** Bare counts in a text: a number in front of the words of a counted list, on a line with no marker for that list. */
export function bareCountProblems(text: string, label: string, firstLine = 1): string[] {
  const out: string[] = []
  lf(text).split('\n').forEach((line, i) => {
    for (const { name, words } of BARE_WORDS) {
      for (const m of line.matchAll(words)) {
        if (new RegExp(`\\[count:\\s*${name}\\s*=\\s*\\d+\\s*\\]`).test(line)) continue
        out.push(`${label}:${firstLine + i}: "${m[0]}" counts a list but has no marker: write it as [count: ${name}=${m[1]}] (the number the code has now; npm run counts prints it)`)
      }
    }
  })
  return out
}

/**
 * Every wrong or bare count in the entries of the status file that name the branch; empty when they are right.
 * The text is checked entry by entry, with the line numbers of the whole file.
 */
export async function statusCountProblems(text: string, branch: string, label = 'status file', counts?: Awaited<ReturnType<typeof currentCounts>>): Promise<string[]> {
  const real = counts ?? await currentCounts()
  const out: string[] = []
  for (const e of entriesForBranch(text, branch)) {
    out.push(...await countProblems('\n'.repeat(e.start - 1) + e.text, label, real))
    out.push(...bareCountProblems(e.text, label, e.start))
  }
  return out
}

/** The branch that is checked out (or, on GitHub, the branch of the pull request); null when it cannot be told. */
export function currentBranch(): string | null {
  const fromEnv = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME
  if (fromEnv) return fromEnv
  const r = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT, encoding: 'utf8' })
  const name = r.status === 0 ? r.stdout.trim() : ''
  return name && name !== 'HEAD' ? name : null
}

/** Where the status file is: STATUS_FILE, or the Helme Brain that sits beside this checkout; null when there is none (CI). */
export function findStatusFile(env: Record<string, string | undefined> = process.env, root = ROOT): string | null {
  for (const candidate of [env.STATUS_FILE, env.COUNTS_STATUS_FILE, path.resolve(root, '..', '..', 'Helme', 'brain', 'projects', 'toiuuram.md')]) {
    if (candidate && existsSync(candidate)) return candidate
  }
  return null
}

export const readStatusFile = (file: string): string => lf(readFileSync(file, 'utf8'))
