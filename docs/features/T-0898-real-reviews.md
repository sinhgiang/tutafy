# T-0898: real reviews after the first lesson (designs A, A, A), OFF by default

Full description, the rules and the steps to turn it on: `docs/reviews-flow.md`.

## Files

- `supabase/migrations/027_reviews_flow.sql`: new columns on `reviews` (`flow`, `tags`, `edited_at`, `tutor_reply`, `replied_at`), the shape check, one review per student per tutor (new flow only), the read-only tutor policy, `REVOKE` of writes for the browser keys, the guard trigger, and the `review_invites` table (row level security on, no policy). Written, tried on PGlite, **not applied** to the real database.
- `src/lib/reviews-flow.ts` (the switch `REVIEWS_FLOW=on`, the rules, `publicName`, `parseReviewInput`, `parseReply`, `summarize`, `agoLabel`), `src/lib/reviews-data.ts` (`submitFlowReview`, `replyToReview`, `loadProfileReviews`, `loadReviewPageState`, `countLessonsHeld`), `src/lib/review-invites.ts` (the mail, the daily run, "stop reminders").
- Routes: `src/app/api/reviews/flow/route.ts` (write or edit, by the portal link), `.../flow/stop/route.ts`, `src/app/api/reviews/reply/route.ts` (the signed-in tutor), `src/app/api/cron/review-invites/route.ts` (closed unless `CRON_SECRET`; `vercel.json` runs it daily). All answer 404 while the switch is off. The old `src/app/api/reviews/route.ts` POST answers 410 while it is on.
- Pages and components: `src/app/portal/[token]/review/[lessonId]/` (the one-card form and the stop page), `src/components/profile/ReviewsSection.tsx` (summary card and list), `src/components/profile/ReplyForm.tsx`, the profile page `src/app/tutors/[slug]/page.tsx` (shows the new section only when on), the student page `src/app/portal/[token]/page.tsx` (link instead of the old form when on).

## Tests

`tests/reviews-flow.test.ts` (the rules over an in-memory database, the routes, the invitation, the pages, the switch off and on; one mutation check was run: without the ownership checks four tests fail), `tests/reviews-flow-limits.test.ts` (the two limits hold whatever the caller makes up), `tests/reviews-flow-migration.test.ts` (the migration on a real Postgres: idempotent, old reviews untouched, the shape, the 7 days, answer once, nobody with a browser key writes, a tutor reads only their own hidden reviews, nobody with a browser key reads the invitations), three tests added to `tests/tutor-profile.test.ts` (profile off and on, who sees the answer box). `tests/support/fake-db.ts` now returns the row for `insert().select().maybeSingle()`.
