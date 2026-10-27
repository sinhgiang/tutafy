# T-1006 (stage B): filters and niche pages, design samples

**Designs only.** Nothing here is imported by the app, reads or writes data, or changes `/tutors` or `/learn`. Open `index.html`. Rebuild with `node docs/niche-design/build.mjs` (edit `build.mjs` or `niche.css`, never the generated `.html`). Add `?shot=full` for full-page shots and `?sheet=0` to hide the phone sheet.

## What already exists (so nothing is built twice)

Checked in the code on 27 Oct 2026. All six filters of the stage B list are live on `/tutors` (T-0769, T-0863):

| Filter | Where |
|---|---|
| Language | `?lang=` |
| Price | `?price=` four ready-made groups (`PRICE_BUCKETS` in `src/lib/directory.ts`) |
| Free times | `?when=`, `?tod=` |
| Time zone | `?tz=`, and `?near=1` (within 3 hours) |
| Level | `?level=` (needs migration 026, written, run by the owner) |
| Trial lesson | `?trial=1` |

Language pages exist too (T-0875): `/learn/<language>` for the languages with a written guide and at least 3 bookable tutors. The directory itself stays closed until 6 tutors are listed (today: fewer), so no card and no page of this kind is on the live site yet.

## What this design adds

1. **Learning for** (filter): Work and career, Exams, Kids and teens, Travel, University, Conversation. Tutors tick the groups they enjoy teaching (Settings, Profile, like the levels). Shown only while at least one listed tutor ticked one, as the level filter is. Needs a new tutor column (see below).
2. **Price range**: two boxes, From and Up to, beside the four ready-made groups, which stay as shortcuts. A range says exactly what is meant; the groups only approximate it.
3. **Niche pages**: `/learn/<language>/<group>`, for example `/learn/english/working-professionals`. Language and group together, so the page answers a question the language page cannot ("a tutor who will work from my real emails and meetings"). Sections: the answer in the first sentences; the tutors who teach that language AND ticked that group; what you actually practise (four real situations with a sample sentence); an eight-week plan; how to choose; links into the filtered directory; four questions; related pages.

### Rules that keep the niche pages from being doorway pages

- A page exists only while at least 3 bookable tutors teach that language and ticked that group, and a guide written by hand for that pair exists. At most 3 niche pages at first. Otherwise the address is a 404 and the sitemap line goes away by itself (the same `pickLanguagePages` pattern as T-0875).
- No shared paragraph between two pages: the test compares every pair, as `tests/language-pages.test.ts` does for languages. A pair without its own guide gets no page, however many tutors it has.
- The value of the page that no other page has: the live list of real tutors, the real price range, the real earliest free times, plus a plan and sentences written for that group.
- The language page links to its niche pages; the niche page names its language page in the breadcrumb.

## What the owner decides

- Approve the two new filters and the niche page layout, or ask for changes.
- Run a new migration (not written yet, nothing is touched until approved): a column on `tutors` for the groups a tutor ticked, with a check on the six ids, written as 026 was. Until it is run, the filter stays hidden and no niche page exists.
- Which pairs get a written guide first. Proposed: English for working professionals, English for exams (IELTS and TOEFL), Spanish for travel.

## Privacy

The niche pages read the directory only and draw the same fixed card keys (`CARD_KEYS`); the new group list is one more key made of ids from a fixed list. No e-mail, phone, id or payment field, and no student data, ever reaches a page. A tutor who cannot be booked is on no page.

## Files

`index.html`, `filters.html` (the directory with the new filters, and the phone sheet), `niche.html` (the sample niche page), `niche.css`, `build.mjs`.
