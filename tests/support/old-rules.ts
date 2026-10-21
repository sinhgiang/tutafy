// The wording of value rules this project has LOOSENED or CHANGED, kept in ONE list (T-0703), and the scan that finds it left behind.
//
// Why: twice (T-0675, T-0700) the Reviewer found a comment or a sentence in a file that was being changed still stating the OLD
// rule after the rule had changed (lesson lengths were 30, 45, 60 or 90, then any whole length from 10 to 240 in steps of 5). The
// code was right and the words around it were wrong. Reading for it by eye misses it; a scan does not.
//
// What it scans: every file under src/ and every file under supabase/migrations/ (comments, descriptive strings, page text, SQL
// comments), joined across line breaks and comment markers, so a phrase wrapped over two comment lines is still found. A phrase of
// this list may stay only where the OLD rule is meant as history (the first version of a migration, say), marked in the same
// comment, within 3 lines above or 1 line below, with `allow-old-rule: <reason>`. The reason must say why (12 characters or more);
// a marker with no reason, or a marker with no old phrase beside it, is itself an error, so a stale marker cannot stay.
//
// To change a value rule: add the old wording to OLD_RULE_PHRASES below IN THE SAME PULL REQUEST (the pull request template asks),
// then the scan lists every place that still says it. Lists of numbers in code ([30, 45, 60, 90], an SQL `in (30, 45, 60, 90)`) are
// not phrases and are not found; the phrases are words ("30, 45, 60 and 90", "30/45/60/90", "only 30").
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

export type OldRule = {
  /** The old wording, as it would be written in a comment or a sentence. Matched without regard to case, spaces or line breaks. */
  phrase: string
  /** What the rule used to be, in a few words. */
  was: string
  /** What it is now, in a few words: what the fix should say. */
  now: string
  /** The ticket that changed the rule. */
  ticket: string
}

const LENGTHS_WAS = 'only the four lengths 30, 45, 60 and 90 minutes'
const LENGTHS_NOW = 'any whole number of minutes from 10 to 240 in steps of 5, one to six lengths per tutor (src/lib/lesson-durations.ts); 30, 45, 60 and 90 are only the four ready-made choices'

export const OLD_RULE_PHRASES: OldRule[] = [
  { phrase: '30, 45, 60 and 90', was: LENGTHS_WAS, now: LENGTHS_NOW, ticket: 'T-0675, T-0700' },
  { phrase: '30, 45, 60 or 90', was: LENGTHS_WAS, now: LENGTHS_NOW, ticket: 'T-0675, T-0700' },
  { phrase: '30/45/60/90', was: LENGTHS_WAS, now: LENGTHS_NOW, ticket: 'T-0675, T-0700' },
  { phrase: '30 / 45 / 60 / 90', was: LENGTHS_WAS, now: LENGTHS_NOW, ticket: 'T-0675, T-0700' },
  { phrase: 'only 30', was: 'only 30 (minutes) accepted', now: LENGTHS_NOW, ticket: 'T-0700' },
  { phrase: 'at most four lengths', was: 'at most four lengths per tutor', now: 'one to six lengths per tutor (MAX_DURATIONS)', ticket: 'T-0700' },
  { phrase: 'up to four lengths', was: 'up to four lengths per tutor', now: 'one to six lengths per tutor (MAX_DURATIONS)', ticket: 'T-0700' },
  { phrase: 'one to four lengths', was: 'one to four lengths per tutor', now: 'one to six lengths per tutor (MAX_DURATIONS)', ticket: 'T-0700' },
]

export const ALLOW_MARKER = 'allow-old-rule:'
export const MIN_REASON_LENGTH = 12
/** A marker covers a phrase that starts up to this many lines below it, or one line above it. */
export const MARKER_LINES_BEFORE = 3
export const MARKER_LINES_AFTER = 1

export type Finding = { file: string; line: number; text: string; problem: 'old-rule' | 'marker-without-reason' | 'stale-marker' }

