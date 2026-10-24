import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/list-params'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// The students of a group lesson. Every call uses the server's key (the table's row level security does not apply to it), so each one
// first proves two things itself: the caller is signed in, and the lesson is THIS tutor's (the tutor id is the session's, never the body's).
// An entry is only ever read, changed or removed through its lesson: `id` and `lesson_id` in the same statement, so an entry id that belongs
// to another tutor's lesson matches nothing and the answer is the same 404 as for an id that does not exist.
const PAYMENT_STATUSES = ['pending', 'paid', 'refunded'] as const
const NOT_FOUND = { error: 'Not found' }

type Admin = ReturnType<typeof createAdminClient>

/** The signed-in tutor's id, or null. */
async function sessionTutor(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** True when the lesson exists and is this tutor's. */
async function ownsLesson(admin: Admin, lessonId: string, tutorId: string): Promise<boolean> {
  if (!isUuid(lessonId)) return false
  const { data } = await admin.from('lessons').select('id').eq('id', lessonId).eq('tutor_id', tutorId).maybeSingle()
  return !!data
}

async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  const body = await req.json().catch(() => null)
  return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
}

// GET — list students in group lesson
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params
  const tutorId = await sessionTutor()
  if (!tutorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  if (!(await ownsLesson(admin, lessonId, tutorId))) return NextResponse.json(NOT_FOUND, { status: 404 })

  const { data, error } = await admin
    .from('lesson_students')
    .select('id, price, payment_status, students(id, name, email)')
    .eq('lesson_id', lessonId)

  if (error?.message?.includes('relation "public.lesson_students" does not exist')) {
    return NextResponse.json({ students: [], migrationRequired: true })
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ students: data ?? [] })
}

// POST — add student to group lesson
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params
  const tutorId = await sessionTutor()
  if (!tutorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { student_id, price } = await readBody(req)
  if (!student_id) return NextResponse.json({ error: 'student_id required' }, { status: 400 })
  if (!isUuid(student_id)) return NextResponse.json(NOT_FOUND, { status: 404 })
  if (price != null && !(typeof price === 'number' && Number.isFinite(price) && price >= 0 && price < 1_000_000)) {
    return NextResponse.json({ error: 'price must be a number of 0 or more' }, { status: 400 })
  }

  // Verify lesson and student belong to tutor
  const [lessonIsTheirs, { data: student }] = await Promise.all([
    ownsLesson(admin, lessonId, tutorId),
    admin.from('students').select('id').eq('id', student_id).eq('tutor_id', tutorId).maybeSingle(),
  ])

  if (!lessonIsTheirs || !student) return NextResponse.json(NOT_FOUND, { status: 404 })

  const { data, error } = await admin
    .from('lesson_students')
    .insert({ lesson_id: lessonId, student_id, price: price ?? null })
    .select('id, price, payment_status, students(id, name, email)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ entry: data })
}

// DELETE — remove student from group lesson
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params
  const tutorId = await sessionTutor()
  if (!tutorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entryId = req.nextUrl.searchParams.get('entry_id')
  if (!entryId) return NextResponse.json({ error: 'entry_id required' }, { status: 400 })
  if (!isUuid(entryId)) return NextResponse.json(NOT_FOUND, { status: 404 })

  const admin = createAdminClient()
  if (!(await ownsLesson(admin, lessonId, tutorId))) return NextResponse.json(NOT_FOUND, { status: 404 })

  const { data, error } = await admin.from('lesson_students').delete().eq('id', entryId).eq('lesson_id', lessonId).select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json(NOT_FOUND, { status: 404 })

  return NextResponse.json({ ok: true })
}

// PATCH — update payment status for a group student
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params
  const tutorId = await sessionTutor()
  if (!tutorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { entry_id, payment_status } = await readBody(req)
  if (!entry_id || !payment_status) return NextResponse.json({ error: 'entry_id and payment_status required' }, { status: 400 })
  if (!isUuid(entry_id)) return NextResponse.json(NOT_FOUND, { status: 404 })
  if (!(PAYMENT_STATUSES as readonly unknown[]).includes(payment_status)) {
    return NextResponse.json({ error: `payment_status must be one of: ${PAYMENT_STATUSES.join(', ')}` }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!(await ownsLesson(admin, lessonId, tutorId))) return NextResponse.json(NOT_FOUND, { status: 404 })

  const { data, error } = await admin
    .from('lesson_students')
    .update({ payment_status })
    .eq('id', entry_id)
    .eq('lesson_id', lessonId)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json(NOT_FOUND, { status: 404 })

  return NextResponse.json({ ok: true })
}
