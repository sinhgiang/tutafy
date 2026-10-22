// T-0724: the welcome series for a new tutor is a DRAFT. These tests prove the rules that make it safe to switch on later, on the pure
// code in src/lib/welcome-series.ts, with made-up tutors: nobody who signed up before the start date is ever due a mail (the 723
// tutors who signed up before the series existed), no start date means off, an opt-out is respected, a lesson stops the nudges, each
// mail goes once and only inside its window. And the three mails: English, short, with the unsubscribe link, the tutor's name as text.
// Nothing here (and nothing in the app yet) sends a mail or reads a real tutor.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { WelcomeStep, WelcomeFacts } from '@/lib/welcome-series.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const series = await import('@/lib/welcome-series.ts')
const { htmlToText } = await import('@/lib/email-config.ts')
const { dueWelcomeSteps, renderWelcomeMail, firstName, mailable, WELCOME_STEPS, WELCOME_SCHEDULE } = series

const DAY = 86_400_000
const START = new Date('2026-11-01T00:00:00Z')
const at = (days: number) => new Date(START.getTime() + days * DAY)
const tutor = (over: Partial<WelcomeFacts> = {}): WelcomeFacts => ({ createdAt: at(0).toISOString(), email: 'maria@school.example', lessons: 0, sent: [], optedOut: false, ...over })
const due = (f: WelcomeFacts, now: Date, startsAt: Date | null = START) => dueWelcomeSteps(f, { startsAt, now })

test('the schedule: welcome on day 0, the nudge from day 2, the check-in from day 7, each inside its own window', () => {
  assert.deepEqual([...WELCOME_STEPS], ['welcome', 'nudge', 'checkin'])
  assert.deepEqual(WELCOME_SCHEDULE.welcome, { fromDay: 0, windowDays: 1, needsNoLesson: false })
  assert.equal(WELCOME_SCHEDULE.nudge.fromDay, 2)
  assert.equal(WELCOME_SCHEDULE.checkin.fromDay, 7)
  const f = tutor()
  assert.deepEqual(due(f, at(0)), ['welcome'])
  assert.deepEqual(due(f, at(0.9)), ['welcome'])
  assert.deepEqual(due(f, at(1)), [], 'day 1 is nobody\'s day')
  assert.deepEqual(due(f, at(1.99)), [])
  assert.deepEqual(due(f, at(2)), ['nudge'])
  assert.deepEqual(due(f, at(3.9)), ['nudge'])
  assert.deepEqual(due(f, at(4)), [], 'a nudge is not sent late')
  assert.deepEqual(due(f, at(6.99)), [])
  assert.deepEqual(due(f, at(7)), ['checkin'])
  assert.deepEqual(due(f, at(9.9)), ['checkin'])
  assert.deepEqual(due(f, at(10)), [], 'a check-in is not sent late')
  assert.deepEqual(due(f, at(30)), [])
})

test('a mail already sent is not due again; the others are unaffected', () => {
  assert.deepEqual(due(tutor({ sent: ['welcome'] }), at(0.5)), [])
  assert.deepEqual(due(tutor({ sent: ['nudge'] }), at(3)), [])
  assert.deepEqual(due(tutor({ sent: ['welcome', 'nudge'] }), at(8)), ['checkin'])
  assert.deepEqual(due(tutor({ sent: [...WELCOME_STEPS] }), at(8)), [])
})

test('a lesson stops the nudge and the check-in (a tutor who already teaches on Tutafy needs neither), but not the welcome', () => {
  assert.deepEqual(due(tutor({ lessons: 1 }), at(0.2)), ['welcome'])
  assert.deepEqual(due(tutor({ lessons: 1 }), at(2.5)), [])
  assert.deepEqual(due(tutor({ lessons: 5 }), at(8)), [])
  assert.deepEqual(due(tutor({ lessons: 0 }), at(8)), ['checkin'])
})

test('THE 723: nobody who signed up before the start date is ever due a mail, on any day, with any history', () => {
  const old = Array.from({ length: 723 }, (_, i) => tutor({ createdAt: new Date(START.getTime() - (1 + (i % 400)) * DAY - i * 1000).toISOString(), email: `old${i}@school.example` }))
  let sends = 0
  for (let day = -5; day <= 400; day += 0.5) for (const t of old) sends += due(t, at(day)).length
  assert.equal(sends, 0)
  // the very edge: the second before the start is old, the start itself is new
  assert.deepEqual(due(tutor({ createdAt: new Date(START.getTime() - 1000).toISOString() }), at(0)), [])
  assert.deepEqual(due(tutor({ createdAt: START.toISOString() }), at(0)), ['welcome'])
})

