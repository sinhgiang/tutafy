// An in-memory stand-in for the part of the Supabase client the journey code uses:
// from(table).select / insert / upsert / update / delete with eq, in, is, gte, lt,
// order, limit, maybeSingle. Tables are plain arrays, so tests can look inside.
type Row = Record<string, unknown>
type Filter = (r: Row) => boolean

export function createFakeDb(initial: Record<string, Row[]> = {}) {
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
    let orderBy: { col: string; asc: boolean } | null = null
    let max = Infinity
    let head = false
    let maybe = false

    const run = () => {
      const rows = tables[table]
      if (op === 'insert') {
        const list = (Array.isArray(payload) ? payload : [payload!]).map(r => ({ id: r.id ?? nextId++, ...r }))
        log.push({ table, op, payload })
        rows.push(...list)
        return { data: null, error: null, count: null }
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
        return { data: null, error: null, count: null }
      }
      if (op === 'delete') {
        log.push({ table, op })
        tables[table] = rows.filter(r => !matching.includes(r))
        return { data: null, error: null, count: null }
      }
      let out = [...matching]
      if (orderBy) {
        const { col, asc } = orderBy
        out.sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : String(a[col]) > String(b[col]) ? 1 : 0) * (asc ? 1 : -1))
      }
      out = out.slice(0, max)
      if (head) return { data: null, error: null, count: matching.length }
      return maybe ? { data: out[0] ?? null, error: null, count: null } : { data: out, error: null, count: null }
    }

    const q = {
      select(_cols?: string, opts?: { head?: boolean }) { head = !!opts?.head; return q },
      insert(p: Row | Row[]) { op = 'insert'; payload = p; return q },
      upsert(p: Row, o?: { onConflict?: string; ignoreDuplicates?: boolean }) { op = 'upsert'; payload = p; upsertOpts = o ?? {}; return q },
      update(p: Row) { op = 'update'; payload = p; return q },
      delete() { op = 'delete'; return q },
      eq(col: string, v: unknown) { filters.push(r => r[col] === v); return q },
      in(col: string, vs: unknown[]) { filters.push(r => vs.includes(r[col])); return q },
      is(col: string, v: unknown) { filters.push(r => (r[col] ?? null) === v); return q },
      gte(col: string, v: string) { filters.push(r => String(r[col]) >= v); return q },
      lt(col: string, v: string) { filters.push(r => String(r[col]) < v); return q },
      order(col: string, o?: { ascending?: boolean }) { orderBy = { col, asc: o?.ascending !== false }; return q },
      limit(n: number) { max = n; return q },
      maybeSingle() { maybe = true; return q },
      then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
        try { return Promise.resolve(run()).then(resolve, reject) } catch (e) { return Promise.reject(e).then(resolve, reject) }
      },
    }
    return q
  }

  return { tables, log, from: (table: string) => builder(table) }
}

export type FakeDb = ReturnType<typeof createFakeDb>
