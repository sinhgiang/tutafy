// The addresses a customer is told to write to (T-0712), written here ONCE. Every page that shows a contact address for a customer
// (/contact, /privacy, /terms, the upgrade pages) draws it with <ContactEmails /> from this list, so the two never drift apart
// (tests/contact-emails.test.ts reads the whole of src/ and fails when either address is typed anywhere else).
// The first address is the one answered first and always stands first. It is the owner's own address, so it is NOT written in the code
// (rule 4b, T-0908): it is the server variable CONTACT_EMAIL; without it the pages show the company mailbox alone.
// The last one is the company mailbox, forwarded to the owner: the very address the outgoing mail names as Reply-To,
// written once in src/lib/email-config.ts (T-0686), so the two cannot differ.
// Not here: the admin sign-in account (src/lib/admin.ts), which is never shown to customers.
import { DEFAULT_REPLY_TO } from '@/lib/email-config'

type Env = Record<string, string | undefined>

const PLAIN_ADDRESS = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/

/** The owner's own address from CONTACT_EMAIL, or null when it is missing or not a plain address. */
export function primaryContactEmail(env: Env = process.env): string | null {
  const v = (env.CONTACT_EMAIL ?? '').trim()
  return PLAIN_ADDRESS.test(v) ? v : null
}

export const SUPPORT_CONTACT_EMAIL: string = DEFAULT_REPLY_TO

/** The addresses to show, the owner's first (when configured), the company mailbox last, no address twice. */
export function contactEmails(env: Env = process.env): string[] {
  const primary = primaryContactEmail(env)
  return primary && primary !== SUPPORT_CONTACT_EMAIL ? [primary, SUPPORT_CONTACT_EMAIL] : [SUPPORT_CONTACT_EMAIL]
}

/** The promise printed under the addresses. */
export const REPLY_PROMISE = 'We usually reply within one business day.'
