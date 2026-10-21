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

/**
 * A readable plain-text copy of an HTML email: links keep their address ("label: https://..."), blocks become
 * lines, list items get a dash, styles and tags disappear, entities are decoded.
 */
export function htmlToText(html: string): string {
  let t = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<a\b[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi, (_m, d: string | undefined, s: string | undefined, label: string) => {
      const href = (d ?? s ?? '').trim()
      const text = label.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
      if (!href) return text
      if (!text) return href
      if (text.includes(href.replace(/^mailto:/i, ''))) return text
      return `${text}: ${href}`
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<\/(p|div|h[1-6]|tr|ul|ol|table|section|blockquote)>/gi, '\n')
    .replace(/<\/(td|th)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
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
