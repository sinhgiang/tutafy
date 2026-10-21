// The table of lists whose length a human or an agent may write down (T-0646).
//
// The mistake it stops (lock count-claim-not-regrepped; the T-0631 and T-0638 reviews): a status report says "18 public files
// no longer have text-gray-400", but a later commit had put two more files in the list, so the true number was 20. The number was
// typed by hand and never counted again.
//
// The rule:
//   1. A number that counts a list in the code is written with a marker, never bare:  [count: PUBLIC_TEXT_FILES=20]
//   2. COUNTED_LISTS below maps each list name to a function that counts the real list in the real code: it imports an exported
//      array, or reads the literal of a constant in a file, or counts the `test(` calls of a test file.
//   3. countProblems(text) reads the markers of a text and reports a marker that names no list of the table, a marker whose number
//      is not the real count, a marker that is not written the way rule 1 says, and a list that cannot be counted in this checkout.
//   4. tests/counted-lists.test.ts checks the markers of every Markdown file in the repository (docs/, README.md), always.
//      `npm run counts` prints the numbers now (to copy), and `npm run counts -- <file>` checks the markers of any file, for
//      example the project's status file in the Helme Brain, which is outside this repository.
// To add a list: add a row here and run `npm run counts`. A list that a branch does not have yet cannot be counted: a marker for it
// is reported, so a number is never written for code that is not there.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const lf = (s: string) => s.replace(/\r\n/g, '\n')
const readRepo = (rel: string) => lf(readFileSync(path.join(ROOT, rel), 'utf8'))
const exists = (rel: string) => existsSync(path.join(ROOT, rel))

// ---- ways to count --------------------------------------------------------------------------------------------------

/** The items at the top level of the array literal of `const NAME = [ ... ]` (a constant that is not exported, so it is read, not imported). */
export function arrayLiteralLength(source: string, name: string): number {
  const decl = new RegExp(`(?:^|\\n)(?:export )?const ${name}\\b[^=\\n]*=\\s*\\[`).exec(source)
  if (!decl) throw new Error(`no "const ${name} = [" in the file`)
  let depth = 1
  let items = 0
  let sawContent = false
  let i = decl.index + decl[0].length
  for (; i < source.length && depth > 0; i++) {
    const c = source[i]
    if (c === "'" || c === '"' || c === '`') { // a string: skip to its end
      sawContent = true
      for (i++; i < source.length && source[i] !== c; i++) if (source[i] === '\\') i++
      continue
    }
    if (c === '/' && source[i + 1] === '/') { while (i < source.length && source[i] !== '\n') i++; continue }
    if (c === '/' && source[i + 1] === '*') { i = source.indexOf('*/', i + 2) + 1; continue }
    if (c === '[' || c === '{' || c === '(') { depth++; sawContent = true; continue }
    if (c === ']' || c === '}' || c === ')') { depth--; continue }
    if (c === ',' && depth === 1) { if (sawContent) items++; sawContent = false; continue }
    if (!/\s/.test(c)) sawContent = true
  }
  if (depth !== 0) throw new Error(`the array of ${name} is not closed`)
  return items + (sawContent ? 1 : 0)
}

/**
 * The alternatives of `const NAME = '(?:a|b|c)'`, a regular-expression list written as one string (the closed list of units in
 * tests/support/line-refs.ts): the `|` at the top level of its outer group, plus one. Brackets, groups and escapes are skipped.
 */
