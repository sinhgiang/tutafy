// T-0684: a line citation ("src/lib/x.ts dòng 40-52", "src/lib/x.ts:40-52") must point inside the file it names.
//
// The mistake it stops (lock line-ref-not-recounted; the T-0646 and T-0676 reviews): a report quotes "file lines N-M" as the
// proof of a claim, but the last line is past the end of the file (or the file was never opened again after an edit). A reader who
// follows the citation lands nowhere. What is checked here is the part a machine can know for sure: the file exists in this
// checkout and N and M are lines of it (1 <= N <= M <= the number of lines). Whether the lines still show the claim is a human's
// check; a citation that is merely out of date but still inside the file passes.
//
// Forms read:   `path` dòng N      `path` dòng N-M      path:N      path:N-M      path line N      path lines N-M
// (a "-", an en dash or an em dash between N and M). A path is a name with an extension of source, data or text (ts, tsx, js, mjs,
// json, md, sql, css, yml ...), with folders in front of it or alone. A path is read from the repository root; if no file is there,
// it may be the end of a longer path ("settings/page.tsx") or a bare file name, and it is looked up among all files of the
// repository (node_modules and build folders are not searched). It is wrong only when it is too short for EVERY file it names.
//
// Used by tests/line-refs.test.ts (in npm test, on the Markdown files of the repository, on the fixtures, and on the status file
// when LINE_REFS_STATUS_FILE names it), by `npm run line-refs -- <file>` (any file: the project's status file in the Helme Brain
// is outside this repository) and by the pull request workflow (.github/workflows/pull-request.yml).
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

export type LineRef = { raw: string; file: string; from: number; to: number; line: number }

const EXT = '(?:tsx?|jsx?|mjs|cjs|json|md|mdx|sql|css|ya?ml|html|txt|toml|sh)'
const SEG = '(?:[\\w.@-]|\\[[\\w.-]+\\]|\\([\\w.-]+\\))+'
const PATH = `(?:${SEG}/)*${SEG}\\.${EXT}`
const RANGE = '(\\d+)(?:\\s*[-\\u2013\\u2014]\\s*(\\d+))?'
// path, then closing quotes/backticks/brackets, then ":N-M" or " dòng N-M" / " line N-M" / " (dòng N-M)"
const REF = new RegExp(
  `(?<![\\w./@:-])(${PATH})(?![\\w])(?:[\`'")\\]]*)(?::${RANGE}|[\\s,(]+(?:d\\u00f2ng|lines?)\\s+${RANGE})`,
  'giu',
)

/** Every line citation of a text, in the order they are written. */
export function lineRefsIn(text: string): LineRef[] {
  const out: LineRef[] = []
  const lineStarts = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1)
  const lineOf = (pos: number) => {
    let lo = 0
    let hi = lineStarts.length - 1
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= pos) lo = mid; else hi = mid - 1 }
    return lo + 1
  }
  for (const m of text.matchAll(REF)) {
    const [from, to] = m[2] !== undefined ? [m[2], m[3]] : [m[4], m[5]]
    out.push({ raw: m[0], file: m[1], from: Number(from), to: to === undefined ? Number(from) : Number(to), line: lineOf(m.index ?? 0) })
  }
  return out
}

/** The number of lines of a text (a closing newline does not start another line). */
export function lineCount(source: string): number {
  if (source === '') return 0
  const n = source.split('\n').length
  return source.endsWith('\n') ? n - 1 : n
}

// ---- finding the files ----------------------------------------------------------------------------------------------

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', '.vercel'])
let allFiles: string[] | null = null
/** Every file of the checkout, as a path from the repository root with "/" (node_modules and build folders are not searched). */
function repoFiles(): string[] {
  if (allFiles) return allFiles
  const found: string[] = []
  const walk = (dir: string) => {
    for (const n of readdirSync(path.join(ROOT, dir))) {
      if (SKIP_DIRS.has(n)) continue
      const rel = dir ? `${dir}/${n}` : n
      if (statSync(path.join(ROOT, rel)).isDirectory()) walk(rel)
      else found.push(rel)
    }
  }
  walk('')
  allFiles = found
  return found
}

