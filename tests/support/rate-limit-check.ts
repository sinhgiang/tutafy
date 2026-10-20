// One shared check for every request limit in a route (T-0616).
//
// The mistake it stops: a security note says "at most 60 new visitors a minute" but the caller can
// change the thing the limit is counted on (a cookie they made up, a header, a query parameter, a field
// of the body), so the limit does not hold. This check calls the route `limit + 1` times and, on every
// call, gives a different value to every part of the request the route READS. The limit must still
// refuse call `limit + 1`.
//
// How it knows what the route reads: the request it builds is wrapped, and every read goes through
// the wrapper (see `recorder`). It records these reads:
//   - headers:  headers.get / has (that header), entries / keys / values / forEach / for...of (all headers)
//   - cookies:  cookies.get / has (that cookie), getAll(name) (that cookie), getAll() / for...of (all cookies)
//   - query:    nextUrl.searchParams.get / has / getAll(name) (that parameter), entries / keys / values /
//               forEach / for...of / toString, and the whole URL (request.url, nextUrl.href / search) (all parameters)
//   - body:     json() fields at any depth (a.b.c), Object.keys / JSON.stringify of the body or of a nested
//               object (everything under it), and text() (every field of the body)
// A read the wrapper cannot follow (formData(), blob(), arrayBuffer(), clone(), the raw `body` stream)
// throws, so the check fails instead of passing blind. Any other way of reading the request (a new
// property, a helper that copies the request first) is NOT seen; a route that does that needs this file
// extended before it can be checked.
//
// For each part the route reads, on EVERY call, the call must give it a fresh value (v.uuid(), v.text(),
// v.ip(), v.email(), v.flip(), v.pick()) or list it in `fixed` with a reason (for example the one identity
// a per-visitor limit counts, or a header the route needs to stay the same). The limit number is read from
// the route's own createLimiter({ max }), so a test cannot claim a number the code does not use.
import assert from 'node:assert/strict'
import { mock } from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NextRequest } from 'next/server.js'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src')

export type Field = { kind: 'cookie' | 'header' | 'body' | 'url'; name: string }
export type FixedField = Field & { reason: string }

type Fresh = { __fresh: string | boolean }
type Value = string | number | boolean | Fresh | null | undefined | { [k: string]: Value } | Value[]

export type Vary = {
  /** The number of this call, from 0. */
  n: number
  uuid(): Fresh
  text(): Fresh
  ip(): Fresh
  email(): Fresh
  /** true on even calls, false on odd ones (for a yes/no field: the most a boolean can change). */
  flip(): Fresh
  /** the list item for this call, cycling through the list (for a field with a few allowed values). */
  pick<T extends string>(list: T[]): Fresh
  /**
   * Build the request. Cookie, header, query and body values are either a literal (fixed) or one of the fresh
   * values above. A body value may be an object (fields at any depth).
   */
  request(spec: {
    url?: string
    method?: string
    query?: Record<string, Value>
    cookies?: Record<string, Value>
    headers?: Record<string, Value>
    body?: Record<string, Value>
  }): NextRequest
}

export type RateLimitCheck = {
  /** Route file relative to src, for example 'app/api/track/route.ts'. Its source is read to find the limiter. */
  routeFile: string
  /** The name of the limiter constant in the route, for example 'newVisitors'. */
  limiter: string
  /** Parts of the request that are NOT varied, each with the reason (the identity this limit counts, or a value the route needs). Name '*' for a whole kind. */
  fixed?: FixedField[]
  /** Make one call of the route using the request builder. */
  call(v: Vary): Promise<Response>
  /** Is this answer "let through"? Default: any status except 429. */
  allowed?(res: Response, n: number): boolean
  /** Is this answer "refused by the limit"? Default: status 429. */
  refused?(res: Response): boolean
  /** Self-tests only: the route source and limit to use instead of reading the file. */
  override?: { source: string; limit: number }
}

let windowCounter = 0

/** Read `const <name> = createLimiter({ max: N, ... })` out of a route's source. */
export function limiterMax(source: string, name: string): number | null {
  const m = new RegExp(`const\\s+${name}\\s*=\\s*createLimiter\\(\\{[^}]*?max:\\s*(\\d+)`).exec(source)
  return m ? Number(m[1]) : null
}

