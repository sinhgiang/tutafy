# T-1074: Cancelling a plan, checked against Polar's documentation, with a safety net

Follows T-1052 (cancelling keeps the plan to the end of the paid period). The owner chose not to test in Polar's sandbox (W-3443: 1), so this
ticket checks the code against Polar's documented events, adds tests for every case, and adds a daily check in case Polar's `subscription.revoked`
is late or never comes. Nothing here calls Polar, and no Polar setting changes.

## What Polar's documentation says (https://polar.sh/docs/integrate/webhooks/events.md, read 2026-10-28)

- Cancel at the end of the period (the default): `subscription.canceled` and `subscription.updated` are sent at once, the subscription is still
  `active` and `cancel_at_period_end` is `true`. `subscription.revoked` is sent when the period ends; only then is the status `canceled`.
- Immediate revocation: `canceled`, `updated` and `revoked` are sent together, with status `canceled` straight away.
- `uncanceled` is one of the kinds of `updated` (the customer took the cancel back).
- The Subscription object has `cancel_at_period_end`, `canceled_at`, `ends_at` ("will end"), `ended_at` ("ended"), `current_period_end`, `modified_at`.

## What the code does with it

`src/app/api/webhooks/polar/route.ts`, rules in `src/lib/polar-subscription.ts`, memory in `src/lib/polar-state.ts`:

- `subscription.uncanceled` was ignored before; it is now handled like `updated` (the tutor stays paid, the "canceling" mark is cleared).
- A subscription Polar says has ended (`ended_at` has come) is no longer paid, even if `current_period_end` is still in the future. Before, a
  `canceled` status with a future `current_period_end` counted as paid.
- Each Polar subscription has one row in `polar_subscription_state` (migration 031): `active`, `canceling` (with `ends_at`) or `ended`, and the
  `modified_at` of the newest event applied. With it: `revoked` always applies; anything else about an ended subscription is ignored (a late
  `updated` cannot give the plan back); an event older than one already applied is ignored; the same event twice changes nothing.
- The owner gets one mail for each cancelled subscription (the first time `canceled` or `revoked` is seen for it), naming the tutor by id only.
  If the mail service fails, the webhook still answers 200 and the notice is tried again on the next delivery.
- The log line that used to print the customer's address when no tutor matched now prints only which fields were present.

## The safety net

`/api/cron/polar-expiry` (daily 06:00 UTC in `vercel.json`, closed without `CRON_SECRET`), logic in `src/lib/polar-expiry.ts`: a subscription
remembered as `canceling` whose `ends_at` passed more than 12 hours ago (`SAFETY_GRACE_MS`) with no `revoked` puts that tutor back on Free
(`subscription_status = 'free'`, date cleared), writes the log line `SAFETY DOWNGRADE tutor=<id>` and mails the admin. Before the end of the period
plus 12 hours the tutor keeps the plan. A tutor who bought another subscription since is not touched. The row is claimed with one conditional update,
so two runs, or a `revoked` at the same moment, cannot both act. Worst case a tutor keeps the plan up to about 12 + 24 hours past the paid period
(the grace plus the wait for the next daily run).

## Needs the owner

- **Migration 031 is written, not applied.** Without it the webhook behaves as it did after T-1052 (the ordering rules and the safety net are off and a
  warning is logged). With it, both are on. Run `supabase/migrations/031_polar_subscription_state.sql` in the Supabase SQL Editor.
- The mail to the admin needs `ADMIN_EMAIL` and `RESEND_API_KEY` on the server (both already used elsewhere).

## Tests

`tests/polar-safety.test.ts` runs the real route, the real check and the real cron route over a real Postgres built from the migrations: cancel at the
end of the period, the events sent twice, `revoked` at the end, immediate revocation in all six orders (with and without `ended_at`), `revoked` early,
events after `revoked`, uncancel and an older cancel arriving late, the safety net before / at / after the end and the grace, `revoked` after the safety
net, another subscription, two runs at once, the mail failing or not set up, migration not applied, forged and unsigned events, a second tutor, the RLS
of the new table, the cron route's gate, and that no log line holds an address. Mutation checks were run (without the "ended" rule, with a safety net
that acts too early, without the other-subscription check): each turned tests red.

## Not known until a real cancel

- WHEN Polar sends `revoked` after the period ends (minutes, hours, or at the next renewal date). The 12-hour grace is a guess; the mail to the admin
  tells how often the safety net had to step in.
- The exact `ended_at` / `ends_at` values Polar sends for an immediate revocation: the code handles both with and without `ended_at`, but the
  documentation does not list them.
- `past_due`, `unpaid` and `paused` still drop the plan at once (unchanged since T-1052).
