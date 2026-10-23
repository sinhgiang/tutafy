// The read that makes the tutor directory (T-0769). SERVER ONLY, READ ONLY: it never inserts, updates or deletes, and a test scans this file for that.
//
// A visitor's own session cannot read lessons (row level security: only the tutor reads theirs), so the free times are worked out with the
// server's admin client. What leaves this file is a DirectoryCard (src/lib/directory.ts): a fixed list of keys, never an email, a phone
// number, an address or a payment field. The columns read below are the only columns of `tutors` that are ever selected here.
//
// Narrowing, so the cost stays small: (a) every free-hours row (a small table; only tutors with hours can be listed); (b) the tutors with the
// page on among those, 25 at a time; (c) for each group, their blocked days and their saved lessons from yesterday to 16 days ahead;
// (d) the levels a tutor teaches are read on their own (optional column), the free times are counted in code by the same function the dashboard card uses. A read that fails THROWS: the directory then shows
// its error state, never an empty list that looks like "no tutors".
import { clashWindowStart, type AvailabilityRow, type LessonWindow } from '@/lib/booking-slots'
import { chunks, ROWS_PER_REQUEST, MAX_PAGES } from '@/lib/paged-read'
import { HORIZON_DAYS, MAX_LISTED, buildCard, checkListing, directoryIsOpen, listingSlots, sortCards, type DirectoryCard } from '@/lib/directory'

type Row = Record<string, unknown>
type Answer = { data: Row[] | null; error: { code?: string; message?: string } | null }
type Query = PromiseLike<Answer> & {
  eq(c: string, v: unknown): Query; neq(c: string, v: unknown): Query; is(c: string, v: unknown): Query; in(c: string, v: unknown[]): Query
  gte(c: string, v: string): Query; lt(c: string, v: string): Query; order(c: string): Query
  range(from: number, to: number): PromiseLike<Answer>
}
/** The part of a Supabase client these reads use. */
export type DirectoryClient = { from(table: string): { select(cols: string): Query } }

/** The columns of `tutors` the directory reads. Nothing else is ever selected. */
export const TUTOR_COLUMNS = 'id, slug, name, bio, avatar_url, languages, timezone, booking_url_active, average_rating, review_count, default_lesson_price, currency, trial_enabled, trial_price, buffer_minutes'

export class DirectoryReadError extends Error {
  readonly tables: string[]
  constructor(tables: string[]) {
    super(`The tutor directory could not read: ${tables.join(', ')}`)
    this.tables = tables
  }
}

export type DirectoryList = {
  /** Listed tutors in the "Recommended" order of the moment, at most MAX_LISTED. EMPTY while the directory is closed (see `open`). */
  cards: DirectoryCard[]
  /** How many tutors the rule listed (may be more than the cards). */
  listed: number
  /** False while fewer than DIRECTORY_OPENS_AT tutors are listed: the directory then carries no card at all (T-0803). */
  open: boolean
  truncated: boolean
  asOf: string
}

const GROUP = 25
/** The table or column is not on this database yet (an older one): the right answer is "none". Any other error is a real failure. */
const missing = (e: { code?: string } | null) => e?.code === '42P01' || e?.code === '42703' || e?.code === 'PGRST204' || e?.code === 'PGRST205'

/**
 * Every row of a query, page by page (a request returns at most ROWS_PER_REQUEST rows). `build` makes a fresh, ordered query each time.
 * A failed page throws, except a table or column this database does not have yet when `optional` is set: that is the answer "none".
 */
async function all(build: () => Query, table: string, optional = false): Promise<Row[]> {
  const out: Row[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * ROWS_PER_REQUEST
    const { data, error } = await build().range(from, from + ROWS_PER_REQUEST - 1)
    if (error) {
      if (optional && missing(error)) return []
      throw new DirectoryReadError([table])
    }
    const got = data ?? []
    for (const row of got) out.push(row)
    if (got.length < ROWS_PER_REQUEST) return out
  }
  throw new DirectoryReadError([`${table} (too many rows)`])
}

