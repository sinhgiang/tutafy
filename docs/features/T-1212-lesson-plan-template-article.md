# T-1212: Tutoring lesson plan template (blog article, dated 8 Nov 2026)

The ticket asked for an article on Preply's commission. Step 0 found four posts on that topic already on the blog
(`how-much-does-preply-take`, `marketplace-vs-independent-the-real-math`, `preply-alternatives-for-tutors`,
`how-to-leave-preply-migration-guide`), and Preply's own help page returns 403 to a script, so a fifth post could only repeat
numbers we already print. The ticket's rule for that case is "update the old post and use a reserve article", so this is the
reserve article from the plan: `/blog/tutoring-lesson-plan-template`.

- Body: `src/lib/blog-posts/tutoring-lesson-plan-template.ts`, registered at the end of `POSTS` in `src/lib/blog.ts` (date 2026-11-08), with its hero alt text, its entry in `src/lib/page-meta.ts` and its hero drawn by `scripts/gen-blog-images.mjs`.
- What it says: the six parts of a tutoring session from the National Student Support Accelerator page and the British Council TeachingEnglish planning article (both read directly on 31 Oct 2026), an eleven-line one-page template, four filled-in plans for invented students, a time budget (the minutes are ours and say so), and what Tutafy has (lesson notes, homework, AI Lesson Plan Generator on Pro) and does not have (a template library, a plan that carries over, an exit-check feature).
- Not read: the EEF page and the NSSA toolkit PDF (403 and compressed text); what the article says about them is marked as from search results.
- Four photos (3 CC0, 1 CC BY-SA 4.0) from Wikimedia Commons, recorded in `public/blog/inline/credits.json`; the batch is in `scripts/_commons-batch.json`.
- Tests that keep it: `tests/blog-length.test.ts` (3,500 to 4,000 words) and `tests/blog-photos.test.ts` (3 to 4 photos with author, licence and link).
- Changed in place: `how-much-does-preply-take` got one paragraph on the tiers we cannot verify and `updated` 2026-10-31; `real-hourly-rate-for-tutors` links to the new post.
- Not done: no Preply commission post (see above); master has no publish-date filter, so the article shows as soon as the pull request is merged; merge it on 8 Nov.
