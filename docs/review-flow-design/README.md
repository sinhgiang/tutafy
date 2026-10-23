# Real reviews after the first lesson: design options (T-0876)

**Designs only.** Nothing here is imported by the app, reads or writes data, or changes a live page. Every tutor, student, review and number is made up. The owner picks one design for each part before anything is built.

Open `index.html` in a browser (one self-contained file). The buttons at the top switch System, Light and Dark; add `?only=p1a` (any of `p1a p1b p1c p2a p2b p2c p3a p3b p3c`) to see one option alone and `&theme=light|dark` to fix the colours. Each option is drawn twice, on a 1100 px computer frame and on a 390 px phone frame, from the same markup (container queries decide the layout from the frame's own width).

| Part | Option | Idea |
|---|---|---|
| 1. Asking after the first lesson | A | An email with five stars to tap (suggested) |
| | B | A banner in the student portal plus one plain email |
| | C | One yes-or-no question ("Would you book again?"), then the stars; one reminder, then stop |
| 2. The review form | A | One card: stars, tags, a few words (suggested) |
| | B | Three short steps |
| | C | Three ratings (teaching, preparation, communication) and words |
| 3. Reviews and lessons taught on the profile | A | A summary card (average, breakdown, lessons taught), then the reviews (suggested) |
| | B | A line by the name, a Reviews section with tag filters |
| | C | Highlights first: tag counts and quotes, a review with the tutor's reply |

Part 3 also shows each option on the directory card.

## Rules behind all nine designs (for the owner to confirm)

Only a student with a held lesson can review; one review for each student and tutor; a signed link, no account; the tutor may reply once and cannot edit or hide a review; the student may edit for 7 days; the name shown is the first name and last initial; existing reviews stay as they are; the lessons-taught number counts only lessons that were held; Tutafy removes a review only for abuse and says so.

## Rebuild

`node docs/review-flow-design/build.mjs` from the repository root (it uses `react`, `react-dom` and `lucide-react` from `node_modules`; run `npm ci` first). Edit `build.mjs`, never the generated `index.html`.
