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

## Where things stand (T-0774)

**The code is changed and the SQL has been run on the real database by the owner (W-2548); it is now the migration `supabase/migrations/025_tutors_not_public.sql`.** The checks after it showed both public policies gone and no select left for the visitor.

| Page or API | Before | Now |
|---|---|---|
| `src/app/book/[slug]/page.tsx`, `src/app/book/[slug]/[member]/page.tsx`, `src/app/embed/[slug]/page.tsx` | the tutor row and the blocked days with the visitor's key, the PayPal link, the card link, the Stripe account id and the contract text in the same row | `loadPublicTutor` (`src/lib/public-tutor.ts`) with the admin client and the list of the page in `src/lib/public-tutor-columns.ts`; blocked days: the date only (`loadBlockedDates`); `loadChosenDurations` and `loadShowMadeWith` get the admin client. `stripe_account_id` is no longer read at all (nothing in the page used it). `paypal_link`, `paddle_checkout_link` and `contract_template` stay on the booking pages only: the student pays and signs there |
| `src/app/tutors/[slug]/page.tsx` and `loadFreeTimes` in `src/lib/profile-data.ts` | the tutor row and the blocked days with the visitor's key | the tutor through `loadPublicTutor` (a tutor whose page is off is found only by that tutor, signed in); the blocked days through the admin client (a failed read of them is now "unknown", never "no blocked days") |
| `src/app/sitemap.ts` with `src/lib/tutor-sitemap.ts` | the slugs with the public key | the slugs (the `slug` column only, `booking_url_active = true`) with the server's key |
| `src/app/student/dashboard/page.tsx` | (the first version of this file said the student's session read the tutors: it already used the admin client) | unchanged in behaviour; `STUDENT_PAGE_COLUMNS` names the four columns it reads |
| `src/app/api/tutors/public/route.ts` | replaced by the directory work (T-0769) | unchanged |
| `src/proxy.ts` (**not in the list of the first version of this file**) | two reads of `tutors` with the PUBLIC key: the custom domain of a tutor, and "is this signed-in account a tutor?" | the custom domain is looked up with the server key (slug only, page on); "is this a tutor?" is asked with the signed-in account's own session. Without this change, the day 025 runs every custom domain would stop working and every signed-in tutor would be sent to the student sign-in |

Already safe (they use the admin client): the booking route, the portal pages and routes, the reviews route, the homework check, the subscription and Stripe checkout routes.

What keeps it that way: `tests/public-tutor-reads.test.ts` renders the real pages over a database that has 025 applied (a visitor's key reads nothing from the two tables) and searches the markup and the props of every element for the made-up private values; `tests/public-tutor-scan.test.ts` scans all of `src` and fails on any read of `tutors` or `availability_exceptions` with a client that is not the admin client unless it is listed with a reason; `tests/public-tutor-columns.test.ts` keeps the lists of columns honest; `tests/proxy-tutor-reads.test.ts` proves the proxy.

## Running it (the owner; the steps with links are in the waiting item)

1. **Merge the pull request of T-0774 and wait for the site to deploy.** Before that, 025 would break the booking pages.
2. **Open a booking page** (`/tutors`, pick a tutor, press Book) and check it shows the tutor and the free times.
3. **Run `025_checks_read_only.sql` first** (two select statements; shows "open").
4. **Run `supabase/migrations/025_tutors_not_public.sql`** in the SQL Editor of the Supabase project (done).
5. **Run the two checks again.** Check 1 must no longer list "Anyone can view tutor for booking" or "Public read exceptions"; check 2 must show no row.
6. **Open the booking page, the embed and a tutor's profile again,** and sign in as a tutor: the dashboard must open. If a page shows "not found" or the dashboard sends you to the student sign-in, run `025_tutors_not_public_rollback.sql` (it puts both policies and the visitor's right to select back, exactly as before; it re-opens the exposure, so it is a stop-gap) and tell the Chief.
7. **Then** the file was moved into `supabase/migrations` (done, with the marker `T-0767-FIX`): `tests/tutors-read-exposure.test.ts` expects no exposure and is the guard that keeps it closed.
8. **Decide about Google Calendar** (not done by anyone): the refresh tokens of the tutors who connected Google Calendar were readable by anyone with the public key. Nothing says anyone read them; nothing says nobody did. The owner decides whether to ask every tutor to disconnect and connect Google Calendar again (Settings, Google Calendar).

`tests/tutors-025-ready.test.ts` proves, on a copy built from every migration: the two checks only select; before the fix they show the two public policies and the visitor's right to select, after it neither; the fix can be run twice; fix then rollback gives back exactly the same policies and grants as the migration files made.

## Not done here, and why

- **The tutor's own dashboard** reads its own full tutor row (`select('*')` in `src/app/(dashboard)/layout.tsx`) and gives it to the header. That is the signed-in tutor's own data, in their own browser, so it is not what this folder is about; but the row holds the Google Calendar refresh token and the push subscription, and a browser does not need them. A separate, small change (list the columns the header shows) is proposed in the report of T-0774.
- **`paypal_link` can be an e-mail address** (the booking page accepts "a full link or a paypal.me name / email"), and it goes to every visitor of the booking page, because the package buttons use it before any booking. Taking it out of the page would need a server step that redirects to the payment after the student chooses; that is a product decision, not a security patch, and it is on the report for the owner.
- A `tutors(...)` join inside a select string is not seen by the scan. Every one in the code is made by the admin client or by the signed-in tutor on their own lessons (listed in the report of T-0774).
