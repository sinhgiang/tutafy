// What the public tutor profile (/tutors/<slug>) works out from a tutor's existing data (T-0765). No table or column is added:
// everything here is made from the fields the page already reads (name, bio, photo, time zone, languages, rating, price, trial,
// cancellation hours, lesson lengths, free hours, reviews). Plain .ts with no browser or React imports, so the node tests run it.
import { getSlots, overlappingLesson, type AvailabilityRow, type LessonWindow } from '@/lib/booking-slots'
import { describeDurations } from '@/lib/lesson-durations'
import { formatMoney } from '@/lib/currency'
import { cleanText } from '@/lib/tutor-seo'
import { TRIAL_MINUTES } from '@/lib/trial'

// ---- time zones --------------------------------------------------------------------------------------------------------------------

/** A time zone name the runtime knows, else "UTC": a tutor's zone is free text in the database, and one bad value must not break the page. */
export function safeZone(tz: unknown): string {
  if (typeof tz !== 'string' || !tz.trim()) return 'UTC'
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz.trim() })
    return tz.trim()
  } catch {
    return 'UTC'
  }
}

function zoneParts(ms: number, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms))
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0)
  return { y: get('year'), mo: get('month'), d: get('day'), h: get('hour') % 24, mi: get('minute'), s: get('second') }
}

/** How far ahead of UTC a zone's wall clock is at an instant, in milliseconds. */
export function zoneOffsetMs(ms: number, tz: string): number {
  const z = zoneParts(ms, tz)
  return Date.UTC(z.y, z.mo - 1, z.d, z.h, z.mi, z.s) - Math.floor(ms / 1000) * 1000
}

/** The instant (UTC milliseconds) at which a zone's wall clock reads `date` `time`. The second pass settles a time next to a clock change. */
export function wallToInstant(date: string, time: string, tz: string): number {
  const naive = Date.parse(`${date}T${time}:00Z`)
  const first = naive - zoneOffsetMs(naive, tz)
  return naive - zoneOffsetMs(first, tz)
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "YYYY-MM-DD" of an instant on a zone's calendar. */
export function dayKey(ms: number, tz: string): string {
  const z = zoneParts(ms, tz)
  return `${z.y}-${pad(z.mo)}-${pad(z.d)}`
}

function addDays(date: string, n: number): string {
  const t = Date.parse(`${date}T00:00:00Z`) + n * 86400000
  return new Date(t).toISOString().slice(0, 10)
}

// ---- the next free times -----------------------------------------------------------------------------------------------------------

export type FreeSlot = {
  /** The instant the slot starts, as an ISO string: the browser turns it into the visitor's own time zone. */
  at: string
  /** The same start on the tutor's own wall clock, the way the booking page lists it. */
  date: string
  time: string
}

export type FreeSlotInput = {
  availability: AvailabilityRow[]
  /** The tutor's time zone. */
  timezone: string
  /** The length the booking page selects first, and the buffer the tutor keeps between lessons. */
  durationMinutes: number
  bufferMinutes?: number
  /** Days the tutor blocked ("YYYY-MM-DD", their own calendar). */
  blockedDates?: string[]
  /** Lessons already saved (not cancelled). Read in the booking route's convention: see the comment on busyConvention below. */
  busy?: LessonWindow[]
  now: Date
  /** How many days ahead to look (counting today), and the most slots to return. */
  days?: number
  maxSlots?: number
  /** A slot that starts sooner than this from now is not offered. */
  leadMinutes?: number
}

/**
 * The tutor's free start times, soonest first, from the weekly hours the booking page uses (getSlots), minus the days they blocked
 * and the times a saved lesson already takes.
 *
 * busyConvention: the booking route builds a lesson's start as `new Date(`${date}T${time}:00`)` on the server (UTC), so a saved
 * lesson's starts_at holds the tutor's WALL-CLOCK time written as if it were UTC. To say a slot is taken exactly when the booking
 * route would refuse it (a 409), the overlap is checked in that same wall-clock space; only the result is turned into a true instant.
 */
export function nextFreeSlots(input: FreeSlotInput): FreeSlot[] {
  const tz = safeZone(input.timezone)
  const days = input.days ?? 14
  const maxSlots = input.maxSlots ?? 30
  const lead = (input.leadMinutes ?? 60) * 60000
  const blocked = new Set(input.blockedDates ?? [])
  const duration = input.durationMinutes
  if (!(duration > 0) || input.availability.length === 0) return []

  const nowMs = input.now.getTime()
  const today = dayKey(nowMs, tz)
  const out: FreeSlot[] = []
  for (let i = 0; i < days && out.length < maxSlots; i++) {
    const date = addDays(today, i)
    if (blocked.has(date)) continue
    const times = [...new Set(getSlots(input.availability, date, duration, input.bufferMinutes ?? 0))].sort()
    for (const time of times) {
      const at = wallToInstant(date, time, tz)
      if (at < nowMs + lead) continue
      const naive = Date.parse(`${date}T${time}:00Z`)
      if (input.busy && overlappingLesson(input.busy, new Date(naive), new Date(naive + duration * 60000))) continue
      out.push({ at: new Date(at).toISOString(), date, time })
      if (out.length >= maxSlots) break
    }
  }
  return out
}

// ---- showing a slot in the visitor's time zone ------------------------------------------------------------------------------------

/** "6:00 PM", always with a plain space (newer runtimes put a narrow no-break space there, and the server and the browser must agree). */
export function formatClock(ms: number, tz: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(ms)).replace(/[  ]/g, ' ')
}