// ---- what the route reads -----------------------------------------------------------------------------------

/** A read is "kind:name" for one part, or "kind:<prefix>*" for everything (of that kind, or under that prefix). */
const ALL_OF = (kind: string, prefix = '') => `${kind}:${prefix}*`

const NOT_A_FIELD = new Set(['then', 'toJSON', 'length', 'constructor'])

function recordingBody(value: object, prefix: string, reads: Set<string>): object {
  return new Proxy(value, {
    get(target, prop, receiver) {
      if (typeof prop !== 'string') return Reflect.get(target, prop, receiver)
      const v = Reflect.get(target, prop, receiver)
      if (typeof v === 'function') return v.bind(target)
      if (NOT_A_FIELD.has(prop)) return v
      const name = prefix ? `${prefix}.${prop}` : prop
      reads.add(`body:${name}`)
      return v !== null && typeof v === 'object' ? recordingBody(v, name, reads) : v
    },
    has(target, prop) {
      if (typeof prop === 'string') reads.add(`body:${prefix ? `${prefix}.${prop}` : prop}`)
      return Reflect.has(target, prop)
    },
    ownKeys(target) {
      reads.add(ALL_OF('body', prefix ? `${prefix}.` : ''))
      return Reflect.ownKeys(target)
    },
  })
}

const ITERATING = new Set(['entries', 'keys', 'values', 'forEach', 'toString', 'size', 'count'])

/** Wrap a Headers, RequestCookies or URLSearchParams: `named` methods read one name, iteration reads all. */
function recordingMap<T extends object>(real: T, kind: string, reads: Set<string>, lower: boolean): T {
  const nameOf = (n: unknown) => (lower ? String(n).toLowerCase() : String(n))
  return new Proxy(real, {
    get(target, prop) {
      if (prop === 'get' || prop === 'has') {
        return (name: string, ...rest: unknown[]) => {
          reads.add(`${kind}:${nameOf(name)}`)
          return (Reflect.get(target, prop, target) as (...a: unknown[]) => unknown).call(target, name, ...rest)
        }
      }
      if (prop === 'getAll') {
        return (...args: unknown[]) => {
          reads.add(args.length && args[0] !== undefined ? `${kind}:${nameOf(typeof args[0] === 'object' ? (args[0] as { name: string }).name : args[0])}` : ALL_OF(kind))
          return (Reflect.get(target, prop, target) as (...a: unknown[]) => unknown).call(target, ...args)
        }
      }
      if (prop === Symbol.iterator || (typeof prop === 'string' && ITERATING.has(prop))) {
        const v = Reflect.get(target, prop, target)
        if (typeof v === 'function') {
          return (...args: unknown[]) => { reads.add(ALL_OF(kind)); return (v as (...a: unknown[]) => unknown).apply(target, args) }
        }
        reads.add(ALL_OF(kind))
        return v
      }
      const v = Reflect.get(target, prop, target)
      return typeof v === 'function' ? v.bind(target) : v
    },
  })
}

function cannotFollow(what: string): never {
  throw new Error(`rate-limit-check cannot follow "${what}" on the request: extend tests/support/rate-limit-check.ts before using it in a route with a limit`)
}

function recorder(real: NextRequest, reads: Set<string>): NextRequest {
  const headers = recordingMap(real.headers, 'header', reads, true)
  const cookies = recordingMap(real.cookies, 'cookie', reads, false)
  const realNextUrl = real.nextUrl
  const searchParams = recordingMap(realNextUrl.searchParams, 'url', reads, false)
  const nextUrl = new Proxy(realNextUrl, {
    get(target, prop) {
      if (prop === 'searchParams') return searchParams
      if (prop === 'href' || prop === 'search' || prop === 'toString' || prop === 'toJSON') reads.add(ALL_OF('url'))
      const v = Reflect.get(target, prop, target)
      return typeof v === 'function' ? v.bind(target) : v
    },
  })
  const realUrl = real.url
  const realJson = real.json.bind(real)
  const realText = real.text.bind(real)

  const define = (name: string, value: PropertyDescriptor) => Object.defineProperty(real, name, { configurable: true, ...value })
  // The real request itself is changed (own properties over the prototype's), so its private state keeps working.
  define('headers', { value: headers })
  define('cookies', { value: cookies })
  define('nextUrl', { value: nextUrl })
  define('url', { get: () => { reads.add(ALL_OF('url')); return realUrl } })
  define('json', {
    value: async () => {
      const parsed = await realJson()
      return parsed !== null && typeof parsed === 'object' ? recordingBody(parsed, '', reads) : parsed
    },
  })
  define('text', { value: async () => { reads.add(ALL_OF('body')); return realText() } })
  for (const name of ['formData', 'blob', 'arrayBuffer', 'bytes', 'clone']) define(name, { value: () => cannotFollow(`${name}()`) })
  define('body', { get: () => cannotFollow('body') })
  return real
}

