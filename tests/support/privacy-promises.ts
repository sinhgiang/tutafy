// The table of what the Privacy page promises about data that goes to a measurer (T-0645).
//
// The mistake it stops (lock privacy-scope-matches-mount; the T-0621 and T-0637 reviews): a sentence on the Privacy page
// promises something absolute about the data sent to Google ("the page addresses we send to Google never include ...
// anything after a question mark") while the code only keeps that promise when a setting outside the code is right
// (Enhanced Measurement in the owner's Google Analytics), or on fewer pages than the sentence says.
//
// The rule, kept by tests/privacy-promises.test.ts (runs in `npm test`, no GitHub Actions):
//   1. every sentence of src/app/privacy/page.tsx that makes an absolute claim (never, always, only, no, not, nothing, at all,
//      at most, without, n't) must carry the marker {/* [promise: id] */} right after it, naming a row of PROMISES, or be listed
//      in OUT_OF_SCOPE with its reason (a sentence that names Google, Meta, a pixel, analytics or ads can never be listed there);
//   2. a marker that names no row, a row no sentence marks, and a row whose `promise` words are not in a sentence that marks it
//      all turn the test red;
//   3. a row is one of two kinds. ENFORCED: `check` runs the REAL code on hostile input and reads the evidence; the right
//      sample is the real code (no problem may be found) and the violation sample is the same code with one change from
//      `mutations` (the problem must be found). DEPENDS ON A SETTING: `setting` names what outside the code must be true and
//      the sentence must say that condition in words (`sentenceMustSay`), so the page cannot promise more than the code does.
//      A row can be both: the code part is proved, the outside part is said.
// To add a promise: write the sentence with its marker, add a row, run the test. Wording on the page is the owner's to approve.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const PRIVACY_PAGE = 'src/app/privacy/page.tsx'

const lf = (s: string) => s.replace(/\r\n/g, '\n')
export const readSource = (rel: string) => lf(readFileSync(path.join(ROOT, rel), 'utf8'))

// ---- reading the sentences of the page --------------------------------------------------------------------------------

export interface PageSentence {
  text: string
  /** Row ids written in the marker right after the sentence. */
  ids: string[]
  /** The sentence makes an absolute claim (see ABSOLUTE). */
  absolute: boolean
}

/**
 * Words that make a claim absolute. Whole words only: "note", "another" and "knot" hold none of them.
 * The list is kept by hand: a claim worded in other words ("zero", "nobody", "under no circumstance") is not seen.
 */
export const ABSOLUTE: RegExp[] = [
  /\bnever\b/i, /\balways\b/i, /\bonly\b/i, /\bnothing\b/i, /\bno\b/i, /\bnot\b/i,
  /\bat all\b/i, /\bat most\b/i, /\bwithout\b/i, /\b\w+n['’]t\b/i,
]

/** A sentence that names a measurer must carry a marker: it can never be waved through OUT_OF_SCOPE. */
export const MEASURER = /\b(google|meta|facebook|pixel|gtag|analytics|advertis\w*)\b/i

const MARKER = /\{\/\*\s*\[promise:\s*([a-z0-9-]+(?:\s*,\s*[a-z0-9-]+)*)\]\s*\*\/\}/g

/** What the browser shows of a JSX text: tags gone, entities decoded, one blank line between blocks. Markers become ⟦a, b⟧. */
function pageText(source: string): string {
  const start = source.indexOf('return (')
  const end = source.lastIndexOf('\nfunction ')
  let s = source.slice(start < 0 ? 0 : start + 'return ('.length, end < 0 ? undefined : end).replace(/[\s)}]+$/, '')
  s = s.replace(MARKER, (_m, ids: string) => `⟦${ids.replace(/\s+/g, '')}⟧`)
  s = s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\{[A-Za-z_][\w.]*\}/g, '') // other comments, {UPDATED}
  s = s.replace(/<\/?(?:p|li|ul|h1|h2|div|article|nav|Section)\b[^>]*>/g, '\n\n')
  s = s.replace(/<[^>]+>/g, '')
  s = s.replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&amp;/g, '&')
  return s
}

