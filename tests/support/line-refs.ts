// T-0684: a line citation ("src/lib/x.ts dòng 40-52", "src/lib/x.ts:40-52") must point inside the file it names.
//
// The mistake it stops (lock line-ref-not-recounted; the T-0646 and T-0676 reviews): a report quotes "file lines N-M" as the
// proof of a claim, but the last line is past the end of the file (or the file was never opened again after an edit). A reader who
// follows the citation lands nowhere. What is checked here is the part a machine can know for sure: the file exists in this
// checkout and N and M are lines of it (1 <= N <= M <= the number of lines). Whether the lines still show the claim is a human's
// check; a citation that is merely out of date but still inside the file passes.
//
// NOT read (so not checked): a line number with no file name in the same phrase ("dòng 80" alone, "(dòng 23-24)" after a
// sentence that named the file earlier), the form "path#L40", a number written in words, a file name without one of the
// extensions below, and a path written with "\" . Only the numbers of a phrase that names the file are checked.
//
// Forms read:   `path` dòng N      `path` dòng N-M      path:N      path:N-M      path line N      path lines N-M
//               a LIST after any of them, every number and every range is checked:  `path` dòng 64 và 99   dòng 75, 88
//               dòng 163 và 280-281   path:10-12, 40   path lines 3 and 9   (separators: ", ", " và ", ", và ", " and ")
//               the numbers first:  dòng 75-93 của `path`   dòng 64 và 99 của path   lines 3-9 of path   dòng 5 trong tệp path
// (a "-", an en dash or an em dash between N and M). In a list EVERY number is a line, whatever word follows it ("dòng 10 và 83
// kiểm" checks 83), except a number followed by a unit of counting or measuring, which counts something else: "dòng 12 và 300 test
// khác" and "dòng 196, 45 ký tự" read only 12 and 196 (the units are the closed list UNIT below: test, ký tự, chars, ms, giây, phút,
// giờ, ngày, tệp, files, lần, dòng, bytes, trang, mục, ... ; a unit that is not on it is read as a line, so add it there). A bare
// number after a comma is always a line, so write "dòng 18-20, trả mã 401" and not "dòng 18-20, 401" (401 is not a line of the
// file). A path is a name with an extension of source, data or text (ts, tsx, js, mjs,
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
const ITEM = '\\d+(?!\\d)(?:\\s*[-\\u2013\\u2014]\\s*\\d+(?!\\d))?'
// The words that make a number NOT a line: a unit of counting or measuring. "dòng 12 và 300 test khác", "dòng 196, 45 ký tự",
// "dòng 5 và 40 ms": the number after the comma or "và" counts tests, characters, milliseconds. ONLY a unit lets a number off: a
// number followed by anything else (a verb, a noun, no word at all) is read as a line, so "dòng 10 và 83 kiểm" is checked against 83.
// The units are a closed list kept by hand, and what is not on it is read as a line (a new unit is added here and in the test).
const UNIT = '(?:tests?|k[ýí] tự|chars?|characters?|ms|gi\u00e2y|seconds?|secs?|ph\u00fat|minutes?|mins?|gi\u1edd|hours?|ng\u00e0y|days?|t\u1ec7p|files?|l\u1ea7n|times|d\u00f2ng|lines?|bytes?|kb|mb|trang|pages?|m\u1ee5c|items?|c\u00e1i|ch\u1ed7|bản|ng\u01b0\u1eddi|gia s\u01b0|h\u1ecdc sinh|bu\u1ed5i|lessons?|students?|tutors?|%)'
// A number after ", " / " và " / " and " is one more line of the same citation, unless a unit follows it. The first number is always a line.
const MORE = `(?:\\s*,\\s*(?:(?:v\\u00e0|and)\\s+)?|\\s+(?:v\\u00e0|and)\\s+)${ITEM}(?!\\s*${UNIT}(?!\\p{L}))`
const LIST = `${ITEM}(?:${MORE})*`
const OF = '(?:c\\u1ee7a|\\u1edf|trong|of|in)'
// 1. path, then closing quotes/backticks/brackets, then ":LIST" or " dòng LIST" / " line LIST" / " (dòng LIST)"
const PATH_FIRST = new RegExp(
  `(?<![\\w./@:-])(${PATH})(?![\\w])(?:[\`'")\\]]*)(?::(${LIST})|[\\s,(]+(?:d\\u00f2ng|lines?)\\s+(${LIST}))`,
  'giu',
)
// 2. "dòng LIST của `path`", "lines LIST of path", "dòng LIST trong tệp path"
const NUMBER_FIRST = new RegExp(
  `(?<![\\p{L}\\d])(?:d\\u00f2ng|lines?)\\s+(${LIST})\\s+${OF}\\s+(?:(?:t\\u1ec7p|file)\\s+)?[\`'"(]*(${PATH})(?![\\w])`,
  'giu',
)

/** The lines a list of numbers names: "64 và 99" -> 64 and 99, "163 và 280-281" -> 163 and 280-281. */
function itemsOf(list: string): { from: number; to: number }[] {
  return [...list.matchAll(/(\d+)(?:\s*[-–—]\s*(\d+))?/g)].map(m => ({ from: Number(m[1]), to: m[2] === undefined ? Number(m[1]) : Number(m[2]) }))
}

/** Every line citation of a text, in the order they are written; a list of lines gives one citation for each number or range. */
export function lineRefsIn(text: string): LineRef[] {
  const lineStarts = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1)
  const lineOf = (pos: number) => {
    let lo = 0
    let hi = lineStarts.length - 1
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= pos) lo = mid; else hi = mid - 1 }
    return lo + 1
  }
  const found: { start: number; end: number; refs: LineRef[] }[] = []
  for (const m of text.matchAll(PATH_FIRST)) {
    const start = m.index ?? 0
    found.push({ start, end: start + m[0].length, refs: itemsOf(m[2] ?? m[3]).map(i => ({ raw: m[0], file: m[1], ...i, line: lineOf(start) })) })
  }
  for (const m of text.matchAll(NUMBER_FIRST)) {
    const start = m.index ?? 0
    found.push({ start, end: start + m[0].length, refs: itemsOf(m[1]).map(i => ({ raw: m[0], file: m[2], ...i, line: lineOf(start) })) })
  }
  found.sort((a, b) => a.start - b.start)
  const out: LineRef[] = []
  let readUpTo = 0
  for (const f of found) {
    if (f.start < readUpTo) continue // inside a citation already read
    out.push(...f.refs)
    readUpTo = f.end
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
