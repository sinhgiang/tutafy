// Sending the one-off mail to the tutors (T-1064): the test mail to the admin, the queue (Start), Stop, and the numbers for the status page.
// The words and the rule for WHO and WHEN are src/lib/tutor-announcement.ts (pure, tested alone); this file reads the database, claims, and sends.
// Nothing here runs by itself: only the three admin API routes call it, and each of them checks on the server that the caller is the platform
// admin (src/lib/admin-guard.ts) before anything is read.
//
// HOW THE THREE MINUTES ARE KEPT. The mail service holds a mail and sends it at the time it is given (`scheduledAt`). Start gives tutor 1 the
// first time and every next tutor three minutes after the one before, in one go; nothing needs to stay open and no cron is needed (the
// project's hosting runs scheduled jobs once a day, which cannot do every three minutes). Stop asks the mail service to take back each mail that
// has not gone yet.
// HOW A TUTOR GETS IT ONCE. A row (campaign, tutor) is written BEFORE the mail service is asked; the primary key lets one request win. The new
// rows of a Start are one single insert, so two Starts at once cannot split the list between them. A mail that failed or was cancelled may be
// queued again by the next Start (its attempt number goes up, and so does the key the mail service uses to recognise a repeated request).
// WHAT IS KEPT. Only the tutor's id, a state, a time and the mail service's error NAME. No address, no name, no message text is stored or logged.
import { createMailer } from '@/lib/email'
import { signUnsubscribeToken, unsubscribePageUrl, unsubscribePostUrl, unsubscribeSecret } from '@/lib/unsubscribe-token'
import { isPublicSlug } from '@/lib/tutor-seo'
import { chunks } from '@/lib/paged-read'
import {
  CAMPAIGN, MAX_RECIPIENTS, TEST_VALID_MS, firstSlotAt, pickRecipients, renderAnnouncement, slotTimes,
  type Recipient, type TutorRow,
} from '@/lib/tutor-announcement'

type Env = Record<string, string | undefined>

// The part of the database client this file uses: the Supabase admin client, or a stand-in over a real Postgres in tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnnouncementDb = { from: (table: string) => any }

type MailResult = { data?: { id?: string } | null; error?: { name?: string } | null }
/** The part of the mail service this file uses (createMailer gives it; a test gives a recorder). */
export type AnnouncementMailer = {
  emails: {
    send: (mail: { to: string; subject: string; html: string; headers?: Record<string, string>; scheduledAt?: string }, options?: { idempotencyKey?: string }) => PromiseLike<MailResult>
    cancel: (id: string) => PromiseLike<{ error?: { name?: string } | null } | null | undefined>
  }
}

/** The mail service the app uses; null when the server has no key. */
export function realMailer(env: Env = process.env): AnnouncementMailer | null {
  return (env.RESEND_API_KEY ?? '').startsWith('re_') ? createMailer(process.env.RESEND_API_KEY, 'general') : null
}

/** A pause between two calls to the mail service, which answers a few calls a second at most. */
export const CALL_GAP_MS = 600
const realSleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
const MAX_TUTORS_READ = 5000

type Sleep = (ms: number) => Promise<void>

const missingTable = (e: unknown) => ['42P01', 'PGRST205', 'PGRST204'].includes((e as { code?: string } | null)?.code ?? '')
const errorName = (e: unknown): string => {
  const n = (e as { name?: unknown } | null)?.name
  return typeof n === 'string' && /^[A-Za-z0-9_ -]{1,60}$/.test(n) ? n : 'mail_service_error'
}

type SendRow = { tutor_id: string; state: 'queued' | 'scheduled' | 'cancelled' | 'failed'; scheduled_for: string; mail_id: string | null; error: string | null; attempt: number; created_at?: string }

// ---- who is eligible ---------------------------------------------------------------------------------------------------------------

export type RecipientsRead = { ok: true; recipients: Recipient[] } | { ok: false; why: 'read-failed' }

