// The invitation to review (T-0898, design 1A of T-0876): an email the morning after a student's FIRST lesson with a tutor, with five stars that are
// links. A star link only OPENS the review form with that rating chosen (a mail app that previews links never saves a rating: GET changes nothing);
// the student presses Publish to save it. It is sent once, with at most one reminder three days later if the student has not answered, and "Stop
// reminders" is remembered. Everything here is behind the switch (REVIEWS_FLOW=on, src/lib/reviews-flow.ts): off means nothing is read and nothing is sent.
import { reviewsFlowOn } from '@/lib/reviews-flow'
import { SITE_URL } from '@/lib/site-url'
import { spamHintHtml } from '@/lib/email-config'
import { cleanText } from '@/lib/tutor-seo'
import type { FlowClient } from '@/lib/reviews-data'

const DAY_MS = 24 * 60 * 60 * 1000
/** A lesson is invited when it ended between 6 hours and 3 days ago (the daily run goes out in the morning after it). */
export const INVITE_AFTER_HOURS = 6
export const INVITE_WITHIN_DAYS = 3
/** The one reminder goes three days after the invitation, and not later than ten. */
export const REMIND_AFTER_DAYS = 3
export const REMIND_UNTIL_DAYS = 10
export const MAX_INVITES_PER_RUN = 50

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

export const reviewPageUrl = (portalToken: string, lessonId: string, query = '') => `${SITE_URL}/portal/${encodeURIComponent(portalToken)}/review/${encodeURIComponent(lessonId)}${query}`

export type InviteMail = { subject: string; html: string }

/** The first name of a tutor, for "How was your first lesson with Tomás?". */
const firstName = (name: string) => cleanText(name, 60).split(' ')[0] || 'your tutor'

/** The invitation (or, with `reminder`, the one reminder). Pure: the same input gives the same mail. */
export function renderInviteMail(input: { tutorName: string; portalToken: string; lessonId: string; reminder: boolean }): InviteMail {
  const tutor = escapeHtml(firstName(input.tutorName))
  const full = escapeHtml(cleanText(input.tutorName, 60) || 'your tutor')
  const stars = [1, 2, 3, 4, 5].map(n =>
    `<a href="${escapeHtml(reviewPageUrl(input.portalToken, input.lessonId, `?stars=${n}`))}" style="display:inline-block;width:52px;margin:0 6px 8px 0;padding:10px 0;border:1px solid #d1d5db;border-radius:12px;text-align:center;text-decoration:none;color:#111827;font-weight:700;">`
    + `<span style="display:block;font-size:22px;line-height:26px;color:#f59e0b;">&#9733;</span>${n}</a>`).join('')
  const stop = reviewPageUrl(input.portalToken, input.lessonId, '?stop=1')
  const heading = input.reminder ? `Still thinking about your lesson with ${tutor}?` : `How was your first lesson with ${tutor}?`
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#111827;">`
    + `<h1 style="font-size:22px;line-height:28px;margin:0 0 8px;">${heading}</h1>`
    + `<p style="font-size:15px;line-height:22px;color:#4b5563;margin:0 0 16px;">Tap a star. It takes ten seconds, and it helps the next student choose.</p>`
    + `<div>${stars}</div>`
    + `<p style="font-size:14px;line-height:20px;color:#4b5563;margin:8px 0 0;">Not now? You can rate any time from your student page.</p>`
    + `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0 12px;">`
    + `<p style="font-size:12px;line-height:18px;color:#6b7280;margin:0;">You booked a lesson with ${full} on Tutafy. We only send this once, and one reminder if you do not answer. <a href="${escapeHtml(stop)}" style="color:#4f46e5;">Stop reminders</a></p>`
    + spamHintHtml()
    + `</div>`
  return { subject: input.reminder ? `Reminder: how was your lesson with ${firstName(input.tutorName)}?` : `How was your first lesson with ${firstName(input.tutorName)}?`, html }
}

/** Sends one mail (the route builds it from the shared mailer, src/lib/email.ts). */
type Send = (mail: { to: string; subject: string; html: string }) => PromiseLike<unknown>
export type RunResult = { skipped?: 'off'; invited: number; reminded: number; errors: number }

/**
 * The daily run. Invites the students whose FIRST completed lesson with a tutor ended 6 hours to 3 days ago, who have an address, no review of that
 * tutor and no invitation yet; then sends the one reminder to those invited 3 to 10 days ago who still have no review and did not stop reminders.
 * An invitation is claimed first (a row in review_invites, one per student and tutor), so two runs at once cannot send two mails.
 */
