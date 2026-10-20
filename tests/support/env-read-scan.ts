// A scan that answers "which files STILL read this variable?" by reading all of the code,
// so nobody has to remember the pages (T-0631).
//
// Why it exists: a status note said "NEXT_PUBLIC_APP_URL is still read in these pages" and
// listed the pages the writer remembered. The reviewer found API routes and email code that
// read it too, twice (lock `status-claim-not-grepped`). A claim about "everywhere a variable
// is read" must come from a scan, and a new reader must make a test fail.
//
// How it is used (tests/env-read-scan.test.ts): for a variable that something else replaced
// (SITE_URL replaced NEXT_PUBLIC_APP_URL), the test lists every file that still reads it
// next to an allow-list that gives a reason for each file. A file that reads it and is not on
// the list fails the test and is named; a file on the list that no longer reads it, or reads
// it on more lines than the list says, fails too, so the list stays true.
//
// Comments are skipped (a note that names the variable is not a read); strings are not
// (`process.env['NAME']` is a read). Nothing here is specific to one variable.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import path from 'node:path'

/** One allowed file: why it still reads the variable, and on how many lines of code. */
export interface ReadAllowance {
  reason: string
  /** Lines of code (not comments) that name the variable in this file. */
  lines: number
}
/** Keys are paths from the repository root with forward slashes, e.g. `src/lib/app-url.ts`. */
export type ReadAllowList = Record<string, ReadAllowance>

export interface Reader {
  file: string
  /** 1-based line numbers of the lines of code that name the variable. */
  lines: number[]
}

const CODE_FILE = /\.(?:[cm]?[jt]sx?)$/
const SKIP_DIRS = new Set(['node_modules', '.next', '.git'])

/**
 * The source text with comments blanked out (newlines kept, so line numbers stay right).
 * A small scanner that knows strings, template strings (with `${ ... }` inside them) and
 * regular-expression literals, so a `//` inside "https://..." does not start a comment and a
 * quote inside a regular expression does not start a string.
 */
export function stripComments(src: string): string {
  let out = ''
  let i = 0
  // Stack of what we are in: 'code', or a template string. `depth` counts { } inside a ${ ... } so the matching } returns to the template.
  const stack: Array<{ kind: 'code' | 'template'; depth: number }> = [{ kind: 'code', depth: 0 }]
  let lastSignificant = '' // the last non-space character of code, to tell a regex from a division
  const top = () => stack[stack.length - 1]
  while (i < src.length) {
    const c = src[i]
    const next = src[i + 1]
    if (top().kind === 'template') {
      if (c === '\\') { out += c + (next ?? ''); i += 2; continue }
      if (c === '`') { out += c; stack.pop(); lastSignificant = '`'; i++; continue }
      if (c === '$' && next === '{') { out += '${'; stack.push({ kind: 'code', depth: 0 }); lastSignificant = '{'; i += 2; continue }
      out += c; i++; continue
    }
    // code
    if (c === '/' && next === '/') { while (i < src.length && src[i] !== '\n') i++; continue }
    if (c === '/' && next === '*') {
      i += 2
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') out += '\n'; i++ }
      i += 2; continue
    }
    if (c === '"' || c === "'") {
      out += c; i++
      while (i < src.length && src[i] !== c && src[i] !== '\n') { if (src[i] === '\\') { out += src[i] + (src[i + 1] ?? ''); i += 2 } else { out += src[i]; i++ } }
      if (i < src.length) { out += src[i]; i++ }
      lastSignificant = c; continue
    }
    if (c === '`') { out += c; stack.push({ kind: 'template', depth: 0 }); i++; continue }
    if (c === '/' && (lastSignificant === '' || '(,=:[!&|?{};+-*%<>~^'.includes(lastSignificant) || /(?:return|typeof|case|in|of)$/.test(out.trimEnd().slice(-8)))) {
      // a regular-expression literal: copy it whole (a [...] class may hold a /)
      out += c; i++
      let inClass = false
      while (i < src.length && src[i] !== '\n') {
        const r = src[i]
        out += r; i++
        if (r === '\\') { out += src[i] ?? ''; i++; continue }
        if (r === '[') inClass = true
        else if (r === ']') inClass = false
        else if (r === '/' && !inClass) break
      }
      lastSignificant = '/'; continue
    }
    if (c === '{') top().depth++
    if (c === '}') {
      if (top().depth === 0 && stack.length > 1) { out += c; stack.pop(); i++; continue } // end of a ${ ... }
      top().depth--
    }
    out += c
    if (!/\s/.test(c)) lastSignificant = c
    i++
  }
  return out
}

function listCodeFiles(abs: string, out: string[] = []): string[] {
  if (!existsSync(abs)) return out
  const st = statSync(abs)
  if (st.isFile()) { if (CODE_FILE.test(abs)) out.push(abs); return out }
  for (const name of readdirSync(abs)) {
    if (SKIP_DIRS.has(name)) continue
    listCodeFiles(path.join(abs, name), out)
  }
  return out
}

/**
 * Every file under `places` (folders or single files, relative to `root`) that names `name`
 * in its code. `name` is matched as a whole word, so `NEXT_PUBLIC_APP_URL_X` is not a hit.
 */
export function findReaders(name: string, root: string, places: string[] = ['src']): Reader[] {
  const word = new RegExp(`(?<![A-Za-z0-9_$])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9_$])`)
  const found: Reader[] = []
  for (const place of places) {
    for (const abs of listCodeFiles(path.join(root, place))) {
      const code = stripComments(readFileSync(abs, 'utf8'))
      const lines: number[] = []
      code.split(/\r?\n/).forEach((line, i) => { if (word.test(line)) lines.push(i + 1) })
      if (lines.length) found.push({ file: path.relative(root, abs).split(path.sep).join('/'), lines })
    }
  }
  return found.sort((a, b) => a.file.localeCompare(b.file))
}

/** What is wrong between the files that read `name` and the list that explains them. Empty means the list is true and complete. */
export function readerProblems(name: string, readers: Reader[], allow: ReadAllowList): string[] {
  const problems: string[] = []
  const byFile = new Map(readers.map(r => [r.file, r]))
  for (const r of readers) {
    const a = allow[r.file]
    if (!a) {
      problems.push(`${r.file} reads ${name} (line ${r.lines.join(', ')}) and is not on the allow-list: use the constant that replaced it, or add the file to the list with the reason`)
    } else if (a.lines !== r.lines.length) {
      problems.push(`${r.file} reads ${name} on ${r.lines.length} line(s) (${r.lines.join(', ')}), the list says ${a.lines}: a new read? check it, then update the list`)
    }
  }
  for (const [file, a] of Object.entries(allow)) {
    if (!byFile.has(file)) problems.push(`${file} is on the allow-list but no longer reads ${name}: remove it from the list`)
    if (typeof a.reason !== 'string' || a.reason.trim().length < 20) problems.push(`${file}: the allow-list needs a reason of at least 20 characters`)
  }
  return problems
}
