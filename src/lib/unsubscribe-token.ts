// The signed link that unsubscribes one address from Tutafy's tips mail (T-0737).
//
// The token is the lower-case address plus an HMAC of it, made with UNSUBSCRIBE_SECRET: it cannot be forged and cannot be changed to
// another address, and it does not expire (an old mail must still be able to unsubscribe). The secret is its own variable, never
// reused from another one (not STUDENT_AUTH_SECRET, not CRON_SECRET): with none set, no link can be made, no link is accepted,
// and the mail sender sends nothing (see welcome-send.ts).
//
// What a link can do is only "unsubscribe this address". Opening it changes nothing; the button on the page (a POST) does.
import { createHmac } from 'node:crypto'
import { readSecret, safeEqual } from '@/lib/secrets'
import { SITE_URL } from '@/lib/site-url'

type Env = Record<string, string | undefined>

/** The signing key, or null when UNSUBSCRIBE_SECRET is missing, blank or too short. */
export function unsubscribeSecret(env: Env = process.env): string | null {
  return readSecret('UNSUBSCRIBE_SECRET', env)
}

const ADDRESS = /^[^\s:@]+@[^\s:@]+$/

const mac = (secret: string, email: string) => createHmac('sha256', secret).update(`unsubscribe:${email}`).digest('hex')

/** The token for an address, or null when there is no signing key (nothing is ever signed with a made-up key). */
export function signUnsubscribeToken(email: string, env: Env = process.env): string | null {
  const secret = unsubscribeSecret(env)
  const e = email.trim().toLowerCase()
  if (!secret || !ADDRESS.test(e) || e.length > 254) return null
  return Buffer.from(`${e}:${mac(secret, e)}`).toString('base64url')
}

/** The address a token was signed for, or null when the token is not ours, was changed, or the server has no key. */
export function verifyUnsubscribeToken(token: string, env: Env = process.env): string | null {
  const secret = unsubscribeSecret(env)
  if (!secret || typeof token !== 'string' || token.length === 0 || token.length > 700) return null
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const cut = decoded.lastIndexOf(':')
    if (cut < 0) return null
    const email = decoded.slice(0, cut)
    const sig = decoded.slice(cut + 1)
    if (email !== email.toLowerCase() || !ADDRESS.test(email) || email.length > 254) return null
    return safeEqual(sig, mac(secret, email)) ? email : null
  } catch {
    return null
  }
}

/** The page that asks "Unsubscribe <address>?" (a link in the mail). */
export const unsubscribePageUrl = (token: string) => `${SITE_URL}/unsubscribe?t=${token}`
/** The address a mail program posts to for its own Unsubscribe button (the List-Unsubscribe header). */
export const unsubscribePostUrl = (token: string) => `${SITE_URL}/api/unsubscribe?t=${token}`
