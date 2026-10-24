# T-0915: intro video and the "Established" badge on the tutor profile (design A of T-0864)

Built from the design the owner chose at W-2835 (video first, badge beside the name, a card on press), W-2836 (the light badge "Established": automatic, free,
no ID or paper check, never the word "Verified") and W-2837 (the video is a pasted YouTube or Vimeo link, not a file).

## The profile `/tutors/<slug>` (`src/app/tutors/[slug]/page.tsx`)

- **Intro video first** (`src/components/profile/IntroVideo.tsx`): a poster and a play button above the name card. Nothing is requested from YouTube or Vimeo
  until the visitor presses play (no frame, no thumbnail, no script), and a video never starts by itself. After the press, one sandboxed frame is drawn:
  `youtube-nocookie.com` for YouTube, `player.vimeo.com` with `dnt=1` for Vimeo. A line under it says where the video is hosted and links to it.
- **Established badge beside the name** (`src/components/profile/EstablishedBadge.tsx`): a button that opens a card under the name with the four checks and their
  dates, and the sentence "Tutafy does not check IDs, diplomas or qualifications". Drawn only for a tutor who earned it.
- **The rule** (`src/lib/established.ts`, pure): all four of: the sign-in email is confirmed (the date the auth service recorded), the booking page is live, the
  introduction is written (at least 40 characters of text), at least 10 lessons are completed and have started (the date of the tenth is shown).
  `tests/established.test.ts` tests each condition on its own edge. The facts come from `src/lib/established-data.ts`.
- **For people who ask a search engine or an assistant** (`src/lib/profile-answers.ts`): a first sentence (who, what, where, how much), and a short list of
  questions drawn on the page and put in a FAQPage markup from the same list. The question about the video and the one about the badge exist only when true.
  The badge is NOT in the structured data of the profile.
- **Dark theme**: the profile follows the visitor's setting with the directory's stylesheet plus `src/styles/profile-dark.css`; the poster has its own
  always-dark colours (`src/styles/profile-video.css`). Contrast is measured in `tests/profile-dark.test.ts`.

## Where the video link is set and what is checked

- Settings, Profile (`src/components/settings/IntroVideoField.tsx`): paste a link, Save or Remove. The browser explains a wrong link before sending anything.
- `POST` and `DELETE /api/tutors/intro-video` (`src/app/api/tutors/intro-video/route.ts`): same-origin only, signed-in tutor, own row only, 30 calls in 10 minutes.
- **One rule for every place** (`src/lib/intro-video.ts`): https only, the host youtube.com, youtu.be or vimeo.com (also `www.` and, for YouTube, `m.`), a video id of
  the exact shape, no user name, password or port. The address that is SAVED is rebuilt from the provider and the id; the frame address is rebuilt from the
  same two values. The stored text is checked again at display time (it must be exactly the canonical address), and the browser component checks the frame address
  again just before it draws a frame.
- **Content-Security-Policy** (`next.config.ts`): the profile gets `frame-src https://www.youtube-nocookie.com https://player.vimeo.com` and no other directive.
  `tests/profile-csp.test.ts` reads the real config; the policy was also tried in a browser: a frame from youtube.com or example.com is refused.

## The directory cards

A card carries two yes/no facts, `established` and `video` (never the address), and draws an "Established" chip and a "Video" label (`TutorCard.tsx`).

## The database file: written, NOT applied

`supabase/migrations/028_intro_video_and_established.sql` (the owner runs it in the Supabase SQL Editor; safe to run twice):

- `tutors.intro_video_url` with a CHECK that accepts only the two rebuilt forms (so even a direct write by a tutor cannot store another site);
- `tutor_established_facts(ids)`, a function the server's own key alone may call, that returns the email-confirmed date, the number of completed lessons and the
  date of the tenth (it reads `auth.users`, hence SECURITY DEFINER; nothing else leaves it).

Until it is applied nothing breaks: the profile and the directory read both on their own and treat a database without them as "no video" and "no badge"; the
Settings route answers "not available yet" (503). `tests/intro-video-migration.test.ts` runs the file on PGlite.

## Tests

`tests/intro-video.test.ts` (the link rule), `tests/intro-video-route.test.ts` (the route, a second tutor, the database not ready),
`tests/intro-video-migration.test.ts`, `tests/established.test.ts`, `tests/profile-video-badge.test.ts` (the real page and card, the readers, no "verified" word
anywhere), `tests/profile-csp.test.ts`, `tests/profile-dark.test.ts`, and the lists of `tests/public-tutor-scan.test.ts`, `tests/public-tutor-reads.test.ts`,
`tests/rate-limits.test.ts`, `tests/directory-rule.test.ts` and `tests/tutor-profile.test.ts` now name the new reads and the new limit.

## Not done

- An explanatory page behind the badge (the card carries the explanation).
- A VideoObject in the structured data (the video's title, thumbnail and upload date are not known to Tutafy).
- The badge in the dashboard (a tutor cannot yet see how far along they are); the card shows it only to visitors, for a tutor who earned it.