/** The tutors the rule picks, minus the addresses that unsubscribed. A failed read of either list is a failure (nothing is mailed on a guess). */
export async function loadAnnouncementRecipients(db: AnnouncementDb): Promise<RecipientsRead> {
  const read = await db.from('tutors').select('id, slug, name, email, bio, avatar_url, created_at').eq('booking_url_active', true).order('slug').limit(MAX_TUTORS_READ)
  if (read.error || !read.data) return { ok: false, why: 'read-failed' }
  const rows = (read.data as TutorRow[]).filter(r => isPublicSlug(r.slug))
  const picked = pickRecipients(rows)
  const optedOut = new Set<string>()
  for (const part of chunks(picked.map(r => r.email.toLowerCase()), 100)) {
    const o = await db.from('email_optouts').select('email').in('email', part)
    if (o.error) return { ok: false, why: 'read-failed' }
    for (const row of (o.data ?? []) as { email: string }[]) optedOut.add(row.email)
  }
  return { ok: true, recipients: picked.filter(r => !optedOut.has(r.email.toLowerCase())) }
}

// ---- the status page ---------------------------------------------------------------------------------------------------------------

export type Setup = { adminEmail: boolean; mailKey: boolean; unsubscribeSecret: boolean; tables: boolean }

export type StatusRow = { n: number; state: 'queued' | 'scheduled' | 'sent' | 'cancelled' | 'failed'; at: string; error: string | null }

export type Status = {
  setup: Setup
  /** Null when the tables are missing or the read failed. */
  readFailed: boolean
  eligible: number | null
  /** How many a Start would queue now (not yet queued, or failed / cancelled before). The confirm box shows this number. */
  toQueue: number | null
  testSentAt: string | null
  stoppedAt: string | null
  counts: { queued: number; waiting: number; gone: number; cancelled: number; failed: number }
  nextAt: string | null
  lastAt: string | null
  rows: StatusRow[]
}

/**
 * What the status page shows. Tutors appear only as numbers in the order they go (no name, no address). A mail whose time has passed is "gone":
 * the mail service was asked to send it then, and Stop could no longer take it back.
 */
export async function loadAnnouncementStatus(db: AnnouncementDb, env: Env = process.env, now: Date = new Date()): Promise<Status> {
  const setup: Setup = {
    adminEmail: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test((env.ADMIN_EMAIL ?? '').trim()),
    mailKey: (env.RESEND_API_KEY ?? '').startsWith('re_'),
    unsubscribeSecret: unsubscribeSecret(env) !== null,
    tables: true,
  }
  const empty: Status = { setup, readFailed: false, eligible: null, toQueue: null, testSentAt: null, stoppedAt: null, counts: { queued: 0, waiting: 0, gone: 0, cancelled: 0, failed: 0 }, nextAt: null, lastAt: null, rows: [] }

  const sends = await db.from('tutor_announcement_sends').select('tutor_id, state, scheduled_for, mail_id, error, attempt, created_at').eq('campaign', CAMPAIGN).order('scheduled_for', { ascending: true })
  if (sends.error) return missingTable(sends.error) ? { ...empty, setup: { ...setup, tables: false } } : { ...empty, readFailed: true }
  const control = await db.from('tutor_announcement_control').select('test_sent_at, stopped_at').eq('campaign', CAMPAIGN)
  if (control.error) return missingTable(control.error) ? { ...empty, setup: { ...setup, tables: false } } : { ...empty, readFailed: true }

  const rows = (sends.data ?? []) as SendRow[]
  const ctl = ((control.data ?? [])[0] ?? null) as { test_sent_at: string | null; stopped_at: string | null } | null
  const counts = { queued: 0, waiting: 0, gone: 0, cancelled: 0, failed: 0 }
  const shown: StatusRow[] = rows.map((r, i) => {
    const gone = r.state === 'scheduled' && Date.parse(r.scheduled_for) <= now.getTime()
    const state: StatusRow['state'] = gone ? 'sent' : r.state
    if (state === 'queued') counts.queued += 1
    else if (state === 'scheduled') counts.waiting += 1
    else if (state === 'sent') counts.gone += 1
    else if (state === 'cancelled') counts.cancelled += 1
    else counts.failed += 1
    return { n: i + 1, state, at: r.scheduled_for, error: r.error }
  })
  const waiting = rows.filter(r => r.state === 'scheduled' && Date.parse(r.scheduled_for) > now.getTime()).map(r => r.scheduled_for)
  const people = await loadAnnouncementRecipients(db)
  const done = new Set(rows.filter(r => r.state === 'queued' || r.state === 'scheduled').map(r => r.tutor_id))
  return {
    ...empty,
    eligible: people.ok ? people.recipients.length : null,
    toQueue: people.ok ? people.recipients.filter(r => !done.has(r.id)).length : null,
    readFailed: !people.ok,
    testSentAt: ctl?.test_sent_at ?? null,
    stoppedAt: ctl?.stopped_at ?? null,
    counts,
    nextAt: waiting[0] ?? null,
    lastAt: waiting[waiting.length - 1] ?? null,
    rows: shown,
  }
}

