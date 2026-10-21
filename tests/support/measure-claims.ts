// The table of what every home-made measure says it catches (T-0641).
//
// The mistake it stops (lock comment-claims-missing-check; the T-0616 and T-0629 reviews): the comment of a measure
// says "it catches this kind of element", but a filter in its code skips that very kind (for example "an icon-only
// round button must stay a circle" while the code ignores every button that holds an svg), so the measure stays
// green and checks nothing for that kind.
//
// The rule, kept by tests/measure-claims.test.ts (runs in `npm test`, no GitHub Actions):
//   1. every kind a measure claims has a row here: a small sample in the broken state and one in the right state;
//   2. the test runs the REAL measure on both samples: the broken one must be reported, the right one must pass;
//   3. in the files listed in MEASURE_FILES, every comment that claims a catch ("catches", "must stay", "no longer",
//      "is reported" ...) must carry a marker `[claim: <id>]` of a row of this table, and every row must be named
//      by a marker in its own file. A new claim without a row, or a row nobody claims, turns the test red.
//   4. one marker cannot answer for a list: when such a comment names a kind (a word of KIND_WORDS for its file: summary, tab,
//      checkbox, min-w-[Npx], style width ...), a row it marks must list that kind in `covers`; a row may only cover a kind
//      its file's KIND_WORDS knows. A kind the comment names in other words than KIND_WORDS holds is not seen (kept by hand).
// To add a measure: write its claim in the comment with [claim: id], add a row here, run the test. What the comments say
// but the table does not hold is listed, with the reason, in LEFT_WITHOUT_ROW.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { windowFor } from './mini-dom.ts'
import { nonSquareButtons, smallTextClasses, fixedWidthProblems, tablesWithoutFrame } from './mobile-scans.ts'
import { assertRateLimitHolds } from './rate-limit-check.ts'
import { createLimiter } from '@/lib/rate-limit-memory.ts'
import { NextRequest } from 'next/server.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

export interface MeasureClaim<S = string> {
  /** Written in the measure's comment as [claim: id]. */
  id: string
  /** Where the claim is written (path from the repository root). */
  file: string
  /** The kind of thing the measure says it catches, in words. */
  kind: string
  /**
   * The kind names (from KIND_WORDS of the file) this row stands for. A comment that names a kind must have, among the
   * rows it marks, one that covers that name: one row cannot stand in for a whole list of kinds (the T-0641 review).
   */
  covers: string[]
  /** One small sample holding exactly that kind, in the broken state. */
  broken: S
  /** The same kind in the right state. */
  good: S
  /** More samples of the same kind in other broken states (a checkbox with no label, a div with role="checkbox"). */
  moreBroken?: S[]
  /** More samples of the same kind in other right states (a square icon button, a link inside a sentence). */
  moreGood?: S[]
  /** Runs the REAL measure on a sample: true when it reports a problem. */
  run(sample: S): boolean | Promise<boolean>
}

// ---- scripts/mobile-audit.mjs (browser measure, run on HTML samples in a small fake page) -----------------------------

const auditModule = (async () => import(pathToFileURL(path.join(ROOT, 'scripts/mobile-audit.mjs')).href) as Promise<Record<string, (...a: unknown[]) => unknown[]>>)()

async function auditReports(measure: 'findSmallTargets' | 'findDistorted', html: string): Promise<boolean> {
  const m = await auditModule
  const win = windowFor(html)
  const env = (m as unknown as { makeHelpers(w: unknown): Record<string, unknown> }).makeHelpers(win)
  return (m[measure](env) as unknown[]).length > 0
}
const smallTarget = (html: string) => auditReports('findSmallTargets', html)
const distorted = (html: string) => auditReports('findDistorted', html)

// ---- the rate-limit check (src limits counted on something the caller can change) ----------------------------------

type Req = InstanceType<typeof NextRequest>
type Vary = Parameters<Parameters<typeof assertRateLimitHolds>[0]['call']>[0]
interface LimitSample {
  /** What the limit is counted on; `call` is the number of the call, from 0. */
  keyOf(req: Req, call: number): string | Promise<string>
  make(v: Vary): ReturnType<Vary['request']>
  fixed?: { kind: 'cookie' | 'header' | 'body' | 'url'; name: string; reason: string }[]
}