/** "Today", "Tomorrow", or "Fri": the day of an instant on the viewer's calendar, as the viewer's today sees it. */
export function dayLabel(ms: number, tz: string, now: Date): string {
  const key = dayKey(ms, tz)
  const today = dayKey(now.getTime(), tz)
  if (key === today) return 'Today'
  if (key === addDays(today, 1)) return 'Tomorrow'
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(new Date(ms))
}

/** "Oct 23" */
export function shortDate(ms: number, tz: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'short', day: 'numeric' }).format(new Date(ms))
}

/** The line a sticky bar shows: "Today 6:00 PM", "Tomorrow 9:00 AM", "Fri 9:00 AM". */
export function nextLabel(slot: FreeSlot | undefined, tz: string, now: Date): string | null {
  if (!slot) return null
  const ms = Date.parse(slot.at)
  return `${dayLabel(ms, tz, now)} ${formatClock(ms, tz)}`
}

export type SlotDay = { key: string; label: string; date: string; times: { at: string; text: string }[] }

/** Slots grouped by the viewer's own calendar day, at most `maxDays` days and `perDay` times each. */
export function groupSlots(slots: FreeSlot[], tz: string, now: Date, maxDays: number, perDay: number): SlotDay[] {
  const days: SlotDay[] = []
  for (const s of slots) {
    const ms = Date.parse(s.at)
    const key = dayKey(ms, tz)
    let day = days.find(d => d.key === key)
    if (!day) {
      if (days.length >= maxDays) continue
      day = { key, label: dayLabel(ms, tz, now), date: shortDate(ms, tz), times: [] }
      days.push(day)
    }
    if (day.times.length < perDay) day.times.push({ at: s.at, text: formatClock(ms, tz) })
  }
  return days
}

/** "Toronto" from "America/Toronto", for a line like "Times shown in Toronto time". */
export function zoneCity(tz: string): string {
  return (tz.split('/').pop() ?? tz).replace(/_/g, ' ')
}

// ---- text of the profile -----------------------------------------------------------------------------------------------------------

export function firstNameOf(name: string | null | undefined): string {
  return (typeof name === 'string' ? name.trim().split(/\s+/)[0] : '') || 'this tutor'
}

export function initialsOf(name: string | null | undefined): string {
  const letters = (typeof name === 'string' ? name : '').trim().split(/\s+/).map(w => Array.from(w)[0] ?? '').join('').toUpperCase()
  return Array.from(letters).slice(0, 2).join('') || 'T'
}