export function alternativesIn(source: string, name: string): number {
  const decl = new RegExp(`(?:^|\\n)(?:export )?const ${name}\\b[^=\\n]*=\\s*'((?:[^'\\\\\\n]|\\\\.)*)'`).exec(source)
  if (!decl) throw new Error(`no "const ${name} = '...'" in the file`)
  // the literal is JavaScript source: read it the way JavaScript does (an escaped letter is the letter, a doubled backslash one backslash)
  let body = new Function(`return '${decl[1]}'`)() as string
  const outer = /^\(\?:/.exec(body)
  if (outer && body.endsWith(')')) body = body.slice(outer[0].length, -1)
  let depth = 0
  let inClass = false
  let alternatives = 1
  for (let i = 0; i < body.length; i++) {
    const c = body[i]
    if (c === '\\') { i++; continue }
    if (inClass) { if (c === ']') inClass = false; continue }
    if (c === '[') inClass = true
    else if (c === '(') depth++
    else if (c === ')') depth--
    else if (c === '|' && depth === 0) alternatives++
  }
  return alternatives
}

/** How many tests a test file declares: its `test(` calls at the start of a line. */
export const testsIn = (source: string): number => (source.match(/^test(?:\.\w+)?\(/gm) ?? []).length

const literalOf = (file: string, name: string) => () => arrayLiteralLength(readRepo(file), name)
const testsOf = (file: string) => () => testsIn(readRepo(file))
const exportOf = (file: string, name: string) => async () => {
  const mod = (await import(pathToFileURL(path.join(ROOT, file)).href)) as Record<string, unknown>
  const value = mod[name]
  if (Array.isArray(value)) return value.length
  if (value && typeof value === 'object') return Object.keys(value).length
  throw new Error(`${file} exports no array or object named ${name}`)
}

function filesIn(dir: string, pattern: RegExp, out: string[] = []): string[] {
  for (const name of readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${name}`
    if (statSync(path.join(ROOT, rel)).isDirectory()) filesIn(rel, pattern, out)
    else if (pattern.test(name)) out.push(rel)
  }
  return out
}

// ---- the table ------------------------------------------------------------------------------------------------------

export interface CountedList {
  /** What the number counts, in words. */
  what: string
  /** The file that holds the list (it must exist for the list to be counted). */
  file: string
  /** The real count, read from the real code. */
  count(): number | Promise<number>
}

export const COUNTED_LISTS: Record<string, CountedList> = {
  PUBLIC_PAGES: { what: 'public pages that tests/accessibility.test.ts checks for one <main>', file: 'tests/accessibility.test.ts', count: literalOf('tests/accessibility.test.ts', 'PUBLIC_PAGES') },
  PUBLIC_TEXT_FILES: { what: 'files read for pale grey text by tests/accessibility.test.ts (the layouts above the pages are scanned besides)', file: 'tests/accessibility.test.ts', count: literalOf('tests/accessibility.test.ts', 'PUBLIC_TEXT_FILES') },
  ACCESSIBILITY_TESTS: { what: 'tests in tests/accessibility.test.ts', file: 'tests/accessibility.test.ts', count: testsOf('tests/accessibility.test.ts') },
  CLAIMS: { what: 'rows of the measure-claims table (kinds a home-made measure says it catches)', file: 'tests/support/measure-claims.ts', count: exportOf('tests/support/measure-claims.ts', 'CLAIMS') },
  MEASURE_FILES: { what: 'files whose comments the measure-claims test reads', file: 'tests/support/measure-claims.ts', count: exportOf('tests/support/measure-claims.ts', 'MEASURE_FILES') },
  LEFT_WITHOUT_ROW: { what: 'things the measure comments describe that the table leaves out, with a reason', file: 'tests/support/measure-claims.ts', count: exportOf('tests/support/measure-claims.ts', 'LEFT_WITHOUT_ROW') },
  MEASURE_CLAIM_TESTS: { what: 'tests in tests/measure-claims.test.ts', file: 'tests/measure-claims.test.ts', count: testsOf('tests/measure-claims.test.ts') },
  PROMISES: { what: 'rows of the Privacy promise table', file: 'tests/support/privacy-promises.ts', count: exportOf('tests/support/privacy-promises.ts', 'PROMISES') },
  OUT_OF_SCOPE: { what: 'absolute sentences of the Privacy page declared out of scope, with a reason', file: 'tests/support/privacy-promises.ts', count: exportOf('tests/support/privacy-promises.ts', 'OUT_OF_SCOPE') },
  PRIVACY_PROMISE_TESTS: { what: 'tests in tests/privacy-promises.test.ts', file: 'tests/privacy-promises.test.ts', count: testsOf('tests/privacy-promises.test.ts') },
  TEST_FILES: { what: 'test files (tests/*.test.ts) that npm test runs', file: 'tests', count: () => filesIn('tests', /\.test\.ts$/).filter(f => f.split('/').length === 2).length },
  LINE_REF_UNITS: { what: 'units of counting or measuring (test, ms, tệp, ...) that make a number NOT a line in a citation: the closed list UNIT of tests/support/line-refs.ts', file: 'tests/support/line-refs.ts', count: () => alternativesIn(readRepo('tests/support/line-refs.ts'), 'UNIT') },
  LINE_REF_TEST_UNITS: { what: 'unit words that tests/line-refs.test.ts writes out and tries one by one (TEST_UNIT_WORDS; not the regular expression UNIT, which is LINE_REF_UNITS)', file: 'tests/line-refs.test.ts', count: literalOf('tests/line-refs.test.ts', 'TEST_UNIT_WORDS') },
  STATUS_COUNT_TESTS: { what: 'tests in tests/status-counts.test.ts', file: 'tests/status-counts.test.ts', count: testsOf('tests/status-counts.test.ts') },
  COUNT_LIST_TESTS: { what: 'tests in tests/counted-lists.test.ts', file: 'tests/counted-lists.test.ts', count: testsOf('tests/counted-lists.test.ts') },
}

/** Every name of the table with its real count, or the reason it cannot be counted in this checkout. */
export async function currentCounts(): Promise<{ name: string; what: string; count: number | null; problem?: string }[]> {
  const out: { name: string; what: string; count: number | null; problem?: string }[] = []
  for (const [name, list] of Object.entries(COUNTED_LISTS)) {
    if (!exists(list.file)) { out.push({ name, what: list.what, count: null, problem: `${list.file} is not in this checkout` }); continue }
    try { out.push({ name, what: list.what, count: await list.count() }) } catch (e) { out.push({ name, what: list.what, count: null, problem: (e as Error).message }) }
  }
  return out
}

// ---- reading the markers of a text -----------------------------------------------------------------------------------

/** Every well-formed marker. The name is upper case with digits and underscores. */
const MARKER = /\[count:\s*([A-Z][A-Z0-9_]*)\s*=\s*(\d+)\s*\]/g
/** Anything that starts like a marker, well formed or not. */
const LOOKS_LIKE_MARKER = /\[count(?::|\s+[A-Za-z_]+\s*=)[^\]\n]*\]?/g

/** The example that docs/feature-map.md explains the convention with: it names no list and is not checked. Any other marker is. */
const EXAMPLE = '[count: NAME=N]'

export interface CountMarker { name: string; claimed: number; line: number }

export function countMarkers(text: string): CountMarker[] {
  const out: CountMarker[] = []
  const lines = lf(text).split('\n')
  lines.forEach((line, i) => { for (const m of line.matchAll(MARKER)) out.push({ name: m[1], claimed: Number(m[2]), line: i + 1 }) })
  return out
}

/**
 * Every way the markers of `text` and the code disagree; empty when they agree.
 * @param counts the real counts (default: counted now from the code); a parameter so the self-check can change one
 */
export async function countProblems(text: string, label = 'text', counts?: Awaited<ReturnType<typeof currentCounts>>): Promise<string[]> {
  const real = counts ?? await currentCounts()
  const byName = new Map(real.map(c => [c.name, c]))
  const out: string[] = []
  lf(text).split('\n').forEach((line, i) => {
    for (const m of line.matchAll(LOOKS_LIKE_MARKER)) {
      if (m[0] === EXAMPLE) continue // the one example the convention is explained with
      if (!new RegExp(`^${MARKER.source}$`).test(m[0])) out.push(`${label}:${i + 1}: "${m[0]}" is not written as [count: NAME=N] (NAME in capitals, N a whole number)`)
    }
  })
  for (const m of countMarkers(text)) {
    const list = byName.get(m.name)
    if (!list) { out.push(`${label}:${m.line}: [count: ${m.name}=${m.claimed}] names no list of tests/support/counted-lists.ts`); continue }
    if (list.count === null) { out.push(`${label}:${m.line}: [count: ${m.name}=${m.claimed}] cannot be checked here: ${list.problem}`); continue }
    if (list.count !== m.claimed) out.push(`${label}:${m.line}: [count: ${m.name}=${m.claimed}] but the code has ${list.count}`)
  }
  return out
}

/** The Markdown files of the repository whose markers are always checked. */
export const markdownFiles = (): string[] => [...(exists('README.md') ? ['README.md'] : []), ...filesIn('docs', /\.md$/)]