/** True when the shared check says the limit does NOT hold for a route counted on `keyOf`. */
async function rateLimitBroken(s: LimitSample): Promise<boolean> {
  const lim = createLimiter({ max: 4, windowMs: 60_000 })
  let calls = 0
  const handler = async (req: Req) => (lim.hit(await s.keyOf(req, calls++)) ? new Response('ok') : new Response('slow down', { status: 429 }))
  try {
    await assertRateLimitHolds({
      routeFile: 'sample/route.ts', limiter: 'guard', fixed: s.fixed ?? [],
      call: v => Promise.resolve(handler(s.make(v))),
      override: { source: 'const guard = createLimiter({ max: 4, windowMs: 60 * 1000 })', limit: 4 },
    })
    return false
  } catch { return true }
}
const EVERYONE = () => 'everyone'
const rateLimitRow = (id: string, kind: string, covers: string, keyOf: LimitSample['keyOf'], make: LimitSample['make']): MeasureClaim<LimitSample> => ({
  id, kind, covers: [covers], file: 'tests/support/rate-limit-check.ts',
  broken: { keyOf, make },
  good: { keyOf: EVERYONE, make },
  run: rateLimitBroken,
})

// ---- the table -------------------------------------------------------------------------------------------------------

const BTN = (style: string, inner = 'Save') => `<button style="${style}">${inner}</button>`
const SVG = '<svg style="left:4px;top:4px;width:12px;height:12px"></svg>'
const IMG = '<img src="/a.png" style="width:20px;height:20px">'
const row = (id: string, file: string, covers: string[], kind: string, broken: string, good: string, run: (s: string) => boolean | Promise<boolean>, more: { moreBroken?: string[]; moreGood?: string[] } = {}): MeasureClaim<string | LimitSample> =>
  ({ id, file, covers, kind, broken, good, run: s => run(s as string), ...more })
const AUDIT = 'scripts/mobile-audit.mjs'
const SCANS = 'tests/support/mobile-scans.ts'

