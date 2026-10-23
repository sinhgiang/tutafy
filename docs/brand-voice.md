# Tutafy brand voice (draft from the existing copy, T-0843, for the owner to approve)

Every word a visitor reads on a public page, in the app, in an e-mail, in an FAQ answer or in a blog post follows this file. Product text is English only (see `product-ui-english-only`); the owner reads reports in Vietnamese, the customers read this.

## Who speaks to whom

A small team that runs its own tutoring-tech business, talking to an independent online tutor (or the owner of a small centre) who is good with technology, has tried three tools already, and is wary of anything that sounds like a sales page. Customers are mostly in the US and Europe.

## How it sounds

- Short and direct, like a colleague in the trade. One idea per sentence. Say the number, the price or the step.
- Concrete before clever. "0% commission on every plan" beats "keep more of what you earn".
- Honest about limits. If something is not there yet, say so (the customer-stories page says there are no stories until a tutor agrees to one).
- Warm, not gushing. No exclamation marks, no emoji used as icons.
- The answer comes first. The first one to three sentences of a page answer the question the visitor came with; the detail follows.

## Words to use

tutor, student, lesson, booking, your link, your students, your money, free, flat fee, 0% commission, cancel anytime.

## Words never to use

revolutionary, unleash, seamless, elevate, supercharge, game-changer, cutting-edge, leverage, empower, unlock, streamline, effortless, next-level, world-class, best-in-class, robust, delve, "journey" (as a word for the tutor's work), "transform your", "take your business to the next level".

(Searched for in all of `src/` on 2026-10-23: none of them is on a public page or in a blog post. The only customer-visible hits are "unlocks instantly" and "unlock {plan}" in the upgrade sheet of the tutor app, `src/components/plan/LockedFeature.tsx`; prefer "turns on" there when that sheet is next edited.)

## Two right, two wrong

Right:

- "Share one link. Students see your real availability in their timezone and book. No emails, no double-bookings."
- "Never. Unlike marketplaces, Tutafy takes 0% of what your students pay you, on every plan."

Wrong:

- "Unlock a seamless, next-level booking experience that empowers your tutoring journey."
- "Our revolutionary all-in-one solution transforms the way you teach!"

## Where the facts live (one place each)

Prices, plan limits and the FAQ: `src/lib/site-content.ts`. Titles and descriptions of every public page: `src/lib/page-meta.ts`. Structured data: `src/lib/seo.ts`. `/llms.txt` is built from those, so a fact is written once.

## Open

The owner approves this voice at the design review. Until then it is a description of what the site already does, not a new direction.
