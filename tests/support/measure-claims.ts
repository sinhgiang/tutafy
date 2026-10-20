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
// To add a measure: write its claim in the comment with [claim: id], add a row here, run the test.
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
  /** One small sample holding exactly that kind, in the broken state. */
  broken: S
  /** The same kind in the right state. */
  good: S
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
const rateLimitRow = (id: string, kind: string, keyOf: LimitSample['keyOf'], make: LimitSample['make']): MeasureClaim<LimitSample> => ({
  id, kind, file: 'tests/support/rate-limit-check.ts',
  broken: { keyOf, make },
  good: { keyOf: EVERYONE, make },
  run: rateLimitBroken,
})

// ---- the table -------------------------------------------------------------------------------------------------------

const BTN = (style: string, inner = 'Save') => `<button style="${style}">${inner}</button>`
const SVG = '<svg style="left:4px;top:4px;width:12px;height:12px"></svg>'

export const CLAIMS: MeasureClaim<string | LimitSample>[] = [
  // --- findSmallTargets ---
  { id: 'small-target-button', file: 'scripts/mobile-audit.mjs', kind: 'a button with a text label',
    broken: BTN('width:80px;height:30px'), good: BTN('width:80px;height:44px'), run: s => smallTarget(s as string) },
  { id: 'small-target-link', file: 'scripts/mobile-audit.mjs', kind: 'a stand-alone link',
    broken: '<a href="/x" style="display:block;width:100px;height:30px">Open</a>', good: '<a href="/x" style="display:block;width:100px;height:44px">Open</a>', run: s => smallTarget(s as string) },
  { id: 'small-target-field', file: 'scripts/mobile-audit.mjs', kind: 'a text field',
    broken: '<input type="text" style="width:200px;height:30px">', good: '<input type="text" style="width:200px;height:44px">', run: s => smallTarget(s as string) },
  { id: 'small-target-icon-button', file: 'scripts/mobile-audit.mjs', kind: 'an icon-only button (an svg and no text), narrow or short',
    broken: BTN('width:28px;height:28px', SVG), good: BTN('width:44px;height:44px', SVG), run: s => smallTarget(s as string) },
  { id: 'small-target-switch', file: 'scripts/mobile-audit.mjs', kind: 'a switch (its invisible touch box is what counts)',
    broken: '<button role="switch" data-after="30x30" style="width:36px;height:20px"></button>', good: '<button role="switch" data-after="44x44" style="width:36px;height:20px"></button>', run: s => smallTarget(s as string) },
  // --- findDistorted ---
  { id: 'distorted-switch', file: 'scripts/mobile-audit.mjs', kind: 'a switch stretched into a circle with its knob half way',
    broken: '<button role="switch" style="width:44px;height:44px;border-radius:9999px"><span style="left:16px;top:15px;width:14px;height:14px"></span></button>',
    good: '<button role="switch" style="width:36px;height:20px;border-radius:9999px"><span style="left:20px;top:3px;width:14px;height:14px"></span></button>', run: s => distorted(s as string) },
  { id: 'distorted-round-icon-button-svg', file: 'scripts/mobile-audit.mjs', kind: 'a fully rounded button holding only an svg, stretched to a pill',
    broken: BTN('width:60px;height:44px;border-radius:9999px', SVG), good: BTN('width:44px;height:44px;border-radius:9999px', SVG), run: s => distorted(s as string) },
  { id: 'distorted-round-icon-button-img', file: 'scripts/mobile-audit.mjs', kind: 'a fully rounded button holding only an img, stretched to a pill',
    broken: BTN('width:60px;height:44px;border-radius:9999px', '<img src="/a.png" style="width:20px;height:20px">'), good: BTN('width:44px;height:44px;border-radius:9999px', '<img src="/a.png" style="width:20px;height:20px">'), run: s => distorted(s as string) },
  // --- tests/support/mobile-scans.ts (source scans, run on a few lines of a page) ---
  { id: 'non-square-button', file: 'tests/support/mobile-scans.ts', kind: 'a button drawn at a fixed width and height that differ, without role="switch"',
    broken: '<button onClick={go} className="relative inline-flex h-5 w-9 rounded-full"><span /></button>',
    good: '<button role="switch" aria-checked={on} onClick={go} className="relative inline-flex h-5 w-9 rounded-full"><span /></button>',
    run: s => nonSquareButtons(s as string).some(b => !b.isSwitch || !b.checked) },
  { id: 'small-text-class', file: 'tests/support/mobile-scans.ts', kind: 'a page that uses a text size under 14px',
    broken: '<p className="text-[11px] text-gray-400">small</p>', good: '<p className="text-[14px] text-gray-400">fine</p>', run: s => smallTextClasses(s as string).length > 0 },
  { id: 'fixed-width', file: 'tests/support/mobile-scans.ts', kind: 'a fixed width over 360px with no breakpoint',
    broken: '<div className="w-[420px] p-4">x</div>', good: '<div className="w-[320px] md:w-[420px] p-4">x</div>', run: s => fixedWidthProblems('sample.tsx', s as string).length > 0 },
  { id: 'table-without-frame', file: 'tests/support/mobile-scans.ts', kind: 'a table with no sideways-scrolling frame around it',
    broken: '<div className="bg-white">\n  <table className="w-full">\n</table></div>', good: '<div className="overflow-x-auto">\n  <table className="w-full">\n</table></div>', run: s => tablesWithoutFrame('sample.tsx', s as string).length > 0 },
  // --- tests/support/rate-limit-check.ts (T-0616) ---
  rateLimitRow('rate-limit-cookie', 'a limit counted on a cookie the caller makes up', req => req.cookies.get('sid')?.value ?? 'none', v => v.request({ cookies: { sid: v.uuid() } })) as MeasureClaim<string | LimitSample>,
  rateLimitRow('rate-limit-header', 'a limit counted on a header the caller sets', req => req.headers.get('x-forwarded-for') ?? 'none', v => v.request({ headers: { 'x-forwarded-for': v.ip() } })) as MeasureClaim<string | LimitSample>,
  rateLimitRow('rate-limit-body', 'a limit counted on a field of the request body', async req => String(((await req.json()) as Record<string, unknown>).email ?? 'none'), v => v.request({ body: { email: v.email() } })) as MeasureClaim<string | LimitSample>,
  // a part the route reads only from the second call on: the check must still see it ([claim: rate-limit-second-call])
  { id: 'rate-limit-second-call', file: 'tests/support/rate-limit-check.ts', kind: 'a request part the route reads only from the second call on, set to the same value every time',
    broken: { keyOf: (req, call) => (call === 0 ? 'always-the-same' : req.cookies.get('sid')?.value ?? 'none'), make: v => v.request({ cookies: { sid: 'always-the-same' } }) },
    good: { keyOf: (req, call) => (call === 0 ? 'always-the-same' : req.cookies.get('sid')?.value ?? 'none'), make: v => v.request({ cookies: { sid: 'always-the-same' } }), fixed: [{ kind: 'cookie', name: 'sid', reason: 'the one identity this limit counts, on purpose' }] },
    run: rateLimitBroken } as MeasureClaim<string | LimitSample>,
  rateLimitRow('rate-limit-url', 'a limit counted on a query parameter', req => req.nextUrl.searchParams.get('email') ?? 'none', v => v.request({ query: { email: v.email() } } as never)) as MeasureClaim<string | LimitSample>,
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

export const readRepoFile = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8')