export const CLAIMS: MeasureClaim<string | LimitSample>[] = [
  // --- findSmallTargets: one row for every kind its comment names ---
  row('small-target-button', AUDIT, ['button'], 'a button with a text label',
    BTN('width:80px;height:30px'), BTN('width:80px;height:44px'), smallTarget,
    { moreBroken: ['<div role="button" style="width:80px;height:30px">Save</div>'] }),
  row('small-target-link', AUDIT, ['link'], 'a stand-alone link',
    '<a href="/x" style="display:block;width:100px;height:30px">Open</a>', '<a href="/x" style="display:block;width:100px;height:44px">Open</a>', smallTarget,
    { moreGood: ['<p>See <a href="/x" style="display:inline;width:50px;height:16px">the terms</a> for details</p>'] }), // a link inside a sentence is not a stand-alone target
  row('small-target-field', AUDIT, ['field'], 'a text field',
    '<input type="text" style="width:200px;height:30px">', '<input type="text" style="width:200px;height:44px">', smallTarget),
  row('small-target-select', AUDIT, ['select'], 'a select box (a drop-down list)',
    '<select style="width:200px;height:30px"></select>', '<select style="width:200px;height:44px"></select>', smallTarget),
  row('small-target-textarea', AUDIT, ['textarea'], 'a textarea (a multi-line text box)',
    '<textarea style="width:200px;height:30px"></textarea>', '<textarea style="width:200px;height:44px"></textarea>', smallTarget),
  row('small-target-summary', AUDIT, ['summary'], 'a summary (the line that opens a details box)',
    '<details><summary style="width:200px;height:30px">More</summary></details>', '<details><summary style="width:200px;height:44px">More</summary></details>', smallTarget),
  row('small-target-tab', AUDIT, ['tab'], 'a tab (an element with role="tab")',
    '<div role="tab" style="width:80px;height:30px">Plans</div>', '<div role="tab" style="width:80px;height:44px">Plans</div>', smallTarget),
  row('small-target-menuitem', AUDIT, ['menu item'], 'a menu item',
    '<div role="menuitem" style="width:120px;height:30px">Settings</div>', '<div role="menuitem" style="width:120px;height:44px">Settings</div>', smallTarget),
  row('small-target-checkbox', AUDIT, ['checkbox'], 'a checkbox: small inside a label that is under 44px high, or with no label at all; fine when its label is 44px high',
    '<label style="width:200px;height:30px"><input type="checkbox" style="width:20px;height:20px">Remember me</label>',
    '<label style="width:200px;height:44px"><input type="checkbox" style="width:20px;height:20px">Remember me</label>', smallTarget,
    { moreBroken: ['<input type="checkbox" style="width:20px;height:20px">', '<div role="checkbox" style="width:20px;height:20px"></div>'] }),
  row('small-target-icon-button', AUDIT, ['button'], 'an icon-only button (an svg and no text) that is short',
    BTN('width:44px;height:28px', SVG), BTN('width:44px;height:44px', SVG), smallTarget),
  row('small-target-icon-button-narrow', AUDIT, ['button'], 'an icon-only button (an svg and no text) that is narrow but 44px high',
    BTN('width:28px;height:44px', SVG), BTN('width:44px;height:44px', SVG), smallTarget),
  row('small-target-switch', AUDIT, ['switch'], 'a switch (its invisible touch box is what counts)',
    '<button role="switch" data-after="30x30" style="width:36px;height:20px"></button>', '<button role="switch" data-after="44x44" style="width:36px;height:20px"></button>', smallTarget),
  // --- findDistorted ---
  row('distorted-switch', AUDIT, ['switch'], 'a switch stretched into a circle with its knob half way',
    '<button role="switch" style="width:44px;height:44px;border-radius:9999px"><span style="left:16px;top:15px;width:14px;height:14px"></span></button>',
    '<button role="switch" style="width:36px;height:20px;border-radius:9999px"><span style="left:20px;top:3px;width:14px;height:14px"></span></button>', distorted),
  row('distorted-round-icon-button-svg', AUDIT, ['button', 'svg'], 'a fully rounded button holding only an svg, stretched to a pill',
    BTN('width:60px;height:44px;border-radius:9999px', SVG), BTN('width:44px;height:44px;border-radius:9999px', SVG), distorted),
  row('distorted-round-icon-button-img', AUDIT, ['img'], 'a fully rounded button holding only an img, stretched to a pill',
    BTN('width:60px;height:44px;border-radius:9999px', IMG), BTN('width:44px;height:44px;border-radius:9999px', IMG), distorted),
  row('distorted-round-icon-button-font', AUDIT, ['font'], 'a fully rounded button whose icon is a font (no svg, no img, no text in it), stretched to a pill',
    BTN('width:60px;height:44px;border-radius:9999px', ''), BTN('width:44px;height:44px;border-radius:9999px', ''), distorted),
  // --- tests/support/mobile-scans.ts (source scans, run on a few lines of a page) ---
  row('non-square-button', SCANS, ['button', 'switch', 'square button'], 'a button drawn at a fixed width and height that differ, without role="switch"',
    '<button onClick={go} className="relative inline-flex h-5 w-9 rounded-full"><span /></button>',
    '<button role="switch" aria-checked={on} onClick={go} className="relative inline-flex h-5 w-9 rounded-full"><span /></button>',
    s => nonSquareButtons(s).some(b => !b.isSwitch || !b.checked),
    { moreGood: ['<button onClick={go} className="inline-flex h-7 w-7 rounded-full"><span /></button>'] }), // a square icon button just grows to 44 square
  row('small-text-class', SCANS, ['text-[Npx]'], 'a page that uses a text size under 14px written in px',
    '<p className="text-[11px] text-gray-400">small</p>', '<p className="text-[14px] text-gray-400">fine</p>', s => smallTextClasses(s).length > 0),
  row('small-text-class-rem', SCANS, ['text-[Nrem]'], 'a page that uses a text size under 14px written in rem',
    '<p className="text-[0.8rem] text-gray-400">small</p>', '<p className="text-[1rem] text-gray-400">fine</p>', s => smallTextClasses(s).length > 0),
  row('small-text-class-xs', SCANS, ['text-xs'], 'a page that uses text-xs',
    '<p className="text-xs text-gray-400">small</p>', '<p className="text-sm text-gray-400">fine</p>', s => smallTextClasses(s).length > 0),
  row('fixed-width', SCANS, ['w-[Npx]'], 'a fixed width over 360px with no breakpoint',
    '<div className="w-[420px] p-4">x</div>', '<div className="w-[320px] md:w-[420px] p-4">x</div>', s => fixedWidthProblems('sample.tsx', s).length > 0),
  row('fixed-width-min', SCANS, ['min-w-[Npx]'], 'a fixed minimum width over 360px',
    '<div className="min-w-[500px] p-4">x</div>', '<div className="min-w-[300px] p-4">x</div>', s => fixedWidthProblems('sample.tsx', s).length > 0),
  row('fixed-width-style', SCANS, ['style width'], 'a width over 360px written in the style attribute',
    '<div style={{ width: 500 }}>x</div>', '<div style={{ width: 300 }}>x</div>', s => fixedWidthProblems('sample.tsx', s).length > 0),
  row('fixed-width-grid', SCANS, ['grid-cols'], 'a grid with fixed-pixel columns and no breakpoint prefix',
    '<div className="grid grid-cols-[200px_1fr]">x</div>', '<div className="grid md:grid-cols-[200px_1fr]">x</div>', s => fixedWidthProblems('sample.tsx', s).length > 0),
  row('table-without-frame', SCANS, ['table'], 'a table with no sideways-scrolling frame around it',
    '<div className="bg-white">\n  <table className="w-full">\n</table></div>', '<div className="overflow-x-auto">\n  <table className="w-full">\n</table></div>', s => tablesWithoutFrame('sample.tsx', s).length > 0),
  // --- tests/support/rate-limit-check.ts (T-0616) ---
  rateLimitRow('rate-limit-cookie', 'a limit counted on a cookie the caller makes up', 'cookie', req => req.cookies.get('sid')?.value ?? 'none', v => v.request({ cookies: { sid: v.uuid() } })) as MeasureClaim<string | LimitSample>,
  rateLimitRow('rate-limit-header', 'a limit counted on a header the caller sets', 'header', req => req.headers.get('x-forwarded-for') ?? 'none', v => v.request({ headers: { 'x-forwarded-for': v.ip() } })) as MeasureClaim<string | LimitSample>,
  rateLimitRow('rate-limit-body', 'a limit counted on a field of the request body', 'body', async req => String(((await req.json()) as Record<string, unknown>).email ?? 'none'), v => v.request({ body: { email: v.email() } })) as MeasureClaim<string | LimitSample>,
  // a part the route reads only from the second call on: the check must still see it ([claim: rate-limit-second-call])
  { id: 'rate-limit-second-call', file: 'tests/support/rate-limit-check.ts', covers: [], kind: 'a request part the route reads only from the second call on, set to the same value every time',
    broken: { keyOf: (req, call) => (call === 0 ? 'always-the-same' : req.cookies.get('sid')?.value ?? 'none'), make: v => v.request({ cookies: { sid: 'always-the-same' } }) },
    good: { keyOf: (req, call) => (call === 0 ? 'always-the-same' : req.cookies.get('sid')?.value ?? 'none'), make: v => v.request({ cookies: { sid: 'always-the-same' } }), fixed: [{ kind: 'cookie', name: 'sid', reason: 'the one identity this limit counts, on purpose' }] },
    run: rateLimitBroken } as MeasureClaim<string | LimitSample>,
  rateLimitRow('rate-limit-url', 'a limit counted on a query parameter', 'query', req => req.nextUrl.searchParams.get('email') ?? 'none', v => v.request({ query: { email: v.email() } } as never)) as MeasureClaim<string | LimitSample>,
]

