// The parts of the Updates page that the browser also needs: the entry shape, the dates as shown, and which version an
// address points at. No file access in here (src/lib/updates.ts reads the folder), so a client component can import it.

export interface UpdateEntry {
  version: string
  /** YYYY-MM-DD, the day the change reached tutors. */
  date: string
  title: string
  /** One sentence shown under the headline. */
  summary?: string
  bullets: string[]
  /** `width` and `height` are read from the picture file by loadUpdates, so the page can reserve the space. */
  image?: { src: string; alt: string; width?: number; height?: number }
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "2026-10-21" -> "October 21, 2026". No time zone is involved, so the day never shifts. */
export function formatUpdateDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

/** "2026-10-21" -> "Oct 21, 2026", for the version list. */
export function formatUpdateDateShort(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return `${MONTHS[m - 1].slice(0, 3)} ${d}, ${y}`
}

/**
 * Which version the page shows: the one named in the address (#v1.3.0 or #1.3.0), else the newest.
 * `entries` are newest first.
 */
export function pickVersion(hash: string, entries: { version: string }[]): string {
  let wanted = ''
  try { wanted = decodeURIComponent(hash.replace(/^#/, '')).replace(/^v/i, '') } catch { /* a broken address shows the newest */ }
  return entries.find(e => e.version === wanted)?.version ?? entries[0]?.version ?? ''
}
