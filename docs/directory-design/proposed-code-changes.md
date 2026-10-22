# How the code would change (a proposal, T-0764)

**Nothing was changed.** No file under `src/`, no migration, no table, no environment variable. This only says what a build would touch, if the owner approves the design. Read `bookable-rule.md` first.

## Today

- `src/app/api/tutors/public/route.ts` (20 lines): reads `tutors` with the visitor's own session, `booking_url_active = true`, ordered by `review_count`, `limit(50)`; any error returns an empty list. It returns id, name, bio, avatar, timezone, languages, slug, rating, review count and `default_lesson_price`. No free-time check, no currency, no trial.
- `src/app/tutors/(directory)/page.tsx` (199 lines): a client component that fetches that route after the page loads, so the HTML Google sees has no tutors in it. Search by name or bio, language buttons (first 8), a card with initials, rating, three lines of bio, time zone and a price written with a fixed "$".
- Row level security lets anyone read a tutor row when `booking_url_active` is true (`supabase/migrations/002_rls.sql:20`), but `lessons` can be read only by their tutor (`002_rls.sql:33`), so the browser session cannot see which slots are taken.

## Proposed changes, in build order

### 1. One pure rule file: `src/lib/directory.ts` (new)

`isListable(tutor, slots)` (the four conditions), `nextAvailable(slots)`, `rankTutors(list, today)` (the order in `bookable-rule.md`), `priceBucket()`. Import `getSlots` and `overlappingLesson` from `src/lib/booking-slots.ts`, not a copy, so the directory and the booking page cannot disagree. No imports from Next or Supabase, so the node tests can load it (like `src/lib/branding.ts`).

### 2. The list: `/api/tutors/public` and a server read

- Read with the admin client (`createAdminClient()`, service role), **on the server only**, because the browser session cannot read `lessons`. Read only: no insert, update or delete; a test scans the file for them (as T-0741 did).
- Narrow the work in this order, so the cost stays small: (a) tutors with the page on, a name and `char_length(bio) >= 80`, selecting only the columns below; (b) of those, the ones with at least one `availability` row; (c) for those tutor ids, one read of `availability`, one of `availability_exceptions` from today, one of `lessons` between now and 15 days ahead that are not cancelled (`in('tutor_id', ids)`); (d) compute slots in code with `getSlots`.
- Return only what a card needs: `id, slug, name, avatar_url, languages, average_rating, review_count, default_lesson_price, currency, trial price (if on), a headline, next_slot (ISO, UTC), slots (up to 40 ISO times for the "Free times" filter)`. **Never** the email, phone, address or any payment field. A test fixes the list of keys.
- Cache the answer for a few minutes (`s-maxage`, `stale-while-revalidate`) so one visitor's page does not cost a hundred reads. A new tutor appears within minutes. Pagination by cursor, 24 a page, replaces `limit(50)`.
- Errors: a failed read returns an error answer (not an empty list that looks like "no tutors"), so the page can show the error state with a "Try again" button.

### 3. The page: server-rendered, shareable filters

- Render the list on the server (so Google sees real tutors, which the next marketplace step needs) and read the filters from the address: `/tutors?lang=english&price=15-30&trial=1&when=evening&sort=soonest`. A visitor can share a filtered list.
- A small client component formats "Next available" in the **visitor's own time zone** with `Intl.DateTimeFormat` (Today, Tomorrow, then weekday) and does the "Free times" filter on the slots the list carries. Without JavaScript it shows the date in the tutor's time zone, labelled as such.
- States: normal, filters applied, no match (with the nearest fix), few (fewer than 6; a constant), empty, error, loading. Words in English only (rule of the project).
- Mobile: filters in a bottom sheet, card with a small photo on the left, no sideways scroll at 390 px (measured, like T-0761).

### 4. Language and price filters need two small decisions

- Language: the list of buttons comes from the listed tutors only, with counts. The stored values are free text ("english", "English "), so they are trimmed and capitalised for display and matching (`initcap(btrim())` in the count query does the same).
- Price: tutors price in their own currency (`tutors.currency`, shown by `src/lib/currency.ts`). A "$15 to $30" filter has to compare like with like. Option 1 (proposed): one small table of approximate rates in code, marked approximate in the filter ("other currencies are converted at approximate rates"); the card always shows the tutor's own currency. Option 2: filter only tutors priced in USD and keep the others out of the price filter. The owner decides.

### 5. Optional: a switch for tutors, `tutors.list_in_directory` (migration, not written)

Every tutor with the page on is already shown today without being asked. A column `list_in_directory boolean not null default true` (a switch in Settings, "Show me in the tutor directory") gives tutors control and answers a privacy question before the directory gets more visitors. It is a plain profile column, not in the lock of `016_lock_paid_tutor_columns.sql`; the tutor writes only their own row (test with a second tutor). The tutor-side card in this folder ("Turn it off in Settings") assumes it. Without it the card drops that line.

### 6. The tutor's side: the "Your listing" card

On the dashboard (next to the first-student card and the profile completion card of T-0761): "Listed / Not listed yet" with the four conditions and a button for each one that fails. It reads the same `isListable` function, for the signed-in tutor's own rows only (session client, the tutor id from the session), and writes nothing. This is what turns "not listed" into "add your free hours".

### 7. Tests the build would add

- `isListable` boundaries: bio 79 and 80, name blank, slot 59 minutes from now and 61 minutes, day 14 and 15, a cancelled lesson, a lesson that only touches the slot's end, a buffer.
- The route: never returns the email or any key outside the fixed list (a privacy test), never writes, answers an error rather than an empty list when the read fails, the cache header is present.
- The same cases as `tests/directory-gate-sql.test.ts` (which already proves the SQL on a throwaway Postgres), so the code and the count query cannot drift apart.
- The page: the six states render, filters from the address, 390 px has no sideways scroll, no tutor without a free slot is ever drawn.
- Lighthouse before and after (the page becomes server-rendered).

### 8. Rollout

1. Run the two count queries on the real database (owner). They write nothing.
2. Build the rule file, the route and the page behind a plain environment constant or a flag the owner turns on after looking at a preview, so the old list can come back at once.
3. Nudge the tutors who are one step short (the funnel columns say which step): the dashboard cards above, and later the welcome series (T-0724).
4. The milestone in the marketplace report is 30 listed tutors.

## Related finding (not part of this ticket)

`002_rls.sql:20` lets anyone read **every column** of a tutor row when the page is on, and Supabase's default grants give the public key `select` on the table. If that holds on the real database, the tutor's email (and payment-link columns) can be read by anyone with the public key through the REST address, whatever `/api/tutors/public` selects. Check on the real database with `select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = 'tutors' and grantee = 'anon'` (read only). If so, the fix is a view with the public columns only, or column-level grants, written as its own ticket before the directory gets more visitors. It was not tested here: there is no road to the real database from this work.
