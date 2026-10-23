// The "Your listing in the tutor directory" card on the tutor dashboard (T-0769, design: docs/directory-design/listing-not.html and listing-yes.html).
//
// It says whether the signed-in tutor is listed, and for each condition that fails, what to do. It does NOT decide anything itself: every
// answer comes from checkListing() and listingSlots() in src/lib/directory.ts, the same two functions the directory uses, so the card and the
// directory can never disagree. Reads are the tutor's OWN rows only, through the tutor's own session (the tutor id comes from the session and is
// named in every query); nothing is written, nothing is sent. A failed read gives null (no card), never a "not listed" that might be wrong.
import { clashWindowStart, type AvailabilityRow, type LessonWindow } from '@/lib/booking-slots'
import { loadChosenDurations } from '@/lib/lesson-durations'
import { DIRECTORY_OPENS_AT, HORIZON_DAYS, MIN_INTRO_CHARS, checkListing, listingSlots, realZone } from '@/lib/directory'
import { PHOTO_UPLOAD_READY } from '@/lib/profile-completion'
import { SITE_URL } from '@/lib/site-url'

export type ListingRowId = 'page' | 'name' | 'times' | 'intro' | 'photo'
export type ListingRow = {
  id: ListingRowId
  /** 'optional' is the photo: neither needed nor missing. */
  state: 'ok' | 'todo' | 'optional'
  title: string
  sub: string
  /** Where the button goes, and its words; absent for a row that needs nothing. */
  href?: string
  action?: string
}
export type ListingCardData = {
  listed: boolean
  title: string
  text: string
  rows: ListingRow[]
  /** The soonest free time as an ISO instant (shown in the viewer's time zone), or null. */
  nextFree: string | null
  tz: string
  /** The tutor's public booking page, shown as a plain address. */
  bookingAddress: string | null
  /** Set by withDirectoryStatus: the tutor meets every condition but the directory shows no card yet (T-0803). */
  waitingForDirectory?: boolean
}

/**
 * The directory shows cards only once DIRECTORY_OPENS_AT tutors are listed (T-0803), so a tutor who meets every condition is "Ready", not "Listed",
 * until it opens. `open` is true when the directory shows cards, false when it does not, null when that could not be read: only a known "open"
 * keeps the words "Students can find and book you". Pure; a tutor who is not listed yet is returned unchanged.
 */
export function withDirectoryStatus(card: ListingCardData, open: boolean | null): ListingCardData {
  if (!card.listed || open === true) return card
  return {
    ...card,
    waitingForDirectory: true,
    text: `You meet every condition. Your card appears in the directory once it opens, which happens when ${DIRECTORY_OPENS_AT} tutors are ready. Students can book you through your booking link now.`,
  }
}

export type ListingTutor = {
  slug: string | null; name: string | null; bio: string | null; avatar_url: string | null; booking_url_active: boolean | null
  timezone: string | null
}

type Free = { slots: { at: string }[]; hoursRows: number }

