// CSV of the lessons the Lessons list shows for the current search and filters (T-0822), all pages.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadTutorCurrency } from '@/lib/tutor-currency'
import { EXPORT_LIMIT } from '@/lib/list-params'
import { LESSON_COLUMNS, applyLessonFilters, lessonsCsv, matchingStudentIds, parseLessonFilters, type LessonRow } from '@/lib/lesson-list'

export const dynamic = 'force-dynamic'
const CHUNK = 1000

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const f = parseLessonFilters(new URL(req.url).searchParams)
  const ids = await matchingStudentIds(supabase, user.id, f.q)
  const rows: LessonRow[] = []
  if (!ids || ids.length > 0) {
    for (let from = 0; from < EXPORT_LIMIT; from += CHUNK) {
      const { data, error } = await applyLessonFilters(supabase.from('lessons').select(LESSON_COLUMNS).eq('tutor_id', user.id), f, new Date(), ids).range(from, from + CHUNK - 1)
      if (error) return NextResponse.json({ error: 'could_not_load' }, { status: 500 })
      rows.push(...((data ?? []) as unknown as LessonRow[]))
      if (!data || data.length < CHUNK) break
    }
  }
  const currency = await loadTutorCurrency(supabase, user.id)
  return new Response(lessonsCsv(rows, currency), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="tutafy-lessons.csv"', 'Cache-Control': 'no-store' },
  })
}
