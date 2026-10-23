# T-0875: language pages (/learn/<language>)

Stacked on T-0863 (`helme/directory-filters`, pull request #89): the pages reuse its dark colour scheme (`.dir-page`) and its level filter links, so #89 is merged first.

## What it is

A page of our own for each of the languages that the most tutors who can be booked teach: `/learn/spanish`, `/learn/english`, and so on. Each page has the answer to "how do I find a <language> tutor?" in its first sentences, the tutors who teach that language and can be booked today (up to 12 public cards, the same `TutorCard` as `/tutors`), a guide to how learning that language with a tutor works, four steps for choosing a tutor of THAT language, links into the filtered directory (level, trial lesson, price, evening), four questions with answers, and links to the other language pages.

## When a page exists (`src/lib/language-pages.ts`, `pickLanguagePages`)

Only when BOTH hold: the language has a written guide (`LANGUAGE_GUIDES`: English, Spanish, French, German, Japanese, Mandarin, Italian, Portuguese) and at least `NICHE_MIN_TUTORS` (3) tutors who can be booked today teach it; at most `NICHE_MAX_PAGES` (3) languages get a page, the ones with the most tutors, ties by name. Everything else is a 404: a language with too few tutors, a language with no guide, a made-up address, a directory that is closed (fewer than 6 listed tutors, T-0803). A read that fails shows an error page with `noindex`, not a 404 and not an empty list. The page, the sitemap and `/llms-languages.txt` all ask `pickLanguagePages`, so they cannot disagree; the list of pages therefore follows the real tutors, and a page that stops having enough tutors goes away by itself.

## Content

Each guide is written for its language (what is hard in French pronunciation, Mandarin tones, German cases, Japanese scripts and so on), so no paragraph is shared; `tests/language-pages.test.ts` compares every pair of guides (no shared question or paragraph, and under 6 percent of six-word groups in common), keeps titles within 60 characters and descriptions within 70 to 155, and rejects the words `docs/brand-voice.md` bans, exclamation marks, addresses, phone numbers, price figures and promises of a result. To add a language, add a guide to `LANGUAGE_GUIDES`; nothing else changes.

## SEO and AEO

Title and description are the guide's own (`languagePageMetadata` in `src/lib/page-meta.ts`), canonical is the page on the main site. The page carries `CollectionPage` (with the tutors drawn), `BreadcrumbList` and `FAQPage` data built from the same text it prints, and the first one to three sentences answer the question. It is in `sitemap.xml` only while it exists. `/llms.txt` (built once at deploy) points to `/llms-languages.txt` (`src/app/llms-languages.txt/route.ts`, read about every hour), which lists the pages that exist now with their tutors by name and profile address only. `/tutors` shows "Browse tutors by language" links to the pages that exist.

## Privacy

The pages read the directory only (`getDirectory`, read only) and draw `DirectoryCard`s, a fixed list of keys: never an email, a phone number, an id or a payment field. A tutor who cannot be booked is never on a page. A test renders the real page over rows that carry private fields and checks none appears, and that no write reaches the database.

## Files

`src/lib/language-pages.ts`, `src/lib/llms-languages.ts`, `src/app/learn/[language]/page.tsx` and `layout.tsx` (the stylesheet), `src/app/llms-languages.txt/route.ts`, `src/app/sitemap.ts`, `src/lib/llms.ts`, `src/lib/page-meta.ts`, `src/app/tutors/(directory)/page.tsx`, `tests/language-pages.test.ts`.

## Not done

- Only the guides written above can become a page; a language such as Korean or Arabic needs a guide first.
- No per-language pictures, and no reviews (there is no review system yet).
- The level links on a language page work with the filters of T-0863; before #89 is merged they are ignored by `/tutors`.
- `/llms.txt` is static, so it points to the live list instead of naming the languages.
