// The CSV import's reading side (T-0824): detect the platform, split the file, group lessons by student, and describe what would
// be imported (the preview the tutor sees BEFORE anything is saved). Pure; the route in src/app/api/import/route.ts does the saving.
import { csvCell } from '@/lib/csv'

export type ParsedStudent = {
  name: string
  email: string
  notes: string
  language: string
  /** The row of the file where this student first appears (see ImportProblem.row). */
  firstRow?: number
  lessons: ParsedLesson[]
}

export type ParsedLesson = {
  date: string
  duration: number
  price: number | null
  notes: string
}

export function detectPlatform(headers: string[]): 'preply' | 'italki' | 'generic' {
  const h = headers.join(',').toLowerCase()
  if (h.includes('preply') || h.includes('trial')) return 'preply'
  if (h.includes('italki') || h.includes('instant')) return 'italki'
  return 'generic'
}

export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
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

/** One thing in the file that could not be imported (T-0841), for the page and for the problems file the tutor downloads. */
export type ImportProblem = {
  /** 1 is the first row under the header, counting only rows that are not empty. */
  row: number
  student: string
  email: string
  problem: string
  /** What Tutafy did about it, in a few words: "Row skipped", "Lesson skipped, student added", "Student not saved". */
  result: string
}

export const MAX_PROBLEMS = 1000

export function parsePreply(headers: string[], rows: string[][]): ParsedStudent[] {
  return parsePreplyWithProblems(headers, rows).students
}

/** The same reading as parsePreply, and a list of every row or lesson it had to leave out, with the reason. */
export function parsePreplyWithProblems(headers: string[], rows: string[][]): { students: ParsedStudent[]; problems: ImportProblem[] } {
  const idx = (name: string) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()))
  const iName = idx('student') !== -1 ? idx('student') : idx('name')
  const iEmail = idx('email')
  const iDate = idx('date') !== -1 ? idx('date') : idx('time')
  const iDur = idx('duration') !== -1 ? idx('duration') : idx('length')
  const iAmt = idx('amount') !== -1 ? idx('amount') : idx('price')
  const iLang = idx('language') !== -1 ? idx('language') : idx('subject')
  const iNotes = idx('notes') !== -1 ? idx('notes') : idx('comment')

  const students = new Map<string, ParsedStudent>()
  const problems: ImportProblem[] = []

  for (const [index, row] of rows.entries()) {
    const rowNo = index + 1
    if (row.length < 2) { problems.push({ row: rowNo, student: '', email: '', problem: 'The row has fewer than two columns', result: 'Row skipped' }); continue }
    const name = (row[iName] ?? '').trim()
    const email = (row[iEmail] ?? '').trim()
    const key = email || name
    if (!key) { problems.push({ row: rowNo, student: '', email: '', problem: 'No student name and no email', result: 'Row skipped' }); continue }

    if (!students.has(key)) {
      students.set(key, {
        name: name || 'Unknown',
        email: email || '',
        notes: '',
        firstRow: rowNo,
        language: iLang >= 0 ? (row[iLang] ?? '').trim() : '',
        lessons: [],
      })
    }

    const dateStr = iDate >= 0 ? (row[iDate] ?? '').trim() : ''
    if (iDate >= 0 && !dateStr) problems.push({ row: rowNo, student: name, email, problem: 'No lesson date', result: 'Lesson skipped, student added' })
    if (dateStr) {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) problems.push({ row: rowNo, student: name, email, problem: `The date "${dateStr.slice(0, 40)}" is not one we can read`, result: 'Lesson skipped, student added' })
      else {
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
  return { students: Array.from(students.values()), problems }
}

const PROBLEM_HEADER = ['Row', 'Student', 'Email', 'Problem', 'What happened']

/** The problems file: one line a problem, safe to open in a spreadsheet (a cell that starts with = + - or @ gets an apostrophe). */
export function problemsCsv(problems: ImportProblem[]): string {
  const lines = [PROBLEM_HEADER.map(csvCell).join(','), ...problems.map(p => [p.row, p.student, p.email, p.problem, p.result].map(csvCell).join(','))]
  return lines.join('\r\n') + '\r\n'
}


export const PREVIEW_ROWS = 25
export const MAX_CSV_CHARS = 2_000_000

export type PreviewRow = { name: string; email: string; lessons: number; firstLesson: string | null; lastLesson: string | null; notes: string[]; existing: boolean }

/** One row of the preview table for a student: how many lessons, from when to when, and what the tutor should know before saving. */
export function previewRow(s: ParsedStudent, existingEmails: Set<string>): PreviewRow {
  const dates = s.lessons.map(l => l.date).sort()
  const existing = s.email !== '' && existingEmails.has(s.email.toLowerCase())
  const notes: string[] = []
  if (existing) notes.push('Already your student: only the lessons are added')
  if (s.email === '') notes.push('No email: a second import would add this student again')
  if (s.name === 'Unknown') notes.push('No name in the file')
  if (s.lessons.length === 0) notes.push('No lesson dates: only the student is added')
  return { name: s.name, email: s.email, lessons: s.lessons.length, firstLesson: dates[0] ?? null, lastLesson: dates[dates.length - 1] ?? null, notes, existing }
}
