# Everywhere Tutafy uses its logo today

Checked in the code on 2026-10-25 (ticket T-0959). The rows under "Outside the repository" are accounts of the owner that the code cannot show.
This file and the table in `compare.html` are both written from `inventory.json` by `build-pages.mjs`.

## On the public site and in the app (code)

| # | Where | What shows today | Where it is in the code or account | What the new one needs |
|---|---|---|---|---|
| 1 | Top bar of every public page | Indigo tile with the lucide graduation cap, then the word Tutafy. Three sizes (32, 28 and 24 px tile) and a `dark` option. | `src/components/SiteLogo.tsx`, used by 19 pages and the footer: home, about, blog, blog post, contact, customers, find a tutor, learn, privacy, terms, tutors directory and profile, updates, switch, unsubscribe, 404, booking page, member booking page, student portal layout. | Horizontal logo, light and dark. One component to change. |
| 2 | Footer of the public site | The same logo, small. | `src/components/SiteFooter.tsx` (through SiteLogo). | Same component, nothing extra. |
| 3 | Sign-in and sign-up pages | The word Tutafy as plain text. No mark. | `src/app/(auth)/login/page.tsx:52`, `src/app/(auth)/register/page.tsx:84`. | Decide: use the new horizontal logo here. Today these two pages do not match the top bar. |
| 4 | Onboarding | A lightning bolt (lucide Zap) in an indigo tile. Not the cap. | `src/app/onboarding/page.tsx:122`. | Replace with the new icon. A second, different mark today. |
| 5 | Tutor app sidebar | A lightning bolt in a 28 px tile (`.dash-logo`) and the word Tutafy from 1280 px up. | `src/components/layout/Sidebar.tsx:81-82`, `src/styles/dashboard-shell.css:65`. | Icon alone for the narrow sidebar, horizontal logo from 1280 px, for the light and the dark app theme. |
| 6 | Tutor app top bar | "Tutafy" as breadcrumb text. | `src/components/layout/Header.tsx:249`. | Text only. Keep, or add the small icon. |
| 7 | Upgrade button and upgrade page | A lightning bolt as a symbol for "Pro". This is not the logo. | `src/components/layout/MobileNav.tsx:99`, `src/app/(dashboard)/upgrade/page.tsx`. | Leave as it is. Listed so nobody swaps it by mistake. |
| 8 | Admin pages | No logo and no name in the layout. | `src/app/(admin)/`. | Nothing to change. Decide whether the admin should show the mark. |
| 9 | Video classroom | No mark. Only the text "Taking you back to Tutafy…". The room itself is Jitsi's, with Jitsi's own branding. | `src/components/VideoRoom.tsx:127`. | Nothing in our code. |
| 10 | "Made with Tutafy" line | A text link at the foot of booking pages and the embed window. No mark. | `src/components/MadeWithTutafy.tsx`. | Optional small icon. |
| 11 | Student certificate | Indigo tile with a graduation-cap drawing pasted in as inline SVG, and the word Tutafy. | `src/app/portal/[token]/certificate/[lessonId]/page.tsx:60-66`. | The horizontal logo. This is a hand-pasted copy, not SiteLogo, so it is easy to miss. |
| 12 | Invoice page | The word Tutafy in indigo. No mark. | `src/app/api/invoices/[lessonId]/route.ts:42,74`. | Horizontal logo as inline SVG (invoices are saved and printed). |

## Files and the browser

| # | Where | What shows today | Where it is in the code or account | What the new one needs |
|---|---|---|---|---|
| 13 | Favicon | A 48 x 48 `.ico` of the current mark. | `src/app/favicon.ico`. | New favicon: an SVG and a 48 px ICO. Each idea has a favicon row on the page above. |
| 14 | App icons (PNG) | 192 and 512 px pictures of the current mark. | `public/icon-192.png`, `public/icon-512.png`. Used by `src/app/layout.tsx:33` (apple-touch-icon), `src/app/manifest.ts:14-15` (the 192 file is declared maskable), `public/sw.js:44-45` (push notification icon and badge), `src/lib/seo.ts:83` (the Organization logo in the site's structured data). | Export 180, 192 and 512 px PNGs from the chosen icon, a maskable version with a safe zone, and a one-colour badge for push. |
| 15 | Web app colors | Theme `#6366f1` and background `#0A0A0F`. | `src/app/manifest.ts:9-10`. | Check them against the chosen main color (the app uses `#4F46E5`). |
| 16 | Share picture | 1200 x 630: a white tile with the cap and the word Tutafy on indigo. | `src/app/og/route.tsx:17-22`, used from `src/lib/page-meta.ts`. | Redraw with the new horizontal logo on dark. |
| 17 | Update pictures and blog heroes | Screenshots taken while the old logo was on screen. | `public/updates/*.webp`, `public/blog/*`. | Leave as history. Not checked picture by picture. |

## Mail

| # | Where | What shows today | Where it is in the code or account | What the new one needs |
|---|---|---|---|---|
| 18 | System emails | No picture logo. A gradient banner with a text title and a "Tutafy · tutafy.com" footer. | 16 places build a mail: the routes for register, bookings, reminders, progress reports, invoice send, no-show, send notes, broadcast, portal cancel, homework, messages and reschedule, student send-link and the lesson summary, plus `src/lib/review-invites.ts` and `src/lib/welcome-series.ts`. Sender settings are in `src/lib/email-config.ts`. | If a logo is added to mail it must be a PNG at an absolute address (mail clients block SVG). Decide in the replacement ticket. |
| 19 | Sign-in mails from Supabase | Unknown. Their templates live in the Supabase dashboard, not in the repository. | Supabase dashboard, Authentication, Email templates. | Owner to check. |

## Outside the repository (the owner's accounts, to check)

| # | Where | What shows today | Where it is in the code or account | What the new one needs |
|---|---|---|---|---|
| 20 | Plan checkout (Pro and Academy) | The page where a tutor pays is hosted by Polar and shows the organization logo set in Polar. | Polar dashboard, organization settings. | Upload the new icon. |
| 21 | Stripe account branding | Icon and brand color on tutor payout onboarding and receipts. | Stripe Dashboard, Settings, Branding. | Upload the new icon and color. |
| 22 | Google sign-in consent screen | App logo on the "Sign in with Google" screen (the login and register pages offer it). | Google Cloud, OAuth consent screen. | Upload a 120 x 120 PNG. Google may review a changed logo. |
| 23 | Hosting and code profiles | Project and owner pictures. | Vercel project avatar, GitHub repository and owner avatar. | Upload the new icon. |
| 24 | Search tools | Mostly the favicon. | Google Search Console, Bing Webmaster Tools, any business profile. | Nothing, once the favicon is live. |
| 25 | Social profiles and directories | Profile picture and banner. | X, LinkedIn, Facebook, Instagram, YouTube, Product Hunt, tutor directories. The repository links to none of them (checked in `src/lib/seo.ts` and the footer). | Owner lists the accounts that exist. |
| 26 | Design samples in the repository | Static HTML that draws the current mark. | `docs/booking-design/`, `docs/directory-design/`, `docs/dashboard-redesign/`. | Not shipped. Leave as a record. |
