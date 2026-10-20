// A small in-memory limiter: at most `max` hits per key in each `windowMs`.
// It lives in one server instance's memory (so the limit is per instance, not
// global) and keeps nothing on disk. No imports, so the node tests can load it.

export function createLimiter(opts: { max: number; windowMs: number; now?: () => number; maxKeys?: number }) {
  const now = opts.now ?? Date.now
  const maxKeys = opts.maxKeys ?? 5000
  const hits = new Map<string, number[]>()

  return {
    /** True when this hit is allowed (and counted), false when the key is over its limit. */
    hit(key: string): boolean {
      const t = now()
      const recent = (hits.get(key) ?? []).filter(x => t - x < opts.windowMs)
      if (recent.length >= opts.max) {
        hits.set(key, recent)
        return false
      }
      recent.push(t)
      hits.set(key, recent)
      if (hits.size > maxKeys) {
        for (const [k, v] of hits) {
          if (v.every(x => t - x >= opts.windowMs)) hits.delete(k)
          if (hits.size <= maxKeys) break
        }
      }
      return true
    },
  }
}
