# T-1252: the six directory filters, checked end to end

The ticket asked for a filter bar on `/tutors` by language, price range, free hours, time zone, student level and trial lesson, done on the server, with a shareable address and a useful "nobody matches" state. **All of it was already built** (T-0769 language, price, free times, trial; T-0863 level, time zone, "within 3 hours of me"; T-1033 price range). This ticket changes no app code. It adds one test file that holds the six together, and this note.

## The six and their address parameters

| Filter | Address | Notes |
|---|---|---|
| Language | `?lang=spanish` | any case; a tutor who teaches two languages matches both |
| Price range | `?min=25&max=35` | dollars an hour, either end optional, swapped ends are put right, other currencies at approximate rates, a tutor with no price is in no range. Ready-made buckets: `?price=15-30` |
| Free hours | `?when=3days&tod=morning` | read on the clock of the zone in the address |
| Time zone | `?tz=Europe/London&near=1` | `tz` is a setting (filters nobody); `near=1` keeps tutors whose clock is within 3 hours of it |
| Level | `?level=beginner` | a tutor who has not chosen a level is not matched |
| Trial lesson | `?trial=1` | only `1` turns it on |

The rules live in `src/lib/directory.ts` (`parseFilters`, `applyFilters`, `relaxations`); the page `src/app/tutors/(directory)/page.tsx` reads the address and `DirectoryView` is rendered on the server with those filters, so the filtered list is in the HTML itself. Without `?tz=` the day and time-of-day filters wait for the browser's zone (the server will not guess one); a shared link that names `tz` filters on the server.

## When the list is short or empty

- Fewer than 6 tutors can be booked (today: 3): the directory is closed. Any address, filtered or not, shows "The tutor directory opens soon" with the two links for tutors, and no card or tutor data.
- Open but nobody fits: "No tutors match these filters", what was asked for, up to two "removing X (n tutors)" buttons (the filters whose removal brings tutors back, best first) and "Clear all filters". The title, search box and chips stay, so the page is never blank.

## Test

`tests/directory-six-filters.test.ts` (in `npm test`): each of the six alone through the real page over a stand-in database of eight made-up tutors; all six together (the result is exactly the overlap of the six alone); the address round trip; an empty list for each kind of reason with its way back; made-up values for every parameter; nothing private in a filtered page; the closed directory with filtered addresses. Seven deliberate breaks of the filter code (trial, level, near, lowest price, language, free hours, the closed state) each turned it red.

## Not done

- No new filter and no paging of the filtered list on the server (first 24 cards, "Show more").
- A closed-directory screenshot was not taken from the running app: the page build embeds the mock database address, so the closed state is covered by the test only.
