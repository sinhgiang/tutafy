// T-0686: the mail Tutafy sends. A named, real sender with a real Reply-To read from ONE place, a plain-text copy
// beside every HTML body, and one short line that tells a reader where to look when the mail is not in the inbox.
// The REAL code runs here: src/lib/email-config.ts and src/lib/email.ts, and the REAL booking route, which sends
// two mails. Resend itself is replaced by a recorder, so nothing is ever sent.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

type Sent = { from?: string; to: string; subject: string; html: string; text?: string; replyTo?: string }
const sent: Sent[] = []
mock.module('resend', { exports: { Resend: class { emails = { send: async (m: Sent) => { sent.push(m); return { data: { id: 'x' }, error: null } } } } } })

let db: FakeDb
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    createAdminClient: () => db,
    createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: null } }) } }),
  },
})

const mail = await import('@/lib/email.ts')
// The sender and the Reply-To are role mailboxes of the site's own domain (rule 4b: no address is typed in a test); what the domain is, is asserted below.
const { DEFAULT_FROM_ADDRESS: FROM, DEFAULT_REPLY_TO: REPLY, MAIL_DOMAIN } = await import('@/lib/email-config.ts')
const bookings = await import('@/app/api/bookings/route.ts')

// ---- the settings ------------------------------------------------------------------------------

test('the sender is a named, real address, and replies go to a real mailbox (the defaults)', () => {
  assert.equal(MAIL_DOMAIN, new URL(read('src/lib/site-url.ts').match(/SITE_URL = '([^']+)'/)![1]).hostname.replace(/^www\./, ''), 'the mailboxes live on the site\'s own domain')
  assert.equal(FROM, `booking@${MAIL_DOMAIN}`)
  assert.equal(REPLY, `support@${MAIL_DOMAIN}`)
  assert.equal(mail.emailFromAddress({}), FROM)
  assert.equal(mail.emailReplyTo({}), REPLY)
  assert.equal(mail.emailFrom('bookings', {}), `Tutafy Bookings <${FROM}>`)
  assert.equal(mail.emailFrom('general', {}), `Tutafy <${FROM}>`)
  assert.doesNotMatch(mail.emailFrom('bookings', {}), /no-?reply/i)
})

test('both addresses are read from ONE place and can be changed there; anything that is not a plain address is ignored', () => {
  assert.equal(mail.emailFromAddress({ EMAIL_FROM_ADDRESS: 'hello@example.com' }), 'hello@example.com')
  assert.equal(mail.emailReplyTo({ EMAIL_REPLY_TO: ' help@example.com ' }), 'help@example.com')
  assert.equal(mail.emailFrom('bookings', { EMAIL_FROM_ADDRESS: 'hello@example.com' }), 'Tutafy Bookings <hello@example.com>')
  for (const bad of ['', '   ', 'nope', 'a@b', 'Name <a@example.com>', 'a@example.com\nBcc: x@example.com', 'a@example.com, c@example.com', '<script>@example.com', 'a b@example.com']) {
    assert.equal(mail.emailFromAddress({ EMAIL_FROM_ADDRESS: bad }), FROM, JSON.stringify(bad))
    assert.equal(mail.emailReplyTo({ EMAIL_REPLY_TO: bad }), REPLY, JSON.stringify(bad))
  }
  assert.equal(mail.emailFromAddress({ EMAIL_FROM_ADDRESS: undefined }), FROM)
})

test('the sender and the reply address are written once in src: no other file names an address on the domain, nor a no-reply one', () => {
  const offenders: string[] = []
  const walk = (dir: string) => {
    for (const n of readdirSync(dir)) {
      const p = path.join(dir, n)
      if (statSync(p).isDirectory()) { walk(p); continue }
      if (!/\.(ts|tsx)$/.test(n)) continue
      const rel = path.relative(ROOT, p).replace(/\\/g, '/')
      const src = readFileSync(p, 'utf8')
      if (rel === 'src/lib/email-config.ts') continue
      if (/\bnoreply@|\bno-reply@|\b(bookings|support)@tutafy\.com/i.test(src)) offenders.push(rel)
    }
  }
  walk(SRC)
  assert.deepEqual(offenders, [], 'an address is written outside src/lib/email-config.ts')
})

