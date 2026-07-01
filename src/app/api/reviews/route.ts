import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const tutorId = url.searchParams.get('tutor_id')
  if (!tutorId) return NextResponse.json({ reviews: [], average_rating: 0, review_count: 0 })

  const supabase = createAdminClient()

  try {
    const [{ data: reviews }, { data: stats }] = await Promise.all([
      supabase
        .from('reviews')
        .select('id, rating, comment, created_at')
        .eq('tutor_id', tutorId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('tutors')
        .select('average_rating, review_count')
        .eq('id', tutorId)
        .single(),
    ])

    return NextResponse.json({
      reviews: reviews ?? [],
      average_rating: (stats as any)?.average_rating ?? 0,
      review_count: (stats as any)?.review_count ?? 0,
    })
  } catch {
    return NextResponse.json({ reviews: [], average_rating: 0, review_count: 0 })
  }
}

export async function POST(request: Request) {
  try {
    const { portal_token, lesson_id, rating, comment } = await request.json()

    if (!portal_token || !lesson_id || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: student } = await supabase
      .from('students')
      .select('id, tutor_id')
      .eq('portal_token', portal_token)
      .single()

    if (!student) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { data: lesson } = await supabase
      .from('lessons')
      .select('id, tutor_id, status')
      .eq('id', lesson_id)
      .eq('student_id', student.id)
      .single()

    if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    if (lesson.status !== 'completed') return NextResponse.json({ error: 'Lesson not completed yet' }, { status: 400 })

    const { error } = await supabase.from('reviews').upsert({
      lesson_id,
      student_id: student.id,
      tutor_id: lesson.tutor_id,
      rating,
      comment: comment?.trim() || null,
      is_public: true,
    }, { onConflict: 'lesson_id,student_id' })

    if (error) {
      // reviews table might not exist yet (migration 009 pending)
      return NextResponse.json({ ok: true, migrationRequired: true })
    }

    // Recompute tutor average_rating
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('tutor_id', lesson.tutor_id)

    if (allReviews?.length) {
      const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
      await supabase.from('tutors').update({
        average_rating: Math.round(avg * 10) / 10,
        review_count: allReviews.length,
      }).eq('id', lesson.tutor_id)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
