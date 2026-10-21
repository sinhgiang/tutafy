// A small stand-in for the part of the Supabase client that the onboarding code uses, written over a REAL Postgres (PGlite), so code that
// talks to the database can be run against the schema the migrations make, with the database's own type checks and constraints.
// Supports: from(t).select(cols).eq(col, v) / .in(col, [v]), from(t).insert(rows).select(cols), from(t).delete().in(col, [v]) / .eq(col, v).
// Every answer is { data, error } like the real client; a database error is { code, message } and never thrown.
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

class Query implements PromiseLike<DbAnswer> {
  private op: 'select' | 'insert' | 'delete' = 'select'
  private cols = '*'
  private rows: Record<string, unknown>[] = []
  private returning: string | null = null
  private wheres: string[] = []
  private db: PGlite
  private table: string
  constructor(db: PGlite, table: string) { this.db = db; this.table = table }

  select(cols = '*') { if (this.op === 'insert') this.returning = cols; else { this.op = 'select'; this.cols = cols } return this }
  insert(rows: Record<string, unknown> | Record<string, unknown>[]) { this.op = 'insert'; this.rows = Array.isArray(rows) ? rows : [rows]; return this }
  delete() { this.op = 'delete'; return this }
  eq(col: string, v: unknown) { this.wheres.push(`${ident(col)} = ${lit(v)}`); return this }
  in(col: string, vs: unknown[]) { this.wheres.push(vs.length ? `${ident(col)} in (${vs.map(lit).join(', ')})` : 'false'); return this }

  private sql(): string {
    const t = `public.${ident(this.table)}`
    const where = this.wheres.length ? ` where ${this.wheres.join(' and ')}` : ''
    if (this.op === 'insert') {
      const keys = Object.keys(this.rows[0] ?? {})
      const values = this.rows.map(r => `(${keys.map(k => lit(r[k])).join(', ')})`).join(', ')
      const ret = this.returning ? ` returning ${this.returning.split(',').map(c => ident(c.trim())).join(', ')}` : ''
      return `insert into ${t} (${keys.map(ident).join(', ')}) values ${values}${ret}`
    }
    if (this.op === 'delete') return `delete from ${t}${where}`
    return `select ${this.cols === '*' ? '*' : this.cols.split(',').map(c => ident(c.trim())).join(', ')} from ${t}${where}`
  }

  then<R1 = DbAnswer, R2 = never>(onfulfilled?: ((v: DbAnswer) => R1 | PromiseLike<R1>) | null, onrejected?: ((r: unknown) => R2 | PromiseLike<R2>) | null): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected)
  }
  private async run(): Promise<DbAnswer> {
    try {
      const res = await this.db.query<Record<string, unknown>>(this.sql())
      return { data: this.op === 'delete' || (this.op === 'insert' && !this.returning) ? null : res.rows, error: null }
    } catch (e) {
      return { data: null, error: { code: (e as { code?: string }).code, message: (e as Error).message } }
    }
  }
}

export function pgliteClient(db: PGlite) {
  return { from: (table: string) => new Query(db, table) }
}
