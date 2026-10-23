// The Students list (T-0822): the filters read from the address, the one query builder both the page and the CSV
// export use (so they cannot disagree about who is listed), and the CSV itself.
import { PAGE_SIZE, EXPORT_LIMIT, cleanSearch, parsePage, pick } from './list-params'
import { csvCell } from './csv'

export const LEVELS = ['all', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native'] as const
export const STATUSES = ['all', 'active', 'paused', 'inactive'] as const
export const SORTS = ['newest', 'oldest', 'name_az', 'name_za'] as const
export type Level = (typeof LEVELS)[number]
export type StudentStatus = (typeof STATUSES)[number]
export type StudentSort = (typeof SORTS)[number]

export const SORT_LABEL: Record<StudentSort, string> = { newest: 'Newest first', oldest: 'Oldest first', name_az: 'Name A to Z', name_za: 'Name Z to A' }
export const SORT_COLUMN: Record<StudentSort, { col: string; asc: boolean }> = {
  newest: { col: 'created_at', asc: false }, oldest: { col: 'created_at', asc: true }, name_az: { col: 'name', asc: true }, name_za: { col: 'name', asc: false },
}

export type StudentFilters = { q: string; level: Level; status: StudentStatus; sort: StudentSort; page: number }
export const STUDENT_DEFAULTS = { q: '', level: 'all', status: 'all', sort: 'newest', page: '1' }

export function parseStudentFilters(sp: Record<string, string | string[] | undefined> | URLSearchParams): StudentFilters {
  const get = (k: string) => { const v = sp instanceof URLSearchParams ? sp.get(k) : sp[k]; return Array.isArray(v) ? v[0] : v ?? null }
  return {
    q: cleanSearch(get('q')),
    level: pick(get('level'), LEVELS, 'all'),
    status: pick(get('status'), STATUSES, 'all'),
    sort: pick(get('sort'), SORTS, 'newest'),
    page: parsePage(get('page')),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a Supabase filter builder, whose chained type is not worth spelling out
type Q = any

/** Adds the filters and the order. The tutor's own `.eq('tutor_id', ...)` is added by the caller, before this. */
export function applyStudentFilters(q: Q, f: StudentFilters): Q {
  if (f.level !== 'all') q = q.eq('level', f.level)
  if (f.status !== 'all') q = q.eq('status', f.status)
  if (f.q) q = q.or(`name.ilike.%${f.q}%,email.ilike.%${f.q}%`)
  const o = SORT_COLUMN[f.sort]
  // a second order keeps the pages stable when many students share a date or a name
  return q.order(o.col, { ascending: o.asc }).order('id', { ascending: true })
}

export type StudentRow = { id: string; name: string; email: string | null; level: string | null; country: string | null; goals: string | null; status: string; created_at: string }
export const STUDENT_COLUMNS = 'id, name, email, level, country, goals, status, created_at'
export { PAGE_SIZE, EXPORT_LIMIT }

export function studentsCsv(rows: StudentRow[]): string {
  const head = ['Name', 'Email', 'Level', 'Country', 'Goals', 'Status', 'Added']
  const lines = rows.map(s => [s.name, s.email ?? '', s.level ?? '', s.country ?? '', s.goals ?? '', s.status, s.created_at.slice(0, 10)])
  return [head, ...lines].map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

export const BULK_STATUS = ['active', 'paused', 'inactive'] as const
