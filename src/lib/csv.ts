// One cell of a CSV file, written the safe way (T-0822): always quoted, quotes doubled, and a cell that starts with = + - or @
// gets a leading apostrophe, because a spreadsheet would run it as a formula (a student name is typed by someone else).
export function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}
