# T-0897: Find me a tutor (`/find-a-tutor`), design option A of T-0864

One screen: five questions on the left, the three tutors that fit best on the right (under the form on a phone, where the button stays in reach). Built from the approved sample `docs/find-tutor-design` (pull request #90, option A).

## What it does

- `src/app/find-a-tutor/page.tsx` (server) reads the directory list (`getDirectory`, the same cached public cards as `/tutors`), reads the answers from the address with the directory's own `parseFilters` and hands both to `src/components/find/FindTutorView.tsx` (client). It also draws the four-question FAQ and its `FAQPage` data from one list (`FIND_TUTOR_FAQ` in `src/lib/site-content.ts`).
- The answers are the directory's filters: language, level, price range, time of day (in the visitor's time zone), trial lesson, and the time zone itself. `formFilters` in `src/lib/find-tutor.ts` keeps only these, so a search word, a day, "near me" or a sort in the address changes nothing silently.
- `findTutors` takes the top three of `applyFilters` in the directory's "Recommended" order. `whyThisTutor` writes up to three reasons and prints one only when it is true of that card (a language or level asked for, a free time that really falls in the chosen time of day, the price range, the trial lesson, then rating and next free time to fill the list).
- With scripts the three tutors follow every answer (the address is kept for sharing); without scripts the form is a plain GET form and the server draws the answer for the address.
- States: three tutors; fewer than three (it says what to drop, with the number of tutors that gives); none (an explained card with "Start again" and "See all tutors"); under six listed tutors (the finder is closed, like the directory, with a link to the list); a failed read (an alert with a retry link and `noindex`, never an empty finder).
- Every answer is a real radio button (a switch for the trial lesson) inside a `fieldset` with a legend, so the keyboard and screen readers work as for any form. The time zone sits in a `details` element.
- Dark: the page uses the directory's `.dir-page` dark scheme (`src/styles/directory-dark.css`); one rule keeps a chosen answer filled in dark (`--dir-chosen`, checked by `tests/find-tutor.test.ts`).

## Added around it (so nothing points at a page that is not there)

- `PAGE_SEO.findTutor` (title, description, canonical), the sitemap, `KEY_PAGES` for `/llms.txt`, the footer link, a link from the directory ("Not sure who to pick?"), and the visitor-journey list (`src/lib/track-path.ts`, path only).
- The registries that list public pages: `tests/accessibility.test.ts`, `tests/seo-metadata.test.ts`, `tests/updates.test.ts`, and the count marker in `docs/feature-map.md`.
- Updates entry 1.18.0 with its picture (`public/updates/find-a-tutor.webp`).

## Tests

`tests/find-tutor.test.ts`: the pick (at most three, only tutors that fit, best first, what to drop), the reasons (only true ones), `formFilters`, the real page over made-up tutors (the three picks, a narrowed list, no match, closed, failed read, nothing private in the HTML, the form markup, the address read like the directory's, title, description, canonical, structured data and FAQ) and the dark contrast.

## Not done

- The sample's "What for" question (travel, work, exam...) is not on the form: a tutor does not say what they teach it for, so no tutor could be matched to it honestly. It needs a field tutors fill in (a separate ticket).
- The sample's "More..." opens a list; here it is a select, which also works without scripts.
- A tutor who has not chosen levels in Settings is not matched when a level is asked for (the directory's rule), so until more tutors choose, "Any" level gives the most results.
