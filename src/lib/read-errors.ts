// What an admin page says when a read of the database failed: which table, not one general
// sentence (T-0680). The table names come from the read state (paged-read.ts), never from the
// person looking at the page. No imports, so the node tests can load it.

const TABLE_LABEL: Record<string, string> = {
  tutors: 'the tutors table',
  students: 'the students table',
  lessons: 'the lessons table',
  visitors: 'the visitors table (visits to the website)',
  visitor_events: 'the visitor_events table (pages and clicks of those visits)',
}

/** The visitor tables are created by migration 015; when it is not applied, reading them fails. */
const VISITOR_TABLES = ['visitors', 'visitor_events']

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export function failedTableNames(tables: string[]): string[] {
  return tables.map(t => TABLE_LABEL[t] ?? `the ${t} table`)
}

/** One sentence naming every table that could not be read. */
export function readErrorMessage(tables: string[]): string {
  const unique = [...new Set(tables)]
  if (unique.length === 0) return 'Could not read some of the data, so the numbers on this page are not reliable. Reload the page; if it keeps happening, check the database.'
  const names = joinList(failedTableNames(unique))
  const visitorOnly = unique.every(t => VISITOR_TABLES.includes(t))
  const hint = visitorOnly
    ? 'These tables come from migration 015; if it has not been applied to the database yet, that is the usual cause.'
    : 'Reload the page; if it keeps happening, check the database.'
  return `Could not read ${names}, so the numbers that depend on ${unique.length === 1 ? 'it' : 'them'} are not reliable. ${hint}`
}
