// The two optional reads behind the intro video and the "Established" badge (T-0915). SERVER ONLY, READ ONLY, with the server's own key (the visitor's
// session cannot read these: after 025 nobody but the tutor and the server reads tutor rows, and the function below is granted to the server only).
//
// Both are OPTIONAL on purpose. They need supabase/migrations/028_intro_video_and_established.sql, which the owner applies; on a database that does not
// have it yet the answer is "no video" and "no badge", never an error on the profile or in the directory. Any other failure is also "none": a badge or a
// video is an extra, so a failed read hides it and never breaks the page, and it never makes a badge appear that was not earned.
import { introVideoFromStored, type IntroVideo } from '@/lib/intro-video'
import { establishedBadge, type EstablishedFacts, type EstablishedResult } from '@/lib/established'

type Answer = { data: unknown; error: { code?: string; message?: string } | null }

/** The part of a Supabase client these reads use. */
export type ExtrasClient = {
  from(table: string): { select(cols: string): { in(column: string, values: string[]): PromiseLike<Answer> } }
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<Answer>
}

/** The intro video of each tutor that has a valid one (the stored text is checked again with the rule that accepted it). A tutor without one is absent. */
export async function loadIntroVideos(db: ExtrasClient, ids: string[]): Promise<Map<string, IntroVideo>> {
  const out = new Map<string, IntroVideo>()
  if (ids.length === 0) return out
  let answer: Answer
  try { answer = await db.from('tutors').select('id, intro_video_url').in('id', ids) } catch { return out }
  if (answer.error || !Array.isArray(answer.data)) return out
  for (const row of answer.data as Record<string, unknown>[]) {
    const video = introVideoFromStored(row.intro_video_url)
    if (video && typeof row.id === 'string') out.set(row.id, video)
  }
  return out
}

/** What the database knows about each tutor for the badge: the email-confirmed date and the lesson numbers. Empty when the function is not there. */
export async function loadBadgeFacts(db: ExtrasClient, ids: string[]): Promise<Map<string, Pick<EstablishedFacts, 'emailConfirmedAt' | 'completedLessons' | 'tenthLessonAt'>>> {
  const out = new Map<string, Pick<EstablishedFacts, 'emailConfirmedAt' | 'completedLessons' | 'tenthLessonAt'>>()
  if (ids.length === 0) return out
  for (let i = 0; i < ids.length; i += 100) {
    let answer: Answer
    try { answer = await db.rpc('tutor_established_facts', { ids: ids.slice(i, i + 100) }) } catch { continue }
    if (answer.error || !Array.isArray(answer.data)) continue
    for (const r of answer.data as Record<string, unknown>[]) {
      if (typeof r.tutor_id !== 'string') continue
      out.set(r.tutor_id, {
        emailConfirmedAt: typeof r.email_confirmed_at === 'string' ? r.email_confirmed_at : null,
        completedLessons: Number(r.completed_lessons) || 0,
        tenthLessonAt: typeof r.tenth_lesson_at === 'string' ? r.tenth_lesson_at : null,
      })
    }
  }
  return out
}

type TutorRow = { id: string; bio?: unknown; booking_url_active?: unknown }

/** The badge of each tutor: only the tutors that earned it are in the map. A tutor the function did not answer for has no badge. */
export async function loadEstablished(db: ExtrasClient, tutors: TutorRow[], now: Date): Promise<Map<string, EstablishedResult>> {
  const facts = await loadBadgeFacts(db, tutors.map(t => t.id))
  const out = new Map<string, EstablishedResult>()
  for (const t of tutors) {
    const f = facts.get(t.id)
    if (!f) continue
    const result = establishedBadge({ ...f, bookingActive: t.booking_url_active === true, bio: typeof t.bio === 'string' ? t.bio : null }, now)
    if (result.earned) out.set(t.id, result)
  }
  return out
}
