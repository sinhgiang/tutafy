// One shared check for every request limit in a route (T-0616).
//
// The mistake it stops: a security note says "at most 60 new visitors a minute" but the caller can
// change the thing the limit is counted on (a cookie they made up, a header, a field of the body),
// so the limit does not hold. This check calls the route `limit + 1` times and, on EVERY call, gives
// a different value to EVERY field the route reads from the request that the caller controls. The
// limit must still say no on call `limit + 1`.
//
// How it knows which fields the route reads: the request it builds records every cookie, header and
// body field the route touches. Each of those fields must be either given a fresh value on every call
// (v.uuid(), v.text(), v.ip(), v.email()) or be listed in `fixed` with a reason (for example the one
// identity a per-visitor limit counts, or a header the route needs to stay the same). The limit it
// claims is also read from the route's own source, so a test cannot claim a number the code does not use.
import assert from 'node:assert/strict'
import { mock } from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NextRequest } from 'next/server.js'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src')

export type Field = { kind: 'cookie' | 'header' | 'body'; name: string }
export type FixedField = Field & { reason: string }

type Fresh = { __fresh: string | boolean }
type Value = string | number | boolean | Fresh | null | undefined | Record<string, unknown>

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
  /** Build the request. Cookie, header and body values are either a literal (fixed) or one of the fresh values above. */
  request(spec: { url?: string; method?: string; cookies?: Record<string, Value>; headers?: Record<string, Value>; body?: Record<string, Value> }): NextRequest
}

