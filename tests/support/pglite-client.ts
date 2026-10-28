// A small stand-in for the part of the Supabase client that the onboarding code uses, written over a REAL Postgres (PGlite), so code that
// talks to the database can be run against the schema the migrations make, with the database's own type checks and constraints.
// Supports: from(t).select(cols).eq(col, v) / .neq / .is / .ilike / .in(col, [v]) / .gte(col, v) / .lt / .lte(col, v) / .order(col, { ascending }) / .limit(n) / .range(a, b),
// from(t).insert(rows).select(cols), from(t).upsert(rows, { onConflict, ignoreDuplicates }), from(t).update(values).eq(col, v), from(t).delete().in(col, [v]) / .eq(col, v),
// and .single() / .maybeSingle() on a select or an insert with .select() (T-0708).
// Every answer is { data, error } like the real client; a database error is { code, message } and never thrown.
// .single() / .maybeSingle() give one row like the real client (single: an error unless there is exactly one row).
// With { role } every query runs as that database role (`set local role`, inside its own transaction), so row level security and the
// grants apply to it the way they do to the key the real service would use: 'anon' is a visitor, 'service_role' is the server, and
// 'authenticated' with { userId } is a signed-in account (auth.uid() answers that id).
// Values are written into the SQL as quoted literals (test data only, never user input); identifiers must be plain lower-case names.
import type { PGlite } from '@electric-sql/pglite'

const IDENT = /^[a-z_][a-z0-9_]*$/
const ident = (s: string) => { if (!IDENT.test(s)) throw new Error(`not a plain identifier: ${s}`); return `"${s}"` }
const lit = (v: unknown): string => {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}

export type DbAnswer = { data: Record<string, unknown>[] | null; error: { code?: string; message: string } | null }
export type DbOneAnswer = { data: Record<string, unknown> | null; error: { code?: string; message: string } | null }

class Query implements PromiseLike<DbAnswer> {
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private sets: Record<string, unknown> = {}
  private conflict: { onConflict: string; ignoreDuplicates: boolean } | null = null
  private orders: string[] = []
  private max: number | null = null
  private skip = 0
  private cols = '*'
  private rows: Record<string, unknown>[] = []
  private returning: string | null = null
  private wheres: string[] = []
  private db: PGlite
  private table: string
  private rest: boolean
  private role: string | null
  private userId: string | null
  private one: 'single' | 'maybe' | null = null
  constructor(db: PGlite, table: string, rest = false, role: string | null = null, userId: string | null = null) { this.db = db; this.table = table; this.rest = rest; this.role = role; this.userId = userId }

  single() { this.one = 'single'; return this }
  maybeSingle() { this.one = 'maybe'; return this }

  select(cols = '*') { if (this.op === 'insert') this.returning = cols; else { this.op = 'select'; this.cols = cols } return this }
  insert(rows: Record<string, unknown> | Record<string, unknown>[]) { this.op = 'insert'; this.rows = Array.isArray(rows) ? rows : [rows]; return this }
  update(values: Record<string, unknown>) { this.op = 'update'; this.sets = values; return this }
  upsert(rows: Record<string, unknown> | Record<string, unknown>[], opts: { onConflict: string; ignoreDuplicates?: boolean }) {
    this.op = 'upsert'; this.rows = Array.isArray(rows) ? rows : [rows]
    this.conflict = { onConflict: opts.onConflict, ignoreDuplicates: opts.ignoreDuplicates === true }
    return this
  }
  delete() { this.op = 'delete'; return this }
  gte(col: string, v: unknown) { this.wheres.push(`${ident(col)} >= ${lit(v)}`); return this }
  lte(col: string, v: unknown) { this.wheres.push(`${ident(col)} <= ${lit(v)}`); return this }
  order(col: string, opts: { ascending?: boolean } = {}) { this.orders.push(`${ident(col)} ${opts.ascending === false ? 'desc' : 'asc'}`); return this }
  limit(n: number) { this.max = n; return this }
  range(from: number, to: number) { this.skip = from; this.max = to - from + 1; return this }
  neq(col: string, v: unknown) { this.wheres.push(`${ident(col)} <> ${lit(v)}`); return this }
  is(col: string, v: unknown) { this.wheres.push(`${ident(col)} is ${v === null ? 'null' : lit(v)}`); return this }
  lt(col: string, v: unknown) { this.wheres.push(`${ident(col)} < ${lit(v)}`); return this }
  eq(col: string, v: unknown) { this.wheres.push(`${ident(col)} = ${lit(v)}`); return this }
  ilike(col: string, pattern: string) { this.wheres.push(`${ident(col)} ilike ${lit(pattern)}`); return this }
  in(col: string, vs: unknown[]) { this.wheres.push(vs.length ? `${ident(col)} in (${vs.map(lit).join(', ')})` : 'false'); return this }

