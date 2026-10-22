# Tutor directory: design samples (T-0764)

Static HTML samples for a `/tutors` directory that lists **only tutors who can be booked**, plus the rule, two read-only count queries and a proposal for the code. **Designs only.** Nothing here is imported by the app, reads or writes data, or changes the live `/tutors` page or `/api/tutors/public`. Every tutor, price and time is made up; each page says so in the dark bar at the top.

Open `index.html`. It links to every page. The pages share colours, type and buttons with the new tutor profile (`../profile-design/styles.css`, T-0761), so that folder must be present.

| File | What |
|---|---|
| `full.html` | The directory, normal state, with search, filters, sort and cards |
| `filtered.html` | Four filters on, the Free times panel open, and a hint that one more tutor matches without "Evening" |
| `filters.html` | All filters in one sheet (phone), the same sheet as a dialog on a computer |
| `few.html` | Only 3 tutors can be booked today: an honest note and a card inviting tutors to join |
| `nomatch.html`, `empty.html`, `error.html` | Filters match nobody; nobody can be booked; the list did not load (and the loading placeholders) |
| `card.html` | The tutor card, its parts, and its variants (no photo and new, no trial, other currency, very long name) |
| `listing-not.html`, `listing-yes.html` | The "Your listing" card in the tutor dashboard: not listed (with what to fix) and listed |
| `bookable-rule.md` | The rule, condition by condition, with why and what the tutor sees |
| `eligible-tutors-count.sql` | READ-ONLY: one row of counts (how many tutors the rule would list, and where the others drop out) |
| `eligible-tutors-by-language.sql` | READ-ONLY: eligible tutors per language |
| `proposed-code-changes.md` | How the code would change. A proposal; nothing was changed |
| `directory.css`, `build.mjs` | Styles and the generator |

`tests/directory-gate-sql.test.ts` runs both queries on a throwaway in-memory Postgres (PGlite) built from every migration, with made-up tutors that each pass or fail one condition, and checks that the two queries share one rule and are read-only.

Add `?shot=full` to a page address for full-page screenshots (the filter sheet then covers the whole page).

## Rebuild

`node docs/directory-design/build.mjs` from the repository root (it uses `react`, `react-dom` and `lucide-react` from `node_modules`; run `npm ci` first). Edit `build.mjs` or `directory.css`, never the generated `.html` files.

## Design notes

- Card: photo (4:3), name and rating, a one-sentence headline, languages, a green **Next available** line in the visitor's time zone, the lowest price, and Book. A tutor without a photo gets a coloured tile with initials; a tutor without reviews gets a quiet "New" pill.
- Phone: the card turns into a small photo on the left and text on the right; filters are one "Filters" button and a sort button; no sideways scroll at 390 px on any page (measured); the filter sheet keeps its buttons in view.
- Words are English only. Prices show the tutor's own currency; the price filter needs a decision (see `proposed-code-changes.md`).

## Built (T-0769)

The owner approved this design (W-2348) and `/tutors` was built from it: see the T-0769 entry of `docs/feature-map.md`. The rule is now code in `src/lib/directory.ts` (the one place), and `tests/directory-rule.test.ts` lists the same tutors with the code and with `eligible-tutors-count.sql` on a throwaway Postgres, so the two cannot drift. What the build does differently from these samples: photos are the initials tile for now (nothing lets a tutor add a photo yet), the price filter uses a table of approximate rates, a page shows 24 tutors then "Show more", there is no "Change" link on the time zone line and no "Turn it off in Settings" switch (that needs a column, which was not added), and the time zone line reads "Times shown in your time zone: ...". These sample pages link `../profile-design/styles.css` (the T-0761 design), which is on its own branch, so on a checkout without that folder they open unstyled.