// ---- what the call gives -----------------------------------------------------------------------------------

const isFreshMarker = (v: unknown): v is Fresh => typeof v === 'object' && v !== null && '__fresh' in v
const isContainer = (v: unknown): v is object => typeof v === 'object' && v !== null && !isFreshMarker(v)

/** The literal value of a spec value (fresh markers replaced by their value). */
function plain(v: unknown): unknown {
  if (isFreshMarker(v)) return v.__fresh
  if (Array.isArray(v)) return v.map(plain)
  if (isContainer(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]))
  return v
}

/** Record, for the value at `name` and everything under it, whether it is fresh on this call. Returns true if anything is. */
function markGiven(given: Map<string, boolean>, kind: string, name: string, v: unknown): boolean {
  let fresh = isFreshMarker(v)
  if (isContainer(v)) {
    for (const [k, x] of Object.entries(v)) fresh = markGiven(given, kind, `${name}.${k}`, x) || fresh
  }
  given.set(`${kind}:${name}`, fresh)
  return fresh
}

/** Turn "kind:prefix*" reads into every given part under that prefix; other reads stay as they are. */
function expandReads(reads: Iterable<string>, given: Map<string, boolean>, problems: Set<string>, fixed: FixedField[]): string[] {
  const out: string[] = []
  for (const r of reads) {
    if (!r.endsWith('*')) { out.push(r); continue }
    const [kind, ...rest] = r.slice(0, -1).split(':')
    const prefix = rest.join(':')
    const under = [...given.keys()].filter(k => k.startsWith(`${kind}:${prefix}`))
    if (kind === 'url' && under.length === 0 && !fixed.some(f => f.kind === 'url' && f.name === '*')) {
      problems.add('url:* is read by the route (request.url, nextUrl.href or a loop over the parameters) but the call sets no query parameter (set one with query: { ... }, or list url "*" in "fixed" with a reason)')
    }
    out.push(...under)
  }
  return out
}

