import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ParsedStudent = {
  name: string
  email: string
  notes: string
  language: string
  lessons: ParsedLesson[]
}

type ParsedLesson = {
  date: string
  duration: number
  price: number | null
  notes: string
}

function detectPlatform(headers: string[]): 'preply' | 'italki' | 'generic' {
  const h = headers.join(',').toLowerCase()
  if (h.includes('preply') || h.includes('trial')) return 'preply'
  if (h.includes('italki') || h.includes('instant')) return 'italki'
  return 'generic'
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const parse = (line: string) => {
    const result: string[] = []
    let cur = '', inQuote = false
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuote = !inQuote }
      else if (line[i] === ',' && !inQuote) { result.push(cur.trim()); cur = '' }
      else { cur += line[i] }
    }
    result.push(cur.trim())
    return result
  }
  const headers = parse(lines[0])
  const rows = lines.slice(1).map(parse)
  return { headers, rows }
}

function parsePreply(headers: string[], rows: string[][]): ParsedStudent[] {
  const idx = (name: string) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()))
  const iName = idx('student') !== -1 ? idx('student') : idx('name')
  const iEmail = idx('email')
  const iDate = idx('date') !== -1 ? idx('date') : idx('time')
  const iDur = idx('duration') !== -1 ? idx('duration') : idx('length')
  const iAmt = idx('amount') !== -1 ? idx('amount') : idx('price')
  const iLang = idx('language') !== -1 ? idx('language') : idx('subject')
  const iNotes = idx('notes') !== -1 ? idx('notes') : idx('comment')

  const students = new Map<string, ParsedStudent>()

  for (const row of rows) {
    if (row.length < 2) continue
    const name = (row[iName] ?? '').trim()
    const email = (row[iEmail] ?? '').trim()
    const key = email || name
    if (!key) continue

    if (!students.has(key)) {
      students.set(key, {
        name: name || 'Unknown',
        email: email || '',
        notes: '',
        language: iLang >= 0 ? (row[iLang] ?? '').trim() : '',
        lessons: [],
      })
    }

    const dateStr = iDate >= 0 ? (row[iDate] ?? '').trim() : ''
    if (dateStr) {
      const d = new Date(dateStr)
      if (!isNaN(d.getTime())) {
        const durRaw = iDur >= 0 ? row[iDur] ?? '' : ''
        const dur = parseInt(durRaw.replace(/[^0-9]/g, '')) || 60
        const priceRaw = iAmt >= 0 ? row[iAmt] ?? '' : ''
        const price = parseFloat(priceRaw.replace(/[^0-9.]/g, '')) || null
        students.get(key)!.lessons.push({
          date: d.toISOString(),
          duration: dur,
          price,
          notes: iNotes >= 0 ? (row[iNotes] ?? '').trim() : '',
        })
      }
    }
  }
  return Array.from(students.values())
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const body = await req.json()
  const { csvText, dryRun = false } = body as { csvText: string; dryRun?: boolean }

  if (!csvText) return NextResponse.json({ error: 'No CSV provided' }, { status: 400 })

  const { headers, rows } = parseCSV(csvText)
  if (!headers.length) return NextResponse.json({ error: 'Could not parse CSV — check file format' }, { status: 400 })

  const platform = detectPlatform(headers)
  const students = parsePreply(headers, rows)

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      platform,
      preview: students.slice(0, 5),
      totalStudents: students.length,
      totalLessons: students.reduce((a, s) => a + s.lessons.length, 0),
    })
  }

  let importedStudents = 0
  let importedLessons = 0
  const errors: string[] = []

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

        if (ce || !created) { errors.push(`Failed to create student ${s.name}: ${ce?.message}`); continue }
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
      }
    } catch (e: any) {
      errors.push(e.message)
    }
  }

  return NextResponse.json({
    ok: true,
    platform,
    importedStudents,
    importedLessons,
    errors: errors.slice(0, 10),
  })
}