export async function loadDirectory(db: DirectoryClient, now: Date = new Date()): Promise<DirectoryList> {
  const hourRows = await all(() => db.from('availability').select('tutor_id, day_of_week, start_time, end_time').order('tutor_id').order('id'), 'availability')
  const hoursOf = new Map<string, AvailabilityRow[]>()
  for (const r of hourRows) {
    const id = String(r.tutor_id)
    const list = hoursOf.get(id) ?? []
    list.push({ day_of_week: Number(r.day_of_week), start_time: String(r.start_time), end_time: String(r.end_time) })
    hoursOf.set(id, list)
  }

  const yesterday = new Date(now.getTime() - 86400000)
  const yesterdayDate = yesterday.toISOString().slice(0, 10)
  const until = new Date(now.getTime() + (HORIZON_DAYS + 2) * 86400000).toISOString()
  const cards: DirectoryCard[] = []
  let listed = 0

  for (const ids of chunks([...hoursOf.keys()], GROUP)) {
    const tutors = await all(() => db.from('tutors').select(TUTOR_COLUMNS).in('id', ids).eq('booking_url_active', true).order('id'), 'tutors')
    if (tutors.length === 0) continue

    // lesson lengths: a database without the two columns (migration 018) means "chose nothing", like the booking page
    const chosen = new Map<string, Row>()
    for (const r of await all(() => db.from('tutors').select('id, lesson_durations, default_lesson_duration').in('id', ids).order('id'), 'tutors', true)) chosen.set(String(r.id), r)

    // levels the tutor says they teach (migration 026, T-0863): a database without the column means "said nothing", never a failure
    const levelsOf = new Map<string, unknown>()
    for (const r of await all(() => db.from('tutors').select('id, levels_taught').in('id', ids).order('id'), 'tutors', true)) levelsOf.set(String(r.id), r.levels_taught)

    const blockedRows = await all(() => db.from('availability_exceptions').select('tutor_id, date').in('tutor_id', ids).gte('date', yesterdayDate).order('tutor_id').order('date'), 'availability_exceptions', true)
    // the tutor's own calendar (assigned_to is null), lessons that are not cancelled: the same read the booking route and the public profile do
    const lessonRows = await all(() => db.from('lessons').select('tutor_id, starts_at, ends_at, duration_minutes').in('tutor_id', ids)
      .is('assigned_to', null).neq('status', 'cancelled').gte('starts_at', clashWindowStart(yesterday)).lt('starts_at', until).order('starts_at').order('id'), 'lessons')

    for (const t of tutors) {
      const id = String(t.id)
      const slots = listingSlots({
        availability: hoursOf.get(id) ?? [],
        timezone: t.timezone,
        lessonDurations: chosen.get(id)?.lesson_durations ?? null,
        defaultLessonDuration: chosen.get(id)?.default_lesson_duration ?? null,
        bufferMinutes: Number(t.buffer_minutes) || 0,
        blockedDates: blockedRows.filter(r => String(r.tutor_id) === id).map(r => String(r.date).slice(0, 10)),
        busy: lessonRows.filter(r => String(r.tutor_id) === id) as unknown as LessonWindow[],
        now,
      })
      if (!checkListing(t as { booking_url_active: unknown; name: unknown; bio: unknown; timezone: unknown }, slots.length).listed) continue
      listed += 1
      const card = buildCard({ ...t, levels_taught: levelsOf.get(id) } as Parameters<typeof buildCard>[0], slots)
      if (card) cards.push(card)
    }
  }

  // Closed: the cards are left out of the answer itself, so neither the page nor /api/tutors/public can show or leak a single tutor.
  const open = directoryIsOpen(cards.length)
  const ordered = open ? sortCards(cards, 'recommended', now) : []
  return { cards: ordered.slice(0, MAX_LISTED), listed, open, truncated: ordered.length > MAX_LISTED, asOf: now.toISOString() }
}
