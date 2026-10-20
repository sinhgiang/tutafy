// Reading long lists from the database the safe way. Supabase answers at most 1000 rows
// per request, so a long read must be paged with range() until a page comes back short,
// in a fixed order. No imports, so the node tests can load it.

export const ROWS_PER_REQUEST = 1000 // what one database request can return
export const MAX_PAGES = 100 // one read stops after this many pages (100 000 rows) and says so
export const CHUNK = 100 // ids per database request, to keep the request address short
export const PARALLEL = 10 // requests or visitors handled at the same time

export type ReadState = { error: boolean; truncated: boolean }
export type RangeQuery = { range(from: number, to: number): PromiseLike<{ data: unknown[] | null; error: unknown }> }

export function newReadState(): ReadState {
  return { error: false, truncated: false }
}

export function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** Run `fn` on every item, PARALLEL at a time. */
export async function inBatches<T>(items: T[], fn: (item: T) => Promise<void>): Promise<void> {
  for (const batch of chunks(items, PARALLEL)) await Promise.all(batch.map(fn))
}

/**
 * Read every row of a query, page by page, until a page comes back with fewer rows than a
 * full page. `build` must return a fresh query each time, with a fixed order (the caller
 * orders by a column and by id), so pages never overlap or skip. An error stops the read and
 * sets state.error; hitting MAX_PAGES sets state.truncated.
 */
export async function readAll<T>(build: () => RangeQuery, state: ReadState): Promise<T[]> {
  const out: T[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * ROWS_PER_REQUEST
    const { data, error } = await build().range(from, from + ROWS_PER_REQUEST - 1)
    if (error) {
      state.error = true
      return out
    }
    const got = (data ?? []) as T[]
    for (const row of got) out.push(row) // a loop, not push(...got): keeps memory and the call stack small
    if (got.length < ROWS_PER_REQUEST) return out
  }
  state.truncated = true
  return out
}
