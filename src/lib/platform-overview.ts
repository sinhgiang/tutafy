// What /admin (Platform Overview) shows (T-0680). Read-only, no column or table is added.
//
// The raw student count is misleading: most tutors have exactly one "student" whose email is the
// tutor's own (the tutor tried their own booking page). So students are split into REAL students and
// SELF-ADDED students (the same email as their tutor), and tutors are counted by what they did:
//   active    = has a lesson with a real student;
//   activated = has at least one completed lesson (with anyone).
// The client is passed in (the service-role client, from a page that already passed the admin gate),
// so the node tests can use a fake. Every long read is paged (paged-read.ts).
import type { BuyersClient } from '@/lib/buyers-data'
import { markFailed, newReadState, readAll } from '@/lib/paged-read'

export const SIGNUP_WEEKS = 12
export const NEW_TUTOR_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

export type WeekCount = { weekStart: string; count: number } // weekStart: Monday, UTC, YYYY-MM-DD

export type OverviewData = {
  // A number is null when a table it depends on could not be read: the page shows a dash, not 0.
  tutors: number | null
  newTutors: number | null
  totalStudents: number | null
  realStudents: number | null
  selfAddedStudents: number | null
  totalLessons: number | null
  activeTutors: number | null
  activatedTutors: number | null
  weekly: WeekCount[] | null
  recentTutors: { id: string; name: string; email: string; created_at: string }[]
  recentLessons: RecentLesson[]
  failedTables: string[]
  truncated: boolean
}

export type RecentLesson = {
  id: string
  starts_at: string
  status: string
  tutors: { name: string } | null
  students: { name: string } | null
}

type TutorRow = { id: string; name: string; email: string; created_at: string }
type StudentRow = { id: string; tutor_id: string; email: string | null }
type LessonRow = { id: string; tutor_id: string; student_id: string; status: string }

export function normEmail(e: string | null | undefined): string {
  return (e ?? '').trim().toLowerCase()
}

/** A student whose email is the tutor's own: the tutor added or booked themselves. No email never counts. */
export function isSelfAdded(studentEmail: string | null | undefined, tutorEmail: string | null | undefined): boolean {
  const s = normEmail(studentEmail)
  return s !== '' && s === normEmail(tutorEmail)
}

/** The Monday (UTC, 00:00) of the week that contains `d`. */
export function weekStartOf(d: Date): Date {
  const day = (d.getUTCDay() + 6) % 7 // Monday = 0
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day))
}

/** Sign-ups per week for the last `weeks` weeks (this week included), oldest first; empty weeks are 0. */
export function weeklySignups(createdAts: string[], now: Date, weeks = SIGNUP_WEEKS): WeekCount[] {
  const thisWeek = weekStartOf(now).getTime()
  const first = thisWeek - (weeks - 1) * 7 * DAY_MS
  const counts = new Array<number>(weeks).fill(0)
  for (const at of createdAts) {
    const t = Date.parse(at)
    if (!Number.isFinite(t)) continue
    const idx = Math.floor((weekStartOf(new Date(t)).getTime() - first) / (7 * DAY_MS))
    if (idx >= 0 && idx < weeks) counts[idx]++
  }
  return counts.map((count, i) => ({ weekStart: new Date(first + i * 7 * DAY_MS).toISOString().slice(0, 10), count }))
}

export async function loadOverview(admin: BuyersClient, now: Date = new Date()): Promise<OverviewData> {
  const state = newReadState()

  const [tutors, students, lessons, recent] = await Promise.all([
    readAll<TutorRow>(() => admin.from('tutors').select('id, name, email, created_at')
      .order('created_at', { ascending: false }).order('id', { ascending: false }), state, 'tutors'),
    readAll<StudentRow>(() => admin.from('students').select('id, tutor_id, email')
      .order('id', { ascending: true }), state, 'students'),
    readAll<LessonRow>(() => admin.from('lessons').select('id, tutor_id, student_id, status')
      .order('id', { ascending: true }), state, 'lessons'),
    admin.from('lessons').select('id, starts_at, status, tutors(name), students(name)')
      .order('created_at', { ascending: false }).limit(8) as PromiseLike<{ data: RecentLesson[] | null; error?: unknown }>,
  ])
  if (recent.error) markFailed(state, 'lessons')

  const failed = new Set(state.tables)
  const ok = (...needs: string[]) => needs.every(t => !failed.has(t))

  const tutorEmail = new Map(tutors.map(t => [t.id, t.email]))
  const selfIds = new Set<string>()
  const realIds = new Set<string>()
  for (const s of students) (isSelfAdded(s.email, tutorEmail.get(s.tutor_id)) ? selfIds : realIds).add(s.id)

  const active = new Set<string>()
  const activated = new Set<string>()
  for (const l of lessons) {
    if (realIds.has(l.student_id)) active.add(l.tutor_id)
    if (l.status === 'completed') activated.add(l.tutor_id)
  }

  const since = now.getTime() - NEW_TUTOR_DAYS * DAY_MS
  return {
    tutors: ok('tutors') ? tutors.length : null,
    newTutors: ok('tutors') ? tutors.filter(t => Date.parse(t.created_at) >= since).length : null,
    totalStudents: ok('students') ? students.length : null,
    realStudents: ok('students', 'tutors') ? realIds.size : null,
    selfAddedStudents: ok('students', 'tutors') ? selfIds.size : null,
    totalLessons: ok('lessons') ? lessons.length : null,
    activeTutors: ok('students', 'tutors', 'lessons') ? active.size : null,
    activatedTutors: ok('lessons') ? activated.size : null,
    weekly: ok('tutors') ? weeklySignups(tutors.map(t => t.created_at), now) : null,
    recentTutors: tutors.slice(0, 8),
    recentLessons: recent.data ?? [],
    failedTables: state.tables,
    truncated: state.truncated,
  }
}