// ---- the test mail -----------------------------------------------------------------------------------------------------------------

export type TestResult = { ok: true } | { ok: false; why: 'no-mail-key' | 'refused' | 'tables-missing' }

/**
 * ONE mail to the admin who is signed in (the address comes from their session, never from the request), sent at once. It is marked
 * "[Test]" and says "Hi there,". Start is refused unless one went out in the last seven days.
 */
export async function sendTestMail({ db, mailer, to, now = new Date(), env = process.env }: { db: AnnouncementDb; mailer: AnnouncementMailer | null; to: string; now?: Date; env?: Env }): Promise<TestResult> {
  if (!mailer) return { ok: false, why: 'no-mail-key' }
  const there = await db.from('tutor_announcement_control').select('campaign').eq('campaign', CAMPAIGN)
  if (there.error) return { ok: false, why: 'tables-missing' } // nothing is sent when the answer could not be written down
  const token = signUnsubscribeToken(to, env)
  const built = renderAnnouncement({ name: null, unsubscribeUrl: token ? unsubscribePageUrl(token) : null, test: true })
  let ok = false
  try {
    const r = await mailer.emails.send({ to, subject: built.subject, html: built.html, headers: token ? unsubscribeHeaders(token) : undefined })
    ok = !r?.error
  } catch { ok = false }
  if (!ok) return { ok: false, why: 'refused' }
  const saved = await db.from('tutor_announcement_control').upsert({ campaign: CAMPAIGN, test_sent_at: now.toISOString() }, { onConflict: 'campaign' })
  if (saved.error) return { ok: false, why: 'tables-missing' }
  return { ok: true }
}

