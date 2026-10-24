// The reads and writes of the reviews flow (T-0898). SERVER ONLY: every function takes the server's client (the admin client) and checks WHO is asking
// before it touches a row (rule 5 of the owner's security rules): a student is known by their portal link, a tutor by their sign-in (the route passes
// the tutor's id from the session, never from the request body). The rules themselves are in src/lib/reviews-flow.ts and, for the database, in
// supabase/migrations/027_reviews_flow.sql, which refuses a forbidden change even if a mistake here lets one through.
import { editOpen, publicName, summarize, type ReviewInput, type Summary } from '@/lib/reviews-flow'
import { loadReviewLessonCounts, type ReadClient } from '@/lib/profile-data'

type Row = Record<string, unknown>
type Result<T = Row[]> = { data: T | null; error: { code?: string; message?: string } | null; count?: number | null }
type Query = PromiseLike<Result> & {
  eq(c: string, v: unknown): Query; is(c: string, v: unknown): Query; in(c: string, v: unknown[]): Query; gte(c: string, v: string): Query; lte(c: string, v: string): Query; lt(c: string, v: string): Query
  order(c: string, o?: { ascending: boolean }): Query; limit(n: number): Query; select(cols?: string): Query
  maybeSingle(): PromiseLike<Result<Row>>
}
/** The part of a Supabase client these functions use. */
export type FlowClient = { from(table: string): { select(cols: string, opts?: { count?: 'exact'; head?: boolean }): Query; insert(p: Row): Query; update(p: Row): Query; delete(): Query } }

const str = (v: unknown, max = 120): string | null => (typeof v === 'string' && v.length > 0 && v.length <= max ? v : null)

export type Failure = { ok: false; status: number; error: string }
const fail = (status: number, error: string): Failure => ({ ok: false, status, error })

/** The tutor's stored average and count, worked out again from the public reviews (the same two columns the directory and the profile read). */
export async function recomputeTutorRating(db: FlowClient, tutorId: string): Promise<void> {
  const { data } = await db.from('reviews').select('rating').eq('tutor_id', tutorId).eq('is_public', true)
  const s = summarize((data ?? []).map(r => Number(r.rating)))
  await db.from('tutors').update({ average_rating: s.average, review_count: s.count }).eq('id', tutorId)
}

export type SubmitResult = { ok: true; id: string; edited: boolean } | Failure

/**
 * A student's review of a tutor, written or changed. The student is the owner of the portal link; the lesson must be theirs, completed, and already
 * held; there is one review per student per tutor, edited for 7 days and then closed. A review written the old way (before the flow) counts as the
 * student's one review and is not duplicated.
 */
export async function submitFlowReview(db: FlowClient, args: { portalToken: unknown; lessonId: unknown; input: ReviewInput; now: Date }): Promise<SubmitResult> {
  const token = str(args.portalToken)
  const lessonId = str(args.lessonId)
  if (!token || !lessonId) return fail(400, 'Missing the lesson or the link.')

  const { data: student } = await db.from('students').select('id, tutor_id').eq('portal_token', token).maybeSingle()
  if (!student) return fail(401, 'This link is not valid.')

  const { data: lesson } = await db.from('lessons').select('id, tutor_id, status, starts_at').eq('id', lessonId).eq('student_id', String(student.id)).maybeSingle()
  if (!lesson) return fail(404, 'Lesson not found.')
  if (lesson.status !== 'completed' || new Date(String(lesson.starts_at)).getTime() > args.now.getTime()) return fail(400, 'You can review a lesson after it has taken place.')
  const tutorId = String(lesson.tutor_id)

  // a student may have several OLD reviews of this tutor (one per lesson, before the flow): read the list, not "one row"
  const { data: before } = await db.from('reviews').select('id, flow, created_at').eq('student_id', String(student.id)).eq('tutor_id', tutorId).limit(20)
  const existing = (before ?? []).find(r => r.flow === true)
  const row: Row = { rating: args.input.rating, tags: args.input.tags, comment: args.input.comment }

  if (!existing && (before ?? []).length > 0) return fail(409, 'You have already reviewed this tutor.')
  if (existing) {
    if (!editOpen(String(existing.created_at), args.now)) return fail(403, 'A review can be edited for 7 days after it was written.')
    const { data, error } = await db.from('reviews').update(row).eq('id', String(existing.id)).eq('student_id', String(student.id)).eq('tutor_id', tutorId).select('id').maybeSingle()
    if (error || !data) return fail(error?.code === '42501' ? 403 : 500, 'The review could not be saved.')
    await recomputeTutorRating(db, tutorId)
    return { ok: true, id: String(data.id), edited: true }
  }

  const { data, error } = await db.from('reviews').insert({ ...row, lesson_id: lessonId, student_id: String(student.id), tutor_id: tutorId, is_public: true, flow: true }).select('id').maybeSingle()
  if (error) return fail(error.code === '23505' ? 409 : 500, error.code === '23505' ? 'You have already reviewed this tutor.' : 'The review could not be saved.')
  if (!data) return fail(500, 'The review could not be saved.')
  await recomputeTutorRating(db, tutorId)
  return { ok: true, id: String(data.id), edited: false }
}

