import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireApiPlan } from '@/lib/api-guard'
import { MAX_CSV_CHARS, MAX_PROBLEMS, PREVIEW_ROWS, detectPlatform, parseCSV, parsePreplyWithProblems, previewRow, type ImportProblem } from '@/lib/csv-import'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const gate = await requireApiPlan('pro')
  if ('error' in gate) return gate.error
  const user = { id: gate.userId }

  const admin = createAdminClient()

  const body = await req.json().catch(() => null) as { csvText?: unknown; dryRun?: unknown } | null
  const csvText = body?.csvText
  const dryRun = body?.dryRun === true

  if (typeof csvText !== 'string' || !csvText) return NextResponse.json({ error: 'No CSV provided' }, { status: 400 })
  if (csvText.length > MAX_CSV_CHARS) return NextResponse.json({ error: 'That file is too large (2 MB at most)' }, { status: 413 })

  const { headers, rows } = parseCSV(csvText)
  if (!headers.length) return NextResponse.json({ error: 'Could not parse CSV — check file format' }, { status: 400 })

  const platform = detectPlatform(headers)
  const { students, problems: readProblems } = parsePreplyWithProblems(headers, rows)

  if (dryRun) {
    // The preview table (T-0824): the first rows with what would happen to each, BEFORE anything is saved. "Already your
    // student" is looked up among THIS tutor's students only (tutor_id from the session).
    const shown = students.slice(0, PREVIEW_ROWS)
    const emails = shown.map(s => s.email).filter(Boolean)
    const known = new Set<string>()
    if (emails.length > 0) {
      const { data } = await admin.from('students').select('email').eq('tutor_id', user.id).in('email', emails)
      for (const row of (data ?? []) as { email: string | null }[]) if (row.email) known.add(row.email.toLowerCase())
    }
    return NextResponse.json({
      ok: true,
      platform,
      rows: shown.map(s => previewRow(s, known)),
      shown: shown.length,
      totalStudents: students.length,
      totalLessons: students.reduce((a, s) => a + s.lessons.length, 0),
      rowsInFile: rows.length,
      // what the file holds that cannot be imported, with the reason, for the page and the problems file (T-0841)
      problems: readProblems.slice(0, MAX_PROBLEMS),
      problemsTotal: readProblems.length,
    })
  }

  let importedStudents = 0
  let importedLessons = 0
  const errors: string[] = []
  const problems: ImportProblem[] = [...readProblems]
  // A reason the tutor can read: what the database said stays on the server (T-0841).
  const saveProblem = (s: { name: string; email: string; firstRow?: number }, problem: string, result: string) =>
    problems.push({ row: s.firstRow ?? 0, student: s.name, email: s.email, problem, result })

  for (const s of students) {
    try {
      // Upsert student
      let { data: existing } = await admin
        .from('students')
        .select('id')
        .eq('tutor_id', user.id)
        .eq('email', s.email || 'x')
        .maybeSingle()

      let studentId: string

      if (existing) {
        studentId = existing.id
      } else {
        const { data: created, error: ce } = await admin
          .from('students')
          .insert({
            tutor_id: user.id,
            name: s.name,
            email: s.email || null,
            notes: s.notes || null,
          })
          .select('id')
          .single()

        if (ce || !created) { errors.push(`Could not save the student ${s.name}`); saveProblem(s, 'The student could not be saved', 'Student and lessons not saved'); continue }
        studentId = created.id
        importedStudents++
      }

      // Insert lessons (skip duplicates)
      for (const l of s.lessons) {
        const { error: le } = await admin.from('lessons').insert({
          tutor_id: user.id,
          student_id: studentId,
          starts_at: l.date,
          ends_at: new Date(new Date(l.date).getTime() + l.duration * 60000).toISOString(),
          duration_minutes: l.duration,
          price: l.price,
          notes: l.notes || null,
          status: 'completed',
        })
        if (!le) importedLessons++
        else saveProblem(s, `The lesson on ${l.date.slice(0, 10)} could not be saved`, 'Lesson not saved')
      }
    } catch {
      errors.push(`Could not import ${s.name}`)
      saveProblem(s, 'Something went wrong while saving this student', 'Student not fully saved')
    }
  }

  return NextResponse.json({
    ok: true,
    platform,
    importedStudents,
    importedLessons,
    errors: errors.slice(0, 10),
    problems: problems.slice(0, MAX_PROBLEMS),
    problemsTotal: problems.length,
  })
}