/** The words of the card for one tutor. Pure: the facts go in, the card comes out. */
export function buildListingCard(t: ListingTutor, free: Free): ListingCardData {
  const result = checkListing(t, free.slots.length)
  const ok = (id: string) => result.checks.find(c => c.id === id)?.ok === true
  const name = (t.name ?? '').trim()
  const bookingAddress = t.slug ? `${SITE_URL.replace(/^https?:\/\//, '')}/book/${t.slug}` : null

  const rows: ListingRow[] = [
    ok('page')
      ? { id: 'page', state: 'ok', title: 'Your booking page is on', sub: bookingAddress ?? '' }
      : { id: 'page', state: 'todo', title: 'Your booking page is off', sub: 'Students cannot book you while it is off. Switch it on in Settings.', href: '/settings?tab=booking', action: 'Open settings' },
    ok('name')
      ? { id: 'name', state: 'ok', title: 'Your name', sub: name }
      : { id: 'name', state: 'todo', title: 'Add your name', sub: 'A card with no name looks broken. Use at least 2 characters.', href: '/settings?tab=profile', action: 'Add name' },
  ]
  if (ok('times')) {
    rows.push({ id: 'times', state: 'ok', title: 'Free times in the next 14 days', sub: 'Students can book you in the next 14 days.' })
  } else if (!result.zoneOk) {
    rows.push({ id: 'times', state: 'todo', title: 'Choose a valid time zone', sub: 'Your time zone is empty or not one we know, so we cannot work out your free times.', href: '/settings?tab=profile', action: 'Open settings' })
  } else if (free.hoursRows === 0) {
    rows.push({ id: 'times', state: 'todo', title: 'Free times in the next 14 days', sub: 'Students cannot book you until you add your weekly hours.', href: '/availability', action: 'Add free hours' })
  } else {
    rows.push({ id: 'times', state: 'todo', title: 'Your next 14 days are fully booked or blocked', sub: 'Open more hours or unblock a day so students can book you.', href: '/availability', action: 'Open availability' })
  }
  rows.push(ok('intro')
    ? { id: 'intro', state: 'ok', title: 'Introduction', sub: `${result.introChars} characters` }
    : {
      id: 'intro', state: 'todo', title: result.introChars === 0 ? 'Write an introduction' : 'A longer introduction',
      sub: result.introChars === 0
        ? `Aim for at least ${MIN_INTRO_CHARS} characters: who you teach and what a lesson is like.`
        : `Yours is ${result.introChars} characters. Aim for at least ${MIN_INTRO_CHARS}: who you teach and what a lesson is like.`,
      href: '/settings?tab=profile', action: 'Write introduction',
    })
  const hasPhoto = typeof t.avatar_url === 'string' && t.avatar_url.trim() !== ''
  rows.push({
    id: 'photo', state: 'optional', title: 'A photo (optional)',
    sub: hasPhoto
      ? 'Added. A photo helps you rank higher.'
      : PHOTO_UPLOAD_READY
        ? 'Not required. Without one, students see a coloured tile with your initials. A photo helps you rank higher.'
        : 'Not required, and photo upload is coming soon. Until then students see a coloured tile with your initials.',
  })

  const missing = rows.filter(r => r.state === 'todo').length
  return {
    listed: result.listed,
    title: 'Your listing in the tutor directory',
    text: result.listed
      ? 'Students can find and book you. Your next free time is shown on your card.'
      : `Students find you here when your page can be booked. ${missing === 1 ? 'One thing is' : `${missing} things are`} missing.`,
    rows,
    nextFree: free.slots[0]?.at ?? null,
    tz: realZone(t.timezone) ?? 'UTC',
    bookingAddress,
  }
}

type Row = Record<string, unknown>
type Answer = { data: Row[] | null; error: { code?: string } | null }
type Query = PromiseLike<Answer> & {
  eq(c: string, v: unknown): Query; neq(c: string, v: unknown): Query; is(c: string, v: unknown): Query
  gte(c: string, v: string): Query; lt(c: string, v: string): Query; limit(n: number): Query
  maybeSingle(): PromiseLike<{ data: Row | null; error: { code?: string } | null }>
}
export type ListingClient = { from(table: string): { select(cols: string): Query } }

/** Read the signed-in tutor's own rows and build the card. Null when a read fails: no card is better than a wrong one. */
export async function loadListingCard(db: ListingClient, tutorId: string, now: Date = new Date()): Promise<ListingCardData | null> {
  try {
    const [tutor, hours, chosen] = await Promise.all([
      db.from('tutors').select('slug, name, bio, avatar_url, booking_url_active, timezone, buffer_minutes').eq('id', tutorId).maybeSingle(),
      db.from('availability').select('day_of_week, start_time, end_time').eq('tutor_id', tutorId),
      loadChosenDurations(db, tutorId),
    ])
    if (tutor.error || !tutor.data || hours.error || !hours.data) return null

    const yesterday = new Date(now.getTime() - 86400000)
    const until = new Date(now.getTime() + (HORIZON_DAYS + 2) * 86400000).toISOString()
    const blocked = await db.from('availability_exceptions').select('date').eq('tutor_id', tutorId).gte('date', yesterday.toISOString().slice(0, 10))
    // an older database without this table: no blocked days is the right answer; any other failure is not
    const noTable = blocked.error?.code === '42P01' || blocked.error?.code === 'PGRST205'
    if (blocked.error && !noTable) return null
    const lessons = await db.from('lessons').select('starts_at, ends_at, duration_minutes').eq('tutor_id', tutorId)
      .is('assigned_to', null).neq('status', 'cancelled').gte('starts_at', clashWindowStart(yesterday)).lt('starts_at', until).limit(1000)
    if (lessons.error || !lessons.data) return null

    const t = tutor.data
    const slots = listingSlots({
      availability: hours.data as unknown as AvailabilityRow[],
      timezone: t.timezone,
      lessonDurations: chosen.lesson_durations,
      defaultLessonDuration: chosen.default_lesson_duration,
      bufferMinutes: Number(t.buffer_minutes) || 0,
      blockedDates: (blocked.data ?? []).map(r => String(r.date).slice(0, 10)),
      busy: lessons.data as unknown as LessonWindow[],
      now,
    })
    return buildListingCard(t as unknown as ListingTutor, { slots, hoursRows: hours.data.length })
  } catch {
    return null
  }
}
