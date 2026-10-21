// The "Get your first student" card on the tutor dashboard (T-0681).
//
// Five steps whose ticks are worked out from data that already exists; no table or column is added,
// and nothing is sent to anyone. The reads use the signed-in tutor's own session client and name
// the tutor's id in every query, so the card only ever shows that tutor's own data.
//
//   1 student       a REAL student: one whose email is not the tutor's own (a student the tutor made by
//                   booking their own page does not count; a student with no email does)
//   2 availability  at least one weekly free-hours row
//   3 lengths       the tutor ticked their lesson lengths in Settings (tutors.lesson_durations, migration 018;
//                   until that migration is applied the column cannot be read, and the step stays open)
//   4 payment       a valid https card payment link (tutors.paddle_checkout_link). The Payments tab of Settings is
//                   a Pro feature, so on the Free plan this step is shown with a "Pro" tag and does not hold the
//                   card open
//   5 share         at least one lesson exists (a student booked from the shared page, or the tutor booked a test one)
//
// The card is gone when every required step is done, or when the tutor hides it (kept in their browser).
import type { BuyersClient } from '@/lib/buyers-data'
import { chosenDurations } from '@/lib/lesson-durations'
import { safeHttpsUrl } from '@/lib/payment-link'
import { isSelfAdded } from '@/lib/self-added'
import { hasPlan } from '@/lib/plans'
import { SITE_URL } from '@/lib/site-url'

export type StepId = 'student' | 'availability' | 'lengths' | 'payment' | 'share'

export type FirstStudentStep = {
  id: StepId
  title: string
  hint: string
  href: string // the page the button opens
  action: string // the button's words
  done: boolean
  proOnly: boolean // shown with a "Pro" tag, and not required for the card to go away
}

export type FirstStudentCard = {
  steps: FirstStudentStep[]
  done: number // required steps done
  required: number // required steps
  bookingUrl: string | null // the tutor's public booking link, for the copy button
}

export type FirstStudentFacts = {
  tutorEmail: string | null
  plan: string | null
  slug: string | null
  studentEmails: (string | null)[]
  availabilityRows: number
  lessonDurations: unknown
  cardLink: string | null
  lessons: number
}

/** The steps and their ticks from the facts; the card is null when there is nothing left to do. */
export function buildFirstStudent(f: FirstStudentFacts): FirstStudentCard | null {
  const paidPlan = hasPlan(f.plan, 'pro')
  const bookingUrl = f.slug ? `${SITE_URL}/book/${f.slug}` : null
  const steps: FirstStudentStep[] = [
    {
      id: 'student', title: 'Add your first real student',
      hint: 'Someone who is not you. Your own email does not count.',
      href: '/students/new', action: 'Add a student',
      done: f.studentEmails.some(e => !isSelfAdded(e, f.tutorEmail)), proOnly: false,
    },
    {
      id: 'availability', title: 'Set your free hours',
      hint: 'The days and times students can book you.',
      href: '/availability', action: 'Set hours',
      done: f.availabilityRows > 0, proOnly: false,
    },
    {
      id: 'lengths', title: 'Choose your lesson lengths',
      hint: 'Tick the lengths you teach, or type your own, like 75 minutes.',
      href: '/settings?tab=booking', action: 'Choose lengths',
      done: chosenDurations(f.lessonDurations) !== null, proOnly: false,
    },
    {
      id: 'payment', title: 'Paste your card payment link',
      hint: paidPlan ? 'A Stripe Payment Link, so students can pay by card.' : 'Card payments come with the Pro plan.',
      href: '/settings?tab=payments', action: paidPlan ? 'Add link' : 'See Pro',
      done: safeHttpsUrl(f.cardLink) !== null, proOnly: !paidPlan,
    },
    {
      id: 'share', title: 'Share your booking page and book a test lesson',
      hint: 'Copy your link and send it to a student, or book a test lesson yourself.',
      href: f.slug ? `/book/${f.slug}` : '/settings?tab=booking', action: 'Open page',
      done: f.lessons > 0, proOnly: false,
    },
  ]
  const required = steps.filter(s => !s.proOnly)
  const done = required.filter(s => s.done).length
  if (done === required.length) return null
  return { steps, done, required: required.length, bookingUrl }
}

/**
 * Read the facts for one tutor and build the card. Returns null (no card) when a read fails, so a
 * broken read never shows a wrong to-do list. The lesson-lengths column is read apart: it may not exist yet.
 */
export async function loadFirstStudent(db: BuyersClient, tutorId: string): Promise<FirstStudentCard | null> {
  const [tutor, lengths, students, availability, lessons] = await Promise.all([
    db.from('tutors').select('email, slug, subscription_status, paddle_checkout_link').eq('id', tutorId).maybeSingle(),
    db.from('tutors').select('lesson_durations').eq('id', tutorId).maybeSingle(),
    db.from('students').select('email').eq('tutor_id', tutorId).limit(1000),
    db.from('availability').select('id', { count: 'exact', head: true }).eq('tutor_id', tutorId),
    db.from('lessons').select('id', { count: 'exact', head: true }).eq('tutor_id', tutorId),
  ])
  if (tutor.error || !tutor.data || students.error || availability.error || lessons.error) return null
  return buildFirstStudent({
    tutorEmail: tutor.data.email ?? null,
    plan: tutor.data.subscription_status ?? null,
    slug: tutor.data.slug ?? null,
    studentEmails: ((students.data ?? []) as { email: string | null }[]).map(s => s.email),
    availabilityRows: availability.count ?? 0,
    lessonDurations: lengths.error ? null : lengths.data?.lesson_durations ?? null,
    cardLink: tutor.data.paddle_checkout_link ?? null,
    lessons: lessons.count ?? 0,
  })
}

// ---- hiding the card ----------------------------------------------------------------
// "Hide" is kept in the tutor's browser (localStorage), one key per tutor: no table or column is added.
// Private windows and blocked storage can throw, so every access is wrapped, and then the card just stays.
type StorageRead = { getItem(key: string): string | null }
type StorageWrite = { setItem(key: string, value: string): void }

export const hiddenKey = (tutorId: string) => `tutafy:first-student-hidden:${tutorId}`

export function readHidden(storage: StorageRead | null, tutorId: string): boolean {
  try {
    return storage?.getItem(hiddenKey(tutorId)) === '1'
  } catch {
    return false
  }
}

export function writeHidden(storage: StorageWrite | null, tutorId: string): void {
  try {
    storage?.setItem(hiddenKey(tutorId), '1')
  } catch { /* storage blocked: the card stays until all steps are done */ }
}
