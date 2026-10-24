// A browser push subscription as the app keeps it in `push_subscription` (tutors and students) and later hands to the push library, which
// sends a request to its `endpoint`. The body of the request is somebody's input, so only a well-formed subscription is kept, and only the
// fields the library needs: an https address (never another scheme, never an address with a user name or password) and the two keys.
export type PushSubscriptionJson = { endpoint: string; expirationTime: number | null; keys: { p256dh: string; auth: string } }

const KEY = /^[A-Za-z0-9_\-+/=]{8,200}$/

export function cleanPushSubscription(raw: unknown): PushSubscriptionJson | null {
  if (!raw || typeof raw !== 'object') return null
  const { endpoint, expirationTime, keys } = raw as { endpoint?: unknown; expirationTime?: unknown; keys?: { p256dh?: unknown; auth?: unknown } | null }
  if (typeof endpoint !== 'string' || endpoint.length > 2000) return null
  let url: URL
  try { url = new URL(endpoint) } catch { return null }
  if (url.protocol !== 'https:' || url.username || url.password) return null
  if (typeof keys?.p256dh !== 'string' || typeof keys.auth !== 'string' || !KEY.test(keys.p256dh) || !KEY.test(keys.auth)) return null
  return {
    endpoint,
    expirationTime: typeof expirationTime === 'number' && Number.isFinite(expirationTime) ? expirationTime : null,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
  }
}