/** The sentences of the page, with the marker that follows each. Split at . ! ? (and the marker) before a capital letter, at every block. */
export function pageSentences(source: string): PageSentence[] {
  const out: PageSentence[] = []
  for (const block of pageText(source).split(/\n\s*\n/)) {
    const flat = block.replace(/\s+/g, ' ').trim()
    if (!flat) continue
    for (const raw of flat.split(/(?<=[.!?](?:⟦[^⟧]*⟧)?)\s+(?=[A-Z"(⟦])/)) {
      const ids = [...raw.matchAll(/⟦([^⟧]*)⟧/g)].flatMap(m => m[1].split(','))
      const text = raw.replace(/⟦[^⟧]*⟧/g, '').trim()
      if (text) out.push({ text, ids, absolute: ABSOLUTE.some(re => re.test(text)) })
    }
  }
  return out
}

const squash = (s: string) => s.replace(/\s+/g, ' ').toLowerCase()

// ---- code under test, real or with one change -------------------------------------------------------------------------

export interface Mutation {
  file: string
  /** Text of the real file that must occur exactly once. */
  from: string
  to: string
  /** What the change does to the promise. */
  why: string
}

type Mod = Record<string, (...a: never[]) => unknown> & Record<string, unknown>
// The modules are used loosely on purpose: the table feeds them hostile input and reads what comes out.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any

export interface Code {
  tag: Loose
  page: Loose
  sender: Loose
  /** One source file, with the change applied when it is the changed one. */
  source(rel: string): string
  /** Every .ts and .tsx file under src, with the change applied. */
  allSources(): Record<string, string>
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${name}`
    if (statSync(path.join(ROOT, rel)).isDirectory()) walk(rel, out)
    else if (/\.tsx?$/.test(name)) out.push(rel)
  }
  return out
}

let mutantCount = 0
const mutantDir = path.join(os.tmpdir(), `tutafy-privacy-mutants-${process.pid}`)

/** The module of a file as it is on disk, or, when a change is given for it, a copy with that one change (written to the temp folder, imported once). */
async function moduleOf(rel: string, change: Mutation | undefined): Promise<Mod> {
  if (!change) return import(pathToFileURL(path.join(ROOT, rel)).href)
  const { mkdirSync, writeFileSync } = await import('node:fs')
  mkdirSync(mutantDir, { recursive: true })
  const file = path.join(mutantDir, `${++mutantCount}-${path.basename(rel)}`)
  writeFileSync(file, applyChange(readSource(rel), change))
  return import(pathToFileURL(file).href)
}

/** `source` with `from` replaced by `to`; `from` must occur exactly once. */
export function replaceOnce(source: string, from: string, to: string): string {
  const parts = source.split(from)
  if (parts.length !== 2) throw new Error(`the text to change occurs ${parts.length - 1} times, not once: ${from.slice(0, 70)}`)
  return parts.join(to)
}

export const applyChange = (source: string, m: Mutation): string => replaceOnce(source, m.from, m.to)

/** The real code, or the real code with one change. */
export async function codeWith(change?: Mutation): Promise<Code> {
  const mine = (rel: string) => (change && change.file === rel ? change : undefined)
  const source = (rel: string) => (mine(rel) ? applyChange(readSource(rel), mine(rel)!) : readSource(rel))
  return {
    tag: await moduleOf('src/lib/google-tag.ts', mine('src/lib/google-tag.ts')),
    page: await moduleOf('src/lib/google-page.ts', mine('src/lib/google-page.ts')),
    sender: await moduleOf('src/lib/track-sender.ts', mine('src/lib/track-sender.ts')),
    source,
    allSources: () => Object.fromEntries(walk('src').map(rel => [rel, source(rel)])),
  }
}

// ---- a small fake browser ---------------------------------------------------------------------------------------------

const ORIGIN = 'https://www.tutafy.com'
const GA4 = 'G-QYDSQ8W6TX'
const ADS = 'AW-18335043737'
const UUID = '3f2b8c1e-9a4d-4e57-8b6a-0c1d2e3f4a5b'
const SECRET = 'abc123secret'
const EMAIL = 'ten@example.com'

type Fake = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

/** A plain window showing `url`, enough for the helpers that read location and document. */
function fakeWindow(url: string): Fake {
  const u = new URL(url)
  return { location: { href: u.href, origin: u.origin, pathname: u.pathname, search: u.search }, document: { referrer: '', title: 'Tutafy' } }
}

/** A window in which the real start-up script of the tag has run, the way Analytics.tsx runs it. */
function startedBrowser(code: Code, url: string): Fake {
  const ctx = fakeWindow(url)
  ctx.window = ctx
  ctx.URL = URL
  ctx.history = { pushState() {}, replaceState() {} }
  ctx.addEventListener = () => {}
  const l = ctx.location
  const page = code.page.googlePageParams({ origin: l.origin, pathname: l.pathname, search: l.search, referrer: '', title: 'Tutafy' })
  vm.runInNewContext(code.tag.googleTagBootstrapScript([GA4, ADS], page), ctx)
  return ctx
}

const layerOf = (ctx: Fake): unknown[][] => Array.from((ctx.dataLayer ?? []) as ArrayLike<ArrayLike<unknown>>).map(a => Array.from(a))
const queuedOf = (ctx: Fake): unknown[][] => [...layerOf(ctx), ...((ctx.__tutafyGtagPending ?? []) as unknown[][])]

/** What a visitor who accepted cookies makes the tag send on this address. */
function sendEverything(code: Code, ctx: Fake, consent: 'accepted' | 'declined' | null) {
  code.tag.sendGooglePageView(ctx, consent)
  code.tag.sendGaEvent(ctx, consent, 'sign_up')
  code.tag.sendAdsSignupConversion(ctx, consent)
  code.tag.sendGaEvent(ctx, consent, 'begin_checkout', code.tag.beginCheckoutParams('pro'))
  code.tag.sendGaEvent(ctx, consent, 'begin_checkout', code.tag.beginCheckoutParams('academy'))
}

const strings = (v: unknown, out: string[] = []): string[] => {
  if (typeof v === 'string') out.push(v)
  else if (v && typeof v === 'object') for (const x of Object.values(v as object)) strings(x, out)
  return out
}

// ---- the rows ---------------------------------------------------------------------------------------------------------

export interface PromiseRow {
  id: string
  /** Who receives the data: the measurer the sentence is about. */
  party: 'Google Analytics' | 'Google Ads' | 'Meta Pixel' | 'cookie consent' | 'our own measurement'
  /** Words that must stand in the sentence that carries this row's marker (any case, spaces as one). */
  promise: string
  /** Where the code keeps the promise; the test checks that the file holds the name. */
  guard: { file: string; symbol: string }
  /** ENFORCED: the real code on hostile input. */
  check?: {
    /** Runs the code (real, or with one change) and returns what came out. */
    evidence(code: Code): Promise<unknown> | unknown
    /** What breaks the promise in that evidence; empty when it holds. */
    breaks(evidence: unknown): string[]
    /** Changes to the real code that make the promise break; each one, run through the same `evidence`, must be found. */
    mutations: Mutation[]
  }
  /** DEPENDS ON A SETTING: what outside the code must be true. */
  setting?: {
    name: string
    wanted: string
    /** Every one of these must match the sentence: it says the condition. */
    sentenceMustSay: RegExp[]
    /** When the code itself can show the condition still holds, this does; false means the sentence or row is out of date. */
    assumption?: { says: string; holds(code: Code): boolean }
  }
}

const GATE_BEFORE_SEND = 'src/components/Analytics.tsx'

/** Comments out of a source, so a word in a comment is not read as code. */
const noComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')

const CALL = /\b(sendGaEvent|sendAdsSignupConversion|sendGooglePageView)\(\s*[\w.]+\s*,\s*(getConsent\(\)|'[^']*'|[\w.]+)/g

function tagGateProblems(sources: Record<string, string>): string[] {
  const out: string[] = []
  const analytics = noComments(sources[GATE_BEFORE_SEND] ?? '')
  const gate = analytics.indexOf('if (!ok) return null')
  const firstScript = analytics.indexOf('<Script')
  if (gate < 0) out.push('Analytics.tsx has no "if (!ok) return null" gate before it renders a tag')
  else if (firstScript >= 0 && firstScript < gate) out.push('a <Script> tag is rendered before the consent gate')
  if (!/setOk\(getConsent\(\) === 'accepted'\)/.test(analytics)) out.push('Analytics.tsx does not take "ok" from an accepted consent')
  for (const [file, raw] of Object.entries(sources)) {
    const code = noComments(raw)
    if (file !== GATE_BEFORE_SEND && file !== 'src/lib/google-tag.ts' && /googletagmanager\.com|connect\.facebook\.net|fbevents\.js/.test(code)) {
      out.push(`${file} loads a tag from a measurer's host`)
    }
    if (file === 'src/lib/google-tag.ts') continue
    for (const m of code.matchAll(CALL)) {
      const arg = m[2].trim()
      if (arg === 'getConsent()') continue
      const before = code.slice(Math.max(0, m.index! - 160), m.index!)
      if (file === GATE_BEFORE_SEND && arg === "'accepted'" && /if \(!ok\) return\b/.test(before)) continue
      out.push(`${file}: ${m[1]}(…, ${arg}) does not pass the consent the visitor gave`)
    }
  }
  return out
}

/** The campaign parameters Google may be told about, taken from the real code. */
const campaignKeys = (code: Code): string[] => [...code.page.CAMPAIGN_PARAMS]

const HOSTILE_ADDRESSES = [
  `${ORIGIN}/portal/${SECRET}?x=1`,
  `${ORIGIN}/students/${UUID}`,
  `${ORIGIN}/lessons/${UUID}?note=1`,
  `${ORIGIN}/book/sarah-test?token=${SECRET}`,
  `${ORIGIN}/blog/some-post?ref=${SECRET}&utm_source=newsletter`,
  `${ORIGIN}/register?email=${encodeURIComponent(EMAIL)}&utm_campaign=spring#${SECRET}`,
  `${ORIGIN}/settings?tab=billing`,
  `${ORIGIN}/student/dashboard?token=${SECRET}`,
]

const PRIVATE_PATHS = [
  `/portal/${SECRET}?x=1`, `/portal/parent/${SECRET}`, `/students/${UUID}`, `/lessons/${UUID}?note=1`,
  '/admin', '/super-admin', `/student/dashboard?token=${SECRET}`, '/upgrade/success?session_id=cs_1', '/auth/callback?code=x',
]

const sentenceMark = (needle: string, file: string, from: string, to: string, why: string): Mutation => ({ file, from, to, why: `${needle}: ${why}` })

export const PROMISES: PromiseRow[] = [
  {
    id: 'tags-only-after-accept',
    party: 'Google Ads',
    promise: 'only with your consent',
    guard: { file: 'src/components/Analytics.tsx', symbol: 'Analytics' },
    check: {
      evidence: code => code.allSources(),
      breaks: sources => tagGateProblems(sources as Record<string, string>),
      mutations: [
        sentenceMark('gate', 'src/components/Analytics.tsx', 'if (!ok) return null', '', 'the tags render for a visitor who has not accepted'),
        sentenceMark('page view', 'src/components/Analytics.tsx', 'if (!ok) return\n    const timer', 'const timer', 'the Google page view is sent without Accept'),
        sentenceMark('sign-up', 'src/app/onboarding/page.tsx', "sendGaEvent(window, getConsent(), 'sign_up')", "sendGaEvent(window, 'accepted', 'sign_up')", 'the sign-up event ignores the answer in the banner'),
      ],
    },
  },
  {
    id: 'events-no-personal-data',
    party: 'Google Analytics',
    promise: 'those events carry no name or email address',
    guard: { file: 'src/lib/google-tag.ts', symbol: 'beginCheckoutParams' },
    check: {
      evidence: code => {
        const sent: unknown[] = []
        for (const url of [`${ORIGIN}/register?email=${encodeURIComponent(EMAIL)}&utm_source=ads`, `${ORIGIN}/upgrade`]) {
          const w = fakeWindow(url)
          sendEverything(code, w, 'accepted')
          sent.push(...queuedOf(w))
        }
        return sent
      },
      breaks: sent => {
        const text = JSON.stringify(sent).replace(/"item_name"/g, '"item"')
        return [...new Set(text.match(/@|%40|email|user_id|phone|\bname\b|ten@/gi) ?? [])].map(w => `an event carries "${w}"`)
      },
      mutations: [
        sentenceMark('begin_checkout', 'src/lib/google-tag.ts', 'return { items: [{ item_id: plan,', `return { email: '${EMAIL}', items: [{ item_id: plan,`, 'begin_checkout carries an email address'),
      ],
    },
  },
  {
    id: 'addresses-no-codes',
    party: 'Google Analytics',
    promise: 'never include an access code, a record id or anything after a question mark',
    guard: { file: 'src/lib/google-page.ts', symbol: 'googlePageParams' },
    check: {
      evidence: code => HOSTILE_ADDRESSES.map(url => {
        const ctx = startedBrowser(code, url)
        sendEverything(code, ctx, 'accepted')
        return { url, layer: layerOf(ctx), keys: campaignKeys(code) }
      }),
      breaks: ev => {
        const out: string[] = []
        for (const e of ev as { url: string; layer: unknown[][]; keys: string[] }[]) {
          for (const c of e.layer) {
            if (c[0] === 'config' && (c[2] as { send_page_view?: unknown } | undefined)?.send_page_view !== false) {
              out.push(`${e.url}: config ${String(c[1])} lets gtag.js send the page view with the real address`)
            }
          }
          for (const s of strings(e.layer)) {
            if (s.includes(SECRET) || s.includes(UUID) || /ten@|ten%40/.test(s)) out.push(`${e.url}: sends "${s}"`)
            const q = s.indexOf('?')
            if (s.includes('#')) out.push(`${e.url}: sends a fragment: ${s}`)
            if (q >= 0) for (const k of new URLSearchParams(s.slice(q + 1)).keys()) if (!e.keys.includes(k)) out.push(`${e.url}: sends the query key "${k}"`)
          }
        }
        return [...new Set(out)]
      },
      mutations: [
        sentenceMark('config', 'src/lib/google-tag.ts', 'send_page_view: false', 'send_page_view: true', 'gtag.js sends the page view itself, with the real address'),
        sentenceMark('events', 'src/lib/google-tag.ts', 'page_location: page.page_location, page_path: page.page_path }]', 'page_location: String((w.location as { href?: string }).href), page_path: page.page_path }]', 'events carry the real address'),
      ],
    },
    setting: {
      name: 'Google Analytics 4, Admin, Data streams, the web stream, Enhanced measurement, Page views, "Page changes based on browser history events"',
      wanted: 'switched off (gtag.js then cannot record a page change by itself, with the real address; the owner does this in W-1920)',
      sentenceMustSay: [/enhanced measurement/i, /switched off/i, /\bas long as\b/i],
    },
  },
  {
    id: 'private-pages-send-nothing',
    party: 'Google Analytics',
    promise: 'send nothing to google at all',
    guard: { file: 'src/lib/google-tag.ts', symbol: 'sendGtag' },
    check: {
      evidence: code => PRIVATE_PATHS.map(p => {
        const url = `${ORIGIN}${p}`
        const ctx = fakeWindow(url)
        sendEverything(code, ctx, 'accepted')
        const plan = code.tag.googleTagPlan({ consent: 'accepted', ga4Env: GA4, legacyEnv: ADS, path: new URL(url).pathname })
        // a tag already running on a public page, then the visitor goes to the private page
        const live = fakeWindow(`${ORIGIN}/blog`)
        live.window = live
        live.URL = URL
        live.history = { pushState() {}, replaceState() {} }
        live.addEventListener = () => {}
        vm.runInNewContext(code.tag.googleTagGuardScript([GA4, ADS]), live)
        live.history.pushState(null, '', p)
        return { path: p, sent: queuedOf(ctx).length, loaderId: plan.loaderId as string | null, switchedOff: live[`ga-disable-${GA4}`] === true && live[`ga-disable-${ADS}`] === true }
      }),
      breaks: ev => (ev as { path: string; sent: number; loaderId: string | null; switchedOff: boolean }[]).flatMap(e => [
        ...(e.sent > 0 ? [`${e.path}: ${e.sent} entries sent`] : []),
        ...(e.loaderId ? [`${e.path}: the tag is loaded (${e.loaderId})`] : []),
        ...(!e.switchedOff ? [`${e.path}: a running tag is not switched off`] : []),
      ]),
      mutations: [
        sentenceMark('events', 'src/lib/google-tag.ts', 'if (isSecretPath(w.location?.pathname)) return // a page that opens private data reports nothing', '', 'events are sent from a private page'),
        sentenceMark('loader', 'src/lib/google-tag.ts', 'if (isSecretPath(opts.path)) return { loaderId: null, configIds: [] }', '', 'the tag loads on a private page'),
        sentenceMark('switch', 'src/lib/google-tag.ts', "window['ga-disable-'+ids[i]]=s", "window['ga-disable-'+ids[i]]=false", 'a running tag is not switched off on a private page'),
      ],
    },
  },
  {
    id: 'decline-sends-nothing',
    party: 'Google Analytics',
    promise: 'no google tag is loaded and nothing is sent to google',
    guard: { file: 'src/lib/google-tag.ts', symbol: 'googleTagPlan' },
    check: {
      evidence: code => ([null, 'declined'] as const).map(consent => {
        const plan = code.tag.googleTagPlan({ consent, ga4Env: GA4, legacyEnv: ADS, path: '/' })
        const ctx = fakeWindow(`${ORIGIN}/`)
        sendEverything(code, ctx, consent)
        return { consent, loaderId: plan.loaderId as string | null, configIds: plan.configIds as string[], sent: queuedOf(ctx).length }
      }),
      breaks: ev => (ev as { consent: string | null; loaderId: string | null; configIds: string[]; sent: number }[]).flatMap(e => [
        ...(e.loaderId ? [`consent ${e.consent}: the tag is loaded`] : []),
        ...(e.configIds.length ? [`consent ${e.consent}: ${e.configIds.length} ids are configured`] : []),
        ...(e.sent > 0 ? [`consent ${e.consent}: ${e.sent} entries sent`] : []),
      ]),
      mutations: [
        sentenceMark('plan', 'src/lib/google-tag.ts', "if (opts.consent !== 'accepted') return { loaderId: null, configIds: [] }", '', 'the tag loads without Accept'),
        sentenceMark('events', 'src/lib/google-tag.ts', "function sendGtag(win: object, consent: ConsentState, args: unknown[]): void {\n  if (consent !== 'accepted') return", 'function sendGtag(win: object, consent: ConsentState, args: unknown[]): void {', 'events are sent without Accept'),
      ],
    },
  },
  {
    id: 'own-record-after-accept',
    party: 'our own measurement',
    promise: 'only if you accept cookies',
    guard: { file: 'src/lib/track-sender.ts', symbol: 'createTrackSender' },
    check: {
      evidence: async code => {
        const calls: string[] = []
        const sender = code.sender.createTrackSender({ fetch: async (url: string) => { calls.push(url) }, hasConsent: () => false })
        await sender.send({ kind: 'page_view', path: '/' })
        const tracker = noComments(code.source('src/components/VisitorTracker.tsx'))
        const gate = tracker.indexOf('if (!consented) return')
        return { callsWithoutConsent: calls.length, trackerGuarded: gate >= 0 && gate < tracker.indexOf('sendTrack(') }
      },
      breaks: ev => {
        const e = ev as { callsWithoutConsent: number; trackerGuarded: boolean }
        return [
          ...(e.callsWithoutConsent > 0 ? [`the sender made ${e.callsWithoutConsent} request(s) without consent`] : []),
          ...(!e.trackerGuarded ? ['VisitorTracker sends a page view before its consent gate'] : []),
        ]
      },
      mutations: [
        sentenceMark('sender', 'src/lib/track-sender.ts', 'if (!deps.hasConsent()) return Promise.resolve()', '', 'the sender sends without consent'),
        sentenceMark('tracker', 'src/components/VisitorTracker.tsx', 'if (!consented) return', '', 'the tracker sends a page view without consent'),
      ],
    },
  },
  {
    id: 'own-record-not-ad-company',
    party: 'our own measurement',
    promise: 'not with an advertising company',
    guard: { file: 'src/lib/track-sender.ts', symbol: 'createTrackSender' },
    check: {
      evidence: async code => {
        const urls: string[] = []
        const sender = code.sender.createTrackSender({ fetch: async (url: string) => { urls.push(url) }, hasConsent: () => true })
        await sender.send({ kind: 'page_view', path: '/' })
        const literals = ['src/lib/track-sender.ts', 'src/lib/track-client.ts', 'src/components/VisitorTracker.tsx']
          .flatMap(f => (noComments(code.source(f)).match(/https?:\/\/[^\s'"`)]+/g) ?? []).map(u => `${f}: ${u}`))
        return { urls, literals }
      },
      breaks: ev => {
        const e = ev as { urls: string[]; literals: string[] }
        return [
          ...e.urls.filter(u => !u.startsWith('/') || u.startsWith('//')).map(u => `a page view goes to ${u}, not to our own address`),
          ...e.literals.map(l => `an outside address is written in the tracking code: ${l}`),
        ]
      },
      mutations: [
        sentenceMark('sender', 'src/lib/track-sender.ts', "'/api/track'", "'https://ads.example.com/collect'", 'the page view goes to another company'),
      ],
    },
  },
  {
    id: 'own-record-deleted-on-decline',
    party: 'cookie consent',
    promise: 'nothing is recorded and anything already stored for your visitor id is deleted',
    guard: { file: 'src/components/VisitorTracker.tsx', symbol: 'forgetMe' },
    check: {
      evidence: async code => {
        const calls: string[] = []
        const sender = code.sender.createTrackSender({ fetch: async (url: string) => { calls.push(url) }, hasConsent: () => false })
        await sender.send({ kind: 'page_view', path: '/' })
        const tracker = noComments(code.source('src/components/VisitorTracker.tsx'))
        const client = noComments(code.source('src/lib/track-client.ts'))
        const route = noComments(code.source('src/app/api/track/route.ts'))
        const deleteHandler = route.slice(route.indexOf('export async function DELETE'))
        return {
          recordedAfterDecline: calls.length,
          trackerForgets: /detail === 'declined'\) forgetMe\(\)/.test(tracker),
          clientDeletes: /function forgetMe\(\)[\s\S]*?method: 'DELETE'/.test(client),
          routeDeletes: /forgetVisitor\(/.test(deleteHandler) && /maxAge: 0/.test(deleteHandler),
        }
      },
      breaks: ev => {
        const e = ev as { recordedAfterDecline: number; trackerForgets: boolean; clientDeletes: boolean; routeDeletes: boolean }
        return [
          ...(e.recordedAfterDecline > 0 ? ['a page view is sent after a decline'] : []),
          ...(!e.trackerForgets ? ['VisitorTracker does not call forgetMe() when the visitor declines'] : []),
          ...(!e.clientDeletes ? ['forgetMe() does not send a DELETE request'] : []),
          ...(!e.routeDeletes ? ['the DELETE route does not remove the visitor and the cookie'] : []),
        ]
      },
      mutations: [
        sentenceMark('tracker', 'src/components/VisitorTracker.tsx', "if ((e as CustomEvent).detail === 'declined') forgetMe()", '', 'a decline deletes nothing'),
        sentenceMark('client', 'src/lib/track-client.ts', "method: 'DELETE'", "method: 'GET'", 'forgetMe asks for nothing to be deleted'),
        sentenceMark('sender', 'src/lib/track-sender.ts', 'if (!deps.hasConsent()) return Promise.resolve()', '', 'a page view is recorded after a decline'),
      ],
    },
  },
  {
    id: 'retention-13-months',
    party: 'our own measurement',
    promise: 'records older than 13 months are removed by a clean-up that the tutafy owner runs by hand',
    guard: { file: 'supabase/migrations/015_visitor_tracking.sql', symbol: 'purge_old_visitor_data' },
    setting: {
      name: 'Someone runs public.purge_old_visitor_data(395) in the Supabase database (a scheduled job there, or by hand)',
      wanted: 'run at least once a month; nothing in the code schedules it',
      sentenceMustSay: [/by hand/i, /not yet automatic/i],
      assumption: {
        says: 'nothing in the code (src, vercel.json crons) calls purge_old_visitor_data, so only a person can run it',
        holds: code => {
          const vercel = readSource('vercel.json')
          return !/purge_old_visitor_data/.test(vercel) && !Object.values(code.allSources()).some(s => /purge_old_visitor_data/.test(s))
        },
      },
    },
  },
]

// ---- sentences that make an absolute claim but are not about a measurer ---------------------------------------------------------

export interface OutOfScope {
  /** The start of the sentence (any case, spaces as one). Exactly one sentence of the page must start with it. */
  starts: string
  /** Why the claim is not about data sent to a measurer. */
  why: string
  /** For a claim about our own database: the test that keeps it, found by its exact title in that file. */
  keptBy?: { file: string; title: string }
}

export const OUT_OF_SCOPE: OutOfScope[] = [
  { starts: 'we do not store full card numbers', why: 'about card numbers we store, not data sent to a measurer (the payment processors are not measurers)' },
  { starts: 'we do not sell your data', why: 'a business promise about selling data; no code of ours sells data, and no code can show a negative about a buyer' },
  { starts: 'each processes data only as needed', why: 'what the service providers (Supabase, Vercel, Stripe ...) do under their own contracts; our code cannot show it. The owner is told in the report of T-0645' },
  { starts: 'no system is perfectly secure', why: 'a disclaimer, not a promise' },
  { starts: 'declining does not affect your ability to use tutafy', why: 'about the app working after a decline (nothing is gated on the answer), not about data sent' },
  { starts: 'the pages you open on tutafy.com', why: 'our own database, not a third party', keptBy: { file: 'tests/visitor-tracking.test.ts', title: 'no IP address, user agent, query string or token ever reaches the database' } },
  { starts: 'we do not store your ip address', why: 'our own database, not a third party', keptBy: { file: 'tests/visitor-tracking.test.ts', title: 'no IP address, user agent, query string or token ever reaches the database' } },
  { starts: 'only the tutafy owner can see these records', why: 'our own database, not a third party', keptBy: { file: 'tests/visitor-migration.test.ts', title: 'both tables have RLS on, no policy, and no grant to anon or authenticated' } },
  { starts: "if you're in california, we do not sell", why: 'a business promise about selling data (see "we do not sell your data")' },
  { starts: 'it is not legal advice', why: 'a disclaimer, not a promise' },
]

// ---- the checks that tie the page to the table ------------------------------------------------------------------------------

/** Every way the page and the table disagree; empty when they agree. `rows` and `outOfScope` are parameters so the self-check can change them. */
export function privacyProblems(pageSource: string, rows: PromiseRow[] = PROMISES, outOfScope: OutOfScope[] = OUT_OF_SCOPE): string[] {
  const out: string[] = []
  const sentences = pageSentences(pageSource)
  const known = new Set(rows.map(r => r.id))
  for (const s of sentences) {
    for (const id of s.ids) if (!known.has(id)) out.push(`marker [promise: ${id}] names no row of PROMISES: "${s.text.slice(0, 80)}"`)
    if (!s.absolute || s.ids.length) continue
    const waved = outOfScope.find(o => squash(s.text).startsWith(squash(o.starts)))
    if (!waved) out.push(`an absolute claim has no [promise: id] marker and is not in OUT_OF_SCOPE: "${s.text}"`)
    else if (MEASURER.test(s.text)) out.push(`a sentence that names a measurer cannot be out of scope: "${s.text.slice(0, 80)}"`)
  }
  for (const o of outOfScope) {
    const hits = sentences.filter(s => squash(s.text).startsWith(squash(o.starts)))
    if (hits.length !== 1) out.push(`OUT_OF_SCOPE "${o.starts}" matches ${hits.length} sentences of the page, not one`)
    else if (hits[0].ids.length) out.push(`OUT_OF_SCOPE "${o.starts}" is also marked as a promise`)
  }
  for (const r of rows) {
    const marked = sentences.filter(s => s.ids.includes(r.id))
    if (!marked.length) { out.push(`row "${r.id}" is marked by no sentence of the page`); continue }
    const carrier = marked.find(s => squash(s.text).includes(squash(r.promise)))
    if (!carrier) { out.push(`row "${r.id}": none of the sentences it marks says "${r.promise}"`); continue }
    if (r.setting) for (const re of r.setting.sentenceMustSay) {
      if (!re.test(carrier.text)) out.push(`row "${r.id}" depends on a setting (${r.setting.name}) but its sentence does not say the condition (${re}): "${carrier.text.slice(0, 100)}"`)
    }
    if (!r.check && !r.setting) out.push(`row "${r.id}" has neither a check nor a setting`)
  }
  return out
}

/** Does a file hold a test with exactly this title? */
export function hasTest(file: string, title: string): boolean {
  return readSource(file).includes(`test('${title}'`)
}