test('no start date means the series is OFF: nobody is due anything, whatever their age', () => {
  for (const day of [0, 0.5, 2, 3, 7, 8, 20]) assert.deepEqual(due(tutor(), at(day), null), [], `day ${day}`)
})

test('an address that opted out is never due; a made-up or broken address is never mailed', () => {
  for (const day of [0.1, 2.5, 8]) assert.deepEqual(due(tutor({ optedOut: true }), at(day)), [], `day ${day}`)
  for (const email of [null, '', 'not an address', 'a@b', 'x@example.com', 'x@sub.example.org', 'x@mail.test', 'x@localhost', 'x@host.invalid']) {
    assert.equal(mailable(email), false, String(email))
    assert.deepEqual(due(tutor({ email }), at(0.5)), [], String(email))
  }
  for (const email of ['maria@school.example', 'tutor.name+tag@mail.example', 'x@mail.co.example']) assert.equal(mailable(email), true, email)
  assert.deepEqual(due(tutor({ createdAt: 'not a date' }), at(1)), [])
  assert.deepEqual(due(tutor(), at(-1)), [], 'a clock that is behind the sign-up sends nothing')
})

test('a daily run from sign-up to day 12 sends exactly three mails to a tutor who stays quiet, each on its own day, once', () => {
  const t = tutor()
  const log: [number, WelcomeStep][] = []
  for (let day = 0; day <= 12; day++) {
    for (const step of due(t, at(day + 0.4)).slice(0, 1)) { log.push([day, step]); t.sent = [...t.sent, step] }
  }
  assert.deepEqual(log, [[0, 'welcome'], [2, 'nudge'], [7, 'checkin']])
})

test('a tutor who unsubscribes on day 1 gets the welcome and nothing more; one who has a lesson on day 1 gets only the welcome', () => {
  const run = (change: (t: WelcomeFacts, day: number) => void) => {
    const t = tutor(); const got: WelcomeStep[] = []
    for (let day = 0; day <= 12; day++) { change(t, day); for (const s of due(t, at(day + 0.4)).slice(0, 1)) { got.push(s); t.sent = [...t.sent, s] } }
    return got
  }
  assert.deepEqual(run((t, day) => { if (day >= 1) t.optedOut = true }), ['welcome'])
  assert.deepEqual(run((t, day) => { if (day >= 1) t.lessons = 1 }), ['welcome'])
  assert.deepEqual(run((t, day) => { if (day >= 3) t.lessons = 1 }), ['welcome', 'nudge'])
})

test('a run that was down for days does not send late: a tutor who is 5 days old gets nothing from the "day 2" mail', () => {
  assert.deepEqual(due(tutor(), at(5)), [])
})

// ---- the mails ------------------------------------------------------------------------------------------------------------------

const input = { name: 'Maria Santos', bookingUrl: 'https://www.tutafy.com/book/maria-santos-ab12', unsubscribeUrl: 'https://www.tutafy.com/unsubscribe?t=SIGNED' }
const mails = Object.fromEntries(WELCOME_STEPS.map(s => [s, renderWelcomeMail(s, input)])) as Record<WelcomeStep, ReturnType<typeof renderWelcomeMail>>
const words = (s: string) => s.split(/\s+/).filter(Boolean).length

