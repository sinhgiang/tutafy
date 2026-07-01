import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET — list students in group lesson
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Verify lesson belongs to tutor
  const { data: lesson } = await admin
    .from('lessons')
    .select('id')
    .eq('id', lessonId)
    .eq('tutor_id', user.id)
    .single()

  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { student_id, price } = await req.json()
  if (!student_id) return NextResponse.json({ error: 'student_id required' }, { status: 400 })

  // Verify lesson and student belong to tutor
  const [{ data: lesson }, { data: student }] = await Promise.all([
    admin.from('lessons').select('id').eq('id', lessonId).eq('tutor_id', user.id).single(),
    admin.from('students').select('id').eq('id', student_id).eq('tutor_id', user.id).single(),
  ])

  if (!lesson || !student) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entryId = req.nextUrl.searchParams.get('entry_id')
  if (!entryId) return NextResponse.json({ error: 'entry_id required' }, { status: 400 })

  const admin = createAdminClient()
  await admin.from('lesson_students').delete().eq('id', entryId)

  return NextResponse.json({ ok: true })
}

// PATCH — update payment status for a group student
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { entry_id, payment_status } = await req.json()
  if (!entry_id || !payment_status) return NextResponse.json({ error: 'entry_id and payment_status required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('lesson_students')
    .update({ payment_status })
    .eq('id', entry_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
