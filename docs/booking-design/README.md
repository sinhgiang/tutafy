# Booking page and tutor profile: redesign (T-0809)

**Design only.** Static HTML samples of the redesigned public booking page (`/book/<slug>`), drawn with the app's own indigo and Geist type. Nothing here is imported by the app or changes a live page. Every tutor, review, price and time is made up (each page says so in the dark bar). Open `index.html`. Rebuild with `node docs/booking-design/build.mjs` from the repository root; edit `build.mjs` or `booking.css`, never the generated `.html`.

Before (the live page today, measured on made-up data): `0-before-1440.png` and `0-before-390.png` in the approval pictures.

| File | What |
|---|---|
| `booking-empty.html` | Main screen: nothing chosen yet |
| `booking-picked.html` | A day and a time chosen, details step open |
| `booking-ready.html` | Details filled, trial lesson on, button ready |
| `booking-dark.html` | Dark theme |
| `booking-new.html` | New tutor: no photo, no price, no reviews, no headline |
| `booking-nohours.html` | No free times: waitlist |
| `states.html` | Loading, free times did not load, a day with no times, form error, booked |
| `design-system.html` | Colour, type, space, buttons, rules for empty, loading, error |

## 1. Design brief

**What is wrong today** (from the live page): the left profile card is short and the page ends in a large empty area under it; the same review sentence repeats; no price, no experience, no headline; the booking steps are a stack of cards in which the details step is faded out until a time is picked; the calendar and the times sit in two cramped columns with a bare "Pick a date"; help text is 11 px and past days are 1.3:1 grey; the time-zone note repeats the tutor's zone in a blue box.

**Who is looking.** Adult learners, and parents booking for a child, in many countries, on a phone about as often as on a computer. Many are not native English speakers and are cautious about paying a stranger. They are not technical.

**What they want in the first 5 seconds**, in this order: Is this person real and good? (photo, name, rating, what they teach) · What does it cost? · Can I start soon? (soonest times, trial lesson) · What if it does not work out? (cancellation). The hero answers the first, the fact strip and the booking card answer the rest, with the booking card visible beside the content at 1440 and one tap away on a phone.

**Layout.** Wide screen: a hero card (photo, name, rating, one-sentence headline, languages, time zone, subject chips, then four facts: price from, lesson lengths, trial, cancellation), then two columns: the profile content (About, packages, reviews, booking and cancellation, questions) and a sticky booking card. The empty area at the bottom is gone because the booking card follows the reader. Phone: hero, then the booking card straight away, then the content; a fixed bar "from $22 · Book a lesson" is always in reach; the fact strip is hidden because the same facts are in the booking card.

**Booking card: three numbered steps** (length, day and time, details). Nothing is greyed out and hidden: step 3 says "Choose a time first. Then you only need your name and email." Before a day is chosen the card shows **Soonest times** (three one-tap buttons), then "or pick a date". After a day is chosen the times appear under the calendar in a three-column grid, in the visitor's time zone, with a "Change" link. Once a time is chosen a summary (day, time, length, price) sits above the button. The button always says what is missing: "Choose a day and time" → "Enter your name and email to book" → "Book 60 min lesson".

**Voice (Tutafy).** A knowledgeable friend who is straight with you. Short, plain sentences. Says what happens and what it costs. No hype, no exclamation marks, no "unlock", "seamless", "world-class". Tutor bios keep the tutor's own words; Tutafy's text around them (labels, buttons, errors, FAQ) follows this voice.
- Use: "Choose a day and time", "You pay the tutor directly", "Free cancellation up to 24 hours before", "Nothing was booked".
- Never: "Amazing!", "Seamlessly book", "Don't miss out!", "Oops!".
- Right: "That time was just taken. Pick another time. Your details are saved." Wrong: "Oops! Something went wrong. Please try again later."
- Right: "No reviews yet. Priya is new on Tutafy." Wrong: "Be the first to leave a glowing review!"
- Interface words are English only. Prices show the tutor's own currency.

