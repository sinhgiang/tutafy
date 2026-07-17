// The public origin of the current request (e.g. https://www.tutafy.com).
//
// We derive it from the request headers rather than NEXT_PUBLIC_APP_URL, which
// has been empty/BOM'd in production — that made OAuth redirect URIs collapse to
// a relative path and Google rejected them with redirect_uri_mismatch. Using the
// real request host guarantees the redirect URI always matches the host the user
// is actually on (and works on preview deployments too).
export function originFromRequest(req: Request): string {
  const h = req.headers
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  if (host) return `${proto}://${host}`.replace(/\/+$/, '')
  const env = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/[﻿​\s]/g, '').replace(/\/+$/, '')
  return env || 'https://tutafy.com'
}