export type RateLimitCheck = {
  /** Route file relative to src, for example 'app/api/track/route.ts'. Its source is read to find the limiter. */
  routeFile: string
  /** The name of the limiter constant in the route, for example 'newVisitors'. */
  limiter: string
  /** Fields that are NOT varied, each with the reason (the identity this limit counts, or a value the route needs). */
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

function recorder(real: NextRequest, reads: Set<string>): NextRequest {
  const headers = new Proxy(real.headers, {
    get(target, prop) {
      if (prop === 'get' || prop === 'has') {
        return (name: string) => {
          reads.add(`header:${String(name).toLowerCase()}`)
          return (target[prop as 'get'] as (n: string) => unknown).call(target, name)
        }
      }
      const v = Reflect.get(target, prop, target)
      return typeof v === 'function' ? v.bind(target) : v
    },
  })
  const cookies = new Proxy(real.cookies, {
    get(target, prop) {
      if (prop === 'get' || prop === 'has') {
        return (name: string) => {
          reads.add(`cookie:${name}`)
          return (target[prop as 'get'] as (n: string) => unknown).call(target, name)
        }
      }
      const v = Reflect.get(target, prop, target)
      return typeof v === 'function' ? v.bind(target) : v
    },
  })
  // the real request itself is changed (own properties over the prototype's), so its private state keeps working
  const realJson = real.json.bind(real)
  Object.defineProperty(real, 'headers', { value: headers, configurable: true })
  Object.defineProperty(real, 'cookies', { value: cookies, configurable: true })
  Object.defineProperty(real, 'json', {
    value: async () => {
      const parsed = await realJson()
      if (parsed && typeof parsed === 'object') {
        return new Proxy(parsed, {
          get(target, prop, receiver) {
            // `then` and `toJSON` are read by await / JSON.stringify, not by the route
            if (typeof prop === 'string' && prop !== 'then' && prop !== 'toJSON') reads.add(`body:${prop}`)
            return Reflect.get(target, prop, receiver)
          },
        })
      }
      return parsed
    },
    configurable: true,
  })
  return real
}

export async function assertRateLimitHolds(spec: RateLimitCheck): Promise<{ limit: number; reads: string[] }> {
  const source = spec.override?.source ?? readFileSync(path.join(SRC, spec.routeFile), 'utf8')
  const limit = spec.override?.limit ?? limiterMax(source, spec.limiter)
  assert.ok(limit !== null && limit > 0, `${spec.routeFile}: no "const ${spec.limiter} = createLimiter({ max: N ..." found`)

  // every check starts in its own time window, so one check never uses up the next one's budget
  windowCounter += 1
  const base = Date.now() + windowCounter * 24 * 60 * 60 * 1000
  mock.method(Date, 'now', () => base)

  const allowed = spec.allowed ?? ((res: Response) => res.status !== 429)
  const refused = spec.refused ?? ((res: Response) => res.status === 429)
  const fixed = spec.fixed ?? []
  for (const f of fixed) assert.ok(f.reason && f.reason.length >= 10, `fixed ${f.kind}:${f.name} needs a real reason`)

  const reads = new Set<string>()
  const statuses: number[] = []
  const problems: string[] = []

  for (let n = 0; n <= limit; n++) {
    const produced = new Set<string>()
    const fresh = (kind: string): Fresh => {
      const value = `${kind}-${windowCounter}-${n}-${Math.random().toString(36).slice(2, 10)}`
      produced.add(value)
      return { __fresh: value }
    }
    // a value is varied when it is a fresh marker, or an object that holds one
    const isFresh = (v: unknown): boolean =>
      typeof v === 'object' && v !== null && ('__fresh' in v || Object.values(v).some(isFresh))
    const plain = (v: unknown): unknown => {
      if (typeof v !== 'object' || v === null) return v
      if ('__fresh' in v) return (v as Fresh).__fresh
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]))
    }
    const given = new Map<string, boolean>() // field -> was it fresh on this call

    const vary: Vary = {
      n,
      uuid: () => {
        const h = Math.random().toString(16).slice(2).padEnd(12, '0').slice(0, 12)
        const value = `${String(windowCounter).padStart(4, '0')}${String(n).padStart(4, '0')}-0000-4000-8000-${h}`
        produced.add(value)
        return { __fresh: value }
      },
      text: () => fresh('text'),
      flip: () => ({ __fresh: n % 2 === 0 }),
      pick: list => ({ __fresh: list[n % list.length] }),
      email: () => {
        const f = fresh('mail')
        return { __fresh: `${String(f.__fresh)}@example.com` }
      },
      ip: () => {
        // a different address on every call (documentation ranges, never a real one)
        const value = `203.0.${(n >> 8) & 255}.${n & 255}`
        produced.add(value)
        return { __fresh: value }
      },
      request(s) {
        const headers: Record<string, string> = {}
        for (const [k, v] of Object.entries(s.headers ?? {})) {
          headers[k.toLowerCase()] = String(plain(v))
          given.set(`header:${k.toLowerCase()}`, isFresh(v))
        }
        const cookieParts: string[] = []
        for (const [k, v] of Object.entries(s.cookies ?? {})) {
          cookieParts.push(`${k}=${plain(v)}`)
          given.set(`cookie:${k}`, isFresh(v))
        }
        if (cookieParts.length) headers.cookie = cookieParts.join('; ')
        const bodyObj: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(s.body ?? {})) {
          bodyObj[k] = plain(v)
          given.set(`body:${k}`, isFresh(v))
        }
        const init: { method: string; headers: Record<string, string>; body?: string } = { method: s.method ?? 'POST', headers }
        if (s.body) init.body = JSON.stringify(bodyObj)
        return recorder(new NextRequest(s.url ?? 'https://www.tutafy.test/x', init), reads)
      },
    }

    const res = await spec.call(vary)
    statuses.push(res.status)

    if (n === 0) {
      // every field the route read must be varied, or listed as fixed with a reason
      for (const r of reads) {
        const [kind, ...rest] = r.split(':')
        const name = rest.join(':')
        const isFixed = fixed.some(f => f.kind === kind && f.name.toLowerCase() === name.toLowerCase())
        if (!given.has(r)) {
          if (!isFixed) problems.push(`${r} is read by the route but the call does not set it`)
        } else if (!given.get(r) && !isFixed) {
          problems.push(`${r} is read by the route and the call sets it to the same value every time (vary it, or list it in "fixed" with a reason)`)
        }
      }
    } else {
      // on later calls, a field that was fresh on the first call must still be fresh
    }
    if (n < limit) {
      if (!allowed(res, n)) problems.push(`call ${n + 1} of ${limit} was refused (status ${res.status}); the limit says ${limit} are allowed`)
    } else if (!refused(res)) {
      problems.push(`call ${limit + 1} was let through (status ${res.status}) although the limit is ${limit}: the limit does not hold when the caller changes ${[...reads].join(', ') || 'what it sends'}`)
    }
  }
  assert.deepEqual(problems, [], `${spec.routeFile} / ${spec.limiter}`)

  // a fixed field must really be read by the route, otherwise the "reason" is decoration
  for (const f of fixed) {
    assert.ok(reads.has(`${f.kind}:${f.kind === 'header' ? f.name.toLowerCase() : f.name}`), `${f.kind}:${f.name} is listed as fixed but the route never reads it`)
  }
  return { limit, reads: [...reads] }
}