test('three mails, in English, each with a subject of at most 60 characters, no emoji, no shouting', () => {
  for (const step of WELCOME_STEPS) {
    const m = mails[step]
    assert.equal(m.step, step)
    assert.ok(m.subject.length > 0 && m.subject.length <= 60, `${step}: ${m.subject.length} characters`)
    assert.doesNotMatch(m.subject, /\p{Extended_Pictographic}|!{2,}|[A-Z]{6,}/u, `${step} subject`)
    assert.doesNotMatch(m.html, /[ạảãàáâậầấẩẫăắằặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i, `${step} is English`)
  }
  assert.equal(mails.welcome.subject, 'Welcome to Tutafy, Maria: three things to do first')
  assert.equal(mails.nudge.subject, 'Your Tutafy page is ready. Have you sent the link?')
  assert.equal(mails.checkin.subject, 'What got in the way?')
})

test('every mail carries the unsubscribe link and says why the reader is getting it; the plain-text copy keeps the link', () => {
  for (const step of WELCOME_STEPS) {
    const m = mails[step]
    assert.ok(m.html.includes(`href="${input.unsubscribeUrl}"`), `${step} html`)
    assert.match(m.html, /You are getting this because you created a Tutafy account/)
    const text = htmlToText(m.html)
    assert.ok(text.includes(input.unsubscribeUrl), `${step} text`)
    assert.ok(text.includes('Hi Maria,'), `${step} greets by first name`)
  }
})

test('the welcome has exactly the three jobs, in order, each with one button to the page that does it', () => {
  const text = htmlToText(mails.welcome.html)
  const jobs = [...text.matchAll(/^\s*(\d)\. (.+)$/gm)].map(m => `${m[1]}. ${m[2]}`)
  assert.deepEqual(jobs, ['1. Make your page yours', '2. Choose your free hours', '3. Share your booking link'])
  for (const href of ['https://www.tutafy.com/settings', 'https://www.tutafy.com/availability', 'https://www.tutafy.com/settings?tab=booking']) assert.ok(mails.welcome.html.includes(`href="${href}"`), href)
  assert.ok(mails.welcome.html.includes(input.bookingUrl), 'the tutor\'s own link is shown')
  assert.match(mails.welcome.html, /Can't find our email\?/, 'the spam-folder line, as in every first mail')
})

test('the nudge and the check-in are short; the check-in asks for a reply and has no button', () => {
  assert.ok(words(htmlToText(mails.nudge.html)) <= 140, `nudge: ${words(htmlToText(mails.nudge.html))} words`)
  assert.ok(words(htmlToText(mails.checkin.html)) <= 120, `check-in: ${words(htmlToText(mails.checkin.html))} words`)
  assert.ok(mails.nudge.html.includes(`href="${input.bookingUrl}"`))
  assert.match(htmlToText(mails.checkin.html), /Reply with one line/)
  assert.doesNotMatch(mails.checkin.html, /display:inline-block;background:#6366f1/, 'no button in the check-in: the only ask is a reply')
})

test('a tutor with no booking link yet still gets working buttons; a name with markup is shown as text; no name reads "Hi there,"', () => {
  const noLink = renderWelcomeMail('nudge', { ...input, bookingUrl: null })
  assert.ok(noLink.html.includes('href="https://www.tutafy.com/settings?tab=booking"'))
  const evil = renderWelcomeMail('welcome', { ...input, name: '<script>alert(1)</script> Bob' })
  assert.ok(!evil.html.includes('<script>'))
  assert.ok(htmlToText(evil.html).includes('Hi &lt;script&gt;alert(1)&lt;/script&gt;,') || htmlToText(evil.html).includes('Hi <script>alert(1)</script>,'))
  assert.equal(firstName(null), 'there')
  assert.equal(firstName('  '), 'there')
  assert.equal(firstName('Mai  Thu'), 'Mai')
  assert.equal(firstName('x'.repeat(100)).length, 40)
  assert.ok(renderWelcomeMail('welcome', { ...input, name: null }).html.includes('Hi there,'))
  const bad = renderWelcomeMail('welcome', { ...input, unsubscribeUrl: 'https://www.tutafy.com/unsubscribe?t="><b>' })
  assert.ok(!bad.html.includes('"><b>'), 'the unsubscribe address is escaped too')
})

// ---- it is a draft: nothing sends, nothing calls it -----------------------------------------------------------------------------

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${name}`
    if (statSync(path.join(ROOT, rel)).isDirectory()) sourceFiles(rel, out)
    else if (/\.(ts|tsx)$/.test(name)) out.push(rel)
  }
  return out
}
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

test('the words and the rule stay pure: only src/lib/welcome-send.ts imports them, and they contain no call to the mail service, no network call and no address', () => {
  const importers = sourceFiles('src').filter(f => f !== 'src/lib/welcome-series.ts' && /@\/lib\/welcome-series['"]/.test(read(f)))
  assert.deepEqual(importers, ['src/lib/welcome-send.ts'], 'the sending (switches, claim, unsubscribe) is in one place, tests/welcome-send.test.ts')
  const src = read('src/lib/welcome-series.ts')
  const code = src.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n')
  for (const word of ['resend', 'emails.send', 'fetch(', 'createMailer', 'process.env', 'createAdminClient', 'createClient']) assert.ok(!code.includes(word), `the draft does not use ${word}`)
  assert.doesNotMatch(code, /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/, 'no address is typed in the draft')
})
