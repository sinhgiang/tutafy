// The one address a customer is told to write to (T-0957), written here ONCE. Every page that shows a contact address for a customer
// (/contact, /privacy, /terms, the upgrade pages) draws it with <ContactEmails /> from this list, so the pages never drift apart
// (tests/contact-emails.test.ts reads the whole of src/ and fails when the address is typed anywhere else).
// It is the company mailbox support@ on the site's own domain, forwarded to the owner: the very address the outgoing mail names as
// Reply-To, written once in src/lib/email-config.ts (T-0686), so the two cannot differ. No personal address of anyone is shown to a
// customer or written in the code (rule 4b, T-0908); the owner chose this mailbox as the public contact (T-0957).
// Not here: the admin sign-in account (src/lib/admin.ts), which is never shown to customers.
import { DEFAULT_REPLY_TO } from '@/lib/email-config'

export const SUPPORT_CONTACT_EMAIL: string = DEFAULT_REPLY_TO

/** The addresses to show: the company mailbox, alone. A list so a page that joins addresses keeps working if a second mailbox is ever added. */
export function contactEmails(): string[] {
  return [SUPPORT_CONTACT_EMAIL]
}

/** The promise printed under the address. */
export const REPLY_PROMISE = 'We usually reply within one business day.'