// ---- the plain-text copy -----------------------------------------------------------------------

test('htmlToText: links keep their address, blocks become lines, tags, styles and entities go', () => {
  const html = `<style>p{color:red}</style><div style="x"><h1>Booking Confirmed! &#10003;</h1><p>Hi <strong>Sam</strong>,</p>
    <p>Fish &amp; chips &middot; 5 &lt; 6&nbsp;ok</p><ul><li>One</li><li>Two</li></ul>
    <a href="https://tutafy.test/portal/abc" style="b">View your booking details →</a><br/><a href="https://x.test/y">https://x.test/y</a></div>`
  const text = mail.htmlToText(html)
  assert.deepEqual(text.split('\n').filter(Boolean), [
    'Booking Confirmed! ✓',
    'Hi Sam,',
    'Fish & chips · 5 < 6 ok',
    '- One',
    '- Two',
    'View your booking details →: https://tutafy.test/portal/abc',
    'https://x.test/y',
  ])
  assert.ok(!/\n\n\n/.test(text), 'no run of blank lines')
  assert.doesNotMatch(text, /<[a-z/]|&amp;|&lt;|color:red/i)
})

test('htmlToText: nothing is lost that a reader needs, and broken or empty input is safe', () => {
  assert.equal(mail.htmlToText(''), '')
  assert.equal(mail.htmlToText('<p></p>'), '')
  assert.equal(mail.htmlToText('plain words'), 'plain words')
  assert.equal(mail.htmlToText('<p>a</p><p>b</p>'), 'a\nb')
  assert.equal(mail.htmlToText('<a href="mailto:x@example.com">x@example.com</a>'), 'x@example.com')
  assert.equal(mail.htmlToText('<a href="https://x.test">Open</a>'), 'Open: https://x.test')
  assert.equal(mail.htmlToText('&#x1F600; &#0; &#99999999; &unknown;'), '😀 &#0; &#99999999; &unknown;')
  assert.equal(mail.htmlToText('<p>a</p>\n\n\n\n<p>b</p>'), 'a\n\nb')
})

test('withEmailDefaults fills the sender, the reply address and the text, and leaves what the caller set', () => {
  const out = mail.withEmailDefaults({ to: 'a@example.com', subject: 'S', html: '<p>Hello</p>' }, 'bookings', {})
  assert.deepEqual([out.from, out.replyTo, out.text, out.html], [`Tutafy Bookings <${FROM}>`, REPLY, 'Hello', '<p>Hello</p>'])
  const own = mail.withEmailDefaults({ to: 'a@example.com', subject: 'S', html: '<p>Hello</p>', from: 'X <x@example.com>', replyTo: 'r@example.com', text: 'mine' }, 'bookings', {})
  assert.deepEqual([own.from, own.replyTo, own.text], ['X <x@example.com>', 'r@example.com', 'mine'])
})

test('the spam line names the real sender address and tells the reader what to do, in one sentence', () => {
  const line = mail.spamHintFor(FROM)
  assert.equal(line, `Can't find our email? Check your spam or junk folder, and add ${FROM} to your contacts.`)
  assert.equal(mail.spamHint({ EMAIL_FROM_ADDRESS: 'hello@example.com' }), "Can't find our email? Check your spam or junk folder, and add hello@example.com to your contacts.")
  const html = mail.spamHintHtml({})
  assert.match(html, /^<p [^>]*>/)
  assert.ok(html.endsWith(`>Can't find our email? Check your spam or junk folder, and add ${FROM} to your contacts.</p>`), html)
})

// ---- the mailer ---------------------------------------------------------------------------------

beforeEach(() => { sent.length = 0 })

test('createMailer sends HTML with a plain-text copy, the named sender and the Reply-To', async () => {
  await mail.createMailer('re_test', 'bookings').emails.send({ to: 'a@example.com', subject: 'Hello there', html: '<p>Hi <b>Sam</b></p>' })
  assert.equal(sent.length, 1)
  assert.deepEqual(
    { from: sent[0].from, replyTo: sent[0].replyTo, text: sent[0].text, html: sent[0].html, to: sent[0].to, subject: sent[0].subject },
    { from: `Tutafy Bookings <${FROM}>`, replyTo: REPLY, text: 'Hi Sam', html: '<p>Hi <b>Sam</b></p>', to: 'a@example.com', subject: 'Hello there' },
  )
})

