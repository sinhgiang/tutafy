# T-1052: One plan list, a way in for signed-out visitors, and cancelling keeps the plan to the end of the paid period

Owner's choice 1 in W-3297 (the comparison of the pricing pages with what the code sells). Nothing here changes a Polar product, a
price or a Polar setting, and nothing calls Polar.

## One list of plans

`src/lib/plan-list.ts` is the only place that says what each plan costs and includes. The landing page, `/upgrade`, `/switch`,
`/llms.txt` and `/llms-full.txt`, the structured data (`src/lib/seo.ts`) and the "locked feature" sheet
(`src/components/plan/LockedFeature.tsx`, the top five lines of Pro and the lines of Academy) all print from it. `src/lib/site-content.ts`
builds `PLANS` from it (adds the `$12` and `/mo` texts); `/upgrade` and `/switch` no longer type their own lists.

Every line has code behind it, and the test says which (`tests/plan-list.test.ts`, "every line of the list has code behind it"): adding a line
without a proof, or leaving a proof for a removed line, fails. What changed against the old pages:

- "Priority support" is gone (no queue or process stands behind it), and so is "Public API & Zapier" (Zapier works through the API and
  webhooks, there is no Zapier app) and "Email & SMS reminders" (SMS goes out only when a server has Twilio set; the line is now
  "Email reminders").
- `/upgrade` no longer repeats "Unlimited students" and "Up to 5 tutors (team)", and no longer shows crossed-out lines; it lists what each plan
  includes, as the other pages do.
- Lines that were true but missing are in: lesson packages, coupons, student subscriptions, waitlist, student import, accounting export,
  custom domain (each is behind `requireFeature('pro')` or `requireApiPlan('pro')`).
- "Payments (PayPal / card)" became "Card payments with Stripe" on Pro and "PayPal payment link" on Free: the PayPal link is a Settings field
  on every plan, only the card route (`api/stripe/checkout`) asks for Pro.
- The sign-up page said "Free forever for up to 5 students" while the Free plan allows 10 (migration 012): it now prints the first line
  of the Free plan.

## A signed-out visitor who presses "Go Pro" or "Start Academy"

The two buttons go to `/upgrade?plan=pro` or `/upgrade?plan=academy` (Free goes to `/register`).

1. `src/proxy.ts`: signed out on `/upgrade`, the visitor goes to `/register?plan=<plan>`, not to a blank sign-in. Only the exact words `pro`
   and `academy` are kept (`parsePaidPlan`); every other parameter is dropped; a bare `/upgrade` still goes to `/login`. A signed-in tutor
   who opens `/register?plan=` or `/login?plan=` goes on to `/upgrade?plan=`; without a plan, to the dashboard as before.
2. `src/app/(auth)/register/page.tsx`: says which plan was picked, keeps it in the "Sign in" link, and carries it on: email sign-up goes to
   `/onboarding?signup=1&plan=<plan>`; the Google button leaves `/upgrade?plan=<plan>` in the short-lived hand-off cookie
   `tutafy_oauth_next` that `/auth/callback` already reads (a new tutor then goes to onboarding with the plan; an existing tutor goes straight
   to `/upgrade?plan=`). `src/app/(auth)/login/page.tsx` does the same for a tutor who already has an account.
3. `src/app/onboarding/page.tsx`: reads the plan before it rewrites the address, and the last step shows "Continue to Pro" (to
   `/upgrade?plan=pro`) above "Go to Dashboard".
4. `/upgrade?plan=`: names the pick above the cards, marks the card "Your pick", and its button leads to Polar with the tutor's email and id
   attached (as before). A tutor already on that plan or above is told so and gets no second payment button.

Also fixed on `/upgrade`: with no checkout address on the server the button used to point at `#` (a dead link); it now says checkout is not
available and gives the support mailbox. "Downgrade" only shows when the Polar customer portal address is set, otherwise the card says to
write to support (Settings has no way to change a plan). `polarCheckoutLink()` in `src/lib/plans.ts` returns `null` when the address is
missing; `polarCheckoutUrl()` keeps its old fall back for `LockedFeature`.

## Cancelling keeps the plan to the end of the paid period

`src/app/api/webhooks/polar/route.ts`, rules in `src/lib/polar-subscription.ts`:

- `subscription.canceled` with paid time left (`ends_at`, else `current_period_end`, in the future): the tutor KEEPS Pro or Academy, and
  `subscription_expires_at` holds the day it ends. Before this the plan dropped to Free the moment the customer asked to cancel.
- `subscription.revoked`: back to Free and the date cleared, always.
- `subscription.canceled` when the paid period is already over: back to Free. With no usable date at all: nothing changes (a warning is
  logged) and `revoked` is waited for.
- `subscription.created` and `subscription.updated`: a status of `canceled` with time left still counts as paid until the end.
- Only the subscription the tutor is on now can change their plan: an older subscription of the same tutor ending (they bought another
  one since) is ignored, instead of dropping the plan they pay for today (`ownsSubscription`). Rows with no subscription id recorded are
  treated as a match.
- The signature rules are untouched (tests: no secret 503, wrong or missing signature or an old timestamp 401, and a forged revoke changes
  nothing).

Tests: `tests/polar-cancel.test.ts` (the real route over a stand-in database, made-up Polar events; each of the cases above, the retry of
the same event, and a mutation check was run: with the old behaviour put back, five of them fail), `tests/plan-list.test.ts` (the list, the
real `/upgrade` and `/switch` pages, the pick, signed out, no checkout address, the portal button), `tests/plan-signup.test.ts` (the real
proxy and `/auth/callback`, the sign-up and sign-in pages).

## Not done

- **Not tried against Polar.** The owner has to test cancel, and the end of the period, in Polar's sandbox: see the hand-over for the steps.
  Polar's documentation is not clear about when `revoked` arrives, which is why a canceled subscription that Polar already marks as ended is
  also dropped.
- **No safety net if `revoked` never comes.** The plan would then stay until a later event. A scheduled check would need a column that says
  "cancelled, ends on" (today `subscription_expires_at` is also written for active subscriptions), which is a migration the owner decides.
- `past_due` and `unpaid` still drop the plan at once (unchanged): whether to give a grace period is the owner's call.
- The environment variables on Vercel (`NEXT_PUBLIC_POLAR_CHECKOUT_PRO`, `NEXT_PUBLIC_POLAR_CHECKOUT_ACADEMY`, `NEXT_PUBLIC_POLAR_PORTAL_URL`,
  `POLAR_WEBHOOK_SECRET`, `POLAR_PRODUCT_*`) were not read; the code never prints them.
- A plan is still recognised by the product name ("academy" in the name is Academy, any other active product is Pro); setting
  `POLAR_PRODUCT_PRO` and `POLAR_PRODUCT_ACADEMY` is not used for that yet.
