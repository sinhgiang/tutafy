// The welcome series for a new tutor (T-0724): three short mails, and the rule for who is due which one on which day.
//
// DRAFT FOR THE OWNER'S APPROVAL. Nothing in the app imports this file: no route calls it, nothing here talks to the
// mail service, and nothing is sent. docs/welcome-emails.md has the copy, the sending design and the decisions the
// owner has to make; once the owner approves, the wiring (cron route, tables, unsubscribe page) is a separate, small step.
//
//   welcome   day 0, at sign-up         three things to do first
//   nudge     day 2, no lesson yet      "have you shared your link?"
//   checkin   day 7, no lesson yet      "what got in the way?" (an invitation to reply)
//
// dueWelcomeSteps() is a pure function, so its safety rules can be tested without a database or a mail service:
//   - nobody who signed up before the series start date is ever due anything (the 723 tutors who signed up before it
//     existed get nothing from this series; mailing them is a separate decision with its own order);
//   - no start date at all means the series is OFF and nobody is due;
//   - an address that opted out is never due;
//   - the nudge and the check-in only go to a tutor who has no lesson yet;
//   - each mail goes at most once, and only inside its window (a cron that was down for a week does not send a
//     "day 2" mail on day 6).
// No imports from the app except the site address and the mail helpers, so the node tests can load it.
import { SITE_URL } from '@/lib/site-url'
import { spamHintHtml } from '@/lib/email-config'

export const WELCOME_STEPS = ['welcome', 'nudge', 'checkin'] as const
export type WelcomeStep = (typeof WELCOME_STEPS)[number]

const DAY_MS = 24 * 60 * 60 * 1000

/** When each mail is due: from `fromDay` days after sign-up, for `windowDays` days. */
export const WELCOME_SCHEDULE: Record<WelcomeStep, { fromDay: number; windowDays: number; needsNoLesson: boolean }> = {
  welcome: { fromDay: 0, windowDays: 1, needsNoLesson: false },
  nudge: { fromDay: 2, windowDays: 2, needsNoLesson: true },
  checkin: { fromDay: 7, windowDays: 3, needsNoLesson: true },
}

export type WelcomeFacts = {
  /** When the tutor signed up (tutors.created_at). */
  createdAt: string
  email: string | null
  /** How many lessons the tutor has (any lesson: a student booked, or the tutor booked a test one). */
  lessons: number
  /** Which mails of the series were already sent to this tutor. */
  sent: readonly WelcomeStep[]
  /** The address opted out of the series (the unsubscribe list). */
  optedOut: boolean
}

export type WelcomeRules = {
  /** The day the owner switched the series on. null = the series is off. Only tutors who signed up from then on are ever due. */
  startsAt: Date | null
  now: Date
}

const PLAIN_ADDRESS = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/
/**
 * Made-up addresses that are never mailed: ONLY the endings below. tests/absolute-claims.test.ts probes this pattern and fails when these two
 * lists and the pattern disagree, so a new ending must be added to the pattern and to the list together.
 * Blocked: example.com, example.org, example.net, .test, .invalid, .localhost
 * Not blocked: .example, .local
 */
const TEST_DOMAIN = /@(?:[a-z0-9-]+\.)*(?:example\.(?:com|org|net)|[a-z0-9-]+\.test|localhost|invalid)$/i

export function mailable(email: string | null): boolean {
  const e = (email ?? '').trim()
  return PLAIN_ADDRESS.test(e) && !TEST_DOMAIN.test(e)
}

/** The mails this tutor is due right now, earliest first. The sender sends at most one per tutor per run. */
export function dueWelcomeSteps(f: WelcomeFacts, rules: WelcomeRules): WelcomeStep[] {
  if (!rules.startsAt) return []
  const created = Date.parse(f.createdAt)
  if (!Number.isFinite(created)) return []
  if (created < rules.startsAt.getTime()) return []
  if (f.optedOut || !mailable(f.email)) return []
  const ageDays = (rules.now.getTime() - created) / DAY_MS
  if (ageDays < 0) return []
  return WELCOME_STEPS.filter(step => {
    const s = WELCOME_SCHEDULE[step]
    if (f.sent.includes(step)) return false
    if (ageDays < s.fromDay || ageDays >= s.fromDay + s.windowDays) return false
    if (s.needsNoLesson && f.lessons > 0) return false
    return true
  })
}

// ---- the mails -------------------------------------------------------------------------------------------------------------

export type WelcomeMail = { step: WelcomeStep; subject: string; preheader: string; html: string }

