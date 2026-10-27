// The "Make your profile ready for students" card on the tutor dashboard (T-0765).
//
// A percentage and a to-do list worked out from fields a tutor already has: free hours, introduction (bio), lesson price,
// photo and reviews. It is computed every time and never stored: no table or column is added, nothing is sent to anyone.
// The reads use the signed-in tutor's own session client and name the tutor's id in every query, like src/lib/first-student.ts.
//
// Photo (T-0766): a tutor can now add one in Settings, Profile (src/app/api/tutors/avatar/route.ts), so the photo step counts and has its own
// weight. PHOTO_UPLOAD_READY stays as the switch: false puts the photo row back to "Coming soon" and shares its weight among the other steps
// (for a database where the photo bucket of supabase/migrations/024_tutor_avatars.sql has not been made, or if the upload is ever withdrawn).
import type { BuyersClient } from '@/lib/buyers-data'
import { SITE_URL } from '@/lib/site-url'
import { unfilledParts } from '@/lib/intro-templates'

export const PHOTO_UPLOAD_READY = true

/** An introduction counts as written from this many characters: a few sentences, not a single line. */
export const BIO_MIN_CHARS = 200

export type CompletionStepId = 'hours' | 'photo' | 'intro' | 'prices' | 'review'

export type CompletionStep = {
  id: CompletionStepId
  title: string
  hint: string
  href: string // the page the button opens
  action: string // the button's words
  done: boolean
  weight: number // points of the 100 this step is worth; 0 for a step that is not counted yet
  soon: boolean // the tutor cannot do this yet (no photo upload): shown muted, no button
}

export type ProfileCompletion = {
  percent: number // 0 to 100, a whole number
  complete: boolean // 100: the card shrinks to one line
  steps: CompletionStep[] // open steps first (biggest weight first), done and "coming soon" steps after
  profileUrl: string | null // the public page, for the copy button and the preview link
  profilePath: string | null
}

export type CompletionFacts = {
  slug: string | null
  bio: string | null
  avatarUrl: string | null
  defaultLessonPrice: unknown
  reviewCount: unknown
  availabilityRows: number
}

const WEIGHTS_WITH_PHOTO: Record<CompletionStepId, number> = { hours: 25, photo: 20, intro: 20, prices: 20, review: 15 }
const WEIGHTS_WITHOUT_PHOTO: Record<CompletionStepId, number> = { hours: 30, photo: 0, intro: 25, prices: 25, review: 20 }

/**
 * True when the tutor wrote a real introduction: at least BIO_MIN_CHARS characters once the spaces at both ends are gone, and no
 * [bracketed part] of a template left to fill in (an unchanged template is not an introduction).
 */
export function hasIntroduction(bio: unknown): boolean {
  return typeof bio === 'string' && bio.trim().length >= BIO_MIN_CHARS && unfilledParts(bio).length === 0
}

/** True for a price above zero. A blank, zero, negative or non-number price means "not set". */
export function hasPrice(price: unknown): boolean {
  const n = typeof price === 'string' ? Number(price.trim()) : Number(price)
  return price !== null && price !== '' && Number.isFinite(n) && n > 0
}

/** True for a photo address that is really there. */
export function hasPhoto(avatarUrl: unknown): boolean {
  return typeof avatarUrl === 'string' && avatarUrl.trim().length > 0
}

/** True when the tutor has at least one public review. */
export function hasReview(reviewCount: unknown): boolean {
  const n = Number(reviewCount)
  return Number.isFinite(n) && n >= 1
}

export function buildProfileCompletion(f: CompletionFacts, photoUploadReady: boolean = PHOTO_UPLOAD_READY): ProfileCompletion {
  const w = photoUploadReady ? WEIGHTS_WITH_PHOTO : WEIGHTS_WITHOUT_PHOTO
  const photoDone = hasPhoto(f.avatarUrl)
  const steps: CompletionStep[] = [
    {
      id: 'hours', title: 'Set your free hours', hint: 'Students cannot book you until you do.',
      href: '/availability', action: 'Set free hours', done: f.availabilityRows > 0, weight: w.hours, soon: false,
    },
    {
      id: 'intro', title: 'Write your introduction', hint: `A few sentences about who you teach and how a lesson goes. Start from a template.`,
      href: '/settings?tab=profile', action: 'Use a template', done: hasIntroduction(f.bio), weight: w.intro, soon: false,
    },
    {
      id: 'prices', title: 'Set your lesson price', hint: 'Students want to see a price before they book.',
      href: '/settings?tab=booking', action: 'Set price', done: hasPrice(f.defaultLessonPrice), weight: w.prices, soon: false,
    },
    {
      id: 'photo', title: 'Add a clear photo of your face',
      hint: photoUploadReady || photoDone ? 'Smiling, good light, plain background.' : 'Coming soon. We will tell you when you can add one.',
      href: '/settings?tab=profile', action: 'Add photo', done: photoDone, weight: w.photo, soon: !photoUploadReady && !photoDone,
    },
    {
      id: 'review', title: 'Ask your first student for a review',
      hint: 'After a lesson, a student can review you from their lesson page. Ask your first one to do it.',
      href: '/students', action: 'Open students', done: hasReview(f.reviewCount), weight: w.review, soon: false,
    },
  ]
  const counted = steps.filter(s => s.weight > 0)
  const total = counted.reduce((a, s) => a + s.weight, 0)
  const earned = counted.filter(s => s.done).reduce((a, s) => a + s.weight, 0)
  const percent = total === 0 ? 0 : Math.round((earned / total) * 100)
  // open steps first (the biggest gain first), then what is done, then what cannot be done yet
  const rank = (s: CompletionStep) => (s.soon ? 2 : s.done ? 1 : 0)
  const ordered = [...steps].sort((a, b) => rank(a) - rank(b) || (rank(a) === 0 ? b.weight - a.weight : 0))
  return {
    percent,
    complete: percent === 100,
    steps: ordered,
    profileUrl: f.slug ? `${SITE_URL}/tutors/${f.slug}` : null,
    profilePath: f.slug ? `/tutors/${f.slug}` : null,
  }
}

/**
 * Read the facts for one tutor and build the card. A failed read gives null (no card), so a broken read never tells a tutor with
 * hours that they have none.
 */
export async function loadProfileCompletion(db: BuyersClient, tutorId: string): Promise<ProfileCompletion | null> {
  const [tutor, availability] = await Promise.all([
    db.from('tutors').select('slug, bio, avatar_url, default_lesson_price, review_count').eq('id', tutorId).maybeSingle(),
    db.from('availability').select('id', { count: 'exact', head: true }).eq('tutor_id', tutorId),
  ])
  if (tutor.error || !tutor.data || availability.error || availability.count == null) return null
  return buildProfileCompletion({
    slug: tutor.data.slug ?? null,
    bio: tutor.data.bio ?? null,
    avatarUrl: tutor.data.avatar_url ?? null,
    defaultLessonPrice: tutor.data.default_lesson_price ?? null,
    reviewCount: tutor.data.review_count ?? 0,
    availabilityRows: availability.count,
  })
}
