// The CSV import's reading side (T-0824): detect the platform, split the file, group lessons by student, and describe what would
// be imported (the preview the tutor sees BEFORE anything is saved). Pure; the route in src/app/api/import/route.ts does the saving.
export type ParsedStudent = {
  name: string
  email: string
  notes: string
  language: string
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

export function parsePreply(headers: string[], rows: string[][]): ParsedStudent[] {
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
