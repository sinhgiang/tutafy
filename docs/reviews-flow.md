# Real reviews after the first lesson (T-0898): how it works and how to turn it on

Built from the designs A, A, A of T-0876 and the owner's rules of W-2747. **It is OFF.** Until the owner does the two steps below, no invitation goes out and nothing new shows on a profile or a student page; the old review form and the old reviews list work exactly as before.

## The rules (and where each is kept)

| Rule | Kept by |
| --- | --- |
| Only a student who had a lesson with the tutor writes a review (a completed lesson that has already taken place, reached by the student's own portal link) | `submitFlowReview` in `src/lib/reviews-data.ts`; tests in `tests/reviews-flow.test.ts` ("who may NOT review") |
| One review per student per tutor (an old review counts as that one review) | the unique index `reviews_one_per_student_tutor` in migration 027 and the same function |
| The student edits it for 7 days, then it is closed | the trigger `reviews_flow_guard` in migration 027 (refuses even the server's key) and `editOpen` |
| The tutor answers once, with text, only on a review of theirs, and cannot edit or hide a review | the same trigger, `replyToReview`, the tutor's read-only policy and `REVOKE INSERT, UPDATE, DELETE` for the browser keys |
| The name shown is the first name and the last initial ("Maria K.") | `publicName` in `src/lib/reviews-flow.ts` |
| Old reviews stay as they are | `flow = false` rows are untouched by every new rule |
| "Lessons taught" counts only lessons that took place | `countLessonsHeld` (completed and already started) |
| A low rating is shown like any other | the list shows every public review, newest first |
| Tutafy removes a review only for abuse | by hand, with the server's key: `update public.reviews set is_public = false where id = '<id>'` (the trigger lets this through; no tutor or student route can do it) |

## What it adds

- An email the morning after a student's **first** lesson with a tutor (daily run `/api/cron/review-invites` at 10:00 UTC, `vercel.json`), with five stars that are links. A star link only opens the form with that rating chosen; nothing is saved until the student presses Publish. One reminder three days later if there is no review. "Stop reminders" is remembered.
- The review page `/portal/<link>/review/<lesson>`: stars, up to three tags, up to 500 characters, what is public, and for how long it can be edited.
- On a tutor's profile: a summary card (average, share of each number of stars, lessons taught) and the reviews with the name, how many lessons that student took, tags and the tutor's answer. The tutor, signed in on their own profile, sees an answer box under a review with no answer.
- The student page links to the new page instead of the old per-lesson form; the old route `/api/reviews` refuses new reviews (410) while the flow is on.

## To turn it on (the owner)

1. **Read and run `supabase/migrations/027_reviews_flow.sql`** in the Supabase SQL Editor of the Tutafy project. It can be run on its own and more than once: it adds columns and rules, changes the tutor's old "all rights" policy on reviews to read-only, and creates the table of invitations already sent. It changes nothing a visitor can see until step 2. Check afterwards: `select flow, count(*) from public.reviews group by flow;` shows your old reviews with `false`.
2. **Set `REVIEWS_FLOW=on`** (exactly `on`) in the Vercel environment of the project, then redeploy. Any other value, or none, is off. The daily run also needs `CRON_SECRET` and `RESEND_API_KEY`, which the other daily runs already use.
3. Turn it off again by removing the variable and redeploying: the invitations stop and the new cards disappear; reviews already written stay in the database.

Before turning it on: the Privacy page does not yet say that a review is public with the student's first name and last initial; the owner may want a line there (not written here: it is legal text).

## Not done

- The review page and the profile are light-only, like the rest of the student portal and the tutor profile today; the dark scheme of the directory was not applied to them (it would change those pages for everyone, switch on or off).
- The notification "New N★ review received" in the tutor's app still links to the students page.
- A written notice to the tutor when a review arrives (the bell shows it as before).
