# T-1222: Blog posts are public only from their publish day

A blog post is public from the day written in its `date` (YYYY-MM-DD), read in Vietnam time (`Asia/Ho_Chi_Minh`, UTC+7, no daylight saving). From 00:00 that day in Vietnam it is listed and opens; before that it is in no list and its page answers 404.

## Where the rule lives

- `src/lib/blog.ts`: `todayInVietnam`, `isPublished`, `publishedPosts`, `getPublishedPost`, `relatedPosts`, `blogIndexCards`. `POSTS` and `getPost` still hold every post (including the ones waiting); only scripts and tests that count the words of a draft use them (`scripts/count-post-words.mjs`).
- Every public reader goes through the filter: the `/blog` list and its CollectionPage structured data (both built from `blogIndexCards`), the post page (`getPublishedPost`, a post before its day is `notFound()`; `generateStaticParams` builds only the public ones), "Keep reading" (`relatedPosts`), `sitemap.xml`, `llms.txt` and `llms-full.txt` (`src/lib/llms.ts`).
- The "Related guides" boxes inside a post drop a link to a post that is not public yet (a link to a 404 is worse than no link); a box left empty is dropped.

## How the page updates on the day

No daily rebuild and no cron. `/blog`, `/blog/[slug]`, `sitemap.xml`, `llms.txt` and `llms-full.txt` have `export const revalidate = 3600`, so Next rebuilds them about once an hour. A post dated 3 November appears on the first rebuild after 00:00 on 3 November in Vietnam: within about an hour, and for the first visitor after that hour the stale page may be served once while the new one is built. A post whose day has not come is not built ahead (`generateStaticParams`), it is built on its first visit after the day.

## Tests

`tests/blog-publish-date.test.ts`: the day turns at 17:00 UTC; for `online-tutoring-jobs` (3 Nov) and `ielts-speaking-part-2-topics` (4 Nov), on the day before the post is in no list (cards, `/blog` structured data, sitemap, llms, llms-full, related posts, post page) and on its day it is in all of them with its own BlogPosting structured data; a 14-day window proves no public post links a post that is not public; made-up posts prove the link boxes are filtered; a source scan proves no public file reads the raw `POSTS` list and every listing file has `revalidate = 3600`. `tests/seo-llms.test.ts` and `tests/seo-metadata.test.ts` now expect only the posts that are public today.

## Not done

A post goes live within the hour, not at the exact second. If the owner wants the exact minute, a Vercel cron that calls `revalidatePath` at 17:00 UTC would do it; it needs a secret and a route, so it was not added.
