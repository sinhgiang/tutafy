# What the directory lists on day one: real numbers (T-0764)

The owner ran `eligible-tutors-count.sql` on the real Supabase project "tutafy" on 2026-10-22 and sent the one row it returns. Nothing in the database or the code was changed for this note; it only reads the row.

## The row

| Column | Tutors |
|---|---|
| `tutors_total` | 724 |
| `page_on` | 723 |
| `page_on_named` | 723 |
| `page_on_intro_ok` (introduction of 80+ characters) | 22 |
| `page_on_free_time_14d` (a free time in the next 14 days) | 6 |
| `eligible` (all four conditions) | **1** |
| `eligible_and_priced` | 0 |
| `eligible_and_photo` | 0 |
| `eligible_test_like_accounts` | 0 |
| `page_on_unknown_time_zone` | 0 |

The old number "6" (tutors who ever chose free hours) is replaced by this table. Today the directory would show **1 card**, against the milestone of 30 in the marketplace report.

## How to read it: these are not steps of one funnel

Each column counts one condition on its own, over the tutors with the page on. They overlap, and that matters:

- 723 → 22 is the introduction condition alone. 723 → 6 is the free-time condition alone.
- Of the 22 with a long enough introduction, only 1 has a free time. So 21 have an introduction and no hours.
- Of the 6 with a free time, only 1 has a long enough introduction. So 5 have hours and an introduction under 80 characters.
- Everyone with the page on has a name (723 = 723), and the time zone is never the problem (0 unknown).

```
                      has a free time (6)
                      yes             no
introduction  80+     1  (listed)     21  (one step: add hours)
              < 80    5  (one step: write an intro)     696
```

(696 = 723 − 1 − 21 − 5.)

So the biggest single drop is not the introduction. Taking the introduction rule away would list 6 tutors, not 22. Taking the free-time rule away would list 22 tutors, but they would be tutors nobody can book, which breaks the promise of the directory. Both conditions are missing for 696 of 723 tutors (96%). The tutors who are one step from a card are 26 (21 + 5); with the one already listed, 27 is the most the directory could reach before a new tutor does both steps. That is a ceiling, not a forecast: nothing here says how many of the 26 will act.

The funnel is also consistent with the earlier finding (K-0102 of the Brain): 632 of the 724 tutors signed up more than 30 days ago and have no real student; only 6 ever chose free hours. The 6 here are the same kind of tutor.

## Where the code may differ from the query

The query counts a slot with the tutor's `default_lesson_duration` (60 if none). The built directory (`src/lib/directory.ts`, T-0769) counts it with the first lesson length the booking page selects, and does not let a lesson given to a team member block the owner. The two agree on the made-up tutors of `tests/directory-rule.test.ts`; on 724 real tutors the code could list a different number than 1 (this has not been measured). The honest check is to open `/tutors` once it is live.

## The one tutor who passes: what a missing price does

The tutor who passes has no price and no photo (`eligible_and_priced = 0`, `eligible_and_photo = 0`). The rule does not require either, so the card appears, and:

- The card shows the initials tile instead of a photo and, where the price goes, the grey line "Ask for price" (`src/components/directory/TutorCard.tsx:72`).
- Under "Price: low to high" and "Price: high to low" the card goes last. With any price filter on ("Up to $15" and so on) the card is not shown, because a tutor with no price is in no bucket (`src/lib/directory.ts`, `approxUsd` and the price sort).
- The profile completion score used to rank the card is lower (a price is worth 1 of 4 points); with one card there is nothing to rank.
- A student can still book. The booking route saves the lesson with no price (`src/app/api/bookings/route.ts:153-161`: a price is set only when `default_lesson_price` exists) and the booking form shows no price line (`src/app/book/[slug]/BookingForm.tsx:109`). So the student books a lesson without seeing what it costs, and the tutor gets an unpriced lesson. That is the real cost of the missing price: it hurts trust at the moment of booking, not the listing.
- If the rule required a price, the directory would list **0** tutors today (`eligible_and_priced = 0`). Requiring a photo would also list 0.

## Three ways to launch (the owner chooses)

Counts use only the row above. Where the row cannot tell, the range is given and no single number is invented.

### Option 1: keep the rule, open the directory as built, and ask the 26

- Cards on day one: **1**. The page shows its "few tutors" note and the card inviting tutors to join.
- Nudge the 21 tutors who have an introduction and no hours ("add your free hours") and the 5 who have hours and a short introduction ("write two more sentences"). The "Your listing" card on the tutor dashboard already says which step is missing; the welcome series (T-0737) is built and off. Sending an email to real people is the owner's decision, separate from this choice.
- Ceiling about 27 if all of them act. A directory with one card looks empty to a stranger.

### Option 2: lower the introduction rule (80 characters → about 30, or none)

- Cards on day one: **between 1 and 6**. At the extreme (no introduction rule) it is exactly 6, because 6 tutors have a free time and everyone has a name. How many of the 5 have 30 to 79 characters is not in the row; one more read-only query would tell.
- It adds at most 5 cards, each with a thin introduction, and does nothing about the 696 who have neither hours nor an introduction. It lowers the quality of the first cards for a gain of 5. Not recommended.

### Option 3 (chosen by the owner at W-2547, built in T-0803): keep the rule, show cards only from N listed tutors, and nudge the 26 first

- Until N tutors are listed (suggest **N = 6**, the number below which the page already calls the list "few"), `/tutors` shows the existing empty state ("No tutors have open times right now", `src/components/directory/DirectoryView.tsx:176-179`) with its invitation for tutors, and no cards. Today that shows **0 cards** (1 is under 6); the page does not look half empty and does not put one unpriced, photo-less tutor in front of strangers.
- It is a small change, not a rewrite: `stateOf` (`src/lib/directory.ts:430`) would return `empty` when fewer than N tutors are listed, plus a test for the boundary (5 and 6 listed). The single listed tutor keeps their own booking link and profile page. The empty wording may need a sentence saying tutors are joining; that is a design detail for when it is built.
- The directory opens by itself when the 6th tutor qualifies. Reaching 6 needs 5 more of the 26 tutors who are one step away, about one in five of them.
- The milestone of 30 is far (27 is the ceiling today), so the plan is to nudge in the same week and look at the count again after a week.

## Decisions for the owner

1. Option 1, 2 or 3 above (and the N for option 3, if not 6).
2. Whether to send the nudge to the 26 tutors (an email to real people; separate from this choice and not done here).
3. A price is not required (as proposed). The cost of requiring it today is a directory with 0 tutors.
