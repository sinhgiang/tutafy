# T-0896: the tutor directory, the tutor profile and the language pages: measured, and the cheap slow spots fixed

The three public page types were measured before and after on this machine (a production build, `next start`, and a pretend Supabase over made-up data: 40 tutors, six languages), then the clear, cheap slow spots were fixed.

## What was changed

- `src/app/tutors/[slug]/page.tsx`: the profile asked for about nine things one after the other (the tutor, lesson lengths, the plan, the "Made with" setting, reviews, lesson count, hours, blocked days, lessons). After the tutor row, the four chains now run together (lengths then free times, the "Made with" line, reviews then per-student lesson counts, the lesson count). Every chain keeps its own rule for a failed read (no times, no counts, never a page error). The hero photo is asked for with `fetchPriority="high"` and `decoding="async"` (it is the largest thing on a phone when a tutor has a photo).
- `src/lib/profile-data.ts`: `loadFreeTimes` starts its three reads (weekly hours, blocked days, lessons) together and judges them in the old order: no weekly hours is still "none" even if another read failed or the admin key is missing, a blocked-days table that does not exist yet still gives times, any other failure is "unknown".
- `src/lib/directory-data.ts`: the four reads of each group of tutors (lesson lengths, levels, blocked days, lessons) go out together. A failed read still throws (the page then says "could not load", never an empty list).
- `src/components/directory/TutorCard.tsx`: the photo link no longer has an `aria-label` that disagrees with the text on it (Lighthouse "label-content-name-mismatch" failed on the directory and on every language page). Its name is now its own content: a hidden sentence "View <name>'s profile", the photo and the trial badge. The initials tile is `aria-hidden`.
- `tests/perf-reads.test.ts`: the reads are shown to start together with a pretend database that only answers once all of them have started (it fails on the old code), the old order of judgement is kept, a failed read still throws, the card link has no label, and the photo keeps its priority.

## Numbers (before, then after)

Setup: production build, Chrome of Helme, the pretend database adds 40 ms to every read. "Phone" is a 390 px viewport at 4x CPU slowdown, "Desktop" is 1440 px with no slowdown. Network throttling cannot be used in Helme's browser (it is switched off while the address list is on), so the phone numbers are on a fast local link; the page weights below say what a slow link would pay.

| Page | Phone LCP | Desktop LCP | CLS | Lighthouse (accessibility, best practices, SEO) and failed audits |
| --- | --- | --- | --- | --- |
| Directory `/tutors` | 568 ms, then 600 to 652 ms (noise of the tool, no change in this code path) | 88, then 116 ms | 0.014 and 0.014 (phone), 0 and 0 (desktop) | 100, 100, 100; 1 failed audit, then 0 (phone and desktop) |
| Profile `/tutors/<slug>` | 568, then 320 ms | 496, then 240 ms | 0, 0 | 100, 100, 100; 0, then 0 |
| Language `/learn/<language>` | 176, then 176 ms | 68, then 84 ms | 0, 0 | 100, 100, 100; 1 failed audit, then 0 (phone and desktop) |

Server time with the same pretend database (40 ms a read):

| What | Before | After |
| --- | --- | --- |
| Profile, document download (median of 9) | 442 ms | 160 ms |
| One cold build of the directory list (40 tutors in 2 groups; median of 5) | 788 ms | 514 ms |
| Directory and language page, list in the cache | 10 to 19 ms | 10 to 15 ms |

Total blocking time was 0 to 94 ms and layout shift 0 to 0.014 on every page, before and after. The Lighthouse performance score is not given by the tool Helme has (it leaves performance out), so no performance score is claimed.

Weight of a page (gzip, 40 tutors): directory document 20 KB with 24 cards drawn, language page 17 KB, profile 13 KB; styles 26 KB; scripts about 200 KB (650 KB unpacked) on every page, most of it React and Next.

## Not changed, and why (proposals)

- Scripts: about 200 KB gzip on every public page. The root layout loads the toaster (sonner, about 10 KB gzip), the install banner, the cookie banner and two tracking components on every page. Loading the toaster late is not safe as it stands: a toast fired as a page opens (Settings does) would be lost. A ticket should split the layout into a public and an app part.
- Photos: only the directory card (lazy) and the profile hero (now high priority) draw a tutor photo. They are plain `<img>` of any https address the tutor gave, so they could not be measured here (the pretend data has no photos) and `next/image` would need every host listed. The size a tutor uploads is the thing to look at on the real site.
- Real database latency: not measured. The numbers above use a fixed 40 ms a read to show how many reads wait for each other; the real site is the place to read the real figure.
