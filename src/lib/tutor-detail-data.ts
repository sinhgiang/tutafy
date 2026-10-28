// What the owner's page for ONE tutor (/admin/tutors/[id], T-0707) reads from our own database besides the journey: the tutor's
// row, how many real and how many self-added students they have, and their lessons by state. READ-ONLY: no insert, update, delete or
// rpc. The client is passed in (the service-role client, from a page that already passed the admin gate), so the node tests use a fake.
//
// A "self-added" student is one whose email is the tutor's own (src/lib/self-added.ts, the same rule as the Overview and Customers pages).
import type { BuyersClient } from '@/lib/buyers-data'
import { isSelfAdded } from '@/lib/self-added'
import { markFailed, newReadState, readAll } from '@/lib/paged-read'

export type TutorRecord = {
  id: string
  name: string
  email: string
  slug: string | null
  created_at: string
  subscription_status: string | null
  polar_subscription_id: string | null
}

export type TutorDetail = {
  tutor: TutorRecord
  /** null when the students could not be read: the page shows a dash, not a zero */
  students: { real: number; selfAdded: number } | null
  /** null when the lessons could not be read */
  lessons: { total: number; completed: number; scheduled: number; cancelled: number } | null
  failedTables: string[]
}

export async function loadTutorDetail(admin: BuyersClient, tutorId: string): Promise<TutorDetail | null> {
  const state = newReadState()
  const { data, error } = await admin.from('tutors')
    .select('id, name, email, slug, created_at, subscription_status, polar_subscription_id').eq('id', tutorId).maybeSingle()
  if (error) markFailed(state, 'tutors')
  const tutor = data as TutorRecord | null
  if (!tutor) return null

  const studentRows = await readAll<{ id: string; email: string | null }>(
    () => admin.from('students').select('id, email').eq('tutor_id', tutorId).order('id', { ascending: true }), state, 'students')
  const studentsFailed = state.tables.includes('students')
  let selfAdded = 0
  for (const s of studentRows) if (isSelfAdded(s.email, tutor.email)) selfAdded++

  const count = async (status: string | null): Promise<number | null> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = admin.from('lessons').select('id', { count: 'exact', head: true }).eq('tutor_id', tutorId)
    if (status) q = q.eq('status', status)
    const res = await q
    if (res.error) { markFailed(state, 'lessons'); return null }
    return res.count ?? 0
  }
  const [total, completed, scheduled, cancelled] = await Promise.all([count(null), count('completed'), count('scheduled'), count('cancelled')])
  const lessonsFailed = [total, completed, scheduled, cancelled].some(n => n === null)

  return {
    tutor,
    students: studentsFailed || state.truncated ? null : { real: studentRows.length - selfAdded, selfAdded },
    lessons: lessonsFailed ? null : { total: total!, completed: completed!, scheduled: scheduled!, cancelled: cancelled! },
    failedTables: state.tables,
  }
}