/** A comment line without its marker characters, so the words read the same wherever they are wrapped. */
function proseOf(line: string): string {
  return line
    .replace(/^\s*(\{\s*\/\*+|\/\/+|\/\*+|\*+\/?|--+|<!--)\s?/, '')
    .replace(/\s*(\*+\/\s*\}?|-->)\s*$/, '')
}

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

/** All the places in one file's text where an old phrase stands, minus the ones a valid marker covers; and the bad markers. */
export function scanText(file: string, text: string, phrases: OldRule[] = OLD_RULE_PHRASES): Finding[] {
  const lines = text.split(/\r?\n/)
  // one flat text for the whole file, remembering which line each character came from
  let flat = ''
  const lineOf: number[] = []
  lines.forEach((raw, i) => {
    const part = squash(proseOf(raw))
    for (let k = 0; k < part.length; k++) lineOf.push(i)
    flat += part
    lineOf.push(i)
    flat += ' '
  })

  const markers: { line: number; reason: string; used: boolean }[] = []
  lines.forEach((raw, i) => {
    const at = raw.indexOf(ALLOW_MARKER)
    if (at < 0) return
    const reason = raw.slice(at + ALLOW_MARKER.length).replace(/\s*(\*+\/\s*\}?|-->)\s*$/, '').trim()
    markers.push({ line: i, reason, used: false })
  })

  const out: Finding[] = []
  const seen = new Set<string>()
  for (const { phrase } of phrases) {
    const needle = squash(phrase)
    for (let from = flat.indexOf(needle); from >= 0; from = flat.indexOf(needle, from + 1)) {
      const first = lineOf[from]
      const last = lineOf[from + needle.length - 1]
      const key = String(first) // one finding per line, whichever old phrase stands on it
      if (seen.has(key)) continue
      seen.add(key)
      const covering = markers.filter(m => m.line >= first - MARKER_LINES_BEFORE && m.line <= last + MARKER_LINES_AFTER)
      covering.forEach(m => { m.used = true })
      if (covering.some(m => m.reason.length >= MIN_REASON_LENGTH)) continue
      out.push({ file, line: first + 1, text: lines[first].trim().slice(0, 160), problem: 'old-rule' })
    }
  }
  for (const m of markers) {
    if (m.reason.length < MIN_REASON_LENGTH) out.push({ file, line: m.line + 1, text: lines[m.line].trim().slice(0, 160), problem: 'marker-without-reason' })
    else if (!m.used) out.push({ file, line: m.line + 1, text: lines[m.line].trim().slice(0, 160), problem: 'stale-marker' })
  }
  return out.sort((a, b) => a.line - b.line)
}

function walk(dir: string, into: string[]): void {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f)
    if (statSync(p).isDirectory()) walk(p, into)
    else if (/\.(ts|tsx|js|jsx|mjs|cjs|css|md|mdx|json|html|txt|sql)$/.test(f)) into.push(p)
  }
}

/** The places of the repository the scan reads: all of src/ and all of supabase/migrations/. */
export const SCANNED_ROOTS = ['src', 'supabase/migrations']

export function scanRepository(root: string, phrases: OldRule[] = OLD_RULE_PHRASES): { files: number; findings: Finding[] } {
  const files: string[] = []
  for (const r of SCANNED_ROOTS) walk(path.join(root, r), files)
  const findings: Finding[] = []
  for (const f of files) findings.push(...scanText(path.relative(root, f).split(path.sep).join('/'), readFileSync(f, 'utf8'), phrases))
  return { files: files.length, findings }
}

export function describeFinding(f: Finding): string {
  const what = f.problem === 'old-rule'
    ? 'still states a rule that was replaced (fix the words, or add `allow-old-rule: <reason>` if the old rule is meant as history)'
    : f.problem === 'marker-without-reason'
      ? 'has an allow-old-rule marker with no reason (say why, 12 characters or more)'
      : 'has an allow-old-rule marker with no old phrase beside it (remove the marker)'
  return `${f.file}:${f.line} ${what}: ${f.text}`
}