**SEO and AEO (for the build).**
- Title `Book <Name> · <Subject> tutor | Tutafy`, description one sentence with price from and trial, one `<h1>` (the tutor's name), H2s for About, Reviews, Booking and cancellation, Questions. Canonical to `/book/<slug>`. (Not checked in this ticket: which of `/book/<slug>` and `/tutors/<slug>` should be the page search engines prefer for a tutor; the build ticket should look at the current meta and sitemap first.)
- Main questions the page answers in plain sentences (and in the FAQ markup): *How do I book a lesson with <Name>? What time zone are the times in? How does the trial lesson work? What if I need to cancel? How much does a lesson cost?* The hero facts and the "Booking and cancellation" block hold the checkable facts (price, lengths, trial, cancellation hours) as text, not in images.
- Structured data: keep the existing Person and ProfilePage; add `FAQPage` only for the questions that are really on the page, `Offer` for the price and trial only when the tutor set them. No aggregate rating unless the existing rule allows it (it does not today). Photo gets real `alt` text.
- Key words (not stuffed): "online <language> tutor", "book a <language> lesson", "<language> trial lesson", "IELTS prep" where the tutor teaches it.

## 2. Design system

See `design-system.html`. Summary:
- **Colour:** the app's indigo (`#4F46E5`, dark `#818CF8`) on a cool off-white page (`#F6F7FB`), white cards, soft indigo for open days and the trial row, green for trial and booked, amber for "new", red for errors. All as variables, so dark is the same names with other values.
- **Contrast** (WCAG formula, computed): text `#111827` on white 17.7:1; secondary `#374151` 10.3:1; quiet `#5B6475` 6.0:1 on white and 5.6:1 on the page; white on brand 6.3:1; brand on soft indigo 5.6:1; green, amber and red text on their soft backgrounds 5.0, 6.4 and 5.7:1; dark theme quiet text 7.5:1, brand on card 5.8:1. The star orange is 3.2:1, used as a shape beside the number only.
- **Type:** Geist (already loaded). Name 30/24 px, section title 18, headline 17/15, body 15 (16 on a phone), help 13, never below 12.
- **Space and shape:** 8 px grid; cards 24 px padding (18 on a phone), radius 16; buttons and inputs radius 12; every target 40 px or more.
- **States:** empty (say what is missing and what to do), loading (grey blocks in the real shape, still when reduced motion is on), error (what happened, whether anything was saved, one button), not filled in by the tutor (section hidden or honest sentence).

Measured on the samples with a real 390 px viewport: no sideways scroll on `booking-empty`, `booking-ready` and `booking-new` (page width 390); the smallest tap target is 40 px (day circles) after the "Show all reviews" link was raised to 44 px.

## 3. What the samples need that the app does not have yet

The profile is built from fields the tutor already has (name, photo, bio, languages, time zone, rating, price, trial, lengths, cancellation hours, hours, reviews, joined date, packages). These parts of the samples need **new optional fields**, so they are a decision for the owner and a later ticket, not part of the first build unless the owner says so:
- **Headline** (one sentence under the name) · **Years teaching** · **Subjects** (the chips) · **Credentials line**. Without them the hero shows name, rating, languages and time zone only, and the chips and the "years" and "lessons taught" items are left out (the "new tutor" sample shows exactly this). "Lessons taught" can be counted from completed lessons, as the existing profile already does.
- **Formatted bio:** the bio today is plain text. The sample shows a bold first line, short paragraphs and a bullet list; a small safe format (bold, line breaks, bullets typed as `- `) would give that without allowing HTML.
- The **Soonest times** buttons reuse the free-times code the profile page already has (`nextFreeSlots`); no new data.
- **Real photo upload** exists (migration 024, T-0766); until a tutor adds one, the initials tile is drawn.

## 4. Where the ideas come from

Checked on the competitors' public help pages (links below). I did not open the competitors' live profile pages, so what I say about their layout comes from those pages and from general knowledge of how these sites look; treat layout claims as ideas, not as measurements.

| Source | Idea taken | Idea left out |
|---|---|---|
| [Preply help: how to book a trial lesson](https://help.preply.com/en/articles/4179487-how-to-book-a-trial-lesson) | The trial is a clear choice made on the tutor's page, once per student, with a length chosen first and then a day and a time. We use the same order: length, then day and time, with the trial as a switch in step 1. | Preply's marketplace search and credit balance: Tutafy tutors are booked directly and paid directly. |
| Preply tutor cards (hover shows availability, per the same help centre and community answers) | Show the soonest free times before asking the student to open a calendar: our "Soonest times" buttons. | Hover reveal: it does not work on a phone. |
| [Wyzant support: availability](https://support.wyzant.com/?p=508) and [profile](https://support.wyzant.com/?p=411) | Availability is shown converted to the student's time zone, and the tutor's cancellation policy may appear on the profile. We show times in the visitor's zone with a "Change" link, and the policy is a fact in the hero and a block on the page. | Wyzant's hourly-rate bidding. |
| General pattern of scheduling pages (a calendar with open days marked, times under it) | Mark open days in tint and closed days plainly; show times as a grid under the calendar, not in a narrow side column; one summary line of what was chosen. | Month-by-month paging as the only way to find a time. |

## 5. Not done in this ticket (on purpose)

No live page, test or migration was changed. The dark theme is drawn but the public pages have no theme switch today; the first build can ship light only and keep the variables ready. A tutor-side editor for the new fields is not designed here.
