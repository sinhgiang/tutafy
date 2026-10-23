# T-0863: tutor directory filters (level, time zone, near me) and a dark colour scheme

`/tutors` already filtered by language, price, free times (day and time of day) and trial lesson (T-0769, see the T-0769 entry of `docs/feature-map.md`). This ticket adds the two filters that were missing and finishes the rest: **student level**, **time zone** (and "within 3 hours of me"), a **dark colour scheme**, and the address that carries all of it.

## What a visitor sees

- **Level** (`?level=beginner|intermediate|advanced`): a pill on a computer, a group in the Filters sheet on a phone. Counts the listed tutors who chose each level. Offered only when at least one listed tutor has chosen a level (or the address already asks for one): a level filter that empties the list on day one would be worse than none. A tutor who has not chosen a level is not matched by a level filter, and the group says so. The card names the levels the tutor teaches.
- **Time zone** (`?tz=Asia/Tokyo`): "Show times in" in the Time zone panel (a pill on a computer, the Filters sheet on a phone, also opened by "Change" on the line under the title). It is a setting, not a filter: it sets the zone that free times, the Day and Time of day filters and every card are read in, and it is kept in the address. Because the zone is in the address, the server already knows it, so a shared link draws the same days and hours on the server too (before, the first draw of a link with `when` or `tod` showed the unfiltered list until the browser corrected it). "Clear all" keeps the zone and the sort.
- **Within 3 hours of me** (`?near=1`): keeps tutors whose clock is at most `NEAR_HOURS` (3) hours away from the zone in use right now (daylight saving included: `zoneOffsetMinutes`, `isNear`). Left out until the visitor's zone is known, like the day filters.
- Language, price, free times, trial, search and sort are unchanged. The address holds all of them: `?q=&lang=&level=&price=&when=&tod=&near=1&trial=1&tz=&sort=`. Every value is checked against a fixed list or a strict pattern (`parseFilters`, `parseZone`), so a made-up address gives a valid page and nothing from it is drawn as markup.
- The filtered list is in the HTML itself (the client component is also rendered on the server with the filters from the address). Every address names `/tutors` as its canonical address (the layout's metadata), so filtered copies do not compete with the directory page; the structured data (`CollectionPage` list) is the directory's.
- Empty result: "No tutors match these filters", what was asked for, "removing X (n tutors)" for the filters that bring tutors back, and "Clear all filters". Nobody listed: the existing "directory opens soon" state.
- **Dark colour scheme**: `src/styles/directory-dark.css`, only inside `.dir-page`, follows the visitor's system setting (`prefers-color-scheme`). The public pages have no theme switch. Colours are variables at the top of the file; `tests/directory-dark.test.ts` reads them and measures the contrast of every pair (4.5 to 1 for text and chips) and checks that no selector escapes `.dir-page`.

## What a tutor does

Settings, Profile: "Student levels you teach" (three tick boxes, `ProfileSection.tsx`). Saved by `saveTutorSettings` (`src/lib/settings-save.ts`) on its own, only when changed, with the cleaned ids (`cleanLevels`), on the signed-in tutor's own row. The column may not exist yet, so a refused save says "The levels you teach cannot be saved yet. Your other settings are saved." and keeps the old levels in the unsaved-changes bar. Nothing else of the form is held back.

## Data and privacy

- `supabase/migrations/026_tutor_levels.sql`: `tutors.levels_taught text[] not null default '{}'`, a check function `levels_taught_valid` (only the three ids, none twice, at most three). **WRITTEN, NOT APPLIED**: the owner runs it in the Supabase SQL Editor. Until then the directory reads the column on its own (`directory-data.ts`, optional read like the lesson lengths) and treats a database without it as "nobody said", Settings cannot save levels (the message above), and the level filter stays hidden. No policy changes: a tutor writes only their own row (policy "Tutors can update own profile"), anon has no access to `tutors` (025).
- The card gains one key, `levels` (ids only), listed in `CARD_KEYS`; `tests/directory-page.test.ts` and `tests/directory-rule.test.ts` fix the key list and the columns read. Only listed tutors (the four conditions of the bookable rule) are ever in the answer; a private profile (page off, no hours, short introduction) is not read into a card.

## Files

`src/lib/tutor-levels.ts` (the three levels, `cleanLevels`), `src/lib/directory.ts` (`Filters` gains `level`, `near`, `tz`; `parseZone`, `zoneOffsetMinutes`, `isNear`, `levelCounts`, `clearedFilters`, `ZONE_CHOICES`), `src/components/directory/DirectoryView.tsx`, `TutorCard.tsx`, `src/lib/directory-data.ts`, `src/lib/settings-save.ts`, `src/components/settings/sections/ProfileSection.tsx`, `context.ts`, `src/app/(dashboard)/settings/page.tsx`, `src/styles/directory-dark.css`, `supabase/migrations/026_tutor_levels.sql`, `scripts/mock-supabase.mjs` (`MOCK_DIRECTORY=many` tutors now have levels).

## Tests (all in `npm test`)

`tests/directory-filters.test.ts` (levels, zone in the address, the round trip, daylight saving, near me, the real page for each filter over a stand-in database with a second tutor's private fields in the rows, migration 026 on a throwaway Postgres with the second-person test, the directory read with and without the column, the Settings save), `tests/directory-dark.test.ts`, and the updated `tests/directory.test.ts`, `directory-rule.test.ts`, `lesson-durations.test.ts`.

## Not done

- Languages cannot be edited in Settings at all today (they are filled elsewhere); this ticket does not add that.
- Price is still the four ready-made buckets with approximate rates, not a free range.
- No paging of the filtered list on the server (the first 24 cards, "Show more" in the browser, as before).
- The level and zone are not shown on the tutor's own profile page (`/tutors/<slug>`).
- Dark colours follow the system setting only: there is no switch on public pages.