  private sql(): string {
    const t = `public.${ident(this.table)}`
    const where = this.wheres.length ? ` where ${this.wheres.join(' and ')}` : ''
    if (this.op === 'insert' || this.op === 'upsert') {
      const keys = Object.keys(this.rows[0] ?? {})
      const values = this.rows.map(r => `(${keys.map(k => lit(r[k])).join(', ')})`).join(', ')
      const ret = this.returning ? ` returning ${this.returning.split(',').map(c => ident(c.trim())).join(', ')}` : ''
      const c = this.op === 'upsert' ? this.conflict : null
      const conflict = c ? ` on conflict (${ident(c.onConflict)}) ${c.ignoreDuplicates ? 'do nothing' : `do update set ${keys.map(k => `${ident(k)} = excluded.${ident(k)}`).join(', ')}`}` : ''
      return `insert into ${t} (${keys.map(ident).join(', ')}) values ${values}${conflict}${ret}`
    }
    if (this.op === 'delete') return `delete from ${t}${where}`
    if (this.op === 'update') return `update ${t} set ${Object.entries(this.sets).map(([k, v]) => `${ident(k)} = ${lit(v)}`).join(', ')}${where}`
    const order = this.orders.length ? ` order by ${this.orders.join(', ')}` : ''
    const limit = (this.max === null ? '' : ` limit ${Math.floor(this.max)}`) + (this.skip > 0 ? ` offset ${Math.floor(this.skip)}` : '')
    return `select ${this.cols === '*' ? '*' : this.cols.split(',').map(c => ident(c.trim())).join(', ')} from ${t}${where}${order}${limit}`
  }

  then<R1 = DbAnswer & DbOneAnswer, R2 = never>(onfulfilled?: ((v: DbAnswer & DbOneAnswer) => R1 | PromiseLike<R1>) | null, onrejected?: ((r: unknown) => R2 | PromiseLike<R2>) | null): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected)
  }
  private async run(): Promise<DbAnswer & DbOneAnswer> {
    try {
      const sql = this.sql()
      const role = this.role
      const res = role
        ? await this.db.transaction(async tx => {
          await tx.exec(`set local role ${ident(role)}`)
          await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [this.userId ?? ''])
          return tx.query<Record<string, unknown>>(sql)
        })
        : await this.db.query<Record<string, unknown>>(sql)
      let rows = res.rows
      // like PostgREST: a date is "YYYY-MM-DD", a timestamp an ISO string (PGlite hands back Date objects) and a numeric a number (PGlite hands back a string)
      if (this.rest) {
        const kind = new Map(res.fields.map(f => [f.name, f.dataTypeID]))
        rows = rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v instanceof Date ? (kind.get(k) === 1082 ? v.toISOString().slice(0, 10) : v.toISOString()) : kind.get(k) === 1700 && typeof v === 'string' ? Number(v) : v])))
      }
      if (this.one && (this.op === 'select' || this.returning)) {
        if (rows.length === 1) return { data: rows[0] as never, error: null }
        if (rows.length === 0 && this.one === 'maybe') return { data: null, error: null }
        return { data: null, error: { code: 'PGRST116', message: `${rows.length} rows, but one was expected` } }
      }
      return { data: this.op === 'delete' || this.op === 'update' || ((this.op === 'insert' || this.op === 'upsert') && !this.returning) ? null : rows, error: null }
    } catch (e) {
      return { data: null, error: { code: (e as { code?: string }).code, message: (e as Error).message } }
    }
  }
}

/** `restStyle` makes dates and timestamps come back as strings, the way the real service sends them. */
export function pgliteClient(db: PGlite, opts: { restStyle?: boolean; role?: 'anon' | 'authenticated' | 'service_role'; userId?: string } = {}) {
  return { from: (table: string) => new Query(db, table, opts.restStyle === true, opts.role ?? null, opts.userId ?? null) }
}