/** A tutor's one answer to a review of theirs. `tutorId` comes from the tutor's sign-in. */
export async function replyToReview(db: FlowClient, args: { tutorId: string; reviewId: unknown; text: string; now: Date }): Promise<{ ok: true } | Failure> {
  const reviewId = str(args.reviewId)
  if (!reviewId) return fail(400, 'Missing the review.')
  const { data: review } = await db.from('reviews').select('id, flow, tutor_reply').eq('id', reviewId).eq('tutor_id', args.tutorId).maybeSingle()
  if (!review || review.flow !== true) return fail(404, 'Review not found.')
  if (review.tutor_reply !== null && review.tutor_reply !== undefined) return fail(409, 'You have already answered this review.')
  // the answer is written only where there is none yet, so two presses at once cannot give two answers
  const { data, error } = await db.from('reviews').update({ tutor_reply: args.text, replied_at: args.now.toISOString() }).eq('id', reviewId).eq('tutor_id', args.tutorId).is('tutor_reply', null).select('id').maybeSingle()
  if (error || !data) return fail(error?.code === '42501' ? 409 : 500, 'The answer could not be saved.')
  return { ok: true }
}

/** The lessons a tutor has taught: completed and already held (a lesson booked for later does not count). */
export async function countLessonsHeld(db: FlowClient, tutorId: string, now: Date): Promise<number> {
  const res = await db.from('lessons').select('id', { count: 'exact', head: true }).eq('tutor_id', tutorId).eq('status', 'completed').lte('starts_at', now.toISOString())
  return res.count ?? 0
}

export type ProfileReview = {
  id: string
  name: string
  rating: number
  comment: string | null
  tags: string[]
  createdAt: string
  reply: string | null
  /** Completed lessons this student had with this tutor (0 when it cannot be told). */
  lessons: number
}

/** The public reviews of a tutor for the profile: newest first, with the name as "Maria K." and the number of lessons the student took. Nothing that identifies a student beyond that. */
export async function loadProfileReviews(db: FlowClient, tutorId: string): Promise<{ reviews: ProfileReview[]; summary: Summary }> {
  const { data } = await db.from('reviews').select('id, student_id, rating, comment, tags, created_at, tutor_reply').eq('tutor_id', tutorId).eq('is_public', true).order('created_at', { ascending: false }).limit(100)
  const rows = (data ?? []).filter(r => Number.isInteger(Number(r.rating)) && Number(r.rating) >= 1 && Number(r.rating) <= 5)
  const ids = [...new Set(rows.map(r => String(r.student_id ?? '')).filter(Boolean))]
  const names = new Map<string, string>()
  if (ids.length > 0) {
    const { data: students } = await db.from('students').select('id, name').in('id', ids)
    for (const s of students ?? []) names.set(String(s.id), publicName(s.name))
  }
  const lessons = await loadReviewLessonCounts(() => db as unknown as ReadClient, tutorId, ids)
  const reviews = rows.map(r => ({
    id: String(r.id),
    name: names.get(String(r.student_id)) ?? 'A student',
    rating: Number(r.rating),
    comment: typeof r.comment === 'string' && r.comment ? r.comment : null,
    tags: Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === 'string') : [],
    createdAt: String(r.created_at),
    reply: typeof r.tutor_reply === 'string' && r.tutor_reply ? r.tutor_reply : null,
    lessons: lessons.get(String(r.student_id)) ?? 0,
  }))
  return { reviews, summary: summarize(reviews.map(r => r.rating)) }
}

export type ReviewPageState = {
  /** How the student's name appears on the review ("Maria K."), shown on the form before they publish. */
  shownAs: string
  tutor: { id: string; name: string }
  lesson: { id: string; startsAt: string }
  existing: { rating: number; tags: string[]; comment: string; createdAt: string } | null
  /** The old reviews (written before the flow) are the student's one review and are not edited here. */
  legacy: boolean
}

/** What the review page needs for one student and one lesson, or null when the link or the lesson is not theirs (the page then says it does not exist). */
export async function loadReviewPageState(db: FlowClient, args: { portalToken: unknown; lessonId: unknown; now: Date }): Promise<ReviewPageState | null> {
  const token = str(args.portalToken)
  const lessonId = str(args.lessonId)
  if (!token || !lessonId) return null
  const { data: student } = await db.from('students').select('id, name').eq('portal_token', token).maybeSingle()
  if (!student) return null
  const { data: lesson } = await db.from('lessons').select('id, tutor_id, status, starts_at').eq('id', lessonId).eq('student_id', String(student.id)).maybeSingle()
  if (!lesson || lesson.status !== 'completed' || new Date(String(lesson.starts_at)).getTime() > args.now.getTime()) return null
  const { data: tutor } = await db.from('tutors').select('id, name').eq('id', String(lesson.tutor_id)).maybeSingle()
  if (!tutor) return null
  const { data: mine } = await db.from('reviews').select('rating, tags, comment, created_at, flow').eq('student_id', String(student.id)).eq('tutor_id', String(tutor.id)).limit(20)
  const review = (mine ?? []).find(r => r.flow === true) ?? (mine ?? [])[0]
  return {
    shownAs: publicName(student.name),
    tutor: { id: String(tutor.id), name: typeof tutor.name === 'string' ? tutor.name : 'your tutor' },
    lesson: { id: String(lesson.id), startsAt: String(lesson.starts_at) },
    existing: review ? { rating: Number(review.rating), tags: Array.isArray(review.tags) ? review.tags.filter((t): t is string => typeof t === 'string') : [], comment: typeof review.comment === 'string' ? review.comment : '', createdAt: String(review.created_at) } : null,
    legacy: Boolean(review) && review!.flow !== true,
  }
}
