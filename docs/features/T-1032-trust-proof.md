# T-1032: prove it first, no new feature (direction 1 of W-3276)

Three changes and one read-only comparison. Nothing here adds a product feature; each one closes a gap that made the public side look empty.

## 1. Languages a tutor teaches (Settings, Profile)

`tutors.languages` has been in the schema since `001_schema.sql` and every public page reads it (directory card and filter, profile, booking page, language pages, search markup), but **nothing in the app ever wrote it**: no Settings field, no onboarding step, no route. So 0 of the 723 live profiles showed a language, no language page or niche page could ever exist, and the directory's language filter could never list anything. New: "Languages you teach" in Settings, Profile (`src/components/settings/LanguagesField.tsx`), saved by its own route `/api/tutors/languages` (`src/app/api/tutors/languages/route.ts`), like the photo and the intro video: it saves by itself and is not part of the form's Save button. One rule for what is accepted, in the browser and again on the server (`src/lib/tutor-languages.ts`): names of letters (any alphabet), hyphen, space, apostrophe or full stop, at most 30 characters each, at most six, none twice, tidied into capitals; the clean list is stored, never the typed text. The tutor id is the session's, the column is written with the tutor's own session (row level security keeps it to their row), 30 saves in 10 minutes for one tutor, same-origin calls only, 413 over 4 KB. No migration. Tests: `tests/languages-route.test.ts`, the `OWN_SESSION` entry in `tests/public-tutor-scan.test.ts` and the check in `tests/rate-limits.test.ts`.

## 2. Which profiles search engines are asked to index

On 28 Oct 2026 the sitemap listed **723 tutor profiles** and every one said `index, follow`: 691 had no introduction at all (699 under 80 characters), none had a photo, a video or a language, and about 655 had a name made of random letters. `src/lib/profile-index.ts` is the one rule; the sitemap (`src/lib/tutor-sitemap.ts`) and each profile's `robots` tag (`src/app/tutors/[slug]/page.tsx`, list kept an hour by `src/lib/profile-index-data.ts`) both ask it, so a page that says `index` is in the sitemap and a page that says `noindex` is not. A profile is indexable when it has a name, an introduction of at least 80 characters (the directory's own minimum, `MIN_INTRO_CHARS`), is not a test account (a whole word such as test, demo, sample, dummy, fake, trial in the name or address), and is the best profile of its name (longest introduction, then photo, then oldest). Everything else is `noindex` and out of the sitemap; nothing is deleted and the page still works and can be booked. If the list cannot be read, a page falls back to the rules that look at its own row (the "same name" rule waits). Result on the live data (the same function over the 723 public pages): **723 profiles go down to 24**; 698 left out for a short introduction and 1 as a test account; the sitemap goes from 758 addresses to 59. Tests: `tests/profile-index.test.ts` (including a set shaped like the live site and the check that the page and the sitemap always agree), the sitemap test in `tests/tutor-seo.test.ts`, the read test in `tests/public-tutor-reads.test.ts`.

## 3. The frame for tutor stories (/customers)

`src/lib/testimonials.ts` holds `TESTIMONIALS`, **empty on purpose**. An entry is drawn only with the tutor's written consent (given, dated, with how it was given), clean text, a quote of 40 to 600 characters with no link, address or phone number, an https photo if any, and a plain profile address if any; at most three cards; a failing entry is left out, never repaired. `src/components/customers/TestimonialCards.tsx` draws them (photo or initials, quote as text, up to three facts the tutor confirmed, a link to the tutor's profile, the date of the permission). While the list is empty `/customers` keeps its honest "Your story could be the first". No star rating and no `Review` markup. How to ask a tutor and how to add an entry: `docs/testimonials.md`. Tests: `tests/testimonials.test.ts`.

## 4. Pricing page against the plan gateway: read-only, nothing changed

The comparison is in the report for the owner (waiting list); no code of the plans, the checkout or the webhook was touched.

## Not done

- Photos, videos, prices and reviews cannot be created from here: they are the tutors' own content. The live profiles that pass the rule (24) have no photo and no language yet.
- The 699 left-out profiles are `noindex` only after a search engine visits them again, which takes days or weeks. Nothing was sent to a search engine.
- `/book/<slug>` pages were not changed (they already point their canonical to the profile).
- `/customers` stays in the sitemap while it is empty.