/**
 * The kind names a comment of each measure file may use, each with the words that name it. A comment in the file that
 * is marked with [claim: ...] and uses one of these words must also mark a row that lists the name in `covers`.
 * This list is kept by hand: a kind the comment names in other words is not seen (a measure with a new kind adds its name here).
 */
export const KIND_WORDS: Record<string, [name: string, words: RegExp][]> = {
  [AUDIT]: [
    ['button', /\bbuttons?\b/i], ['link', /\blinks?\b/i], ['field', /\bfields?\b/i], ['select', /\bselects?\b/i], ['textarea', /\btextareas?\b/i],
    ['summary', /\bsummary\b/i], ['tab', /\btabs?\b/i], ['menu item', /\bmenu items?\b/i], ['checkbox', /\bcheckbox(?:es)?\b/i],
    ['switch', /\bswitch(?:es)?\b/i], ['svg', /\bsvg\b/i], ['img', /\bimg\b/i], ['font', /\bfont\b/i],
  ],
  [SCANS]: [
    ['button', /\bbuttons?\b/i], ['switch', /\bswitch\b/i], ['square button', /\bsquare icon buttons?\b/i],
    ['text-[Npx]', /\btext-\[\d+px\]/], ['text-[Nrem]', /\btext-\[[\d.]+rem\]/], ['text-xs', /\btext-xs\b/],
    ['w-[Npx]', /(?<![-\w])w-\[\d+px\]/], ['min-w-[Npx]', /\bmin-w-\[\d+px\]/], ['style width', /style=\{\{\s*width/], ['grid-cols', /\bgrid-cols\b|fixed-pixel columns/],
    ['table', /<table>|\btables?\b/i],
  ],
  'tests/support/rate-limit-check.ts': [
    ['cookie', /\bcookies?\b/i], ['header', /\bheaders?\b/i], ['query', /\bquery\b/i], ['body', /\bbody\b/i],
  ],
}

/**
 * What the comments of the measures say but the table does not hold, and why (kept by hand, shown in docs/feature-map.md).
 * Not a hidden gap: the comments of these measures only describe, none of them claims a catch.
 */
export const LEFT_WITHOUT_ROW: { what: string; why: string }[] = [
  { what: 'audit() in scripts/mobile-audit.mjs: sideways scroll, content cut inside a card, text under 14px by the real font size, images wider than their frame, labels that break onto two lines, text over text',
    why: 'the comments describe what is measured and claim no catch; the fake page has no layout engine, no TreeWalker and no Range, so a row would test the sample and not the measure. Their numbers are taken by hand (docs/feature-map.md, "Phone check").' },
  { what: 'the file-top comment of scripts/mobile-audit.mjs ("text under 14px, images wider than their frame")',
    why: 'it lists what the whole script looks at, not what one function catches; the functions that catch a kind have their own marked comments (findSmallTargets, findDistorted).' },
  { what: 'limitersIn, hasOtherLimitSignal and checksIn in tests/rate-limits.test.ts (the T-0616 source scans)',
    why: 'they already have their own scanner self-check in that file (a few made-up routes, each of which must be seen or must not be), so a second table would only repeat it; the file is not in MEASURE_FILES.' },
  { what: 'the read forms listed at the top of tests/support/rate-limit-check.ts (getAll, loops, text(), nested fields, formData() throwing)',
    why: 'each already has a real test in tests/rate-limits.test.ts ("query parameters: ...", "cookies: ...", "headers: ...", "body: ...", "reads the check cannot follow ..."); the table has the four kinds of request part and the second-call rule.' },
]

/** The files whose comments are checked for claims. */
export const MEASURE_FILES = [
  'scripts/mobile-audit.mjs',
  'tests/support/mobile-scans.ts',
  'tests/support/rate-limit-check.ts',
]

/** Words that make a comment a claim about what a measure catches. Kept narrow on purpose: a comment that only describes is not a claim. */
export const CLAIM_WORDS = /\b(catch(?:es)?|caught|must stay|must keep|must still|no longer|is reported|are reported|is flagged|are flagged)\b/i

/** A comment block: consecutive comment lines (// ... or inside /* ... *\/), with the line it starts on. */
export function commentBlocks(src: string): { line: number; text: string }[] {
  const lines = src.split(/\r?\n/)
  const blocks: { line: number; text: string }[] = []
  let current: { line: number; text: string } | null = null
  let currentKind: 'line' | 'block' | null = null // a /* */ block and a run of // lines are separate blocks, so a claim added after a marked block has to carry its own marker
  let inBlock = false
  lines.forEach((raw, i) => {
    const t = raw.trim()
    let comment: string | null = null
    let kind: 'line' | 'block' = 'line'
    if (inBlock) { kind = 'block'; comment = t.replace(/\*\/.*$/, ''); if (/\*\//.test(t)) inBlock = false }
    else if (t.startsWith('/*')) { kind = 'block'; comment = t; if (!/\*\//.test(t)) inBlock = true }
    else if (t.startsWith('//')) comment = t
    else {
      const idx = raw.indexOf(' // ') // a trailing comment after code
      if (idx > 0) comment = raw.slice(idx)
    }
    if (comment === null) { current = null; currentKind = null; return }
    if (!current || currentKind !== kind) { current = { line: i + 1, text: '' }; currentKind = kind; blocks.push(current) }
    current.text += ' ' + comment.replace(/^\s*(?:\/\/+|\/\*+|\*+\/?|\*)\s?/, '')
  })
  return blocks
}

/** Everything wrong between the comments of the measure files and the table. Empty means every claim has its row and every row its claim. */
export function claimProblems(claims: { id: string; file: string }[], files: Record<string, string>): string[] {
  const problems: string[] = []
  const ids = new Set(claims.map(c => c.id))
  const markersByFile = new Map<string, Set<string>>()
  for (const [file, src] of Object.entries(files)) {
    const found = new Set<string>()
    for (const b of commentBlocks(src)) {
      const markers = [...b.text.matchAll(/\[claim: ([\w-]+)\]/g)].map(m => m[1])
      markers.forEach(m => found.add(m))
      for (const m of markers) if (!ids.has(m)) problems.push(`${file}:${b.line}: [claim: ${m}] has no row in the table (tests/support/measure-claims.ts)`)
      if (CLAIM_WORDS.test(b.text) && !markers.length) problems.push(`${file}:${b.line}: a comment claims a catch ("${(CLAIM_WORDS.exec(b.text) ?? [''])[0]}") with no [claim: id] marker and so no row in the table`)
    }
    markersByFile.set(file, found)
  }
  for (const c of claims) {
    if (!markersByFile.get(c.file)?.has(c.id)) problems.push(`row ${c.id}: nobody claims it, write [claim: ${c.id}] in a comment of ${c.file} (or remove the row)`)
  }
  const seen = new Set<string>()
  for (const c of claims) { if (seen.has(c.id)) problems.push(`row ${c.id} is listed twice`); seen.add(c.id) }
  return problems
}

/**
 * The comment of a measure that marks rows and names a kind (a word of KIND_WORDS for its file) must mark a row that covers
 * that kind. So a list of kinds in one comment ("summary, tab, menu item, checkbox") cannot be answered by one row, and a row
 * may only cover names its file knows. Empty means every named kind has its own row.
 */
export function kindProblems(claims: { id: string; file: string; covers: string[] }[], files: Record<string, string>, kindWords: Record<string, [string, RegExp][]> = KIND_WORDS): string[] {
  const problems: string[] = []
  for (const [file, src] of Object.entries(files)) {
    const kinds = kindWords[file]
    if (!kinds) continue
    const known = new Set(kinds.map(k => k[0]))
    for (const b of commentBlocks(src)) {
      const marked = [...b.text.matchAll(/\[claim: ([\w-]+)\]/g)].map(m => m[1])
      if (!marked.length) continue
      const covered = new Set(claims.filter(c => c.file === file && marked.includes(c.id)).flatMap(c => c.covers))
      const text = b.text.replace(/\[claim: [\w-]+\]/g, ' ')
      for (const [name, words] of kinds) {
        if (words.test(text) && !covered.has(name)) problems.push(`${file}:${b.line}: the comment names "${name}" but no row it marks covers it (add a row with covers: ['${name}'] and mark it here, or take the word out of the comment)`)
      }
    }
    for (const c of claims) {
      if (c.file !== file) continue
      for (const name of c.covers) if (!known.has(name)) problems.push(`row ${c.id}: covers "${name}", which is not a kind of ${file} (KIND_WORDS)`)
    }
  }
  return problems
}

export const readRepoFile =(rel: string) => readFileSync(path.join(ROOT, rel), 'utf8')
