// A lesson's meeting can run on the built-in room (default) or on an external
// platform the tutor chooses (Zoom, Google Meet, or any custom link). We store
// the external URL in `lessons.zoom_link` and infer which platform it is from
// the URL itself, so no extra column/migration is needed.

export type VideoProvider = 'builtin' | 'zoom' | 'meet' | 'custom'

export interface VideoProviderInfo {
  provider: VideoProvider
  name: string
}

export function inferVideoProvider(externalUrl: string | null | undefined): VideoProviderInfo {
  const u = (externalUrl ?? '').trim()
  if (!u) return { provider: 'builtin', name: 'Built-in room' }
  let host = ''
  try { host = new URL(u).hostname.toLowerCase() } catch { host = u.toLowerCase() }
  if (host.includes('zoom.us') || host.includes('zoom.com')) return { provider: 'zoom', name: 'Zoom' }
  if (host.includes('meet.google.com')) return { provider: 'meet', name: 'Google Meet' }
  return { provider: 'custom', name: 'Custom link' }
}

// Accept only real http(s) links so a pasted value can't break the Join button
// or become an open-redirect vector.
export function isValidMeetingUrl(url: string): boolean {
  const u = (url ?? '').trim()
  if (!u) return false
  try {
    const parsed = new URL(u)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

// The single source of truth for "where does Join go": the external link if the
// tutor set one, otherwise the built-in branded room. Used by every student- and
// tutor-facing Join point so they never disagree.
export function resolveJoinTarget(opts: {
  externalUrl?: string | null
  builtinRoomPath: string
}): { href: string; external: boolean } {
  const ext = (opts.externalUrl ?? '').trim()
  if (ext) return { href: ext, external: true }
  return { href: opts.builtinRoomPath, external: false }
}
