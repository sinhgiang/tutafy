import { randomBytes, timingSafeEqual } from 'node:crypto'

// The "state" of the Google Calendar connection (OAuth). Starting it makes a random value, puts it in the address sent to Google and in an
// http-only cookie of the same browser, together with the signed-in tutor's id. Google sends the browser back with the value in the
// address; the return is accepted only when the cookie holds the same value for the SAME signed-in account. An address that anybody can
// write (a victim's id, or a code from someone else's Google account) therefore never connects a calendar to a tutor.
export const GCAL_STATE_COOKIE = 'tutafy_gcal_state'
export const GCAL_STATE_PATH = '/api/auth/google-calendar'
export const GCAL_STATE_MAX_AGE = 600

/** A fresh state for this tutor: `state` goes to Google, `cookie` into the browser. */
export function newGcalState(tutorId: string): { state: string; cookie: string } {
  const state = randomBytes(24).toString('base64url')
  return { state, cookie: `${tutorId}.${state}` }
}

/** True when the returned state is the one this browser's cookie holds, made for this signed-in tutor. */
export function gcalStateMatches(cookie: string | undefined, returned: string | null, tutorId: string): boolean {
  if (!cookie || !returned) return false
  const expected = Buffer.from(`${tutorId}.${returned}`)
  const held = Buffer.from(cookie)
  return expected.length === held.length && timingSafeEqual(expected, held)
}
