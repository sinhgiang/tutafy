// The one-off mail to tutors who already signed up (T-1064): the words, who gets it, and when each one goes.
//
// The words are the letter the owner approved ("Two minutes to get your Tutafy profile ready for students"). Nothing here talks to the mail
// service or the database: src/lib/tutor-announcement-run.ts does that, and only when the platform admin presses a button on
// /super-admin/announcement. Plain .ts with no browser, React or database imports, so the node tests can load it.
//
// WHO: the tutors the sitemap lists (turned the public page on, a real introduction, not a test account, not a copy of another profile:
// src/lib/profile-index.ts), who have a plain email address, once per address. At most MAX_RECIPIENTS, so a wrong read can never turn
// into a mail to hundreds.
// WHEN: one tutor at a time, SPACING_MS apart, the first one FIRST_DELAY_MS after the admin presses Start (and never closer than SPACING_MS to a mail already waiting to go).
import { pickIndexable, type IndexFacts } from '@/lib/profile-index'

export const CAMPAIGN = 'tutor-profile-2026-10'
export const SUBJECT = 'Two minutes to get your Tutafy profile ready for students'
export const TEST_SUBJECT_PREFIX = '[Test] '
export const SPACING_MS = 3 * 60 * 1000
export const FIRST_DELAY_MS = 90 * 1000
export const MAX_RECIPIENTS = 60
/** Start is refused unless the admin sent themself the test mail within this time. */
export const TEST_VALID_MS = 7 * 24 * 60 * 60 * 1000

const PLAIN_ADDRESS = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/

export type TutorRow = { id: string; slug: string; name?: unknown; email?: unknown; bio?: unknown; avatar_url?: unknown; created_at?: unknown }
export type Recipient = { id: string; email: string; name: string | null }

/** From every tutor whose page is on: the ones to mail, in a fixed order (by address of their page), one per email address. */
export function pickRecipients(rows: TutorRow[]): Recipient[] {
  const facts: IndexFacts[] = rows.map(r => ({ slug: r.slug, name: r.name, bio: r.bio, avatar_url: r.avatar_url, created_at: r.created_at }))
  const chosen = new Set(pickIndexable(facts).indexable)
  const seen = new Set<string>()
  const out: Recipient[] = []
  for (const r of [...rows].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))) {
    if (!chosen.has(r.slug)) continue
    const email = typeof r.email === 'string' ? r.email.trim() : ''
    if (!PLAIN_ADDRESS.test(email) || email.length > 254) continue
    const key = email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ id: r.id, email, name: typeof r.name === 'string' ? r.name : null })
  }
  return out
}

/** When the first mail of a run goes: FIRST_DELAY_MS after now, and never closer than SPACING_MS after a mail already waiting to go. */
export function firstSlotAt(nowMs: number, lastWaitingMs: number | null): number {
  return Math.max(nowMs + FIRST_DELAY_MS, lastWaitingMs === null ? 0 : lastWaitingMs + SPACING_MS)
}

/** The times the mails go: the first at firstAtMs, every other one SPACING_MS after the one before. */
export function slotTimes(firstAtMs: number, count: number): Date[] {
  return Array.from({ length: count }, (_, i) => new Date(firstAtMs + i * SPACING_MS))
}

const TITLES = /^(dr|mr|mrs|ms|miss|mx|prof|professor)\.?$/i

/** "Maria Santos" -> "Maria"; "Dr. Maria Santos" -> "Maria"; nothing usable -> "there" ("Hi there,"). */
export function greetingName(name: string | null): string {
  const words = (name ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().split(/\s+/).filter(Boolean)
  const pick = words.length > 1 && TITLES.test(words[0]) ? words[1] : words[0]
  return (pick ?? '').slice(0, 40) || 'there'
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

const WRAP = 'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937;font-size:15px;line-height:1.6;'
const p = (html: string) => `<p style="margin:0 0 14px;">${html}</p>`
const h = (text: string) => `<p style="margin:18px 0 6px;font-weight:700;">${text}</p>`
const li = (html: string) => `<li style="margin:0 0 6px;">${html}</li>`
const ul = (items: string[]) => `<ul style="margin:0 0 14px;padding-left:22px;">${items.join('')}</ul>`
const ol = (items: string[]) => `<ol style="margin:0 0 14px;padding-left:22px;">${items.join('')}</ol>`
const b = (text: string) => `<strong>${text}</strong>`

export type AnnouncementInput = {
  name: string | null
  /** The signed unsubscribe page for this address; without it the mail has no footer line (the sender refuses to start without one). */
  unsubscribeUrl?: string | null
  /** The test mail the admin sends themself carries this in front of the subject. */
  test?: boolean
}

/** The mail for one tutor. */
export function renderAnnouncement(input: AnnouncementInput): { subject: string; html: string } {
  const hi = escapeHtml(greetingName(input.name))
  const footer = input.unsubscribeUrl
    ? `<p style="margin:24px 0 0;color:#6b7280;font-size:12px;line-height:1.5;">You are getting this because you have a Tutafy tutor account. <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#6b7280;">Unsubscribe from these emails</a>.</p>`
    : ''
  const html = `<div style="${WRAP}">`
    + p(`Hi ${hi},`)
    + p('Thank you for joining Tutafy. Your profile already has a good introduction, which many profiles do not. Here is what is new, and three small things that help students choose you.')
    + h('New this month')
    + ul([
      li(`${b('Languages you teach.')} List up to six in Settings, Profile. They show on your profile and let students find you by language.`),
      li(`${b('Students you like to teach.')} Tick work, exams, kids and teens, travel, university or conversation (Settings, Profile).`),
      li(`${b('Free hours on a week grid.')} Drag down a day in Availability to add hours.`),
      li(`${b('One 30-minute trial lesson.')} You switch it on and set its price. It is for a student's first lesson only.`),
      li(`${b('Dashboard card.')} It shows what is left before you appear in the tutor directory. The directory opens once six tutors are ready.`),
    ])
    + h('Three things to add')
    + ol([
      li('A clear photo of your face (Settings, Profile, Upload photo).'),
      li('The languages you teach (Settings, Profile, Languages you teach).'),
      li('Your lesson price (Settings, Payments, Default lesson price) and, if you like, your 30-minute trial (Settings, Trial lesson and contract).'),
    ])
    + p('If you have a short video on YouTube or Vimeo, paste the link under Intro video link in Settings, Profile. It plays at the top of your profile.')
    + p('Reply if anything is unclear.')
    + p('The Tutafy team')
    + footer
    + '</div>'
  return { subject: `${input.test ? TEST_SUBJECT_PREFIX : ''}${SUBJECT}`, html }
}
