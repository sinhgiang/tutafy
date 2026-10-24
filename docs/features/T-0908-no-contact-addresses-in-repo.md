# T-0908: no real contact address in the repository

The repository is public, and the owner's rule 4b says no real email address or phone number may be on GitHub. Helme's weekly scan found 45
places. This change removes every one of them from the files as they are now (git history is not rewritten; see the report of the ticket).

## What the product needs at run time, and where it comes from now

| Value | Before | Now |
| --- | --- | --- |
| The admin sign-in account (`/admin`, `/super-admin`, the admin API) | typed in `src/lib/admin.ts`, `src/app/(auth)/register/page.tsx` and the admin settings page | the server variable `ADMIN_EMAIL`, read at each check by `adminEmail()` / `isAdminEmail()` in `src/lib/admin.ts`. **Fail closed**: missing, blank or not an address means nobody is the admin. The settings page shows the signed-in account. |
| The owner's own contact address on `/contact`, `/privacy`, `/terms`, the upgrade pages | typed in `src/lib/contact.ts` | the server variable `CONTACT_EMAIL`, read by `contactEmails()`. Missing or not an address: the company mailbox is shown alone (nothing breaks, nothing says "undefined"). |
| The sender, the Reply-To and the VAPID contact (role mailboxes `booking@`, `support@`, `admin@` of the site's own domain) | typed in full in `src/lib/email-config.ts` and `src/lib/push.ts` | only the role names are written; the domain is `MAIL_DOMAIN`, taken from `SITE_URL`. The values are the same as before. `EMAIL_FROM_ADDRESS` and `EMAIL_REPLY_TO` still override them. |

`ADMIN_EMAIL` and `CONTACT_EMAIL` are plain server variables (not `NEXT_PUBLIC_`): they are read on the server only. `/contact`, `/privacy` and
`/terms` are built ahead of time, so a change of `CONTACT_EMAIL` shows after the next deploy.

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
