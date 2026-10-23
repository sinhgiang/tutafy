// CSV of the students the Students list shows for the current search, level, status and order (T-0822), all pages.
// The tutor is the session's, never a query value; every filter goes through a fixed list (parseStudentFilters).
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EXPORT_LIMIT, applyStudentFilters, parseStudentFilters, studentsCsv, STUDENT_COLUMNS, type StudentRow } from '@/lib/student-list'

export const dynamic = 'force-dynamic'
const CHUNK = 1000

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const filters = parseStudentFilters(new URL(req.url).searchParams)
  const rows: StudentRow[] = []
  for (let from = 0; from < EXPORT_LIMIT; from += CHUNK) {
    const { data, error } = await applyStudentFilters(supabase.from('students').select(STUDENT_COLUMNS).eq('tutor_id', user.id), filters).range(from, from + CHUNK - 1)
    if (error) return NextResponse.json({ error: 'could_not_load' }, { status: 500 })
    rows.push(...((data ?? []) as StudentRow[]))
    if (!data || data.length < CHUNK) break
  }
  return new Response(studentsCsv(rows), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="tutafy-students.csv"', 'Cache-Control': 'no-store' },
  })
}
