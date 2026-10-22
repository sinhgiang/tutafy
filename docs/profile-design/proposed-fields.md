# Proposed fields for the new public tutor profile (T-0761)

**Status: a proposal only.** Nothing in storage was changed. No migration was written, no column was added, no policy was touched, and the live `/tutors/<slug>` page is unchanged. The numbers below are what the design samples in this folder need if the owner picks a variant.

## What the live profile already has (no change needed)

`tutors`: `name`, `slug`, `bio`, `avatar_url`, `timezone`, `languages`, `average_rating`, `review_count`, `default_lesson_price`, `currency`, `trial_enabled`, `trial_price`, `cancellation_hours`, `booking_url_active`, `lesson_durations`, `default_lesson_duration`, `hide_branding` (021, not yet applied). `reviews` (`rating`, `comment`, `is_public`, `student_id`, `lesson_id`, `created_at`). `lessons` (status, tutor, student). `availability`. `packages` (Pro).

## New stored fields

| # | Field | Where | Type and limit | Who writes | Who reads | Used by |
|---|---|---|---|---|---|---|
| 1 | `headline` | `tutors` | text, up to 90 characters | the tutor | everyone (public page) | the one-sentence headline under the name; also the page title and search snippet |
| 2 | `intro_video` | `tutors` | text: the video id and the host (`youtube` or `vimeo`), never a free URL | the tutor | everyone | the intro video block |
| 3 | `teaching_since` | `tutors` | smallint, a year between 1970 and this year | the tutor | everyone | "Teaching since 2018", marked "Added by the tutor" |
| 4 | `credentials` | `tutors` | text[], up to 5 items of 60 characters | the tutor | everyone | "Added by the tutor, not verified by Tutafy" |
| 5 | `place` | `tutors` | text, up to 80 characters ("Toronto, Canada") | the tutor | everyone | the location line (today only the time zone exists) |
| 6 | `languages_spoken` | `tutors` | jsonb: a list of {language, level} with levels native, C2 to A1 | the tutor | everyone | "English (native), Spanish (C1)"; today `languages` is only a list of names |
| 7 | `good_fit`, `not_fit` | `tutors` | text[], up to 4 items of 120 characters each | the tutor | everyone | "A good fit if" and "Probably not for you if"; the templates fill them in |
| 8 | `tutor_subjects` | new table | `tutor_id`, `subject` (80), `level_from`, `level_to` (A1 to C2), `sort`; at most 6 per tutor | the tutor, own rows | everyone, only for tutors whose page is on | "What Maya teaches" with the level bar; also lets the directory filter by subject and level |
| 9 | `price_by_duration` | `tutors` | jsonb {minutes: price}, for the durations the tutor already chose | the tutor | everyone | the design shows a different price for 30 and 60 minutes; today there is one `default_lesson_price` |
| 10 | `cancellation_note` | `tutors` | text, up to 200 characters | the tutor | everyone | what happens inside the free-cancellation window (today the page only says "policy applies") |
| 11 | profile photo upload | storage bucket `avatars` | image up to 2 MB, JPEG, PNG or WebP, shown as a 4:5 crop | the tutor, own folder | everyone can read one file by its address; the bucket is not listable | the large photo; `avatar_url` already exists, the upload flow does not |

Biggest decision: **#9**. If the owner prefers one price for every length, the pricing block gets simpler and #9 is dropped.

## Shown but not stored (counted by the server when the page is built)

| Shown | Counted from |
|---|---|
| lessons taught, students taught | completed `lessons` of the tutor, and distinct students |
| rating and review count | `average_rating` and `review_count`, or counted from public `reviews` |
| "24 lessons with Maya" on each review | completed lessons between that student and that tutor, counted when the page is built |
| "74% of students book again" | students with two or more completed lessons divided by students with one or more |
| "Replies within 1 hour" | the time between a student message and the tutor's first reply in `messages` (shown only with at least 5 replies; otherwise hidden) |
| "Joined October 2026" | `tutors.created_at` |
| next free times, in the visitor's own time zone | `availability`, existing lessons and the booking rules, the same code the booking page uses |
| related tutors | public tutors with the same language or subject, excluding the tutor |
| payment line | which payment methods the tutor has switched on in Settings |
| profile completion percentage | the rules below |

## Profile completion (dashboard card), computed, never stored

| Step | Counts as done when | Weight |
|---|---|---|
| Set your free hours | at least one `availability` row | 20 |
| Write your introduction | `bio` has at least 200 characters | 15 |
| Set your lesson prices | `default_lesson_price` is set | 15 |
| Add a clear photo | `avatar_url` is set | 15 |
| Ask your first student for a review | `review_count` is at least 1 | 15 |
| Add a one-sentence headline | `headline` is not empty | 10 |
| Add an intro video | `intro_video` is set | 10 |

Total 100. Open steps are shown first, biggest weight first; done steps move to the bottom. The card shrinks to one line ("Your profile is complete", with the copy-link button) at 100%. It needs no new column except `headline` and `intro_video`; the first five steps can ship before any migration.

## Security notes for whoever builds this (rules 1, 2, 5, 6, 7, 9 of the security-by-default list)

- Every new column is plain profile text, not a privileged field. The migration `016_lock_paid_tutor_columns.sql` locks plan and payment columns; the new columns must not be added to that lock, and must not be writable through a policy that lets a tutor edit another tutor's row (test with a second tutor).
- `tutor_subjects` needs row level security written in the same migration: public read only when the tutor's page is on, write only for `tutor_id = auth.uid()`; a test where tutor B writes to tutor A's row gets refused, and a signed-out visitor can read only public rows.
- Intro video: store the id and host only, build the embed address on the server from a fixed list (`youtube-nocookie.com`, `player.vimeo.com`), and add exactly those hosts to `frame-src`. A free URL would let a tutor embed anything on a public page.
- All tutor-written text is shown as text, never as HTML. Lengths are checked on the server with a schema (zod), not only in the form.
- Photo upload: size and type checked on the server, a random file name, no listing of the bucket, and a limit on uploads per hour per tutor.
- Public JSON-LD (`src/lib/tutor-seo.ts`) must keep carrying no email and no phone number; the new fields add only headline, place and languages.
- The "send review link" step sends mail to a student: it needs a per-tutor send limit and must go to the student's own address only.
- Nothing here deletes or changes existing data; every new column is nullable with no default, so the live pages keep working before and after the migration.

## Suggested build order (the owner decides)

1. Completion card on the dashboard, using only existing data (steps 1 to 5 of the table above). No migration.
2. One migration: `headline`, `intro_video`, `teaching_since`, `credentials`, `place`, `languages_spoken`, `good_fit`, `not_fit`, `cancellation_note`, and the `tutor_subjects` table (and `price_by_duration` if chosen). The next free migration number must be checked at build time: 019 and 022 are held by other branches, 023 is used.
3. The editor ("About you", templates, live preview) and the photo upload.
4. The new public profile in the chosen variant, with the three states.
5. Structured data for Google (Person and Review) from the same fields.
