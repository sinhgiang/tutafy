import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { tutorId, date, time, duration, name, email, message } = await request.json()

    if (!tutorId || !date || !time || !duration || !name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    const startsAt = new Date(`${date}T${time}:00`)
    const endsAt = new Date(startsAt.getTime() + duration * 60 * 1000)

    // Check if slot is already booked
    const { data: existing } = await supabase
      .from('lessons')
      .select('id')
      .eq('tutor_id', tutorId)
      .eq('starts_at', startsAt.toISOString())
      .neq('status', 'cancelled')
      .single()

    if (existing) {
      return NextResponse.json({ error: 'This slot is already booked. Please choose another time.' }, { status: 409 })
    }

    // Find or create student record by email
    let { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('tutor_id', tutorId)
      .eq('email', email)
      .single()

    if (!student) {
      const { data: newStudent } = await supabase
        .from('students')
        .insert({ tutor_id: tutorId, name, email, notes: message ?? '' })
        .select('id')
        .single()
      student = newStudent
    }

    if (!student) {
      return NextResponse.json({ error: 'Failed to create student record' }, { status: 500 })
    }

    // Create lesson
    const { error } = await supabase.from('lessons').insert({
      tutor_id: tutorId,
      student_id: student.id,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      duration_minutes: duration,
      status: 'scheduled',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
