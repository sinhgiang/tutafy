# "Find me a tutor" and the Verified badge: design options (T-0864)

**Designs only.** Nothing here is imported by the app, reads or writes data, or changes a live page. Every tutor, price, rating and time is made up. The owner picks one design for each part before anything is built.

Open `index.html` in a browser (it is one self-contained file). The buttons at the top switch System, Light and Dark; add `?only=p1a` (any of `p1a p1b p1c p2a p2b p2c`) to see one option alone and `&theme=light|dark` to fix the colours. Each option is drawn twice, on a 1100 px computer frame and on a 390 px phone frame, with the same markup (container queries decide the layout from the frame's own width).

| Part | Option | Idea |
|---|---|---|
| 1. Find me a tutor (3 suggested tutors you can book today) | A | One screen: the form, and the three tutors beside it (suggested) |
| | B | One question at a time, then the three tutors |
| | C | A sentence with blanks the student completes |
| 2. Verified badge and intro video on a profile | A | Video first, a "Verified" badge by the name that opens an explanation |
| | B | Photo first, a "Verified by Tutafy" panel listing the checks with dates, the video in About (suggested) |
| | C | A Photo and Video switch on the picture, a "Verified" ribbon on it |

Part 2 also shows each option on the directory card.

## Decisions that are not design (for the owner)

- What "Verified" means. Light: email confirmed, booking page working, introduction written, 10 lessons held (automatic, free, says "Established"). Standard (drawn): identity checked from a government ID, email confirmed, 25 lessons held. The ID check is done by hand (free, slow) or by a provider (a fee for each check). The word "Verified" is not written in the product until the check exists.
- The intro video: a link to YouTube or Vimeo (suggested: no storage cost) or an upload to Tutafy (storage and bandwidth cost, size limits).

## Rebuild

`node docs/find-tutor-design/build.mjs` from the repository root (it uses `react`, `react-dom` and `lucide-react` from `node_modules`; run `npm ci` first). Edit `build.mjs`, never the generated `index.html`.
