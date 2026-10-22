# Can a visitor read a tutor's private columns? (T-0767)

**Answer: yes.** On a database built from the migration files, anyone with the public key can read EVERY column of every tutor whose booking page is on, the private ones included. The proof is `tests/tutors-read-exposure.test.ts` (in `npm test`). It runs on a throwaway Postgres (PGlite) with made-up tutors; nothing was run on the real Supabase and no key was used. Every address in the files is `example.com`.

## What was asked, column by column

| What | Can a visitor (public key, role `anon`) read it? | Why |
|---|---|---|
| Tutor **email** (`tutors.email`) | **Yes**, for every tutor whose booking page is on | Policy "Anyone can view tutor for booking" (`supabase/migrations/002_rls.sql`, line 20: `using (booking_url_active = true)`) lets the row through, and Supabase's default privileges give `anon` select on every column |
| Tutor **phone number** | There is **no phone column** in `tutors` (the test lists the columns). The phone of a *student* (`students.phone`) is closed to a visitor | `students` has only the owner policy |
| Tutor **private notes** | There is **no notes column** in `tutors`. The private notes of students (`students.notes`), lessons (`lessons.notes`) and the messages are closed to a visitor | owner policies only |
| `google_calendar_refresh_token`, `google_calendar_id` | **Yes** (a token that lets someone act on the tutor's Google Calendar) | same policy |
| `push_subscription` (the browser's push address and keys) | **Yes** | same policy |
| `stripe_account_id`, `stripe_onboarding_complete`, `polar_subscription_id`, `polar_checkout_id`, `subscription_status`, `subscription_expires_at`, `referral_credits`, `custom_domain`, `notify_*`, `paypal_link`, `paddle_checkout_link`, `contract_template` | **Yes** (each one, tested one by one) | same policy |
| A column that is added **tomorrow** | **Yes**, from its first day | the policy is on the row, not on a list of columns |
| `select *` in one call, all tutors with the page on at once | **Yes** (the whole list of emails in one request) | same |
| A tutor whose booking page is **off** | **No** | the policy's condition |
| **Another signed-in tutor** (role `authenticated`) | **Yes**, the same way: the policy is for every role | same |
| `availability_exceptions.reason` (the tutor's note on a blocked day, such as an appointment) | **Yes**, for any tutor | policy "Public read exceptions" (`supabase/migrations/010_availability_exceptions.sql`, `using (true)`); only the date is meant to be public |

Other tables a visitor can read by policy (each looked at, none holds a private column): `availability` (weekly hours), `packages` (active ones), `reviews` (public ones: a rating, a comment and a student's id, no name or email), `subscription_plans` (active ones). The test keeps this list fixed: a new public read policy fails it until somebody looks.

**What this does not prove:** it is built from the migration files, so it assumes Supabase's default privileges and that nobody changed the policies by hand on the real database. The columns that exist only on the real database (made by hand, not by a file) are exposed the same way, because the policy is on the row. **To check the real database, read only** (the owner runs these two in the Supabase SQL Editor; they change nothing):

```sql
select policyname, cmd, roles, qual from pg_policies where schemaname = 'public' and tablename in ('tutors', 'availability_exceptions') order by tablename, policyname;
select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = 'tutors' and grantee in ('anon', 'authenticated') order by grantee, privilege_type;
```

If the first shows "Anyone can view tutor for booking" with `(booking_url_active = true)` and the second shows `SELECT` for `anon`, the exposure is real.

## The fix, proposed and NOT applied: `025_tutors_not_public_proposal.sql`

It is in this folder, not in `supabase/migrations`, on purpose: it must not be applied before the code below is changed. It drops the two public read policies and takes `select` on `tutors` and `availability_exceptions` away from `anon`. A signed-in tutor keeps reading and writing their own rows; the server's own key is unaffected; no row or column changes; `availability`, `packages`, `reviews` and `subscription_plans` stay public. Tested on the copy: a visitor reads nothing from the two tables in any column or form; tutor A still reads every column of their own row; tutor B reads and changes nothing of tutor A's; the server's key still reads everything; it can be run twice. When the owner approves it and the code is changed, move the file into `supabase/migrations` (keep the marker `T-0767-FIX` in it): the first tests of `tests/tutors-read-exposure.test.ts` then expect NO exposure and become the guard that keeps it closed.

## Order of work (so the site does not break)

1. **Code first.** These places read `tutors` (or the blocked days) with a visitor's key today and would show "not found" or empty once the proposal runs. Each must read on the server with the admin client (`createAdminClient`) and select only the columns the page shows (the way the new directory does, `src/lib/directory-data.ts`):
   - `src/app/book/[slug]/page.tsx`, `src/app/book/[slug]/[member]/page.tsx`, `src/app/embed/[slug]/page.tsx`: the tutor row (`createClient()`), the blocked days, and, through them, `loadChosenDurations` and `loadShowMadeWith` (they are given the visitor's client). They select `paypal_link`, `paddle_checkout_link`, `stripe_account_id` and `contract_template`: the page may keep showing what the student needs to pay or sign, but the browser should get a yes/no for Stripe, not the account id.
   - `src/app/tutors/[slug]/page.tsx` (the tutor row, and `loadFreeTimes` in `src/lib/profile-data.ts`, which reads the hours and blocked days with `anon`).
   - `src/app/student/dashboard/page.tsx` (the student's session reads the name, photo and slug of their tutors).
   - `src/app/sitemap.ts` with `src/lib/tutor-sitemap.ts` (reads the slugs with the public key; its comment names the policy this proposal drops).
   - `src/app/api/tutors/public/route.ts` (already replaced by the directory work of T-0769, pull request #66).
   Already safe (they use the admin client): the booking route, the portal pages and routes, the reviews route, the homework check.
2. **Then the owner applies the proposal** (it is one short file, safe to run twice).
3. **If the exposure is confirmed on the real database,** the Google Calendar refresh tokens (and any other secret in those columns) must be treated as possibly copied: the owner decides whether to make every tutor connect Google Calendar again. Nothing here says anyone read them; nothing says nobody did.

## Not done here, and why

No code of the pages was changed: moving them is a separate, larger change with its own tests, and it is safe to do before the owner decides. Nothing was run on the real database.
