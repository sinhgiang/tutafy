// What the list pages (Students, Lessons) read from the address (T-0822). Every value goes through a fixed list or a
// strict pattern, so a typed address can never reach a query as anything but a known choice.
export const PAGE_SIZE = 25
export const EXPORT_LIMIT = 5000

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)

/** One of the allowed values, or the fallback. */
export function pick<T extends string>(raw: string | null | undefined, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(raw ?? '') ? (raw as T) : fallback
}

/** A page number from the address: a whole number from 1 up; anything else is page 1. */
export function parsePage(raw: string | null | undefined): number {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 && n <= 100000 ? n : 1
}

/**
 * Words typed in a search box, made safe to put inside a PostgREST filter string: the characters that mean something
 * there (comma, parentheses, quotes, backslash, % _ * dot and colon) are dropped, the rest is trimmed and cut to 60 characters.
 */
export function cleanSearch(raw: string | null | undefined): string {
  return (raw ?? '').replace(/[,()"'\\%_*.:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
}

/** Row range (inclusive, for Supabase range()) of a 1-based page. */
export function rangeOfPage(page: number): [number, number] {
  return [(page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1]
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE))
}

/** An address with some parameters set and the default ones left out, so addresses stay short. */
export function hrefWith(base: string, current: Record<string, string>, patch: Record<string, string | number | null>, defaults: Record<string, string>): string {
  const merged: Record<string, string> = { ...current }
  for (const [k, v] of Object.entries(patch)) { if (v === null) delete merged[k]; else merged[k] = String(v) }
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(merged)) if (v !== '' && v !== defaults[k]) q.set(k, v)
  const s = q.toString()
  return s ? `${base}?${s}` : base
}
