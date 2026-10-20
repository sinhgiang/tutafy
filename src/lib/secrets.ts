// Reading server secrets the safe way (T-0614): a missing or too-short secret is "not
// configured", never replaced by a value written in the code, and what happens next is
// always "refuse". Log lines name the variable, never its value. Only node built-ins.
import { createHash, timingSafeEqual } from 'node:crypto'

export const MIN_SECRET_LENGTH = 16

const logged = new Set<string>()

/** One server-log line per message per server process, so a missing secret does not flood the log. */
export function logOnce(message: string): void {
  if (logged.has(message)) return
  logged.add(message)
  console.error(`[secrets] ${message}`)
}

/** Forget what was logged (for tests). */
export function resetSecretLog(): void {
  logged.clear()
}

type Env = Record<string, string | undefined>

/** The value of a secret variable, or null when it is missing, blank or shorter than MIN_SECRET_LENGTH. */
export function readSecret(name: string, env: Env = process.env): string | null {
  const value = (env[name] ?? '').trim()
  if (value === '') {
    logOnce(`${name} is not set on the server`)
    return null
  }
  if (value.length < MIN_SECRET_LENGTH) {
    logOnce(`${name} is set but shorter than ${MIN_SECRET_LENGTH} characters, so it is not used`)
    return null
  }
  return value
}

/** Compare two strings without leaking where they differ. */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

/**
 * The key that signs the student sign-in links: STUDENT_AUTH_SECRET. While the owner is moving
 * over, CRON_SECRET is accepted too (with one log line asking for the new variable). Neither set
 * means no signing and no verifying: null.
 */
export function studentAuthSecret(env: Env = process.env): string | null {
  const own = (env.STUDENT_AUTH_SECRET ?? '').trim()
  if (own !== '') return readSecret('STUDENT_AUTH_SECRET', env)
  const old = readSecret('CRON_SECRET', env)
  if (old) logOnce('STUDENT_AUTH_SECRET is not set; the student sign-in links are signed with CRON_SECRET for now. Set STUDENT_AUTH_SECRET.')
  return old
}

/**
 * Check the "Authorization: Bearer <CRON_SECRET>" header of a scheduled job.
 * Returns null when the caller may go on, or the response to send: 503 when the server has
 * no usable CRON_SECRET (closed, nothing runs), 401 when the header is missing or wrong.
 */
export function cronGate(request: Request, env: Env = process.env): Response | null {
  const secret = readSecret('CRON_SECRET', env)
  if (!secret) return Response.json({ error: 'Unavailable' }, { status: 503 })
  const header = request.headers.get('authorization') ?? ''
  if (!safeEqual(header, `Bearer ${secret}`)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}
