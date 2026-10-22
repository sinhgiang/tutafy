# Public tutor profile: design samples (T-0761)

Static HTML samples for a new `/tutors/<slug>`, and for the profile-completion card and the "About you" editor in the tutor dashboard. **Designs only.** Nothing here is imported by the app, nothing here reads or writes data, and the live pages are unchanged. Every tutor, review and number is made up; each page says so in the dark bar at the top.

Open `index.html`. It links to everything and compares the three variants.

| File | What |
|---|---|
| `a-full.html`, `a-new.html`, `a-free.html` | Variant A, Marketplace: full profile (Pro plan), new tutor with nothing filled in, Free plan (shows the "Made with Tutafy" line) |
| `b-*.html` | Variant B, Personal page: one narrow column made to be shared as a link |
| `c-*.html` | Variant C, Video-first: dark hero, stats strip, section tabs, week grid of times |
| `dashboard-1.html` | Completion card at 40% |
| `dashboard-2.html` | "About you": photo, headline, introduction templates, subjects and levels, intro video, live preview |
| `dashboard-3.html` | Completion at 100% (the card shrinks to one line with the copy-link button) |
| `system.html` | Colours, type, buttons, and the empty, loading and error states |
| `proposed-fields.md` | Fields the real build would need. A proposal; nothing in storage was changed |
| `styles.css`, `build.mjs` | Shared styles and the generator |

Add `?shot=full` to a page address to put the sticky booking bar at the end of the page (used for full-page screenshots); without it the bar floats at the bottom of a phone screen.

## Rebuild

The pages are generated. Run `node docs/profile-design/build.mjs` from the repository root (it uses `react`, `react-dom` and `lucide-react` from `node_modules`, so run `npm ci` first). Edit `build.mjs` or `styles.css`, never the generated `.html` files.

## Design notes

- Same indigo, grey scale and type as the live site (Geist; these samples fall back to the system font). One deliberate change: primary buttons use indigo-600 so white text passes WCAG AA (6.3:1) at every size.
- Photos are flat illustrations that stand in for a tutor's own 4:5 photo. A tutor with no photo gets initials on a soft indigo tile, never a grey silhouette.
- Public pages are light only, like the live ones.
- Phone: no sideways scroll at 390 px on any page (measured); a booking bar with price and next free time stays at the bottom of the screen.
- Plan rule: the "Made with Tutafy" line follows the live rule (T-0717): every Free tutor, and a Pro or Academy tutor until they turn it off. The samples assume no other feature depends on the plan.
