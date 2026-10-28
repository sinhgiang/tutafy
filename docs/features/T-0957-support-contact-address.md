# T-0957: one public contact address, the support mailbox

The owner chose the `support@` mailbox of tutafy.com as the one contact address a customer sees. It is the company mailbox that is forwarded to the owner and that
outgoing mail already names as Reply-To (`DEFAULT_REPLY_TO` in `src/lib/email-config.ts`, built from `SITE_URL`), so the page and the mail agree.

## What changed

- `src/lib/contact.ts`: `contactEmails()` returns `[SUPPORT_CONTACT_EMAIL]` and nothing else. The owner's own address, which T-0908 had moved into the
  server variable `CONTACT_EMAIL` and which stood first on the pages, is gone: `primaryContactEmail()` was removed and no file in `src/` reads
  `CONTACT_EMAIL` any more. A leftover `CONTACT_EMAIL` on the host therefore changes nothing; the owner can delete it from Vercel (it is no longer used).
- Where the address shows (all through `<ContactEmails />`): `/contact` (the Email us card, the feedback card's mailto, "Prefer email?"), `/privacy`,
  `/terms`, `/upgrade` and `/upgrade/success`.
- Structured data and meta tags: `/contact` carries a `ContactPage` JSON-LD from `pageJsonLd` and a title and description from `PAGE_SEO.contact`; none
  of them has ever named an address, and a test now pins that.

## Not changed on purpose

- The blog author's name (a real person), the "Email & SMS reminders" and "Public API & Zapier" lines (both were later replaced by the one plan list, T-1052), and the commission numbers.
- The admin sign-in account (`ADMIN_EMAIL`), never shown to a customer.

## Tests

`tests/contact-emails.test.ts` renders `/contact`, `/privacy` and `/terms`, and the component the two upgrade pages use, with a made-up personal
address in `CONTACT_EMAIL` and without it: only the support mailbox appears, as a whole mailto link; the JSON-LD and the meta tags hold no address;
`CONTACT_EMAIL` is read nowhere in `src/`. `tests/no-contact-addresses.test.ts` (T-0908) still keeps every tracked file free of a real address.