export type WelcomeMailInput = {
  /** The tutor's name; only the first word is used. */
  name: string | null
  /** The tutor's own booking address, `${SITE_URL}/book/<slug>`; null when there is none yet. */
  bookingUrl: string | null
  /** The one-click unsubscribe address for THIS recipient (a signed link). */
  unsubscribeUrl: string
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

/** "Maria Santos" -> "Maria"; nothing usable -> "there" ("Hi there,"). */
export function firstName(name: string | null): string {
  const w = (name ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().split(/\s+/)[0] ?? ''
  return w.slice(0, 40) || 'there'
}

const WRAP = 'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937;font-size:15px;line-height:1.6;'
const BUTTON = 'display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px;'
const p = (html: string) => `<p style="margin:0 0 14px;">${html}</p>`
const button = (href: string, label: string) => `<a href="${href}" style="${BUTTON}">${label}</a>`

function frame(preheader: string, body: string, unsubscribeUrl: string): string {
  return `<div style="${WRAP}">`
    + `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>`
    + body
    + `<p style="margin:24px 0 0;color:#6b7280;font-size:12px;line-height:1.5;">You are getting this because you created a Tutafy account. `
    + `<a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b7280;">Unsubscribe from these tips</a>.</p>`
    + `</div>`
}

const SIGN_OFF = p('The Tutafy team')

/** One step of the series for one recipient. The words are the owner's to approve (docs/welcome-emails.md). */
export function renderWelcomeMail(step: WelcomeStep, input: WelcomeMailInput): WelcomeMail {
  const hi = escapeHtml(firstName(input.name))
  const settings = `${SITE_URL}/settings`
  const hours = `${SITE_URL}/availability`
  const linkTab = `${SITE_URL}/settings?tab=booking`
  const page = input.bookingUrl ? escapeHtml(input.bookingUrl) : linkTab

  if (step === 'welcome') {
    const preheader = 'Three things, about ten minutes, and students can book you.'
    const item = (n: number, title: string, text: string, href: string, label: string) =>
      `<div style="margin:0 0 16px;"><p style="margin:0 0 4px;font-weight:600;">${n}. ${title}</p><p style="margin:0 0 8px;color:#4b5563;">${text}</p>${button(href, label)}</div>`
    return {
      step,
      subject: `Welcome to Tutafy, ${firstName(input.name)}: three things to do first`,
      preheader,
      html: frame(preheader,
        p(`Hi ${hi},`)
        + p('Welcome to Tutafy. You can be ready for your first booking in about ten minutes. Do these three things, in this order:')
        + item(1, 'Make your page yours', 'Add your photo and a line about you. It is the first thing a student sees.', settings, 'Open your profile')
        + item(2, 'Choose your free hours', 'Tick the days and times students can book you.', hours, 'Set your hours')
        + item(3, 'Share your booking link', input.bookingUrl ? `Your link is <a href="${page}" style="color:#4f46e5;">${page}</a>. Send it to one student, or put it wherever people find you. They pick a time and the lesson lands in your calendar.` : 'Send it to one student, or put it wherever people find you. They pick a time and the lesson lands in your calendar.', linkTab, 'Copy your link')
        + p('Stuck anywhere? Just reply to this email. A real person reads it.')
        + SIGN_OFF
        + spamHintHtml(), input.unsubscribeUrl),
    }
  }

  if (step === 'nudge') {
    const preheader = 'Nobody can book you until they have your link.'
    return {
      step,
      subject: 'Your Tutafy page is ready. Have you sent the link?',
      preheader,
      html: frame(preheader,
        p(`Hi ${hi},`)
        + p('Your booking page is live, and nobody has booked a lesson yet. That is normal: no one can book you until they have your link.')
        + p('The quickest way to a first lesson is to send the link to one person you already teach or talk to. No students yet? Book a test lesson with yourself and see what a student sees.')
        + `<p style="margin:0 0 14px;">${button(page, 'Open your booking page')}</p>`
        + p(`Not sure your free hours are set? <a href="${hours}" style="color:#4f46e5;">Check them here</a>.`)
        + p('If something is confusing, reply and tell us. We will help.')
        + SIGN_OFF, input.unsubscribeUrl),
    }
  }

  const preheader = 'One line from you is enough.'
  return {
    step,
    subject: 'What got in the way?',
    preheader,
    html: frame(preheader,
      p(`Hi ${hi},`)
      + p('You signed up for Tutafy a week ago and have not had a lesson on it yet. We would like to know what is stopping you.')
      + p('Was it not enough time, a step you could not work out, something Tutafy does not do, or is it simply not what you need? Reply with one line. We read every answer, and if we can fix it or help, we will.')
      + SIGN_OFF, input.unsubscribeUrl),
  }
}
