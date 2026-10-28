// The students the "Schedule Lesson" page offers in its Student box (T-1061), and what the box says when there is nothing to pick.
//
// The page reads from the browser. While an admin has a "View as this tutor" open, that read goes through /api/admin/view-rest, which
// adds `tutor_id = the viewed tutor` to it (src/lib/view-as.ts), so the box lists the viewed tutor's students and nobody else's.
// Before this file the box was silently empty in three different cases (the tutor has no students, all of them are paused or inactive,
// the read failed); now each one has its own sentence and the box never stays blank without saying why.
import type { SupabaseClient } from '@supabase/supabase-js'

export type SchedulableStudent = { id: string; name: string }

export type StudentChoices =
  | { kind: 'ready'; students: SchedulableStudent[] }
  /** The tutor has students, but none is active (all paused or inactive). */
  | { kind: 'none-active'; total: number }
  /** The tutor has no students at all. */
  | { kind: 'none' }
  /** The read failed or nobody is signed in: never shown as "no students". */
  | { kind: 'error' }

type Row = { id: string; name: string | null; status: string | null }

/** Reads this tutor's students (every status, so an empty list can be told apart from a list of paused students) and keeps the active ones. */
export async function loadStudentChoices(supabase: Pick<SupabaseClient, 'from'>, tutorId: string | null | undefined): Promise<StudentChoices> {
  if (!tutorId) return { kind: 'error' }
  const { data, error } = await supabase.from('students').select('id, name, status').eq('tutor_id', tutorId).order('name')
  if (error || !Array.isArray(data)) return { kind: 'error' }
  const rows = data as Row[]
  if (rows.length === 0) return { kind: 'none' }
  const active = rows.filter(r => r.status === 'active').map(r => ({ id: r.id, name: r.name ?? '' }))
  return active.length > 0 ? { kind: 'ready', students: active } : { kind: 'none-active', total: rows.length }
}

/** The words shown instead of the Student box when there is nothing to pick. `null` when there are students. */
export function emptyStudentNotice(c: StudentChoices): { title: string; body: string; action: { label: string; href: string } | null; tone: 'info' | 'error' } | null {
  switch (c.kind) {
    case 'ready': return null
    case 'none':
      return { tone: 'info', title: 'No students yet', body: 'A lesson needs a student. Add your first student, then come back to schedule the lesson.', action: { label: 'Add a student', href: '/students/new' } }
    case 'none-active':
      return { tone: 'info', title: 'No active students', body: `All ${c.total} of your students are paused or inactive. Set one to active on the Students page to schedule a lesson.`, action: { label: 'Go to Students', href: '/students' } }
    case 'error':
      return { tone: 'error', title: 'We could not load your students', body: 'Reload the page to try again. Your students are not lost.', action: null }
  }
}
