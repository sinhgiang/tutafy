// Strip invisible BOM / zero-width / stray whitespace that can sneak into URLs
// (e.g. a corrupted env var), which otherwise turns an absolute link into a
// broken relative path and yields a 404. Safe to call on any URL string.
export function cleanUrl(u: string | null | undefined): string {
  if (!u) return ''
  return u.replace(/[﻿​‌‍⁠]/g, '').trim()
}
