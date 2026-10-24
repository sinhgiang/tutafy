# T-0903: routes that use the server's key prove ownership themselves, and three small bugs

The server's key (`createAdminClient`) skips row level security, so a route that uses it must check, in code, that the caller owns what it touches. T-0895 found one that did not; this ticket fixes it, reads every other file that uses the key, and fixes three small bugs found on the way. Nothing was run on the real database or on the live site.

## What was fixed

| Where | The fault | Now |
| --- | --- | --- |
| `src/app/api/lessons/[id]/group-students/route.ts` (DELETE and PATCH) | The entry id in the request was the only filter: tutor B could remove a group student of tutor A, or mark them paid, by sending the id. | The lesson must be the signed-in tutor's, and an entry is touched only through that lesson (`id` and `lesson_id` in one statement). A miss is a 404, the same as for an id that does not exist. The status must be one the table accepts, the price a number of 0 or more, the ids real ids. GET and POST got the same helper. |
| `src/app/api/auth/google-calendar/callback/route.ts` and the start route | The tutor to connect was the `state` in the address, so anyone could connect their own Google calendar to another tutor (and receive that tutor's lessons), or be tricked into connecting. | The start makes a random state and keeps it, with the tutor id, in an http-only cookie of that browser (`src/lib/gcal-state.ts`). The return is accepted only when the signed-in account is the one that started it and the cookie and state agree; the cookie is single use; the id written is the session's. |
| `src/app/(dashboard)/lessons/[id]/LessonActions.tsx`, `src/app/api/lessons/[id]/no-show/route.ts`, `src/lib/no-show.ts` | The "Mark no-show" card tested `new Date() > new Date(Date.now())`, which is never true, so it never showed. The route marked any lesson, and mailed the student each time. | One rule (`noShowOffered`): the lesson is scheduled and its start has passed. The page shows the card by it and the route accepts the call by it (409 otherwise, no mail). The button now says so when the call fails. |
| `src/app/api/lessons/[id]/sync-gcal/route.ts` | The select did not ask for `google_event_id`, so every sync looked like the first and made one more calendar event. | The column is read; a lesson that has an event is updated. |
| `src/app/api/webhooks/stripe/route.ts`, `src/lib/stripe/subscription-period.ts` | The period dates were read from the subscription only; a newer Stripe API puts them on the items, and a missing date made `toISOString()` throw (500, so Stripe sent the event again for days). | The dates are read from the subscription or its first item; a missing date is left out of the row (an update keeps the dates it has) and the event and subscription ids are logged. A row that cannot be saved is now a 500, so Stripe retries it instead of the paid subscription being lost silently. |

## The register

`tests/support/server-key-registry.ts` lists every file under `src/app` that uses the key (68), each with the reason it is safe, written after reading it. `tests/server-key-routes.test.ts` fails when a file starts using the key without an entry, and when an entry names a file that no longer uses it. Result of the reading: after the two faults above, every other file is scoped by the session's tutor id, a student's portal token, a signed link, an API key, a webhook signature or the cron secret, or reads only public data.

## Not changed, for the owner

- `src/app/api/push/subscribe/route.ts` and `src/app/api/messages/route.ts` read `tutors.user_id`, a column no migration creates: a tutor's push address is never saved. It is not an access fault (it saves nothing), so it is left for a ticket of its own.
- The Stripe subscription webhook takes the tutor from the event's metadata; the event is signed, and the metadata is written by `api/subscriptions/checkout`. A tutor with their own Stripe dashboard access could in principle create a subscription with other metadata; that needs a design decision (check the connected account of the event against the tutor).

## Tests

`tests/server-key-routes.test.ts` (26 tests): the second tutor on all four group-students calls, the Google return with the old attack and with a stolen cookie, the no-show rule, card and route, sync-gcal creating one event only, the Stripe webhook with both date places and none (real signatures), and the register. Run against the routes as they were on `master`, 13 of them fail.

## Files that two open pull requests both touch

The lint clean-up (#94) edits seven of the same files (`any` removed). Whichever is merged second needs its branch refreshed from `master`.