export async function runReviewInvites(db: FlowClient, send: Send, now: Date, env: Record<string, string | undefined> = process.env): Promise<RunResult> {
  const result: RunResult = { invited: 0, reminded: 0, errors: 0 }
  if (!reviewsFlowOn(env)) return { ...result, skipped: 'off' }

  const hasReview = async (studentId: string, tutorId: string): Promise<boolean> => {
    const { data } = await db.from('reviews').select('id').eq('student_id', studentId).eq('tutor_id', tutorId).limit(1)
    return (data ?? []).length > 0
  }
  const tutorName = async (tutorId: string): Promise<string> => {
    const { data } = await db.from('tutors').select('name').eq('id', tutorId).maybeSingle()
    return typeof data?.name === 'string' ? data.name : 'your tutor'
  }

  // ---- the invitations
  const from = new Date(now.getTime() - INVITE_WITHIN_DAYS * DAY_MS).toISOString()
  const to = new Date(now.getTime() - INVITE_AFTER_HOURS * 3600000).toISOString()
  const { data: lessons } = await db.from('lessons').select('id, student_id, tutor_id, starts_at').eq('status', 'completed').gte('starts_at', from).lte('starts_at', to).order('starts_at').limit(200)
  for (const lesson of lessons ?? []) {
    if (result.invited >= MAX_INVITES_PER_RUN) break
    const studentId = String(lesson.student_id ?? '')
    const tutorId = String(lesson.tutor_id ?? '')
    if (!studentId || !tutorId) continue
    try {
      const { data: student } = await db.from('students').select('id, email, portal_token').eq('id', studentId).maybeSingle()
      const email = typeof student?.email === 'string' ? student.email.trim() : ''
      const token = typeof student?.portal_token === 'string' ? student.portal_token : ''
      if (!email || !token) continue
      // only the FIRST lesson with this tutor
      const { data: earlier } = await db.from('lessons').select('id').eq('student_id', studentId).eq('tutor_id', tutorId).eq('status', 'completed').lt('starts_at', String(lesson.starts_at)).limit(1)
      if ((earlier ?? []).length > 0) continue
      if (await hasReview(studentId, tutorId)) continue
      // already invited: the row is the memory (and its key, one per student and tutor, is what stops two runs at once)
      const { data: sentBefore } = await db.from('review_invites').select('student_id').eq('student_id', studentId).eq('tutor_id', tutorId).limit(1)
      if ((sentBefore ?? []).length > 0) continue
      const { error } = await db.from('review_invites').insert({ student_id: studentId, tutor_id: tutorId, lesson_id: String(lesson.id) })
      if (error) { if (error.code !== '23505') result.errors += 1; continue } // 23505: already invited, which is the point
      const mail = renderInviteMail({ tutorName: await tutorName(tutorId), portalToken: token, lessonId: String(lesson.id), reminder: false })
      try {
        await send({ to: email, ...mail })
        result.invited += 1
      } catch {
        await db.from('review_invites').delete().eq('student_id', studentId).eq('tutor_id', tutorId) // the claim goes back so the next run can try again
        result.errors += 1
      }
    } catch {
      result.errors += 1
    }
  }

  // ---- the one reminder
  const remindFrom = new Date(now.getTime() - REMIND_UNTIL_DAYS * DAY_MS).toISOString()
  const remindTo = new Date(now.getTime() - REMIND_AFTER_DAYS * DAY_MS).toISOString()
  const { data: due } = await db.from('review_invites').select('student_id, tutor_id, lesson_id, sent_at, reminded_at, stopped_at').gte('sent_at', remindFrom).lte('sent_at', remindTo).is('reminded_at', null).is('stopped_at', null).limit(200)
  for (const inv of due ?? []) {
    if (result.reminded >= MAX_INVITES_PER_RUN) break
    const studentId = String(inv.student_id)
    const tutorId = String(inv.tutor_id)
    try {
      if (!inv.lesson_id || await hasReview(studentId, tutorId)) continue
      const { data: student } = await db.from('students').select('email, portal_token').eq('id', studentId).maybeSingle()
      const email = typeof student?.email === 'string' ? student.email.trim() : ''
      const token = typeof student?.portal_token === 'string' ? student.portal_token : ''
      if (!email || !token) continue
      // claimed first: the reminder is written only where there is none yet
      const { data: claimed } = await db.from('review_invites').update({ reminded_at: now.toISOString() }).eq('student_id', studentId).eq('tutor_id', tutorId).is('reminded_at', null).select('student_id').maybeSingle()
      if (!claimed) continue
      const mail = renderInviteMail({ tutorName: await tutorName(tutorId), portalToken: token, lessonId: String(inv.lesson_id), reminder: true })
      await send({ to: email, ...mail })
      result.reminded += 1
    } catch {
      result.errors += 1
    }
  }
  return result
}

/** "Stop reminders": remembered for this student and tutor. The student is the owner of the portal link; the lesson must be theirs. */
export async function stopReminders(db: FlowClient, args: { portalToken: unknown; lessonId: unknown }): Promise<boolean> {
  const token = typeof args.portalToken === 'string' && args.portalToken.length <= 120 ? args.portalToken : ''
  const lessonId = typeof args.lessonId === 'string' && args.lessonId.length <= 120 ? args.lessonId : ''
  if (!token || !lessonId) return false
  const { data: student } = await db.from('students').select('id').eq('portal_token', token).maybeSingle()
  if (!student) return false
  const { data: lesson } = await db.from('lessons').select('tutor_id').eq('id', lessonId).eq('student_id', String(student.id)).maybeSingle()
  if (!lesson) return false
  const { data } = await db.from('review_invites').update({ stopped_at: new Date().toISOString() }).eq('student_id', String(student.id)).eq('tutor_id', String(lesson.tutor_id)).select('student_id').maybeSingle()
  return Boolean(data)
}
