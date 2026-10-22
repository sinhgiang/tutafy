// Sending the welcome series (T-0737): the switches, the daily run for the day-2 and day-7 mails, and the day-0 mail at sign-up.
// The rule for WHO is due WHICH mail is src/lib/welcome-series.ts (pure, tested alone); this file reads the database, claims, and sends.
//
// TWO SWITCHES, both off until the owner turns them on (docs/welcome-emails.md):
//   WELCOME_EMAILS_START  a date (2026-11-01). Empty or not a date = the series is OFF. Only tutors who sign up on or after it are
//                         ever due a mail; the tutors who signed up before it are never touched.
//   WELCOME_EMAILS_SEND   exactly "true". With a start date and anything else, the daily run is a DRY RUN: it reads, counts and answers
//                         how many mails it would send per step, with no address in the answer, and never calls the mail service.
// And a third condition, not a switch: with no UNSUBSCRIBE_SECRET nothing is sent even if both switches are on (a mail without a
// working unsubscribe link is never sent), so it stays a dry run.
//
// Sending a step is: claim it (insert the row in welcome_email_sends; the primary key lets one run win), send one mail, and if the
// mail service refuses, remove the claim so the next run can try again inside the window. At most 50 mails and one mail per tutor per run.
import { dueWelcomeSteps, renderWelcomeMail, type WelcomeMail, type WelcomeStep } from '@/lib/welcome-series'
import { signUnsubscribeToken, unsubscribePageUrl, unsubscribePostUrl, unsubscribeSecret } from '@/lib/unsubscribe-token'
import { SITE_URL } from '@/lib/site-url'
import { chunks } from '@/lib/paged-read'

type Env = Record<string, string | undefined>

export const MAX_MAILS_PER_RUN = 50
/** The daily run only looks at tutors who signed up in the last ten days (the check-in window ends on day 10). */
export const LOOK_BACK_DAYS = 10
/** At most this many tutors are read in one run; hitting it is said in the answer. */
export const MAX_TUTORS_READ = 1000
const DAY_MS = 24 * 60 * 60 * 1000

export type WelcomeMode =
  | { kind: 'off' }
  | { kind: 'dry-run'; startsAt: Date; why: 'send-switch-off' | 'no-unsubscribe-secret' }
  | { kind: 'live'; startsAt: Date }

/** The start date from WELCOME_EMAILS_START: "2026-11-01" or a full ISO time. Anything else is no date. */
export function welcomeStart(env: Env = process.env): Date | null {
  const raw = (env.WELCOME_EMAILS_START ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}(T[0-9:.]+(Z|[+-]\d{2}:\d{2}))?$/.test(raw)) return null
  const t = Date.parse(raw)
  return Number.isFinite(t) ? new Date(t) : null
}

/** What the series does right now. The default (nothing set) is OFF. */
export function welcomeMode(env: Env = process.env): WelcomeMode {
  const startsAt = welcomeStart(env)
  if (!startsAt) return { kind: 'off' }
  if ((env.WELCOME_EMAILS_SEND ?? '').trim() !== 'true') return { kind: 'dry-run', startsAt, why: 'send-switch-off' }
  if (!unsubscribeSecret(env)) return { kind: 'dry-run', startsAt, why: 'no-unsubscribe-secret' }
  return { kind: 'live', startsAt }
}

// The part of the database client this file uses: the Supabase admin client, or a stand-in over a real Postgres in tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WelcomeDb = { from: (table: string) => any }

export type OutgoingMail = { to: string; subject: string; html: string; headers: Record<string, string> }
/** Sends one mail; { ok: false } when the mail service refused. It must not throw for a refusal. */
export type SendMail = (mail: OutgoingMail) => Promise<{ ok: boolean }>

type TutorRow = { id: string; email: string | null; name: string | null; slug: string | null; created_at: string }

