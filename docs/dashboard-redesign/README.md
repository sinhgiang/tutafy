# Tutor dashboard: audit and redesign proposal (T-0819)

**Status (T-0820): G1, the shell, is built** (frame, sidebar, top bar, command bar, loading and error states, notice bar, dark theme; see `docs/feature-map.md`, "Tutor app shell"). G2 to G7 are still proposals. The text below is the original audit and proposal (T-0819), written when **no page code was changed**. This folder holds static HTML samples of the redesigned dashboard (open `index.html`; rebuild with `node docs/dashboard-redesign/build.mjs` from the repository root; edit `build.mjs` or `dash.css`, never the generated `.html`). Every name, price and time is made up. Colours, type and corners are the same tokens as the approved public booking page (`docs/booking-design/booking.css`, T-0809), so the booking page and the dashboard read as one product.

Pictures of the real app today (made-up data, from `scripts/mock-supabase.mjs`; one picture per page with 1920, 1440, 1024 and 390 px side by side) are in the Brain, `inbox/screens/toiuuram/T-0819-audit/`: `dashboard, students, student-detail, lessons, lessons-new, lesson-detail, calendar, messages, chat, reports, team, payments, packages, coupons, subscriptions, waitlist, availability, ai, import, referral, developers, settings, upgrade`, and `empty-dashboard, empty-students, empty-lessons, empty-payments, empty-reports` for a tutor with almost no data (the mock's "newtutor" account). The owner's own pictures: `inbox/screens/toiuuram/owner-dashboard-2026-10-23-a.png` and `-b.png`.

## 1. Why the content sits on the left (read from the code)

There is **no page frame**. The layout puts the page straight into `<main>` and never limits or centres it: `src/app/(dashboard)/layout.tsx:35` is `<main className="flex-1 p-4 md:p-7 ...">`. Each page then caps its own root with a fixed `max-w-[Npx]` and **no `mx-auto`**, so a block that is 900 px wide is pinned to the left of a 1690 px area. The same mistake is copied into every page:

| Page (file:line) | Cap | Share of a 1920 screen left empty |
|---|---|---|
| Payments `payments/page.tsx:76` (the owner's picture) | 900 | about 47% of the content area |
| Lessons `lessons/page.tsx:18`, AI tools `AiToolsClient.tsx:117`, Team `TeamClient.tsx:214`, Student detail `students/[id]/page.tsx:39` | 900 | about 47% |
| Reports `reports/page.tsx:103`, Students `students/page.tsx:21` | 1100 | about 35% |
| Settings `settings/page.tsx:224` | 920 | about 45% |
| Developers `DevelopersClient.tsx:52` | 820 | about 52% |
| Messages `messages/page.tsx:65`, Chat `messages/[studentId]/page.tsx:43` | 760 / 680 | about 55% |
| Availability `availability/page.tsx:104`, Lesson detail `lessons/[id]/page.tsx:82` | 700 | about 59% |
| New lesson `lessons/new/page.tsx:123`, Edit lesson `lessons/[id]/edit/page.tsx:119` | 660 | about 61% |
| Coupons `CouponsClient.tsx:68`, Packages `packages/page.tsx:24`, Waitlist `waitlist/page.tsx:24` | 640 | about 62% |
| Student form `StudentForm.tsx:61`, Edit student `students/[id]/edit/page.tsx:79` | 620 | about 63% |
| Import `ImportTool.tsx:73`, Broadcast `messages/broadcast/page.tsx:45` | 600 | about 65% |
| Only these centre themselves: Dashboard `DashboardHome.tsx:439` (1200), Referral `referral/page.tsx:47` and Subscriptions `SubscriptionsClient.tsx:97` (672, `mx-auto`), Upgrade `upgrade/page.tsx:134` | | |

So the answer is yes: a fixed maximum width, not centred, repeated per page, and the layout never provides a frame. The fix is one frame in the layout (section 2), and a test that fails when a page sets its own width cap (ticket G1).

Other layout faults found in the same pass:

- The sidebar is not sticky: `components/layout/Sidebar.tsx:79` is `min-h-screen` inside a normal flex row, so on a long page (Settings, Reports, the chat) the navigation scrolls out of view (visible in `chat.png`).
- From 768 to 1279 px the 220 px sidebar stays open and leaves 800 px or less; there is no icon rail.
- The page title in the top bar is wrong for eight pages: `components/layout/Header.tsx:75` falls back to the word "Tutafy" when the path is not in `PAGE_LABELS` (Messages, Packages, Coupons, Subscriptions, Waitlist, Import, Refer and earn and Upgrade all read "Tutafy > Tutafy").
- Two floating cards (the cookie notice and the "Enable notifications" prompt) sit at the bottom right and cover table rows, and on a phone they cover half of the first screen (`dashboard`, `students`, `settings` pictures at 390).
- Text is too small and too faint: 225 uses of 9 to 11 px text and 343 uses of `text-gray-300` or `text-gray-400` for text in the dashboard files (about 1.5:1 and 2.6:1 on white; the booking design needs 4.5:1).
- There is no `loading.tsx`, `error.tsx` or `not-found.tsx` anywhere under `src/app` except the public directory, so a slow or failing page shows nothing or the framework's error screen.
- No dark theme (no `dark:` class in the dashboard files), no keyboard shortcuts or command bar (the only key handling is in the chat box and the notification sound unlock), no search except on the dashboard home ("Search lessons").

## 2. Layout rules (one frame, four page types)

See `layout-rules.html` for the drawings. Summary:

0. **The frame, for every page.** Sticky sidebar 232 px (icon rail 64 px from 768 to 1279 px, a bottom tab bar below 768 px). Sticky top bar 56 px. The content sits in one frame in the layout: `max-width 1440px; margin: 0 auto`, side padding 32 / 24 / 16 px. Pages never set their own width, except the narrow flows below. At 1920 px the frame leaves about 120 px on each side, evenly; at 1440 it fills the area.
1. **Overview and charts** (Dashboard, Earnings, Reports): a 12-column grid. KPI cards span 3, the main chart 8, a ranking 4, a table 12. Under 1280 px KPIs are two across and charts stack.
2. **Tables and lists** (Students, Lessons, Waitlist, Coupons, Packages, Subscriptions, Team): the table uses the whole frame; a sticky toolbar (search, filters, sort, export); a bulk bar on selection; from 1280 px a row can open a side panel; under 768 px rows become cards.
3. **Forms and settings** (Settings, Availability, Import, and so on): a sticky section list on the left, the form in a readable 720 px column, a live preview or help on the right from 1440 px (for Settings: the booking page as a student sees it). The group is centred. One-step flows (add a student, new lesson, Upgrade) are one centred column of 720 px.
4. **Workspaces** (Calendar, Messages): fill the frame height. Calendar: week view by default on a computer (the app has only a month grid today), day list on a phone, mini month and "today" column on the right. Messages: three panes (list 320, thread, student card 300 from 1440 px).

## 3. Page by page

States are Empty / Loading / Error as asked for in the brief. "No" means the page has none today (there is no `loading.tsx` or `error.tsx` anywhere in the dashboard, so Loading and Error are missing on **every** page and are not repeated below; Empty is listed where it exists).

| Page | Layout faults | Empty state today | Missing for a modern product | Proposed |
|---|---|---|---|---|
| Dashboard | centred 1200, good; setup cards stack tall and push real content (lessons, money) below the fold; two floating prompts over it | yes (setup cards) | no "today" agenda, no income snapshot, no quick actions | Overview grid: today's lessons, this month's earnings with trend, unpaid, new messages, next steps card that collapses when done |
| Students | 1100 cap, left; table scrolls sideways at 390; columns truncated (goals) | yes | no search (the `Search` icon is imported and unused), no filters, no sort, no tags filter, no bulk, no export, no paging (loads every student, `students/page.tsx` selects `*` with no limit), no last or next lesson column, no money owed | `students.html` sample: tabs, search, filters, sort, bulk bar, export, paging, next lesson and owes columns, cards on phone |
| Student detail | 900 cap; lessons list limited to 10 with no "see all" | partly | no timeline of notes, payments and messages in one place, no quick "schedule lesson" | Two columns: profile and notes left, timeline right; side panel from the list |
| Lessons | 900 cap; upcoming and past stacked | yes | has bulk "mark paid" (good); no filters by student, status, date, payment; no calendar toggle; no export | Table with filters and the same toolbar |
| New and edit lesson | 660 left | n/a | no recurring lessons, no conflict warning shown before saving | One centred column; recurrence; conflict check |
| Calendar | month grid only, left; 390 px cells show initials only | yes | no week or day view, no drag to reschedule, no availability overlay, no "today" list, no timezone label | Workspace: week default, drag to move, availability shaded |
| Messages | 760 left; list only | yes | no unread filter, no search, no thread beside the list | Three panes |
| Chat | 680 left; thread height uses `100vh` maths that breaks inside the scrolling main | partly | no attachments, no canned replies, no student card | Part of the three-pane workspace |
| Payments and analytics | 900 left (the owner's page); cards far smaller than the screen | yes | no period switch, no filters on history, no status filter, paging, trend or comparison on the KPIs; export exists | `earnings.html` sample |
| Reports | 1100 left; charts are 8 bars on a flat white card | partly | overlaps Payments (money, top students, lessons per period): two places for one idea | Merge into Earnings with tabs (Overview, Payments, Reports). Owner decision, see section 6 |
| Team and payroll (Academy) | 900 left | yes | no tutor filter, no pay-period export | List layout; payroll export |
| Packages, Coupons, Subscriptions, Waitlist (Pro) | 640 narrow lists; Subscriptions centred at 672 | yes | no search or status filter, no usage stats (redeemed, active, revenue) | List layout with a stat row |
| Availability | 700 left; one long list of days | n/a | no weekly visual grid, no copy to other days, no time-off calendar | Weekly grid, copy day, time-off in the same page |
| AI tools (Pro) | 900 left | n/a | no history of generated items | Workspace with history |
| Import (Pro) | 600 left | n/a | no preview table before import, no error report download | Stepper: upload, map, preview, import |
| Refer and earn | 672 centred | n/a | no share buttons, no list of referred tutors | Card plus a referrals table |
| API and webhooks (Pro) | 820 left | n/a | no request log, no test-send | Tabs: keys, webhooks, log |
| Settings | 920 left; six tabs inside the page and the same list in the sidebar | n/a | no live preview of the booking page, no unsaved-changes bar, no theme choice, no notification settings | Section list plus 720 form plus preview |
| Upgrade | 5xl centred, good; plan table lacks a monthly or yearly switch | n/a | no comparison of what the tutor already uses | Keep; align to the frame |
| Account, sidebar, top bar | account menu holds "View as student" and Feedback as separate top-bar buttons; bell and the sound unlock hook | n/a | no command bar, no shortcuts, no theme, plan locks shown as small badges that look like errors | `command.html`: Ctrl K palette, G-then-letter jumps, N to schedule; locks become a quiet "Pro" tag with an upgrade sheet |

Features that people who use similar products (Calendly, Cal.com, Stripe Dashboard, Notion, Linear, Superhuman) expect, and where this plan puts them:

- **Command bar and shortcuts**: Ctrl or Cmd K, G then S/L/C/E to jump, N to schedule a lesson, ? for the list (G1).
- **Filters and sort** on every list, saved as tabs (G3). **Bulk actions** with a bar (G3). **Export** as CSV on every list and chart (G2, G3).
- **Notifications**: one calm centre in the bell (unread, bookings, messages, payments) instead of floating cards (G1).
- **Dark theme** following the system with a switch in Settings (G1, tokens already defined in `dash.css`).
- **Loading, empty and error states** for every page (G1 builds the pattern, each ticket uses it).

## 4. Design system (summary; full page: `design-system.html`)

- Colour, type and corners: the T-0809 tokens (`--bg --surface --surface-2 --line --ink --ink-2 --ink-3 --brand --brand-soft --ok --warn --err`), light and dark. Brand indigo `#4F46E5`. Nothing lighter than ink-3 carries text. Status is a word plus colour, never colour alone.
- Type: Geist. Page title 24, card title 15, body 14, secondary 13. Nothing under 13 px. Numbers use tabular figures.
- Space: 4, 8, 12, 16, 20, 24, 32, 48. Card padding 20, grid gap 16. Frame padding 32 / 24 / 16.
- Page head: title, one sentence, actions on the right. Cards: 16 px corners, 1 px line, tiny shadow. Tables: sticky head, row hover, tabular numbers, 36 px controls (44 px on a phone), 3 px indigo focus ring.
- Sidebar light by default (the same surface as the booking page), dark in the dark theme. The current near-black sidebar is replaced; if the owner prefers it, only `--surface` for the sidebar changes. Owner decision, section 6.
- Voice: plain US English, short, no exclamation marks, no emoji in headings (the greeting "Hello, Sarah" keeps its wave only on the dashboard home if the owner wants it).

What was reused from the approved public pages: the colour, type and radius tokens, the chip and button shapes, the stat strip idea (as KPI cards), the soft banner (as the Stripe prompt), the empty, loading and error pattern from `docs/booking-design/states.html`.

## 5. Ticket plan (proposed; none is built yet)

Order is by value to the owner's complaint, then by how many pages each unlocks. Each ticket is a build ticket for one group of pages and reuses G1.

| # | Ticket (proposed title) | Pages | Done when (each line can be checked) |
|---|---|---|---|
| G1 | Dashboard shell: frame, sidebar, top bar, command bar, states, dark theme | the layout, sidebar, top bar, every page's frame | (1) at 1920, 1440, 1024 and 390 px the left gap and the right gap of the content frame differ by at most 1 px and there is no horizontal scroll, measured on every dashboard route with the helme browser; (2) a test fails when a file under `src/app/(dashboard)` sets its own root `max-w-[` without the shared frame component; (3) the sidebar stays in view on a page taller than the screen; icon rail from 768 to 1279 px; bottom bar below 768 px; (4) the top bar title is right on all 18 menu routes (a test lists every route in `nav-items.ts` and checks a label exists); (5) Ctrl or Cmd K opens a palette that reaches every page and three actions, with a test; (6) `loading.tsx` and `error.tsx` exist for the group and show the pattern from `states.html`; (7) dark theme: every token pair has 4.5:1 text contrast (a script prints the ratios); (8) the cookie notice and the push prompt are one bar that never covers content on a phone; (9) pictures at 1440 and 390 next to the approved sample |
| G2 | Overview pages: Dashboard home, Earnings (Payments and Reports) | `/dashboard`, `/payments`, `/reports` | 12-column grid at 1920 shows no empty half (content width at least 1376 px at 1920, measured); KPI trend and period switch work against made-up data; CSV export on the history table; empty and error states proven with the mock; pictures at 1920, 1440, 390 |
| G3 | Lists: Students, Lessons | `/students`, `/lessons`, student detail | search, level and status filters, sort, bulk bar and CSV export work; paging loads 25 rows at a time (a test with 120 mock students); cards under 768 px with no sideways scroll; keyboard: Tab reaches every control, rows open with Enter |
| G4 | Workspaces: Calendar and Messages | `/calendar`, `/messages`, chat | week view default, drag to reschedule with a conflict warning; three-pane Messages from 1280 px; nothing capped at 760 px; phone shows list then thread |
| G5 | Forms and settings | Settings, Availability, Import, new and edit lesson and student | live preview of the booking page beside Settings; unsaved changes bar; weekly grid for Availability; Import shows a preview table before saving; every form is one centred 720 px column |
| G6 | Business lists: Packages, Coupons, Subscriptions, Waitlist, Team | five pages | same list pattern as G3 with a stat row; Pro locks use the quiet tag and an upgrade sheet |
| G7 | Account pages: Refer, API, Upgrade, account menu | four areas | account menu holds View as student, Feedback, theme, sign out; Upgrade aligned to the frame; referrals table |

Security notes for every ticket: these are presentation changes, but G2, G3 and G4 read tutor data, so each keeps the existing server-side owner checks and adds a test where a second tutor cannot read the first tutor's rows through any new route (rules 5 and 12).

## 6. Questions for the owner (each has a default; building starts on G1 after the owner approves the pictures)

1. **Sidebar colour.** Default: light, like the booking page (shown in the samples). Alternative: keep the near-black sidebar the app has now.
2. **Payments and Reports.** Default: merge them into one "Earnings" page with tabs, because they show the same money three times. Alternative: keep two pages.
3. **Dark theme.** Default: included in G1 (the tokens exist already). Alternative: drop it from the first round.

## 7. What this folder does not do

No dashboard code was changed, nothing was pushed to `master`, and the samples were not run against a real account or a real database (the audit pictures use the stand-in server with made-up data). The 18 menu routes are the entries of `src/components/layout/nav-items.ts`; the detail and form pages (student, lesson, chat, new lesson) were captured too.
