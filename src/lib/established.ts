// The "Established" badge (T-0915): a light mark a tutor gets automatically and for free from records Tutafy already holds. Pure and import-free.
//
// It says only what Tutafy itself can see, and nothing about the person: Tutafy does NOT check an ID, a diploma or a qualification (the owner's choice for
// this stage), so no word here, on the card or in the markup, may say or hint that a tutor was "verified". The four things it checks:
//   1. the sign-in email of the account is confirmed (the date the auth service recorded);
//   2. the booking page is live;
//   3. the introduction is written (at least ESTABLISHED_BIO_MIN characters of text);
//   4. at least ESTABLISHED_LESSONS lessons have been taught and marked completed (the date of the tenth is shown).
// All four must hold. The facts are read on the server (src/lib/established-data.ts); this file only decides and words them.

export const ESTABLISHED_LESSONS = 10
/** An introduction counts as written from this many characters (spaces at the ends and runs of blanks do not count). */
export const ESTABLISHED_BIO_MIN = 40

export type EstablishedFacts = {
  /** When the auth service recorded the sign-in email as confirmed, or null. */
  emailConfirmedAt: string | null
  /** Lessons marked completed that have started. */
  completedLessons: number
  /** Start time of the ESTABLISHED_LESSONS-th completed lesson, or null while there are fewer. */
  tenthLessonAt: string | null
  bookingActive: boolean
  bio: string | null
}

export type EstablishedCheck = {
  id: 'email' | 'booking' | 'intro' | 'lessons'
  ok: boolean
  /** The line shown on the card, in plain words. */
  title: string
  /** The line under it: the date, or what is missing. */
  detail: string
}

export type EstablishedResult = { earned: boolean; checks: EstablishedCheck[] }

const validDate = (s: string | null): Date | null => {
  if (!s) return null
  const d = new Date(s)
  return Number.isFinite(d.getTime()) ? d : null
}

/** "Oct 24, 2026", in UTC so a server and a browser draw the same day. */
export function dayLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

/** How many characters of real text an introduction holds. */
export function bioLength(bio: unknown): number {
  return typeof bio === 'string' ? bio.replace(/\s+/g, ' ').trim().length : 0
}

export function establishedBadge(f: EstablishedFacts, now: Date): EstablishedResult {
  const today = dayLabel(now)
  const confirmed = validDate(f.emailConfirmedAt)
  const lessons = Number.isFinite(f.completedLessons) ? Math.max(0, Math.floor(f.completedLessons)) : 0
  const tenth = validDate(f.tenthLessonAt)
  const bioOk = bioLength(f.bio) >= ESTABLISHED_BIO_MIN

  const checks: EstablishedCheck[] = [
    {
      id: 'email', ok: confirmed !== null,
      title: 'Sign-in email confirmed',
      detail: confirmed ? `Confirmed ${dayLabel(confirmed)}` : 'Not confirmed yet',
    },
    {
      id: 'booking', ok: f.bookingActive === true,
      title: 'Booking page is live',
      detail: f.bookingActive === true ? `Checked ${today}` : 'The booking page is off',
    },
    {
      id: 'intro', ok: bioOk,
      title: 'Introduction written',
      detail: bioOk ? `Checked ${today}` : 'No introduction yet',
    },
    {
      id: 'lessons', ok: lessons >= ESTABLISHED_LESSONS,
      title: `${ESTABLISHED_LESSONS}+ lessons taught on Tutafy`,
      detail: lessons >= ESTABLISHED_LESSONS
        ? `${lessons} held${tenth ? `, the ${ESTABLISHED_LESSONS}th on ${dayLabel(tenth)}` : ''}`
        : `${lessons} of ${ESTABLISHED_LESSONS} so far`,
    },
  ]
  return { earned: checks.every(c => c.ok), checks }
}

/** What the card says about itself. Written once so the profile, the card and the tests use the same sentences. */
export const ESTABLISHED_TITLE = 'Established on Tutafy'
export const ESTABLISHED_NOTE = 'Given automatically from Tutafy’s own records. Tutafy does not check IDs, diplomas or qualifications.'