/** "October 2026" from a created_at timestamp; null when it is not a date. */
export function joinedLabel(createdAt: unknown): string | null {
  if (typeof createdAt !== 'string') return null
  const t = Date.parse(createdAt)
  return Number.isFinite(t) ? new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(t)) : null
}

/** A tutor's bio as paragraphs: split on blank lines, one line break kept inside a paragraph, empty ones dropped. Shown as text, never as HTML. */
export function bioParagraphs(bio: unknown): string[] {
  if (typeof bio !== 'string') return []
  return bio.replace(/\r\n?/g, '\n').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).slice(0, 8)
}

/** "30 or 60 min sessions": the lengths a tutor takes, in the same words as the booking page (src/lib/lesson-durations.ts). */
export function lengthsPhrase(durations: number[]): string {
  return describeDurations(durations)
}

export type ProfileNote = { id: 'lessons' | 'cancel' | 'trial' | 'video'; title: string; text: string }

/**
 * The tutor's own terms, from their own settings (replaces the same "What to expect" list every profile used to show): the lesson
 * lengths they take, what they set for cancelling, the trial lesson if they switched it on, and how the lesson is held.
 */
export function profileNotes(t: {
  name: string | null; cancellation_hours: number | null; trial_enabled: boolean | null; trial_price: unknown; currency: unknown
}, durations: number[]): ProfileNote[] {
  const first = firstNameOf(t.name)
  const hours = Number(t.cancellation_hours)
  const notes: ProfileNote[] = [{ id: 'lessons', title: 'Lesson length', text: `${lengthsPhrase(durations)}${durations.length > 1 ? '. You pick one when you book.' : '.'}` }]
  notes.push(Number.isFinite(hours) && hours > 0
    ? { id: 'cancel', title: 'Cancel or reschedule', text: `Free up to ${hours} ${hours === 1 ? 'hour' : 'hours'} before the lesson.` }
    : { id: 'cancel', title: 'Cancel or reschedule', text: `${first} has not set a free-cancellation window. Ask before you book if you may need to change the time.` })
  if (t.trial_enabled && Number(t.trial_price) > 0) {
    notes.push({ id: 'trial', title: 'Trial lesson', text: `Your first lesson with ${first} can be a ${TRIAL_MINUTES}-minute trial for ${priceLabel(t.trial_price, t.currency)}.` })
  }
  notes.push({ id: 'video', title: 'Video lesson', text: 'Your lesson link comes by email. It opens in your browser, nothing to install.' })
  return notes
}

/** "$40" for a whole price, "$22.50" otherwise: how a price reads on the profile. Null when there is no price above zero. */
export function priceLabel(amount: unknown, currency: unknown): string | null {
  const n = typeof amount === 'string' ? Number(amount.trim()) : Number(amount)
  if (amount === null || amount === '' || !Number.isFinite(n) || n <= 0) return null
  return formatMoney(n, currency, Number.isInteger(n))
}

/** True when the tutor offers a trial lesson at a price above zero. */
export function hasTrial(t: { trial_enabled: boolean | null; trial_price: unknown }): boolean {
  return t.trial_enabled === true && Number(t.trial_price) > 0
}

// ---- reviews -----------------------------------------------------------------------------------------------------------------------

export type PublicReview = { rating: number; comment: string | null; created_at: string; student_id?: string | null }

/** A review the page may show: a rating from 1 to 5. Anything else (a bad row) is dropped, so a stray value never becomes a star count. */
export function usableReviews<T extends { rating: unknown }>(rows: T[] | null | undefined): (T & { rating: number })[] {
  return (rows ?? []).filter((r): r is T & { rating: number } => typeof r.rating === 'number' && Number.isInteger(r.rating) && r.rating >= 1 && r.rating <= 5)
}

/** How many completed lessons each student had with the tutor, from the completed lessons' student ids. Counts only: nothing else of a lesson leaves the server. */
export function lessonsPerStudent(studentIds: (string | null)[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const id of studentIds) if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
  return counts
}

/** The comment of a review as one clean line for the page: no control characters, no email address, no phone-like number. */
export function reviewText(comment: unknown): string {
  return cleanText(typeof comment === 'string' ? comment : '', 600)
}