const unsubscribeHeaders = (token: string): Record<string, string> => ({
  'List-Unsubscribe': `<${unsubscribePostUrl(token)}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
})

// ---- Start -------------------------------------------------------------------------------------------------------------------------

export type StartResult =
  | { ok: true; queued: number; scheduled: number; failed: number; firstAt: string; lastAt: string }
  | { ok: false; why: 'no-mail-key' | 'no-unsubscribe-secret' | 'tables-missing' | 'read-failed' | 'test-first' | 'too-many' | 'nothing' | 'count-changed' | 'already-started'; actual?: number }

/**
 * Queue the mail for every tutor who has not had it yet, one every three minutes. `expected` is the number the admin saw in the confirm box:
 * when the real number is different the run does not start and says what the real number is.
 */
export async function startAnnouncement({ db, mailer, expected, now = new Date(), env = process.env, sleep = realSleep }: { db: AnnouncementDb; mailer: AnnouncementMailer | null; expected: number; now?: Date; env?: Env; sleep?: Sleep }): Promise<StartResult> {
  if (!mailer) return { ok: false, why: 'no-mail-key' }
  if (!unsubscribeSecret(env)) return { ok: false, why: 'no-unsubscribe-secret' } // a mail without a working unsubscribe link is never sent

  const control = await db.from('tutor_announcement_control').select('test_sent_at').eq('campaign', CAMPAIGN)
  if (control.error) return { ok: false, why: missingTable(control.error) ? 'tables-missing' : 'read-failed' }
  const testAt = ((control.data ?? [])[0] as { test_sent_at: string | null } | undefined)?.test_sent_at ?? null
  if (!testAt || now.getTime() - Date.parse(testAt) > TEST_VALID_MS || Date.parse(testAt) > now.getTime() + 60_000) return { ok: false, why: 'test-first' }

  const people = await loadAnnouncementRecipients(db)
  if (!people.ok) return { ok: false, why: 'read-failed' }
  if (people.recipients.length > MAX_RECIPIENTS) return { ok: false, why: 'too-many', actual: people.recipients.length }

  const existing = await db.from('tutor_announcement_sends').select('tutor_id, state, scheduled_for, attempt').eq('campaign', CAMPAIGN)
  if (existing.error) return { ok: false, why: missingTable(existing.error) ? 'tables-missing' : 'read-failed' }
  const have = new Map((existing.data as Pick<SendRow, 'tutor_id' | 'state' | 'scheduled_for' | 'attempt'>[]).map(r => [r.tutor_id, r]))
  const todo = people.recipients.filter(r => { const row = have.get(r.id); return !row || row.state === 'failed' || row.state === 'cancelled' })
  if (todo.length === 0) return { ok: false, why: 'nothing' }
  if (todo.length !== expected) return { ok: false, why: 'count-changed', actual: todo.length }

  const waitingTimes = [...have.values()].filter(r => r.state === 'scheduled' && Date.parse(r.scheduled_for) > now.getTime()).map(r => Date.parse(r.scheduled_for))
  const slots = slotTimes(firstSlotAt(now.getTime(), waitingTimes.length ? Math.max(...waitingTimes) : null), todo.length)

  // Claim. New tutors: ONE insert, all or none, so two Starts at once cannot each take part of the list.
  const fresh = todo.map((r, i) => ({ r, at: slots[i] })).filter(x => !have.has(x.r.id))
  const again = todo.map((r, i) => ({ r, at: slots[i] })).filter(x => have.has(x.r.id))
  const claimed: { r: Recipient; at: Date; attempt: number }[] = []
  if (fresh.length) {
    const ins = await db.from('tutor_announcement_sends').insert(fresh.map(x => ({ campaign: CAMPAIGN, tutor_id: x.r.id, state: 'queued', scheduled_for: x.at.toISOString(), attempt: 1 })))
    if (ins.error) return { ok: false, why: (ins.error as { code?: string }).code === '23505' ? 'already-started' : 'read-failed' }
    claimed.push(...fresh.map(x => ({ ...x, attempt: 1 })))
  }
  for (const x of again) {
    const prev = have.get(x.r.id)!
    const upd = await db.from('tutor_announcement_sends')
      .update({ state: 'queued', scheduled_for: x.at.toISOString(), mail_id: null, error: null, attempt: prev.attempt + 1, updated_at: now.toISOString() })
      .eq('campaign', CAMPAIGN).eq('tutor_id', x.r.id).eq('state', prev.state).select('tutor_id')
    if (!upd.error && (upd.data ?? []).length === 1) claimed.push({ ...x, attempt: prev.attempt + 1 })
  }
  if (claimed.length === 0) return { ok: false, why: 'already-started' }
  await db.from('tutor_announcement_control').update({ stopped_at: null }).eq('campaign', CAMPAIGN)

  // Hand each claimed mail to the mail service with its time. Stop pressed meanwhile: the rest are not handed over.
  let scheduled = 0
  let failed = 0
  for (let i = 0; i < claimed.length; i += 1) {
    const c = claimed[i]
    const stop = await db.from('tutor_announcement_control').select('stopped_at').eq('campaign', CAMPAIGN)
    const stoppedAt = ((stop.data ?? [])[0] as { stopped_at: string | null } | undefined)?.stopped_at ?? null
    if (stoppedAt && Date.parse(stoppedAt) >= now.getTime()) {
      for (const rest of claimed.slice(i)) await db.from('tutor_announcement_sends').update({ state: 'cancelled', updated_at: new Date().toISOString() }).eq('campaign', CAMPAIGN).eq('tutor_id', rest.r.id).eq('state', 'queued')
      break
    }
    const token = signUnsubscribeToken(c.r.email, env)
    let mailId: string | null = null
    let error: string | null = null
    if (!token) error = 'no_unsubscribe_link'
    else {
      const built = renderAnnouncement({ name: c.r.name, unsubscribeUrl: unsubscribePageUrl(token) })
      try {
        const res = await mailer.emails.send(
          { to: c.r.email, subject: built.subject, html: built.html, headers: unsubscribeHeaders(token), scheduledAt: c.at.toISOString() },
          { idempotencyKey: `${CAMPAIGN}-${c.r.id}-${c.attempt}` },
        )
        if (res?.error || !res?.data?.id) error = errorName(res?.error)
        else mailId = String(res.data.id).slice(0, 100)
      } catch { error = 'mail_service_unreachable' }
    }
    const patch = mailId ? { state: 'scheduled', mail_id: mailId, error: null, updated_at: new Date().toISOString() } : { state: 'failed', error, updated_at: new Date().toISOString() }
    const save = () => db.from('tutor_announcement_sends').update(patch).eq('campaign', CAMPAIGN).eq('tutor_id', c.r.id).eq('state', 'queued').select('tutor_id')
    let saved = await save()
    if (saved.error) saved = await save()
    if (!saved.error && (saved.data ?? []).length === 0 && mailId) {
      // Stop was pressed between the check above and now and already marked this row cancelled: take the mail back at once.
      try { await mailer.emails.cancel(mailId) } catch { /* the status page shows the row as cancelled; Stop can be pressed again */ }
    } else if (mailId) scheduled += 1
    else failed += 1
    if (i < claimed.length - 1) await sleep(CALL_GAP_MS)
  }
  return { ok: true, queued: claimed.length, scheduled, failed, firstAt: claimed[0].at.toISOString(), lastAt: claimed[claimed.length - 1].at.toISOString() }
}

// ---- Stop --------------------------------------------------------------------------------------------------------------------------

export type StopResult =
  | { ok: true; cancelled: number; alreadyGone: number; notCancelled: number }
  | { ok: false; why: 'no-mail-key' | 'tables-missing' | 'read-failed' }

/**
 * Stop: remember it (a Start in the middle of handing mails over sees it and hands over no more), mark every mail not yet handed over as
 * cancelled, and ask the mail service to take back each handed-over mail whose time has not come. A mail whose time has passed has gone: it is
 * left as it is and counted. A mail the service would not take back stays "waiting" and is counted in `notCancelled`, so the admin presses Stop again.
 */
export async function stopAnnouncement({ db, mailer, now = new Date(), sleep = realSleep }: { db: AnnouncementDb; mailer: AnnouncementMailer | null; now?: Date; sleep?: Sleep }): Promise<StopResult> {
  if (!mailer) return { ok: false, why: 'no-mail-key' }
  const saved = await db.from('tutor_announcement_control').upsert({ campaign: CAMPAIGN, stopped_at: now.toISOString() }, { onConflict: 'campaign' })
  if (saved.error) return { ok: false, why: missingTable(saved.error) ? 'tables-missing' : 'read-failed' }
  const read = await db.from('tutor_announcement_sends').select('tutor_id, state, scheduled_for, mail_id').eq('campaign', CAMPAIGN).in('state', ['queued', 'scheduled'])
  if (read.error) return { ok: false, why: 'read-failed' }

  let cancelled = 0
  let alreadyGone = 0
  let notCancelled = 0
  const rows = (read.data ?? []) as Pick<SendRow, 'tutor_id' | 'state' | 'scheduled_for' | 'mail_id'>[]
  let calls = 0
  for (const r of rows) {
    const mark = () => db.from('tutor_announcement_sends').update({ state: 'cancelled', updated_at: now.toISOString() }).eq('campaign', CAMPAIGN).eq('tutor_id', r.tutor_id).eq('state', r.state)
    if (r.state === 'queued' || !r.mail_id) { await mark(); cancelled += 1; continue }
    if (Date.parse(r.scheduled_for) <= now.getTime()) { alreadyGone += 1; continue }
    if (calls > 0) await sleep(CALL_GAP_MS)
    calls += 1
    let ok = false
    try { ok = !(await mailer.emails.cancel(r.mail_id))?.error } catch { ok = false }
    if (ok) { await mark(); cancelled += 1 } else notCancelled += 1
  }
  return { ok: true, cancelled, alreadyGone, notCancelled }
}