export async function assertRateLimitHolds(spec: RateLimitCheck): Promise<{ limit: number; reads: string[] }> {
  const source = spec.override?.source ?? readFileSync(path.join(SRC, spec.routeFile), 'utf8')
  const limit = spec.override?.limit ?? limiterMax(source, spec.limiter)
  assert.ok(limit !== null && limit > 0, `${spec.routeFile}: no "const ${spec.limiter} = createLimiter({ max: N ..." found`)

  const allowed = spec.allowed ?? ((res: Response) => res.status !== 429)
  const refused = spec.refused ?? ((res: Response) => res.status === 429)
  const fixed = spec.fixed ?? []
  for (const f of fixed) assert.ok(f.reason && f.reason.length >= 10, `fixed ${f.kind}:${f.name} needs a real reason`)
  const isFixed = (key: string) => {
    const [kind, ...rest] = key.split(':')
    const name = rest.join(':')
    return fixed.some(f => f.kind === kind && (f.name === '*' || f.name.toLowerCase() === name.toLowerCase() || name.toLowerCase().startsWith(`${f.name.toLowerCase()}.`)))
  }

  // every check starts in its own time window, so one check never uses up the next one's budget
  windowCounter += 1
  const base = Date.now() + windowCounter * 24 * 60 * 60 * 1000
  const clock = mock.method(Date, 'now', () => base)

  const everRead = new Set<string>()
  const problems = new Set<string>()

  try {
    for (let n = 0; n <= limit; n++) {
      const readsNow = new Set<string>()
      const given = new Map<string, boolean>() // part of the request -> is it fresh on this call
      const fresh = (kind: string): Fresh => ({ __fresh: `${kind}-${windowCounter}-${n}-${Math.random().toString(36).slice(2, 10)}` })

      const vary: Vary = {
        n,
        uuid: () => {
          const h = Math.random().toString(16).slice(2).padEnd(12, '0').slice(0, 12)
          return { __fresh: `${String(windowCounter).padStart(4, '0')}${String(n).padStart(4, '0')}-0000-4000-8000-${h}` }
        },
        text: () => fresh('text'),
        flip: () => ({ __fresh: n % 2 === 0 }),
        pick: list => ({ __fresh: list[n % list.length] }),
        email: () => ({ __fresh: `${String(fresh('mail').__fresh)}@example.com` }),
        // a different address on every call (documentation ranges, never a real one)
        ip: () => ({ __fresh: `203.0.${(n >> 8) & 255}.${n & 255}` }),
        request(s) {
          const headers: Record<string, string> = {}
          for (const [k, v] of Object.entries(s.headers ?? {})) {
            headers[k.toLowerCase()] = String(plain(v))
            markGiven(given, 'header', k.toLowerCase(), v)
          }
          const cookieParts: string[] = []
          let anyCookieFresh = false
          for (const [k, v] of Object.entries(s.cookies ?? {})) {
            cookieParts.push(`${k}=${plain(v)}`)
            anyCookieFresh = markGiven(given, 'cookie', k, v) || anyCookieFresh
          }
          if (cookieParts.length) {
            headers.cookie = cookieParts.join('; ')
            given.set('header:cookie', anyCookieFresh) // the cookies travel in this header
          }
          const url = new URL(s.url ?? 'https://www.tutafy.test/x')
          for (const [k, v] of Object.entries(s.query ?? {})) {
            url.searchParams.set(k, String(plain(v)))
            markGiven(given, 'url', k, v)
          }
          const bodyObj: Record<string, unknown> = {}
          for (const [k, v] of Object.entries(s.body ?? {})) {
            bodyObj[k] = plain(v)
            markGiven(given, 'body', k, v)
          }
          const init: { method: string; headers: Record<string, string>; body?: string } = { method: s.method ?? 'POST', headers }
          if (s.body) init.body = JSON.stringify(bodyObj)
          return recorder(new NextRequest(url, init), readsNow)
        },
      }

      const res = await spec.call(vary)

      // Every call, not only the first: a part the route reads only from the second call on (a branch for a
      // visitor that already exists) must still be varied or declared fixed.
      for (const r of readsNow) everRead.add(r)
      for (const r of expandReads(readsNow, given, problems, fixed)) {
        if (!given.has(r)) {
          if (!isFixed(r)) problems.add(`${r} is read by the route but the call does not set it`)
        } else if (!given.get(r) && !isFixed(r)) {
          problems.add(`${r} is read by the route and the call sets it to the same value every time (vary it, or list it in "fixed" with a reason)`)
        }
      }

      if (n < limit) {
        if (!allowed(res, n)) problems.add(`call ${n + 1} of ${limit} was refused (status ${res.status}); the limit says ${limit} are allowed`)
      } else if (!refused(res)) {
        problems.add(`call ${limit + 1} was let through (status ${res.status}) although the limit is ${limit}: the limit does not hold when the caller changes ${[...everRead].join(', ') || 'what it sends'}`)
      }
    }
  } finally {
    clock.mock.restore()
  }
  assert.deepEqual([...problems], [], `${spec.routeFile} / ${spec.limiter}`)

  // a fixed part must really be read by the route, otherwise the "reason" is decoration
  const readAny = (f: FixedField) => [...everRead].some(r => {
    const [kind, ...rest] = r.split(':')
    const name = rest.join(':')
    if (kind !== f.kind) return false
    if (f.name === '*') return true
    if (name.endsWith('*')) return true // a read of everything covers any one part
    return name.toLowerCase() === f.name.toLowerCase() || name.toLowerCase().startsWith(`${f.name.toLowerCase()}.`)
  })
  for (const f of fixed) assert.ok(readAny(f), `${f.kind}:${f.name} is listed as fixed but the route never reads it`)
  return { limit, reads: [...everRead] }
}
