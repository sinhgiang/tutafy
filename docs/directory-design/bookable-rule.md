# Who the directory lists: the "bookable" rule (T-0764)

**Status: a proposal.** Nothing in the code or the database changed. The directory at `/tutors` still lists up to 50 tutors whose booking page is switched on, most of whom nobody can book (724 tutors signed up, 6 ever chose free hours).

**Principle:** the directory is a promise to a stranger: "you can book this person". A card is shown only when the promise is true today. A tutor who is not listed is not hurt: their own booking link and their profile page keep working for the students they send there.

A tutor is listed when **all four** conditions hold. The read-only queries in this folder count the tutors that pass each one.

| # | Condition | How it is checked | Why | What the tutor sees when it fails |
|---|---|---|---|---|
| 1 | **The booking page is on** | `tutors.booking_url_active = true` | The Book button on the card leads to that page. Already the rule today. | "Your booking page is off" with a switch |
| 2 | **A name** | at least 2 characters after trimming spaces | A card with no name looks broken. Registration already requires a name; this only guards blank values. | "Add your name" |
| 3 | **An introduction of at least 80 characters** | `char_length(btrim(bio)) >= 80` | One line such as "English tutor with 5 years experience" (37 characters) tells a student nothing. 80 characters is about one real sentence on who you teach and what a lesson is like. The profile completion bar (T-0761) asks for 200 for full marks; 80 is only the entrance. | "Write an introduction" with the templates of T-0761, and the count so far |
| 4 | **At least one free time in the next 14 days** | at least one slot that starts between 1 hour from now and 14 days from now (see below) | This is the whole point. Without it the card promises a lesson nobody can book. | "Add your free hours" (or "Your next 14 days are fully booked or blocked") |

## What "a free slot" means (condition 4)

It is counted the way the booking page counts it, so a card can never promise a time the booking page does not offer:

1. Take the tutor's weekly hours (`availability`: weekday 0 to 6, start and end, in the tutor's own time zone).
2. For each of the next 15 calendar days in the tutor's time zone, cut each hours row into slots: one slot every **lesson length + buffer** minutes, as long as the whole lesson fits before the row ends. Lesson length is the tutor's first chosen length (`default_lesson_duration`, 60 if none); buffer is `buffer_minutes` (0 if none). This is `getSlots()` in `src/lib/booking-slots.ts`.
3. Remove every day the tutor blocked (`availability_exceptions`).
4. Remove every slot that overlaps a lesson that is not cancelled (`lessons`, with the same overlap rule as the booking route).
5. Keep slots that start at least **1 hour from now** (a slot that starts in ten minutes is not a promise) and at most **14 days from now**.
6. A tutor with at least one slot left passes. The earliest slot is the "Next available" on the card.

A tutor whose time zone is empty or not a real time zone cannot be counted; they are not listed and the count query reports how many there are.

**Left out on purpose:** the old table `blocked_times` (the booking page does not read it), group lessons, and team members' own calendars (a lesson assigned to a team member also blocks the owner's slot in the count; slightly strict, never too generous).

## Not conditions

- **A photo is not required.** The card shows a soft coloured tile with initials, so a tutor without a photo still looks cared for. A photo only helps the ranking (below) and the profile completion bar. If the owner wants a hard rule instead, the count query shows what it would cost (`eligible_and_photo`).
- **A price is not required by the rule**, but the card needs one. Today a tutor without `default_lesson_price` can still be booked, so the card would say "Ask for price" and sort last. The count query shows how many would be lost if a price were required (`eligible_and_priced`).
- **No review count, no plan.** Free, Pro and Academy tutors are listed alike; new tutors with no reviews show a quiet "New" pill.

## Default order ("Recommended")

Listed tutors are ordered by, in this order:

1. has a free slot within the next 48 hours (yes first);
2. profile completeness: photo, introduction of 200+ characters, price, trial lesson (more first);
3. number of reviews (more first);
4. a daily-rotating tie-break (a hash of tutor id and the date), so the same new tutors are not stuck at the bottom and the same tutors do not always lead.

Other sorts: Soonest available, Price low to high, Price high to low, Rating.

## Filters

Language (only languages with a listed tutor, with counts), Price per lesson (Up to $15, $15 to $30, $30 to $50, $50+), Free times (Today, Next 3 days, This weekend; Morning, Afternoon, Evening in the visitor's time zone), Trial lesson offered. The price filter needs a decision because tutors price in their own currency (see `proposed-code-changes.md`).

## "Few tutors" and "empty"

- Fewer than 6 listed tutors (a constant): show the honest note ("We are just getting started... there are 3 today") and an invitation card for tutors. Nothing is padded with tutors who cannot be booked.
- No listed tutor: the empty state, with the same invitation. A tutor who adds free hours appears within minutes (the list is cached for a few minutes).

## What to expect on day one

If the rule were applied to today's real data, the first number is small: the one-row query will say. The funnel columns (`page_on`, `page_on_named`, `page_on_intro_ok`, `page_on_free_time_14d`, `eligible`) show where tutors drop out, which tells the Chief what to nudge first (most likely the free hours, which the dashboard banner of T-0739 already asks for). The milestone in the marketplace report is 30 listed tutors.

## Decisions for the owner

1. Introduction length: 80 characters (proposed). A higher number lists fewer tutors on day one.
2. Photo: not required (proposed). Or required, if the owner prefers a stricter directory.
3. Price: not required by the rule, "Ask for price" on the card (proposed). Or required.
4. Lead time 1 hour and window 14 days (proposed, from the ticket).
5. Fewer than 6 tutors counts as "few" (proposed).
