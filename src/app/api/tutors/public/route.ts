import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: tutors } = await supabase
      .from('tutors')
      .select('id, name, bio, avatar_url, timezone, languages, slug, average_rating, review_count, default_lesson_price')
      .eq('booking_url_active', true)
      .order('review_count', { ascending: false, nullsFirst: false })
      .limit(50)

    return NextResponse.json({ tutors: tutors ?? [] })
  } catch {
    return NextResponse.json({ tutors: [] })
  }
}
