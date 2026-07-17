import crypto from 'crypto'

// Shared HMAC-signed token for the (session-less) student area.
// Used by the email magic-link flow AND the Google login hand-off so both
// land on the same /student/dashboard?token=... page.
const SECRET = () => process.env.CRON_SECRET ?? 'tutafy-student-auth-secret'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function signStudentToken(email: string): string {
  const normalized = email.toLowerCase().trim()
  const ts = Date.now()
  const sig = crypto.createHmac('sha256', SECRET()).update(`${normalized}:${ts}`).digest('hex')
  return Buffer.from(`${normalized}:${ts}:${sig}`).toString('base64url')
}

export function verifyStudentToken(token: string): { email: string; valid: boolean } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const parts = decoded.split(':')
    const sig = parts[parts.length - 1]
    const ts = parts[parts.length - 2]
    const email = parts.slice(0, parts.length - 2).join(':')
    const expected = crypto.createHmac('sha256', SECRET()).update(`${email}:${ts}`).digest('hex')
    const age = Date.now() - parseInt(ts, 10)
    const valid = sig === expected && age < MAX_AGE_MS
    return { email, valid }
  } catch {
    return { email: '', valid: false }
  }
}
