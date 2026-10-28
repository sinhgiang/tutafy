# T-1033: "Learning for", price range and niche pages (stage B of T-1006, step 2)

Built on `docs/niche-design/` (the design samples of T-1006, step 1) and on what already existed: the six directory filters (T-0769, T-0863), `/learn/<language>` (T-0875) and `/find-a-tutor` (T-0897). Nothing of those is rebuilt.

## What it adds

- **"Learning for"** (tutors tick, students filter). Six groups in `src/lib/tutor-groups.ts`: Work and career, Exams, Kids and teens, Travel, University, Conversation. A tutor ticks them in Settings, Profile, "Students you like to teach" (`ProfileSection.tsx`); the choice is stored in `tutors.learning_groups` (migration `029_tutor_learning_groups.sql`, written, NOT run: the owner runs it). The directory reads it in its own query (`directory-data.ts`), so a database without the column lists the same tutors with no groups; the filter and the niche pages simply do not appear until a tutor who can be booked has ticked something. A card carries the ids (`groups` in `CARD_KEYS`) and shows up to three labels; `/tutors?for=work` filters (`for` takes an id from the fixed list; anything else is dropped). The settings save writes the groups apart from the main update, only when changed, so a missing column loses nothing else (`settings-save.ts`).
- **Price range**. `?min=` and `?max=` (whole dollars 0 to 500, a swapped pair is put right, letters and decimals are dropped), two boxes under the four ready-made price groups, which stay as shortcuts. It uses the same approximate dollars as the price groups and the price sort; a tutor with no price is never matched by a range. A filter chip says "From $20", "Up to $30" or "$10 to $30".
- **Niche pages** `/learn/<language>/<group>` (`src/app/learn/[language]/[group]/page.tsx`, rules and guides in `src/lib/niche-pages.ts`). A page exists only while (1) a guide written by hand for that exact pair exists, (2) at least 3 tutors who can be booked teach the language AND ticked the group, (3) it is one of the 3 pairs with the most tutors. Otherwise it is a 404 and its sitemap line goes away. First three guides: English for working professionals, English exam preparation (IELTS and TOEFL), Spanish for travel. A page has: the answer in its first sentences, the tutors of that pair (the same public cards as `/tutors`), four real situations each with a sentence to say, a four-block plan, how to choose, links into the filtered list, four questions, related pages. The language page links to its niche pages. `sitemap.xml` and `/llms-languages.txt` list the same pages (`pickPairPages`), `CollectionPage`, `BreadcrumbList` and `FAQPage` data are built from the text printed.

## Privacy and safety

The pages and the filters read the directory only, with the same fixed list of card keys (one more id list, `groups`). No email, phone, payment field, tutor id or the stored column name reaches a page. A tutor who cannot be booked is on no page. `learning_groups` is public by intent (drawn on the card), like `levels_taught`. The directory cache key is now `tutor-directory-v2` so no copy cached by an earlier deploy (without `groups`) is read.

## Files

`src/lib/tutor-groups.ts`, `src/lib/niche-pages.ts`, `src/lib/directory.ts` (filters), `src/lib/directory-data.ts`, `src/lib/directory-cache.ts`, `src/lib/settings-save.ts`, `src/lib/page-meta.ts`, `src/lib/llms-languages.ts`, `src/app/learn/[language]/page.tsx`, `src/app/learn/[language]/[group]/page.tsx`, `src/app/sitemap.ts`, `src/app/llms-languages.txt/route.ts`, `src/components/directory/DirectoryView.tsx`, `src/components/directory/TutorCard.tsx`, `src/components/settings/sections/ProfileSection.tsx`, `supabase/migrations/029_tutor_learning_groups.sql`, `tests/niche-pages.test.ts` (31 tests), `scripts/mock-supabase.mjs` (sample tutors carry groups).

## Not done

- Nothing is visible on the live site until the directory opens (6 tutors who can be booked; 3 on 28 Oct 2026), the owner runs migration 029, and tutors tick groups. No pages for other pairs: a guide has to be written first.
- `/tutors` does not list the niche pages yet (it lists the language pages).
- Kids and teens, University and Conversation have no niche guide; they only filter.
- The goal question of T-1008 ("what is it for?") on `/find-a-tutor` can now use `for=`, but the form was not changed here.
