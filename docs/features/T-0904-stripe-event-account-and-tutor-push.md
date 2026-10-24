# T-0904: the Stripe subscription webhook checks the event's account, and a tutor's push address is saved

Both were left open by T-0903. Stacked on that branch (the webhook file is the same). Nothing was applied to the real database or the live site; no migration is needed.

## The Stripe subscription webhook

`src/app/api/webhooks/stripe/route.ts` believed the tutor (and plan) named in the metadata of a signed event. The signature only proves Stripe sent the event, not that the metadata is true. Now:

- the event must come from the Stripe account the named tutor connected (`event.account` equals `tutors.stripe_account_id` of that tutor); an event with no account, a tutor with no connected account, an unknown tutor or another tutor's account is **ignored** (answer 200 `ignored: account_mismatch`, nothing written, the event id logged). It answers 200, as the connect webhook does for events that are not for this app, because Stripe would only send the same event again;
- the plan must belong to that tutor (`subscription_plans.tutor_id`), so a subscription is never attached to another tutor's plan;
- a cancel (`customer.subscription.deleted`) is applied only when it comes from the connected account of the tutor who owns the saved subscription.

## The tutor's push address

`tutors` has no `user_id` column (migration 009 adds `tutors.push_subscription`, and a tutor's row is the one whose `id` is the auth account's id), so `api/push/subscribe` and the tutor-name lookup in `api/messages` matched no row: no tutor's address was ever saved, and a message to a student always said "your tutor".

- `src/app/api/push/subscribe/route.ts` saves to `tutors` where `id` is the session's id, answers 404 when no row was updated, 500 when the update fails. The id is the session's whatever the body says.
- The address is validated before it is kept (`src/lib/push-subscription.ts`): https only, no user name or password in the address, at most 2000 characters, both keys present and of a plausible form; only `endpoint`, `expirationTime` and `keys` are stored. The push library sends a request to that address, so an arbitrary one would make the server call an address the caller chose.
- `src/app/api/messages/route.ts` reads the tutor's name by `id`.

No migration: the column already exists (009). It was never filled, so no tutor has an address saved until they press the bell in Settings > Integrations again.

## Tests

`tests/stripe-event-account-push.test.ts` (12 tests; real routes, Stripe's own signatures): right account saved; another tutor's account naming tutor A writes nothing and is logged; no account / no Stripe account / unknown tutor; another tutor's plan; cancel from the right and the wrong account; wrong signature; the push address saved to the session's own row only, a visitor refused, a student link saving that student's address only, malformed addresses refused, extra fields dropped; the tutor's name in a message push. Run against the code before this ticket, 8 of them fail. `tests/server-key-routes.test.ts` now gives its subscription events an account and a plan.