// ---- every place that sends mail -----------------------------------------------------------------

function sendSites(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const n of readdirSync(dir)) {
      const p = path.join(dir, n)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.tsx?$/.test(n) && /emails\.send\(/.test(readFileSync(p, 'utf8'))) out.push(path.relative(ROOT, p).replace(/\\/g, '/'))
    }
  }
  walk(SRC)
  return out.filter(f => f !== 'src/lib/email.ts').sort()
}

test('every file that sends mail uses the shared mailer: no own Resend client, no own sender, no own Reply-To', () => {
  const files = sendSites()
  assert.ok(files.length >= 14, `found ${files.length} files that send mail`)
  for (const f of files) {
    const src = read(f)
    assert.match(src, /createMailer\(process\.env\.RESEND_API_KEY[,)]/, `${f} does not build its client with createMailer`)
    assert.doesNotMatch(src, /new Resend\(/, `${f} builds its own Resend client`)
    assert.doesNotMatch(src, /from 'resend'|import\('resend'\)/, `${f} imports the mail service directly`)
    for (const block of src.split('emails.send(').slice(1)) {
      const call = block.slice(0, block.indexOf('})') + 2)
      assert.doesNotMatch(call, /^\s*\{\s*from\b/, `${f} sets its own sender`)
      assert.doesNotMatch(call, /\n\s*(from|replyTo|reply_to)\s*[:,]/, `${f} sets its own sender or Reply-To`)
    }
  }
})

test('a mail with only HTML cannot be sent: the mailer needs html and always adds the text, whatever the caller forgets', async () => {
  // the types demand html; at run time a caller that passed a body without text still sends both
  await mail.createMailer('re_test').emails.send({ to: 'a@example.com', subject: 'S', html: '<div><p>One</p><p>Two</p></div>' })
  assert.equal(sent[0].text, 'One\nTwo')
  assert.ok(sent[0].html.includes('<div>'))
})

// ---- the real booking route ----------------------------------------------------------------------

const TUTOR = '10000000-0000-4000-8000-0000000000e1'
beforeEach(() => {
  db = createFakeDb({
    tutors: [{ id: TUTOR, name: 'Tutor Tina', email: 'tina@example.com', slug: 'tina', subscription_status: 'free', booking_url_active: true, currency: 'USD', default_lesson_price: 25, timezone: 'UTC', languages: [], cancellation_hours: 24, buffer_minutes: 0 }],
    availability: [{ id: 'a1', tutor_id: TUTOR, team_member_id: null, day_of_week: 1, start_time: '09:00', end_time: '17:00' }],
  }, { students: { portal_token: () => `portal-${randomUUID()}` } })
  process.env.RESEND_API_KEY = 're_test_key_for_tests'
})

async function book() {
  return bookings.POST(new Request('https://www.tutafy.test/api/bookings', {
    method: 'POST', headers: { host: 'www.tutafy.test', 'x-forwarded-proto': 'https' },
    body: JSON.stringify({ tutorId: TUTOR, date: '2030-01-07', time: '10:00', duration: 60, name: 'Sam Student', email: 'sam@example.com', message: '', termsAgreed: true }),
  }))
}

test('a booking sends two mails (student, tutor), each from the named sender, with Reply-To, HTML and text, and the spam line', async () => {
  const res = await book()
  assert.equal(res.status, 200)
  assert.deepEqual(sent.map(m => m.to).sort(), ['sam@example.com', 'tina@example.com'])
  for (const m of sent) {
    assert.equal(m.from, `Tutafy Bookings <${FROM}>`)
    assert.equal(m.replyTo, REPLY)
    assert.ok(m.html.length > 200 && m.html.includes('<div'), 'HTML body')
    assert.ok(m.text && m.text.length > 40 && !/<[a-z]/i.test(m.text), 'plain-text body')
    const hint = mail.spamHint({})
    assert.ok(m.html.includes(hint), 'the spam line is in the HTML')
    assert.ok(m.text!.includes(hint), 'and in the plain text')
    assert.equal((m.html.match(/<img\b/gi) ?? []).length, 0, 'no pictures')
    assert.equal((m.html.match(/display:inline-block;background:#6366f1/g) ?? []).length, 1, 'one main button')
    assert.ok(/https:\/\/www\.tutafy\.test\/(portal|lessons)\//.test(m.text!), 'the button link is in the text too')
  }
})

test('the subjects are plain and clear: no emoji, no shouting, the business content is unchanged', async () => {
  await book()
  const student = sent.find(m => m.to === 'sam@example.com')!
  const tutor = sent.find(m => m.to === 'tina@example.com')!
  assert.match(student.subject, /^Booking Confirmed — Tutor Tina on Monday, January 7, 2030$/)
  assert.match(tutor.subject, /^New booking from Sam Student — Monday, January 7, 2030$/)
  for (const m of sent) assert.doesNotMatch(m.subject, /\p{Extended_Pictographic}|!{2,}|[A-Z]{6,}/u, m.subject)
  assert.match(student.text!, /Hi Sam Student,/)
  assert.match(student.text!, /Your lesson with Tutor Tina is confirmed\./)
  assert.match(student.text!, /60 minutes/)
})

test('the booking answer names the sender address, so the page can tell the student where to look', async () => {
  const body = await (await book()).json()
  assert.equal(body.sender_email, FROM)
  const form = read('src/app/book/[slug]/BookingForm.tsx')
  assert.match(form, /import \{ DEFAULT_FROM_ADDRESS, spamHintFor \} from '@\/lib\/email-config'/)
  assert.match(form, /d\.sender_email/)
  assert.match(form, /\{spamHintFor\(senderEmail\)\}/)
  assert.ok(form.indexOf('Confirmation will be sent to') < form.indexOf('{spamHintFor(senderEmail)}'), 'the line sits right under the promise of a confirmation')
  // the booking page runs in the browser: it may not pull in the mail service
  assert.doesNotMatch(form, /from '@\/lib\/email'|from 'resend'/)
})

test('first mails carry the spam line: welcome (both), sign-in link, booking (both); welcome subjects have no emoji', () => {
  for (const f of ['src/app/api/auth/register/route.ts', 'src/app/auth/callback/route.ts', 'src/app/api/student/send-link/route.ts']) {
    assert.match(read(f), /\$\{spamHintHtml\(\)\}/, f)
  }
  assert.equal((read('src/app/api/bookings/route.ts').match(/\$\{spamHintHtml\(\)\}/g) ?? []).length, 2)
  for (const f of ['src/app/api/auth/register/route.ts', 'src/app/auth/callback/route.ts']) {
    const subject = /subject: '([^']*)'/.exec(read(f))![1]
    assert.doesNotMatch(subject, /\p{Extended_Pictographic}/u, `${f}: ${subject}`)
  }
})

// ---- text a stranger types must not be able to hold the server (review of T-0686) -----------------

// A note of hundreds of thousands of opening tags with no closing tag made the first plain-text converter run for
// minutes (every opening tag searched the whole rest of the text). These run the REAL converter on that input.
const FAST_MS = 1500
function timed<T>(run: () => T): { value: T; ms: number } {
  const t0 = performance.now()
  const value = run()
  return { value, ms: performance.now() - t0 }
}

test('htmlToText stays linear on a note made of opening tags that never close', () => {
  const size = 400_000 // characters
  const inputs: Record<string, string> = {
    '<style': '<style'.repeat(size / 6),
    '<script': '<script'.repeat(size / 7),
    '<head': '<head>'.repeat(size / 6),
    '<a href="x">': '<a href="x">'.repeat(size / 12),
    '<a href="x" ': '<a href="x" '.repeat(size / 12),
    '<a ': '<a '.repeat(size / 3),
    '<': '<'.repeat(size),
    '<!--': '<!--'.repeat(size / 4),
    'text <!-- ': 'x<!-- '.repeat(size / 6),
    '</a>': '</a>'.repeat(size / 4),
    '&': '&#x'.repeat(size / 3) + 'a'.repeat(size),
  }
  for (const [name, note] of Object.entries(inputs)) {
    const html = `<div><p>${note}</p><a href="https://tutafy.test/open">Open</a></div>`
    const { value, ms } = timed(() => mail.htmlToText(html))
    assert.ok(ms < FAST_MS, `${name}: ${Math.round(ms)} ms for ${html.length} characters`)
    assert.equal(typeof value, 'string')
  }
})

test('htmlToText: the same note in the same sentence costs about the same, doubled length about double', () => {
  const small = timed(() => mail.htmlToText('<style'.repeat(50_000))).ms
  const big = timed(() => mail.htmlToText('<style'.repeat(200_000))).ms
  // a squared converter takes ~16 times longer for 4 times the text; allow a lot of noise around 4
  assert.ok(big < Math.max(small * 12, 400), `${Math.round(small)} ms for 50k, ${Math.round(big)} ms for 200k`)
})

test('htmlToText still reads what follows an opening tag that never closes', () => {
  assert.equal(mail.htmlToText('<style>p{}'), 'p{}')
  assert.equal(mail.htmlToText('<p>Hello <a href="https://x.test">there</p>'), 'Hello there')
  assert.equal(mail.htmlToText('<!-- never closed <p>Hi</p>'), 'Hi')
  assert.equal(mail.htmlToText('a <b and c'), 'a <b and c')
  assert.equal(mail.htmlToText('<style>p{}</style>after<STYLE>q{}</STYLE>!'), 'after!')
  assert.equal(mail.htmlToText('<header>Top</header>'), 'Top')
  assert.equal(mail.htmlToText('<A HREF="https://x.test/y">Go</A>'), 'Go: https://x.test/y')
  assert.equal(mail.htmlToText('<a href="https://x.test"><b>Go</b> <i>now</i></a>'), 'Go now: https://x.test')
  assert.equal(mail.htmlToText('<a href="">Only</a>'), 'Only')
  assert.equal(mail.htmlToText('<a href="https://x.test"></a>'), 'https://x.test')
})

test('the booking route turns away a name, email or note too long to belong in a mail, and sends nothing', async () => {
  for (const field of ['name', 'email', 'message'] as const) {
    sent.length = 0
    const body: Record<string, unknown> = { tutorId: TUTOR, date: '2030-01-07', time: '10:00', duration: 60, name: 'Sam Student', email: 'sam@example.com', message: '', termsAgreed: true }
    body[field] = 'x'.repeat(field === 'message' ? 2001 : field === 'email' ? 255 : 201)
    const res = await bookings.POST(new Request('https://www.tutafy.test/api/bookings', { method: 'POST', headers: { host: 'www.tutafy.test' }, body: JSON.stringify(body) }))
    assert.equal(res.status, 400, field)
    assert.equal(sent.length, 0, `${field}: no mail`)
  }
  // a note of exactly the limit is still taken, and its mail is built at once
  const okBody = { tutorId: TUTOR, date: '2030-01-07', time: '10:00', duration: 60, name: 'Sam Student', email: 'sam@example.com', message: '<style'.repeat(333), termsAgreed: true }
  const { value: res, ms } = await (async () => { const t0 = performance.now(); const value = await bookings.POST(new Request('https://www.tutafy.test/api/bookings', { method: 'POST', headers: { host: 'www.tutafy.test' }, body: JSON.stringify(okBody) })); return { value, ms: performance.now() - t0 } })()
  assert.equal(res.status, 200)
  assert.equal(sent.length, 2)
  assert.ok(ms < FAST_MS, `${Math.round(ms)} ms`)
})

test('the portal message route has the same limit (the note goes into the tutor\'s mail)', () => {
  const lim = read('src/lib/input-limits.ts')
  assert.match(lim, /MAX_MESSAGE_LENGTH = 2000/)
  const portal = read('src/app/api/portal/[token]/messages/route.ts')
  assert.match(portal, /if \(!withinMessageLimit\(content\)\) \{\s*return NextResponse\.json\(\{ error: 'content too long' \}, \{ status: 400 \}\)/)
  assert.ok(portal.indexOf('withinMessageLimit(content)') < portal.indexOf('.insert('), 'checked before the message is saved')
})
