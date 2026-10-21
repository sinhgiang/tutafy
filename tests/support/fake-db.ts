// An in-memory stand-in for the part of the Supabase client the journey code uses:
// from(table).select / insert / upsert / update / delete with eq, in, is, gte, lt,
// order (more than one), limit, range, maybeSingle. Tables are plain arrays, so tests can look inside.
//
// Like the real service, a select answers at most SERVER_ROW_CAP rows per request, whatever limit()
// asks for; to read more, a caller must page with range(). (Supabase's default is 1000.)
export const SERVER_ROW_CAP = 1000
type Row = Record<string, unknown>
type Filter = (r: Row) => boolean

// `defaults` are column defaults the real database fills in on insert (a value, or a function that makes
// one), so a test can say what the schema says: e.g. `lessons.currency` is 'USD' for every lesson.
export type FakeDefaults = Record<string, Record<string, unknown | (() => unknown)>>

function likeToRegExp(pattern: string): RegExp {
  let out = ''
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '\\' && i + 1 < pattern.length) out += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    else if (c === '%') out += '[\\s\\S]*'
    else if (c === '_') out += '[\\s\\S]'
    else out += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${out}$`, 'i')
}

export function createFakeDb(initial: Record<string, Row[]> = {}, defaults: FakeDefaults = {}) {
  const tables: Record<string, Row[]> = {}
  for (const [k, v] of Object.entries(initial)) tables[k] = v.map(r => ({ ...r }))
  const log: { table: string; op: string; payload?: unknown }[] = []
  let nextId = 1

  function builder(table: string) {
    tables[table] ??= []
    let op: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select'
    let payload: Row | Row[] | null = null
    let upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {}
    const filters: Filter[] = []
    const orderBy: { col: string; asc: boolean }[] = []
    let max = Infinity
    let offset = 0
    let head = false
    let maybe = false
    let single = false
    let returning = false

    const run = () => {
      const rows = tables[table]
      if (op === 'insert') {
        const filled = Object.fromEntries(Object.entries(defaults[table] ?? {}).map(([k, v]) => [k, typeof v === 'function' ? (v as () => unknown)() : v]))
        const list = (Array.isArray(payload) ? payload : [payload!]).map(r => ({ id: r.id ?? nextId++, ...filled, ...r }))
        log.push({ table, op, payload })
        rows.push(...list)
        if (!returning) return { data: null, error: null, count: null }
        return single ? { data: list[0], error: null, count: null } : { data: list, error: null, count: null }
      }
      if (op === 'upsert') {
        const key = upsertOpts.onConflict ?? 'id'
        const r = payload as Row
        log.push({ table, op, payload })
        const found = rows.find(x => x[key] === r[key])
        if (!found) rows.push({ ...r })
        else if (!upsertOpts.ignoreDuplicates) Object.assign(found, r)
        return { data: null, error: null, count: null }
      }
      const matching = rows.filter(r => filters.every(f => f(r)))
      if (op === 'update') {
        log.push({ table, op, payload })
        matching.forEach(r => Object.assign(r, payload))
        return returning ? { data: matching.map(r => ({ ...r })), error: null, count: null } : { data: null, error: null, count: null }
      }
      if (op === 'delete') {
        log.push({ table, op })
        tables[table] = rows.filter(r => !matching.includes(r))
        return { data: null, error: null, count: null }
      }
      let out = [...matching]
      if (orderBy.length > 0) {
        out.sort((a, b) => {
          for (const { col, asc } of orderBy) {
            const x = a[col] as string | number, y = b[col] as string | number
            const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x) < String(y) ? -1 : String(x) > String(y) ? 1 : 0
            if (c !== 0) return c * (asc ? 1 : -1)
          }
          return 0
        })
      }
      // like the real service, a select hands back copies: a later update must not change a row already read
      out = out.slice(offset, offset + Math.min(max, SERVER_ROW_CAP)).map(r => ({ ...r }))
      if (head) return { data: null, error: null, count: matching.length }
      if (single) return out.length === 1 ? { data: out[0], error: null, count: null } : { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' }, count: null }
      return maybe ? { data: out[0] ?? null, error: null, count: null } : { data: out, error: null, count: null }
    }

    const q = {
      select(_cols?: string, opts?: { head?: boolean }) { head = !!opts?.head; returning = true; return q },
      insert(p: Row | Row[]) { op = 'insert'; payload = p; return q },
      upsert(p: Row, o?: { onConflict?: string; ignoreDuplicates?: boolean }) { op = 'upsert'; payload = p; upsertOpts = o ?? {}; return q },
      update(p: Row) { op = 'update'; payload = p; return q },
      delete() { op = 'delete'; return q },
      eq(col: string, v: unknown) { filters.push(r => r[col] === v); return q },
      neq(col: string, v: unknown) { filters.push(r => r[col] !== v); return q },
      // ilike as Postgres reads it: case-insensitive, % any text, _ any one character, a backslash makes the next one literal
      ilike(col: string, pattern: string) { const re = likeToRegExp(pattern); filters.push(r => typeof r[col] === 'string' && re.test(r[col] as string)); return q },
      in(col: string, vs: unknown[]) { filters.push(r => vs.includes(r[col])); return q },
      is(col: string, v: unknown) { filters.push(r => (r[col] ?? null) === v); return q },
      // .not(col, 'is', null) and .not(col, 'eq', v), the two forms the admin pages use
      not(col: string, operator: string, v: unknown) { filters.push(r => (operator === 'is' ? (r[col] ?? null) !== v : r[col] !== v)); return q },
      gte(col: string, v: string) { filters.push(r => String(r[col]) >= v); return q },
      lt(col: string, v: string) { filters.push(r => String(r[col]) < v); return q },
      lte(col: string, v: string) { filters.push(r => String(r[col]) <= v); return q },
      order(col: string, o?: { ascending?: boolean }) { orderBy.push({ col, asc: o?.ascending !== false }); return q },
      limit(n: number) { max = n; return q },
      range(from: number, to: number) { offset = from; max = to - from + 1; return q },
      maybeSingle() { maybe = true; return q },
      single() { single = true; return q },
      then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
        try { return Promise.resolve(run()).then(resolve, reject) } catch (e) { return Promise.reject(e).then(resolve, reject) }
      },
    }
    return q
  }

  return { tables, log, from: (table: string) => builder(table) }
}

export type FakeDb = ReturnType<typeof createFakeDb>
