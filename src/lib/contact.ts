// The addresses a customer is told to write to (T-0712), written here ONCE. Every page that shows a contact address for a customer
// (/contact, /privacy, /terms, the upgrade pages) draws it with <ContactEmails /> from this list, so the two never drift apart
// (tests/contact-emails.test.ts reads the whole of src/ and fails when either address is typed anywhere else).
// The first address is the one answered first and always stands first; the second is the company mailbox, forwarded to the owner.
// Not here: ADMIN_EMAIL in src/lib/admin.ts is the owner's sign-in account, not an address shown to customers.
export const PRIMARY_CONTACT_EMAIL = 'tubxeebyajtube@gmail.com'
export const SUPPORT_CONTACT_EMAIL = 'support@tutafy.com'
export const CONTACT_EMAILS = [PRIMARY_CONTACT_EMAIL, SUPPORT_CONTACT_EMAIL] as const

/** The promise printed under the addresses. */
export const REPLY_PROMISE = 'We usually reply within one business day.'
