import crypto from 'crypto'
import { logOnce, safeEqual, studentAuthSecret } from '@/lib/secrets'

// Shared HMAC-signed token for the (session-less) student area.
// Used by the email magic-link flow AND the Google login hand-off so both
// land on the same /student/dashboard?token=... page.
//
// The signing key comes only from the server's environment (STUDENT_AUTH_SECRET, or CRON_SECRET
// while moving over; see secrets.ts). There is no key written in the code: with none set, no link
// can be made and no link is accepted.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/** Thrown when the server has no usable signing key. The message holds no secret. */
export class StudentAuthUnavailable extends Error {
  constructor() {
    super('student_auth_unavailable')
    this.name = 'StudentAuthUnavailable'
  }
}

export function isStudentAuthConfigured(): boolean {
  return studentAuthSecret() !== null
}

function mac(secret: string, email: string, ts: string | number): string {
  return crypto.createHmac('sha256', secret).update(`${email}:${ts}`).digest('hex')
}

export function signStudentToken(email: string): string {
  const secret = studentAuthSecret()
  if (!secret) {
    logOnce('student sign-in links refused: no signing key (set STUDENT_AUTH_SECRET)')
    throw new StudentAuthUnavailable()
  }
  const normalized = email.toLowerCase().trim()
  const ts = Date.now()
  return Buffer.from(`${normalized}:${ts}:${mac(secret, normalized, ts)}`).toString('base64url')
}

export function verifyStudentToken(token: string): { email: string; valid: boolean } {
  const secret = studentAuthSecret()
  if (!secret) {
    logOnce('student sign-in links refused: no signing key (set STUDENT_AUTH_SECRET)')
    return { email: '', valid: false }
  }
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const parts = decoded.split(':')
    const sig = parts[parts.length - 1]
    const ts = parts[parts.length - 2]
    const email = parts.slice(0, parts.length - 2).join(':')
    const age = Date.now() - parseInt(ts, 10)
    const valid = safeEqual(sig, mac(secret, email, ts)) && Number.isFinite(age) && age >= 0 && age < MAX_AGE_MS
    return { email, valid }
  } catch {
    return { email: '', valid: false }
  }
}
