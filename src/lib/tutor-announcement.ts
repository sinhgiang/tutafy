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

// T-1115: the tool sends more than one letter. Each letter is a CAMPAIGN with its own id: "who got it" (tutor_announcement_sends) and "when the test
// went / Stop was pressed" (tutor_announcement_control) are kept per campaign id, so a tutor who got one letter can still get the other, once.
// CAMPAIGN and SUBJECT stay the first letter (the profile letter) and everything that does not name a campaign keeps working on it.
export const CAMPAIGN = 'tutor-profile-2026-10'
export const SUBJECT = 'Two minutes to get your Tutafy profile ready for students'
export const AVAILABILITY_CAMPAIGN = 'tutor-availability-2026-10'
export const AVAILABILITY_SUBJECT = 'Your Tutafy page is live, but students cannot book you yet'
export const CAMPAIGN_IDS = [CAMPAIGN, AVAILABILITY_CAMPAIGN] as const
export type CampaignId = (typeof CAMPAIGN_IDS)[number]
export const DEFAULT_CAMPAIGN: CampaignId = CAMPAIGN

/** The campaign with exactly this id, or null: the id comes from the admin's request, so it is looked up in the fixed list and nothing else is accepted. */
export function parseCampaign(value: unknown): CampaignId | null {
  return typeof value === 'string' ? CAMPAIGN_IDS.find(c => c === value) ?? null : null
}

/** The campaign a request body names: none named is the first letter (so the old calls work as they did); one named that is not in the list is null. */
export function campaignOf(body: unknown): CampaignId | null {
  const named = body && typeof body === 'object' ? (body as { campaign?: unknown }).campaign : undefined
  return named === undefined ? DEFAULT_CAMPAIGN : parseCampaign(named)
}

/** Whether the letter goes only to tutors who have no free hours yet. */
export const needsNoHours = (campaign: CampaignId): boolean => campaign === AVAILABILITY_CAMPAIGN

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

/** The letter about free hours goes only to the tutors who have none: those whose id is in `withHours` are taken out. */
export function withoutHours(recipients: Recipient[], withHours: ReadonlySet<string>): Recipient[] {
  return recipients.filter(r => !withHours.has(r.id))
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

/** The letter about free hours (T-1115): the owner-approved draft, word for word. It is about the "Pick a week in one tap" box (src/components/availability/QuickHours.tsx). */
export function renderAvailabilityReminder(input: AnnouncementInput): { subject: string; html: string } {
  const hi = escapeHtml(greetingName(input.name))
  const footer = input.unsubscribeUrl
    ? `<p style="margin:24px 0 0;color:#6b7280;font-size:12px;line-height:1.5;">You are getting this because you have a Tutafy tutor account. <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#6b7280;">Unsubscribe from these emails</a>.</p>`
    : ''
  const html = `<div style="${WRAP}">`
    + p(`Hi ${hi},`)
    + p('You set up your Tutafy booking page, and the introduction you wrote is a good one. One thing is missing: free hours. Until you add some, a student who opens your link has no time to pick, so nobody can book you.')
    + p('It now takes one tap:')
    + ol([
      li('Sign in at tutafy.com and open your dashboard.'),
      li('In the box at the top, press one of four ready-made weeks: weekday evenings, weekday mornings, weekdays 9 to 5, or weekends.'),
      li('Check the time zone named in that box. If it is not yours, change it in Settings first.'),
    ])
    + p('You can change the hours any time under Availability. Free hours are also one of the three things your profile needs before your card can show in the tutor directory, which opens once six tutors are ready.')
    + p('Reply to this mail if anything is unclear.')
    + p('The Tutafy team')
    + footer
    + '</div>'
  return { subject: `${input.test ? TEST_SUBJECT_PREFIX : ''}${AVAILABILITY_SUBJECT}`, html }
}

/** The mail of a campaign for one tutor. */
export function renderCampaign(campaign: CampaignId, input: AnnouncementInput): { subject: string; html: string } {
  return campaign === AVAILABILITY_CAMPAIGN ? renderAvailabilityReminder(input) : renderAnnouncement(input)
}

/** The mail for one tutor (the profile letter). */
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
