// The address a public request came from, for a rate limit (T-0841). On Vercel the platform sets x-real-ip and x-forwarded-for
// itself and replaces what a caller sent, so the caller cannot choose it there. Anywhere else (a self-hosted copy, a test) a caller
// CAN send these headers, so a limit counted on this address is never the only one: the public waitlist also has a cap per tutor
// that no header can dodge (src/app/api/waitlist/route.ts). Returns '' when the request names no address.
export function clientIp(headers: { get(name: string): string | null }): string {
  const real = headers.get('x-real-ip')?.trim()
  if (real) return real.slice(0, 64)
  const first = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return first ? first.slice(0, 64) : ''
}
