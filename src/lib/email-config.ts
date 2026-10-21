// The settings and helpers behind every email Tutafy sends (src/lib/email.ts sends them). Nothing here needs
// the mail service, so the booking page (which runs in the browser) can use the same address and the same sentence.
//
// One place decides:
//   - who a mail comes from: a named, real address ("Tutafy Bookings <bookings@tutafy.com>") instead of a no-reply
//     one, because mail from "noreply" with a bare name is judged harsher by spam filters (school mailboxes especially);
//   - where a reply goes: a real, read mailbox (support@tutafy.com), so a student's answer reaches a person;
//   - a plain-text version beside every HTML one (mail with only HTML is another thing filters mark down).
// The two addresses can be changed without touching code: EMAIL_FROM_ADDRESS and EMAIL_REPLY_TO (optional; a value
// that is not a plain address is ignored and the default stays).

export const DEFAULT_FROM_ADDRESS = 'bookings@tutafy.com'
export const DEFAULT_REPLY_TO = 'support@tutafy.com'

/** "bookings": lesson and booking mail; "general": account, invoice and message mail. Same address, a clearer name. */
export type MailKind = 'bookings' | 'general'
const SENDER_NAME: Record<MailKind, string> = { bookings: 'Tutafy Bookings', general: 'Tutafy' }

const PLAIN_ADDRESS = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/

type Env = Record<string, string | undefined>
const address = (value: string | undefined, fallback: string) => {
  const v = (value ?? '').trim()
  return PLAIN_ADDRESS.test(v) ? v : fallback
}

/** The address mail is sent from (and the one a reader is asked to add to their contacts). */
export function emailFromAddress(env: Env = process.env): string {
  return address(env.EMAIL_FROM_ADDRESS, DEFAULT_FROM_ADDRESS)
}

/** The mailbox a reply goes to. */
export function emailReplyTo(env: Env = process.env): string {
  return address(env.EMAIL_REPLY_TO, DEFAULT_REPLY_TO)
}

/** "Tutafy Bookings <bookings@tutafy.com>" */
export function emailFrom(kind: MailKind = 'general', env: Env = process.env): string {
  return `${SENDER_NAME[kind]} <${emailFromAddress(env)}>`
}

/** The one short line, for the foot of a first mail and for the page that promises it. */
export function spamHintFor(fromAddress: string): string {
  return `Can't find our email? Check your spam or junk folder, and add ${fromAddress} to your contacts.`
}

export function spamHint(env: Env = process.env): string {
  return spamHintFor(emailFromAddress(env))
}

/** The same line as an HTML paragraph for the foot of an email. */
export function spamHintHtml(env: Env = process.env): string {
  return `<p style="color:#6b7280;font-size:12px;line-height:1.5;margin:16px 0 0;">${spamHint(env)}</p>`
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rarr: '→', larr: '←', middot: '·', mdash: '—', ndash: '–', hellip: '…', copy: '©' }

const TAG_NAME = /(\/?)([a-z][a-z0-9]*)/iy
const HREF = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i
const BLOCK_CLOSE = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'tr', 'ul', 'ol', 'table', 'section', 'blockquote'])
const RAW_TEXT = new Set(['style', 'script', 'head'])
/** A tag longer than this is only stripped, never read for a link (a mail's own tags are far shorter). */
const MAX_TAG_READ = 2000

/** Drops every `<...>` in one pass. A `<` with no `>` after it stays as text. */
function stripTags(s: string): string {
  let out = ''
  let i = 0
  for (;;) {
    const lt = s.indexOf('<', i)
    if (lt < 0) return out + s.slice(i)
    out += s.slice(i, lt)
    const gt = s.indexOf('>', lt + 1)
    if (gt < 0) return out + s.slice(lt)
    i = gt + 1
  }
}

/**
 * A readable plain-text copy of an HTML email: links keep their address ("label: https://..."), blocks become
 * lines, list items get a dash, styles and tags disappear, entities are decoded.
 *
 * The HTML has text a stranger typed in it (a booking note, a message), so it is read once from left to right:
 * every tag is consumed up to its `>` and the scan goes on after it, and a closing tag that is missing is looked
 * for once, never again from each opening tag. No pattern here backtracks over the text, so a note of hundreds of
 * thousands of `<style` or `<a href="x">` costs the same as any other note of that length.
 */
export function htmlToText(html: string): string {
  const lower = html.replace(/[A-Z]/g, c => c.toLowerCase()) // ASCII only, so positions match `html`
  const absent = new Set<string>() // closers searched for and not found anywhere after the scan position
  const find = (closer: string, from: number) => {
    if (absent.has(closer)) return -1
    const at = lower.indexOf(closer, from)
    if (at < 0) absent.add(closer)
    return at
  }
  let t = ''
  let i = 0
  while (i < html.length) {
    const lt = html.indexOf('<', i)
    if (lt < 0) { t += html.slice(i); break }
    t += html.slice(i, lt)
    if (lower.startsWith('<!--', lt)) {
      const end = find('-->', lt + 4)
      if (end >= 0) { i = end + 3; continue }
    }
    const gt = html.indexOf('>', lt + 1)
    if (gt < 0) { t += html.slice(lt); break }
    i = gt + 1
    TAG_NAME.lastIndex = lt + 1
    const m = TAG_NAME.exec(html)
    if (!m) continue
    const closing = m[1] === '/'
    const name = m[2].toLowerCase()
    if (closing) {
      if (BLOCK_CLOSE.has(name)) t += '\n'
      else if (name === 'td' || name === 'th') t += ' '
    } else if (name === 'br') {
      t += '\n'
    } else if (name === 'li') {
      t += '\n- '
    } else if (RAW_TEXT.has(name)) {
      const closer = `</${name}>`
      const end = find(closer, gt + 1)
      if (end >= 0) i = end + closer.length
    } else if (name === 'a' && gt - lt <= MAX_TAG_READ) {
      const h = HREF.exec(html.slice(lt, gt + 1))
      const end = h ? find('</a>', gt + 1) : -1
      if (h && end >= 0) {
        const href = (h[1] ?? h[2] ?? '').trim()
        const text = stripTags(html.slice(gt + 1, end)).replace(/\s+/g, ' ').trim()
        i = end + 4
        if (!href) t += text
        else if (!text) t += href
        else if (text.includes(href.replace(/^mailto:/i, ''))) t += text
        else t += `${text}: ${href}`
      }
    }
  }
  t = t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m
    }
    return ENTITIES[e.toLowerCase()] ?? m
  })
  t = t.split('\n').map(line => line.replace(/[ \t]+/g, ' ').trim()).join('\n')
  return t.replace(/\n{3,}/g, '\n\n').trim()
}

/** What a caller gives: HTML mail (the plain-text copy, the sender and the reply address are filled in). */
export type MailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
}

/**
 * The payload as it is sent: the sender, the reply address and a plain-text body are filled in (a caller can still
 * give its own `from`, `replyTo` or `text`).
 */
export function withEmailDefaults<T extends { html?: string; text?: string; from?: string; replyTo?: string | string[] }>(payload: T, kind: MailKind = 'general', env: Env = process.env): T & { from: string; replyTo: string | string[]; text: string } {
  return {
    ...payload,
    from: payload.from ?? emailFrom(kind, env),
    replyTo: payload.replyTo ?? emailReplyTo(env),
    text: payload.text ?? htmlToText(payload.html ?? ''),
  }
}
