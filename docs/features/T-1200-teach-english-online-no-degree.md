# T-1200: How to teach English online, rewritten around "without a degree" (blog article, dated 7 Nov 2026)

The post `/blog/how-to-teach-english-online` has been live since 8 Jul 2026. The ticket asked to update it, not to write a new one, for the search cluster
"teach english online without a degree" (about 210 searches a month, difficulty 9, OpenSEO, US, 31 Oct 2026).

Step 0 (overlap on master, 31 Oct 2026): `online-tutoring-jobs` compares every hiring route, `tutor-resume` and `how-to-write-a-tutor-bio` are the documents,
`how-to-choose-a-tutoring-niche` is niche choice. This rewrite keeps the English-teaching journey and has one angle of its own: the degree question, answered platform
by platform for English teachers, with what a certificate really is (CELTA, CertTESOL) and how to build proof with no degree, certificate or experience. It links to
those guides instead of repeating them.

- Body: `src/lib/blog-posts/how-to-teach-english-online.ts` (the old text moved out of `src/lib/blog.ts`, where the post now only carries `content: TEACH_ENGLISH_ONLINE_CONTENT`). `date` is 2026-11-07, as the calendar asked, and there is no `updated` (a test refuses an `updated` in the future or before `date`); the text says it was first published in July 2026 and rewritten on 7 Nov 2026. The post's `<title>` and description are in `src/lib/page-meta.ts`.
- Sources, all read on 31 Oct 2026 (full list in the header of the body file): Cambly (support page and tutor page), Verbling, AmazingTalker, Cambridge English CELTA, Trinity CertTESOL, TESOL International Association list page, US Bureau of Labor Statistics. Preply and italki answered 403 to a script, so those facts are marked as from search results of the official pages. Engoo (empty page), Wyzant (403) and the British Council (timed out) could not be read, and the article says so.
- Dropped from the old text because it could not be sourced: earning figures for English tutors, "exam prep pays most", "SMS reminders", "student portal", "CEFR levels kept in Tutafy". What it says about Tutafy comes from `src/lib/plan-list.ts`, `src/components/directory/DirectoryView.tsx` and `src/components/VideoRoom.tsx`, and it lists what Tutafy lacks (no students sent, no whiteboard, no qualification check).
- Four photos from Wikimedia Commons (2 CC BY-SA 4.0, 1 CC BY-SA 3.0, 1 CC BY 2.0), recorded in `public/blog/inline/credits.json`; the batch is in `scripts/_commons-batch.json`.
- Tests that keep it: `tests/blog-length.test.ts` (3,500 to 4,000 words), `tests/blog-photos.test.ts` (3 to 4 photos with author, licence and link) and `tests/marketplace-rates.test.ts` (the post states Preply and italki rates, so it carries the "Rates checked" note). In that last test the `updated` check became a floor on the modified day (T-1212 made a similar change on the same line) and only the rates note is held to the "two official links" rule, so a post may also list the pages it read.
- Not done: master has no publish-date filter, so the rewrite shows as soon as the pull request is merged; merge it on 7 Nov. The page's hero drawing is unchanged (it still fits). No Updates entry (see the hand-over).
