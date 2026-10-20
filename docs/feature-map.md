# Feature map

Tutafy: booking, lessons and payments for private tutors (Next.js 16, Supabase, Polar for plans).

## Features

- Tutor settings (profile, booking page, payments, plan): `src/app/(dashboard)/settings/page.tsx`; the tutor opens it from the sidebar "Settings", Payments tab (`/settings?tab=payments`).
- Card payments through Stripe Connect (Pro plan): `src/app/api/stripe/connect/` (`onboard` starts onboarding, `status` says whether Stripe is switched on); on/off logic and customer wording in `src/lib/stripe/availability.ts`; plan gate in `src/lib/api-guard.ts`.
- Student booking and paying: `src/app/book/[slug]/BookingForm.tsx`; the student gets there from the tutor's public booking link `/book/<slug>`. Card checkout: `src/app/api/stripe/checkout/route.ts`, `src/app/api/subscriptions/checkout/route.ts`.
- Plans and gating: `src/lib/plans.ts`, `src/lib/guard.tsx`; upgrades go through Polar (`/upgrade`).
- Operator-only admin area: `src/app/(admin)/admin/` (may name environment variables; customers never see it).

## Run and check

- Open it: `npm run dev`, then http://localhost:3000. Needs `.env.local` with the Supabase settings (copy `.env.example`; never commit it).
- Test account: none recorded yet. A Pro test tutor is needed to see the Settings > Payments > Stripe box; ask the owner for a throwaway account. Do not use a real tutor's login.
- Main flow to go through: sign in as a Pro tutor, open Settings, Payments tab, look at the Stripe Connect box. With `STRIPE_SECRET_KEY` unset it shows "Card payments are not available yet. Please use the PayPal link above."; with it set it shows the "Connect Stripe account" button.
- Tests: `npm test` (node's built-in runner, `tests/*.test.ts`, no browser needed).
- Screenshot: the helme-browser tools against the running dev server, saved as the Helme task asks.