const linesOfFile = (rel: string) => lineCount(readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n'))

export type Found = { path: string; lines: number }

/** The file(s) a citation names in this checkout, with their line counts: none when the file is not there. */
export function findHere(file: string): Found[] {
  const exact = file.includes('/') && existsSync(path.join(ROOT, file)) && statSync(path.join(ROOT, file)).isFile()
  const paths = exact ? [file] : repoFiles().filter(f => f === file || f.endsWith(`/${file}`))
  return paths.map(p => ({ path: p, lines: linesOfFile(p) }))
}

/** The line counts the same path (from the repository root) has on the other branches of this clone (local and origin). */
export function linesOnOtherBranches(rel: string): number[] {
  const refs = spawnSync('git', ['for-each-ref', '--format=%(refname)', 'refs/heads', 'refs/remotes/origin'], { cwd: ROOT, encoding: 'utf8' })
  if (refs.status !== 0) return []
  const out: number[] = []
  for (const ref of refs.stdout.split('\n').filter(Boolean)) {
    const shown = spawnSync('git', ['show', `${ref}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    if (shown.status === 0) out.push(lineCount(shown.stdout.replace(/\r\n/g, '\n')))
  }
  return out
}

// ---- the check ------------------------------------------------------------------------------------------------------

export type Lookup = {
  /** The file(s) in this checkout (empty: not here). */
  here: (file: string) => Found[]
  /**
   * The line counts of a path (from the repository root) on other branches. The status file talks about several branches at once,
   * and a file that is longer on another branch, or only exists there, is not a wrong citation. Asked only when the citation is too
   * long here, or the file is not here and the citation gives its whole path.
   */
  elsewhere?: (rel: string) => number[]
}
export const realLookup = (lenient: boolean): Lookup => ({ here: findHere, elsewhere: lenient ? linesOnOtherBranches : undefined })

export type RefReport = { problems: string[]; checked: number; unresolved: LineRef[] }

/**
 * Checks every citation of `text`. A citation is wrong when its numbers are not 1 <= N <= M, or when the file is here and shorter
 * than M (in every file of that name, and, if `lookup.elsewhere` is given, on every other branch too). A file that is not here is
 * `unresolved`, not a problem: it may belong to a branch that is not merged, and a machine cannot tell that from a typo in a name,
 * so the CLI lists them.
 */
export function lineRefReport(text: string, label: string, lookup: Lookup): RefReport {
  const problems: string[] = []
  const unresolved: LineRef[] = []
  let checked = 0
  for (const ref of lineRefsIn(text)) {
    const where = `${label}:${ref.line}`
    const cited = ref.from === ref.to ? `line ${ref.from}` : `lines ${ref.from}-${ref.to}`
    if (ref.from < 1 || ref.to < ref.from) { problems.push(`${where}: "${ref.raw}" is not a range of lines (${cited})`); checked++; continue }
    const here = lookup.here(ref.file)
    if (here.length === 0) {
      const other = lookup.elsewhere && ref.file.includes('/') ? lookup.elsewhere(ref.file) : []
      if (other.length === 0) { unresolved.push(ref); continue }
      checked++
      if (Math.max(...other) < ref.to) problems.push(`${where}: "${ref.raw}" cites ${cited} but ${ref.file} has at most ${Math.max(...other)} lines on any branch`)
      continue
    }
    checked++
    if (here.some(f => f.lines >= ref.to)) continue
    const longest = Math.max(...here.map(f => f.lines), ...(lookup.elsewhere ? here.flatMap(f => lookup.elsewhere!(f.path)) : []))
    if (longest >= ref.to) continue
    problems.push(`${where}: "${ref.raw}" cites ${cited} but ${here.map(f => f.path).join(' / ')} has only ${Math.max(...here.map(f => f.lines))} lines${lookup.elsewhere ? ' (and no branch has more)' : ''}`)
  }
  return { problems, checked, unresolved }
}

export const lineRefProblems = (text: string, label: string, lookup: Lookup = realLookup(false)): string[] => lineRefReport(text, label, lookup).problems

/** The Markdown files of the repository that are always checked: the ones in its root and everything under docs/. */
export function markdownFilesToCheck(): string[] {
  const out: string[] = []
  for (const n of readdirSync(ROOT)) if (/\.md$/i.test(n) && statSync(path.join(ROOT, n)).isFile()) out.push(n)
  const walk = (dir: string) => {
    if (!existsSync(path.join(ROOT, dir))) return
    for (const n of readdirSync(path.join(ROOT, dir))) {
      const rel = `${dir}/${n}`
      if (statSync(path.join(ROOT, rel)).isDirectory()) walk(rel)
      else if (/\.md$/i.test(n)) out.push(rel)
    }
  }
  walk('docs')
  return out.sort()
}
