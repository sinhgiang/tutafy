/**
 * A to-one embed such as `students(name)` comes back from PostgREST as an object, but the untyped client types it as
 * an array. `one()` reads it as the single row it really is, and also accepts the array form, so callers need no cast.
 */
export function one<T>(rel: T | T[] | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null
  return rel ?? null
}
