# T-0962: what Preply and iTalki take, said once and the same everywhere

The numbers, the day they were checked (25 Oct 2026) and the two official links are written once in `src/lib/marketplace-rates.ts`.
Preply: the first (trial) lesson with each new student is kept 100%, then 33% for a new tutor falling to 18% (`PREPLY_RANGE` 18–33%).
iTalki: 0% on a trial lesson, 21% on a single lesson, 19% / 17% / 15% on packages of 5 / 10 / 15 or 20, 30% on a group class
(`ITALKI_RANGE` 15–21% for one-to-one lessons). Both together on an ordinary lesson: 15–33% (`MARKETPLACE_RANGE`).

- Home page (`src/app/page.tsx`): the sentence under "The business side is a mess" (`HOME_MARKETPLACE_SENTENCE`) and the Marketplaces column of
  the comparison table (15–33%), each followed by `<MarketplaceRatesNote />` ("Rates checked 25 Oct 2026. Sources: ..." with both links).
- Switch page (`src/app/switch/page.tsx`): iTalki 15–21% (the calculator starts at the single-lesson rate, 21%), Preply 18–33%, and the same note.
- Blog: a new block type `{ type: 'source' }` (`PostBlock` in `src/lib/blog.ts`, drawn in `src/app/blog/[slug]/page.tsx`) carries the note; `RATES_SOURCE`
  sits under the platform tables of six posts (marketplace-vs-independent, preply-alternatives, how-to-teach-english-online, how-much-does-preply-take,
  tutafy-vs-alternatives, how-to-write-a-tutoring-business-plan). Those posts carry `updated: '2026-10-25'`. FAQ answers that state iTalki's rate
  carry the date in their own words, because FAQ markup is plain text.
- `tests/marketplace-rates.test.ts` renders the home page and a blog page, reads every post and source file, and fails on an iTalki "flat 15%", on
  "20–33%", on a platform table cell that goes back to the old words, on a post that states a platform rate without the note, and when the FAQ markup
  differs from the visible FAQ.

Not changed on purpose: the generic "15–33%" range in the other posts (it is now true for the two platforms together), Wyzant, Cambly, Verbling
and Superprof rates, and every Tutafy number.
