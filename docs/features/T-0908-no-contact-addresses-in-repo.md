# T-0908: no real contact address in the repository

The repository is public, and the owner's rule 4b says no real email address or phone number may be on GitHub. Helme's weekly scan found 45
places. This change removes every one of them from the files as they are now (git history is not rewritten; see the report of the ticket).

## What the product needs at run time, and where it comes from now

| Value | Before | Now |
| --- | --- | --- |
| The admin sign-in account (`/admin`, `/super-admin`, the admin API) | typed in `src/lib/admin.ts`, `src/app/(auth)/register/page.tsx` and the admin settings page | the server variable `ADMIN_EMAIL`, read at each check by `adminEmail()` / `isAdminEmail()` in `src/lib/admin.ts`. **Fail closed**: missing, blank or not an address means nobody is the admin. The settings page shows the signed-in account. |
| The owner's own contact address on `/contact`, `/privacy`, `/terms`, the upgrade pages | typed in `src/lib/contact.ts` | (changed by T-0957) no personal address is shown at all: the pages show the company mailbox `support@` alone, and `CONTACT_EMAIL` is no longer read. |
| The sender, the Reply-To and the VAPID contact (role mailboxes `booking@`, `support@`, `admin@` of the site's own domain) | typed in full in `src/lib/email-config.ts` and `src/lib/push.ts` | only the role names are written; the domain is `MAIL_DOMAIN`, taken from `SITE_URL`. The values are the same as before. `EMAIL_FROM_ADDRESS` and `EMAIL_REPLY_TO` still override them. |

`ADMIN_EMAIL` is a plain server variable (not `NEXT_PUBLIC_`): it is read on the server only. (`CONTACT_EMAIL`, which T-0908 added, is no longer
used since T-0957.)

## Examples, tests and documents

Every example address in a test, a document or a placeholder is on `example.com`. The tests that sign in as the admin use
`tests/support/admin-account.ts` (a made-up address that it also puts in `ADMIN_EMAIL` for that test process). `scripts/mock-supabase.mjs`
(fake screens) reads `ADMIN_EMAIL` from the environment, default `admin@example.com`: run the app with the same value.

## What keeps it from coming back

- `tests/no-contact-addresses.test.ts` reads every file `git ls-files` lists and fails (file and line only) on a real-looking address,
  with the same allowed placeholders as Helme's scan; it has a self-check of what the detector catches and lets through.
- `tests/contact-emails.test.ts` and `tests/admin-account.test.ts` prove the two variables, including what happens when they are missing.
- Helme's push check and weekly scan.

## Not done

- Git history still holds the old values (this change does not rewrite history).
- The two variables must be set on the host (Production) by the owner; until `ADMIN_EMAIL` is set, nobody can open `/admin`.
