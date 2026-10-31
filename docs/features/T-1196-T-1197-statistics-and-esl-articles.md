# T-1196 and T-1197: two blog articles dated 5 Nov 2026

Two new guides for independent tutors, each on its own page and both dated 2026-11-05 in `POSTS` (master has no publish-date filter, so they show as soon as the pull request is merged: merge it on 5 Nov).

## /blog/online-tutoring-statistics (T-1196)

- Body: `src/lib/blog-posts/online-tutoring-statistics.ts` (3,850 words, 3,913 with photo lines). Step 0 (31 Oct 2026): no statistics post existed; `online-tutoring-jobs` already prints the BLS pay line, so here it is one row of a fact sheet and the jobs guide is linked.
- Angle: a dated fact sheet of what we could open (BLS tutors page, Sutton Trust 2026, the Nickow, Oreopoulos and Quan review as listed by Stanford NSSA, Pew teens and AI, a South Korea survey read in a news report), a table of market-size claims we print only to show the spread, and a list of numbers we would not print (a 2016 price, 0.37 against 0.288 for one study, conflicting school-tutoring shares, platform user counts).
- Not opened and marked as such in the text: the EEF page (403), the Sutton Trust PDF (compressed), the Korean ministries' own release, the Fact.MR page (403), NCES pages (connection refused). Every number says how we know it.
- What it says about Tutafy comes from `src/app/(dashboard)/earnings/page.tsx`: own-earnings numbers, no market benchmarks. No statistics about Tutafy tutors are published.

## /blog/esl-speaking-activities (T-1197)

- Body: `src/lib/blog-posts/esl-speaking-activities.ts` (3,864 words, 3,929 with photo lines). Step 0: `how-to-teach-english-online` has the lesson shape and `ielts-speaking-part-2-topics` one exam task, neither has an activity bank.
- Angle: 20 activities rewritten for one student and one tutor, each with level, minutes, preparation and steps, labelled as from a named British Council TeachingEnglish page (read directly on 31 Oct 2026) or as ours; a delayed-correction routine; a worked 60-minute lesson; what Tutafy has (classroom with screen sharing and chat, notes field, recording-link field) and does not have (whiteboard, recorder, activity library).
- Levels and minutes are our suggestions and the text says so.

## Shared

- Photos: 6, from Wikimedia Commons (CC BY-SA 4.0 x3, CC BY 2.0 x2, CC0 x1), in `public/blog/inline/credits.json`; batch lines added to `scripts/_commons-batch.json`. Heroes are drawn by `scripts/gen-blog-images.mjs`.
- Registered at the end of `POSTS`, `HERO_ALTS`, `BLOG_SEO_BASE`, `tests/blog-length.test.ts` and `tests/blog-photos.test.ts`.
- Tests that keep them: `tests/blog-length.test.ts`, `tests/blog-photos.test.ts`, `tests/seo-metadata.test.ts` (title and description length).