/** The mail as it is sent: the words, the signed unsubscribe link in the body and the one-click headers. */
export function buildOutgoing(step: WelcomeStep, tutor: { email: string; name: string | null; slug: string | null }, env: Env = process.env): { mail: WelcomeMail; out: OutgoingMail } | null {
  const token = signUnsubscribeToken(tutor.email, env)
  if (!token) return null
  const mail = renderWelcomeMail(step, {
    name: tutor.name,
    bookingUrl: tutor.slug ? `${SITE_URL}/book/${tutor.slug}` : null,
    unsubscribeUrl: unsubscribePageUrl(token),
  })
  return {
    mail,
    out: {
      to: tutor.email,
      subject: mail.subject,
      html: mail.html,
      headers: {
        'List-Unsubscribe': `<${unsubscribePostUrl(token)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    },
  }
}

/** Claim a step for a tutor. 'won' = this run may send it; 'taken' = another run already has it; 'failed' = the database refused (send nothing). */
async function claim(db: WelcomeDb, tutorId: string, step: WelcomeStep): Promise<'won' | 'taken' | 'failed'> {
  const { error } = await db.from('welcome_email_sends').insert({ tutor_id: tutorId, step })
  if (!error) return 'won'
  return (error as { code?: string }).code === '23505' ? 'taken' : 'failed'
}

async function release(db: WelcomeDb, tutorId: string, step: WelcomeStep): Promise<void> {
  await db.from('welcome_email_sends').delete().eq('tutor_id', tutorId).eq('step', step)
}

export type WelcomeRunReport =
  | { mode: 'off' }
  | {
      mode: 'dry-run' | 'live'
      why?: string
      read: number
      truncated: boolean
      /** dry-run: how many it WOULD send; live: how many it did send. */
      byStep: Record<'nudge' | 'checkin', number>
      total: number
      failed: number
      /** Due, but over the cap of this run: the next run picks them up while they are still inside their window. */
      overCap: number
    }

/**
 * The daily run: the nudge (day 2) and the check-in (day 7). The welcome (day 0) is sent at sign-up, not here.
 * `send` is only called in live mode. In dry-run nothing is written and no address leaves this function.
 */
export async function runWelcomeSeries({ db, send, now = new Date(), env = process.env }: { db: WelcomeDb; send: SendMail; now?: Date; env?: Env }): Promise<WelcomeRunReport> {
  const mode = welcomeMode(env)
  if (mode.kind === 'off') return { mode: 'off' }

  const report = {
    mode: mode.kind,
    ...(mode.kind === 'dry-run' ? { why: mode.why } : {}),
    read: 0,
    truncated: false,
    byStep: { nudge: 0, checkin: 0 },
    total: 0,
    failed: 0,
    overCap: 0,
  } as Extract<WelcomeRunReport, { read: number }>

  // Only tutors who signed up on or after the start date, inside the last ten days, and old enough for the nudge (2 days).
  const since = new Date(Math.max(mode.startsAt.getTime(), now.getTime() - LOOK_BACK_DAYS * DAY_MS))
  const upTo = new Date(now.getTime() - 2 * DAY_MS)
  const tutorsRead = await db.from('tutors').select('id, email, name, slug, created_at')
    .gte('created_at', since.toISOString()).lte('created_at', upTo.toISOString())
    .order('created_at', { ascending: true }).limit(MAX_TUTORS_READ)
  if (tutorsRead.error) { report.failed += 1; return report } // fail closed: no list, no mail
  const tutors = (tutorsRead.data ?? []) as TutorRow[]
  report.read = tutors.length
  report.truncated = tutors.length >= MAX_TUTORS_READ
  if (tutors.length === 0) return report

  // What each of them already got, who opted out, who already teaches. A failed read of any of the three stops the run.
  const ids = tutors.map(t => t.id)
  const emails = [...new Set(tutors.map(t => (t.email ?? '').trim().toLowerCase()).filter(Boolean))]
  const sent = new Map<string, WelcomeStep[]>()
  const optedOut = new Set<string>()
  const teaching = new Set<string>()
  for (const part of chunks(ids, 100)) {
    const r = await db.from('welcome_email_sends').select('tutor_id, step').in('tutor_id', part)
    if (r.error) { report.failed += 1; return report }
    for (const row of (r.data ?? []) as { tutor_id: string; step: WelcomeStep }[]) sent.set(row.tutor_id, [...(sent.get(row.tutor_id) ?? []), row.step])
    const l = await db.from('lessons').select('tutor_id').in('tutor_id', part)
    if (l.error) { report.failed += 1; return report }
    for (const row of (l.data ?? []) as { tutor_id: string }[]) teaching.add(row.tutor_id)
  }
  for (const part of chunks(emails, 100)) {
    const r = await db.from('email_optouts').select('email').in('email', part)
    if (r.error) { report.failed += 1; return report }
    for (const row of (r.data ?? []) as { email: string }[]) optedOut.add(row.email)
  }

  for (const t of tutors) {
    const email = (t.email ?? '').trim()
    const steps = dueWelcomeSteps({
      createdAt: t.created_at,
      email,
      lessons: teaching.has(t.id) ? 1 : 0,
      sent: sent.get(t.id) ?? [],
      optedOut: optedOut.has(email.toLowerCase()),
    }, { startsAt: mode.startsAt, now }).filter((s): s is 'nudge' | 'checkin' => s === 'nudge' || s === 'checkin')
    const step = steps[0] // one mail per tutor per run
    if (!step) continue

    if (report.total >= MAX_MAILS_PER_RUN) { report.overCap += 1; continue }

    if (mode.kind === 'dry-run') { report.byStep[step] += 1; report.total += 1; continue }

    const built = buildOutgoing(step, { email, name: t.name, slug: t.slug }, env)
    if (!built) { report.failed += 1; continue }
    const got = await claim(db, t.id, step)
    if (got === 'taken') continue
    if (got === 'failed') { report.failed += 1; continue }
    let ok = false
    try { ok = (await send(built.out)).ok } catch { ok = false }
    if (ok) { report.byStep[step] += 1; report.total += 1 } else { report.failed += 1; await release(db, t.id, step) }
  }
  return report
}

/**
 * The day-0 mail at sign-up, replacing the two old welcome mails. `legacy` is the old mail of that sign-up place.
 *
 *   series OFF, or in dry-run, or the start date still ahead: the old mail goes as it always did (a new tutor is never left without
 *     a welcome while the series is off), and nothing of the new series is read, written or sent.
 *   series LIVE: the new welcome goes, once (claimed first), and the old mail does not. An address that unsubscribed before, or a
 *     made-up one, gets nothing; so does a database that cannot be read (fail closed).
 */
export async function sendWelcomeAtSignup({ db, tutor, send, legacy, now = new Date(), env = process.env }: {
  db: WelcomeDb
  tutor: { id: string; email: string; name: string | null; slug: string | null }
  send: SendMail
  legacy: () => Promise<void>
  now?: Date
  env?: Env
}): Promise<'legacy' | 'sent' | 'skipped'> {
  const mode = welcomeMode(env)
  if (mode.kind !== 'live' || now.getTime() < mode.startsAt.getTime()) { await legacy(); return 'legacy' }

  const email = tutor.email.trim()
  const optout = await db.from('email_optouts').select('email').eq('email', email.toLowerCase())
  if (optout.error) return 'skipped'
  const due = dueWelcomeSteps({ createdAt: now.toISOString(), email, lessons: 0, sent: [], optedOut: (optout.data ?? []).length > 0 }, { startsAt: mode.startsAt, now })
  if (!due.includes('welcome')) return 'skipped'

  const built = buildOutgoing('welcome', { email, name: tutor.name, slug: tutor.slug }, env)
  if (!built) return 'skipped'
  if ((await claim(db, tutor.id, 'welcome')) !== 'won') return 'skipped'
  let ok = false
  try { ok = (await send(built.out)).ok } catch { ok = false }
  if (!ok) { await release(db, tutor.id, 'welcome'); return 'skipped' }
  return 'sent'
}
