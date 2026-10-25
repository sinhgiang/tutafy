# Tutafy brand

The rules for how Tutafy looks and sounds. Chosen by the owner on 25 Oct 2026 (logo D2), built in T-0969.
The values below are not typed twice: they live in `src/lib/brand.ts`, and `npm run brand:build` writes the CSS variables, the logo files, the favicon, the app icons, the one-page sheet and the tables in this file from it. `tests/brand.test.ts` fails when any of them differ from `brand.ts`, so a colour cannot be changed in one place only.

- One-page sheet to open and save as a picture: `public/brand/brand-sheet.html` (on the site: `/brand/brand-sheet.html`), already saved as `public/brand/tutafy-brand-sheet.png`.
- Logo files: `public/brand/` (list in section 1).
- Voice in full: `docs/brand-voice.md`.

## 1. The logo

A mortarboard (graduation cap) inside an indigo rounded square, with an amber tassel. The square is an app tile, so the same drawing is the app icon. The name next to it is **Tutafy** in Geist Bold, drawn as outlines so the logo never depends on a font loading.

Two forms:

- **Icon**: the tile alone. For small places: browser tab, app icon, avatar, narrow sidebar, "Made with Tutafy" line.
- **Horizontal logo**: icon, a gap, the word. For headers, footers, sign-in, documents, invoices, certificates, the share picture.

Both are drawn on a 64-unit grid (the horizontal logo is 204 x 64). The source is the owner's file `inbox/tutafy-logo-d2-source.svg` (Helme brain); nothing was redrawn.

| Part | On a light surface | On a dark surface |
|---|---|---|
| Tile | `#4F46E5` | `#6366F1` |
| Cap | white (the lower band at 78 % opacity) | white (same) |
| Tassel | `#F59E0B` | `#FBBF24` |
| Word | `#111827` | white |

Use the dark set on any surface darker than about 40 % grey, including the app's dark theme, the share picture and the avatar. In the app the logo follows the theme by itself (`theme="auto"`, which reads `--brand-logo-*`).

**One colour**: a solid tile with the cap and tassel cut out, in black or white, for stamps, print in one ink, fax, or a coloured photo. Never recolour the full-colour logo; use the one-colour files instead.

### Files (`public/brand/`)

| File | What |
|---|---|
| `tutafy-logo.svg`, `tutafy-logo.png` | Horizontal logo, light surface (PNG is 1020 x 320) |
| `tutafy-logo-dark.svg`, `.png` | Horizontal logo, dark surface |
| `tutafy-logo-mono-black.svg`, `.png` | Horizontal logo, one colour, black |
| `tutafy-logo-mono-white.svg`, `.png` | Horizontal logo, one colour, white |
| `tutafy-icon.svg` | Icon, light |
| `tutafy-icon-{16,32,48,64,128,180,192,256,512,1024}.png` | Icon, light, in pixels |
| `tutafy-icon-dark.svg`, `tutafy-icon-dark-512.png` | Icon, dark |
| `tutafy-icon-mono-black.svg`, `tutafy-icon-mono-black-512.png` | Icon, one colour, black |
| `tutafy-icon-mono-white.svg`, `tutafy-icon-mono-white-512.png` | Icon, one colour, white |
| `tutafy-icon-maskable.svg`, `tutafy-icon-maskable-{192,512}.png` | Full square for Android app icons (the phone crops it); logo kept inside the middle 80 % |
| `tutafy-badge.svg`, `tutafy-badge-96.png` | Push notification badge: the shape in white on transparent |
| `tutafy-brand-sheet.png` | The one-page sheet as a picture |

Also written from the same source: `public/icon-192.png` and `public/icon-512.png` (copies of the icon, used by the manifest, push notifications and the Organization data), `src/app/icon.svg` (browser icon; in a dark tab bar it takes the dark colours), `src/app/favicon.ico` (16, 32 and 48 px), `src/app/apple-icon.png` (180 px, full square: iOS rounds it itself).

### Clear space and smallest size

- **Clear space**: keep one quarter of the icon's height free on every side of the logo (that is the corner radius of the tile). Nothing else enters it.
- **Smallest icon**: 16 px (a browser tab). Below that the cap stops reading.
- **Smallest horizontal logo**: 24 px high (about 77 px wide).
- In the code: `BrandMark` and `BrandLogo` (`src/components/brand/`) draw the logo; the public pages go through `SiteLogo`, which is always a link to `/`. `tests/brand.test.ts` fails when a size under the minimum is written.

### Do not

- Stretch, squash, rotate or tilt it.
- Change its colours, add a gradient, a shadow, a glow or an outline.
- Put the full-colour icon on a surface of its own colour (indigo on indigo): use the one-colour white version.
- Set the word in another font, or redraw the cap.
- Put the light logo on a dark surface or the dark logo on a light one.
- Place text, an icon or an edge inside the clear space.
- Use the lightning bolt or the line-drawing cap of the earlier versions. They are retired; `tests/brand.test.ts` fails if they come back.

A trademark search for the name and the mark has **not** been done. Do it before the logo is used on paid ads, print or a registered profile.

## 2. Colour

Names are the CSS variable names without `--brand-`. Light-surface colours first, then the same family for a dark surface. A page's job decides the colour, not taste: indigo is for what can be pressed or is selected, amber is only the tassel's accent, status colours say status and nothing else.

<!-- brand:colors:begin -->
| Name | Hex | CSS variable | Use |
|---|---|---|---|
| `primary` | `#4F46E5` | `--brand-primary` | Logo tile, main buttons, links, focus ring |
| `primaryHover` | `#4338CA` | `--brand-primary-hover` | Hover and pressed state of an indigo button or link |
| `primarySoft` | `#EEF0FF` | `--brand-primary-soft` | Selected row, tag, quiet highlight |
| `primaryLine` | `#C7CCFA` | `--brand-primary-line` | Border on a soft indigo surface |
| `accent` | `#F59E0B` | `--brand-accent` | The tassel. A small accent only, never a button or a large area |
| `primaryOnDark` | `#6366F1` | `--brand-primary-on-dark` | Logo tile on a dark surface |
| `primaryTextOnDark` | `#818CF8` | `--brand-primary-text-on-dark` | Links, active items and the main button on a dark surface |
| `primaryHoverOnDark` | `#A5B4FC` | `--brand-primary-hover-on-dark` | Hover state on a dark surface |
| `primarySoftOnDark` | `#232A52` | `--brand-primary-soft-on-dark` | Selected row on a dark surface |
| `primaryLineOnDark` | `#3B4586` | `--brand-primary-line-on-dark` | Border on a soft indigo dark surface |
| `accentOnDark` | `#FBBF24` | `--brand-accent-on-dark` | The tassel on a dark surface |
| `ink` | `#111827` | `--brand-ink` | Headings and body text |
| `ink2` | `#374151` | `--brand-ink-2` | Secondary text |
| `ink3` | `#5B6475` | `--brand-ink-3` | Captions, placeholders, quiet labels |
| `canvas` | `#F6F7FB` | `--brand-canvas` | App background |
| `surface` | `#FFFFFF` | `--brand-surface` | Cards, panels, the page of a public site |
| `surface2` | `#F3F4F8` | `--brand-surface-2` | A quiet panel inside a card, table header |
| `line` | `#E5E7EF` | `--brand-line` | Borders and dividers |
| `lineStrong` | `#D0D4E0` | `--brand-line-strong` | A border that has to be seen (inputs, buttons) |
| `inkOnDark` | `#F3F4F8` | `--brand-ink-on-dark` | Headings and body text on a dark surface |
| `ink2OnDark` | `#D1D5E0` | `--brand-ink-2-on-dark` | Secondary text on a dark surface |
| `ink3OnDark` | `#A3ABBD` | `--brand-ink-3-on-dark` | Captions on a dark surface |
| `canvasDark` | `#0E1117` | `--brand-canvas-dark` | Dark app background, the share picture, the app splash screen |
| `surfaceDark` | `#171B24` | `--brand-surface-dark` | Dark cards and panels |
| `surface2Dark` | `#1F2430` | `--brand-surface-2-dark` | A quiet panel inside a dark card |
| `lineDark` | `#2A3040` | `--brand-line-dark` | Dark borders and dividers |
| `lineStrongDark` | `#3A4256` | `--brand-line-strong-dark` | A dark border that has to be seen |
| `ok` | `#047857` | `--brand-ok` | Paid, done, success (text) |
| `okSoft` | `#E8F7F0` | `--brand-ok-soft` | Background behind success text |
| `warn` | `#92400E` | `--brand-warn` | Needs attention (text) |
| `warnSoft` | `#FEF3C7` | `--brand-warn-soft` | Background behind warning text |
| `danger` | `#B42318` | `--brand-danger` | Error, cancel, delete (text) |
| `dangerSoft` | `#FDECEA` | `--brand-danger-soft` | Background behind error text |
| `okOnDark` | `#34D399` | `--brand-ok-on-dark` | Success text on a dark surface |
| `okSoftOnDark` | `#12261F` | `--brand-ok-soft-on-dark` | Background behind success text on dark |
| `warnOnDark` | `#FBBF24` | `--brand-warn-on-dark` | Warning text on a dark surface |
| `warnSoftOnDark` | `#2B2208` | `--brand-warn-soft-on-dark` | Background behind warning text on dark |
| `dangerOnDark` | `#F87171` | `--brand-danger-on-dark` | Error text on a dark surface |
| `dangerSoftOnDark` | `#2E1514` | `--brand-danger-soft-on-dark` | Background behind error text on dark |
| `white` | `#FFFFFF` | `--brand-white` | The cap of the logo, text on a main button |
<!-- brand:colors:end -->

In the code: `src/styles/brand-tokens.css` (all `--brand-*` variables, loaded in `src/app/globals.css`), `src/lib/brand.ts` (the same values for code that needs a hex: the share picture, the manifest, the browser colour, the logo files), and Tailwind utilities `bg-brand`, `text-brand`, `border-brand-line`, `bg-brand-soft`, `bg-tassel`. The tutor app's `--d-*` variables (`src/styles/dashboard-shell.css`) are written from the same table between the `brand:begin` and `brand:end` marks.

**Known gap**: the public pages and the booking pages still use Tailwind's own indigo scale (`indigo-500` is `#6366F1`, `indigo-600` is `#4F46E5`) for buttons and accents, and the e-mail templates carry `#6366F1` as text. They are close to the brand but are not read from `brand.ts` yet. `tests/brand.test.ts` counts these literals and fails if one is added.

## 3. Type

One family for everything: **Geist** (400 regular, 500 medium, 600 semibold, 700 bold, 800 extra bold), loaded with `next/font/google` in `src/app/layout.tsx`. Numbers in tables use tabular figures. The sheet carries a copy of the variable font (`public/brand/fonts/Geist-Variable.woff2`, SIL Open Font License 1.1, from the `geist` package 1.8.2) so it opens without a network.

The word in the logo is Geist Bold at 40 units on the logo grid, tracking -0.02 em, converted to outlines with opentype.js (`src/lib/brand-wordmark.ts`). To redraw it: install `geist@1.8.2` and `opentype.js` somewhere outside the project, run the glyphs of "Tutafy" through `getPath` with those numbers, and paste the path into that file; `npm run brand:build` does the rest.

<!-- brand:type:begin -->
| Style | Size / line | Weight | Tracking | CSS variables |
|---|---|---|---|---|
| `display` | 48 / 52 px | 800 | -0.03em | `--brand-text-display`, `--brand-leading-display`, `--brand-weight-display`, `--brand-tracking-display` |
| `h1` | 34 / 40 px | 800 | -0.025em | `--brand-text-h1`, `--brand-leading-h1`, `--brand-weight-h1`, `--brand-tracking-h1` |
| `h2` | 24 / 30 px | 700 | -0.02em | `--brand-text-h2`, `--brand-leading-h2`, `--brand-weight-h2`, `--brand-tracking-h2` |
| `h3` | 18 / 26 px | 700 | -0.01em | `--brand-text-h3`, `--brand-leading-h3`, `--brand-weight-h3`, `--brand-tracking-h3` |
| `body` | 16 / 26 px | 400 | 0 | `--brand-text-body`, `--brand-leading-body`, `--brand-weight-body`, `--brand-tracking-body` |
| `small` | 14 / 20 px | 500 | 0 | `--brand-text-small`, `--brand-leading-small`, `--brand-weight-small`, `--brand-tracking-small` |
| `caption` | 12 / 16 px | 600 | 0.04em | `--brand-text-caption`, `--brand-leading-caption`, `--brand-weight-caption`, `--brand-tracking-caption` |
<!-- brand:type:end -->

Nothing is smaller than 12 px. Phones and tablets lift body text to at least 14 px and touch targets to 44 px (the touch layer in `src/app/globals.css`).

## 4. Corners and spacing

<!-- brand:shape:begin -->
Corners:

| Name | Radius | CSS variable |
|---|---|---|
| `sm` | 6 px | `--brand-radius-sm` |
| `md` | 8 px | `--brand-radius-md` |
| `lg` | 12 px | `--brand-radius-lg` |
| `xl` | 16 px | `--brand-radius-xl` |
| `pill` | full (999 px) | `--brand-radius-pill` |

Spacing, on a 4 px grid:

| Step | Size | CSS variable |
|---|---|---|
| 1 | 4 px | `--brand-space-1` |
| 2 | 8 px | `--brand-space-2` |
| 3 | 12 px | `--brand-space-3` |
| 4 | 16 px | `--brand-space-4` |
| 5 | 24 px | `--brand-space-5` |
| 6 | 32 px | `--brand-space-6` |
| 7 | 48 px | `--brand-space-7` |
| 8 | 64 px | `--brand-space-8` |
<!-- brand:shape:end -->

Cards and sheets use 12 or 16, buttons and inputs 8, small tags 6, pills and avatars full. The logo's own tile is 16 on a 64 grid (25 %); keep that ratio when the tile is drawn at another size.

## 5. Voice

Short and direct, like a colleague in the trade. One idea per sentence; say the number, the price or the step. Concrete before clever, honest about limits, warm and not gushing: no exclamation marks, no emoji used as icons. The answer comes first. Product text is English only. The full rules, the words to use and the words never to use are in `docs/brand-voice.md`.

- Right: "Share one link. Students see your real availability in their timezone and book. No emails, no double-bookings."
- Right: "Never. Unlike marketplaces, Tutafy takes 0% of what your students pay you, on every plan."
- Wrong: "Unlock a seamless, next-level booking experience that empowers your tutoring journey."
- Wrong: "Our revolutionary all-in-one solution transforms the way you teach!"

## 6. Where the logo is used (checked in the code on 25 Oct 2026, T-0969)

Everything in the code reads the logo from `BrandMark`, `BrandLogo` or a file written by `npm run brand:build`. The first table is the code; the second is what the code cannot reach.

| Where | Which form | File |
|---|---|---|
| Top bar of every public page (home, about, blog, blog post, contact, customers, find a tutor, learn, privacy, terms, tutors directory and profile, updates, switch, unsubscribe, 404, booking pages, student portal) | Horizontal | `src/components/SiteLogo.tsx` (through `BrandLogo`) |
| Footer of the public site | Horizontal, small | `src/components/SiteFooter.tsx` (through `SiteLogo`) |
| Sign-in and sign-up | Horizontal, 48 px | `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx` |
| Student sign-in and student area header | Horizontal | `src/app/student/layout.tsx` |
| Onboarding | Icon, 48 px | `src/app/onboarding/page.tsx` |
| Tutor app sidebar | Icon on the narrow rail, horizontal from 1280 px, light and dark theme | `src/components/layout/Sidebar.tsx`, `src/styles/dashboard-shell.css` |
| Home page, picture of the product (dark sidebar) | Horizontal, dark | `src/app/page.tsx` |
| Offline page | Horizontal | `src/app/offline/page.tsx` |
| "Made with Tutafy" line on booking pages and the embed | Icon, 16 px | `src/components/MadeWithTutafy.tsx` |
| Student certificate | Horizontal | `src/app/portal/[token]/certificate/[lessonId]/page.tsx` |
| Invoice page | Horizontal, inline SVG (printed and saved) | `src/app/api/invoices/[lessonId]/route.ts` |
| Browser tab icon | Icon, adapts to a dark tab bar | `src/app/icon.svg`, `src/app/favicon.ico` |
| iPhone home-screen icon | Icon, full square | `src/app/apple-icon.png` |
| Web app manifest (Android install, splash) | Icon any and maskable, colours from `brand.ts` | `src/app/manifest.ts`, `public/icon-192.png`, `public/icon-512.png`, `public/brand/tutafy-icon-maskable-*.png` |
| Browser colour (address bar on phones) | `--brand-primary` | `src/app/layout.tsx` (`viewport.themeColor`) |
| Push notification icon and badge | Icon, and the white badge shape | `public/sw.js`, `src/components/layout/Header.tsx`, `src/components/layout/NoticeBar.tsx` |
| Share picture of every page without its own (Open Graph, Twitter, LinkedIn, Facebook, assistants) | Horizontal, dark, 1200 x 630 | `src/app/og/route.tsx`, used by `src/lib/page-meta.ts` |
| Organization data for search engines | Icon, 512 px | `src/lib/seo.ts` (`logo`) |
| Service worker cache | Cleared on this release (`tutafy-v2`) so no page or picture with the old logo is served from it | `public/sw.js` |

Blog posts use their own hero pictures (and tutor profiles their own photos) as the share picture, as before: they are content, not the logo, and none of them carries the old mark.

**Not changed, and why**

| Where | Why |
|---|---|
| System e-mails (16 templates: sign-up, bookings, reminders, progress reports, invoices, no-show, notes, broadcasts, portal, student link, welcome series, review invites) | They have never had a logo picture, only a coloured banner and a text footer. A logo in mail has to be a PNG at an absolute address and changes what real people receive, so it is a separate decision. The file for it already exists: `public/brand/tutafy-logo.png`. |
| Tutor app top bar and the word "Tutafy" in breadcrumbs, `Powered by Tutafy` and `Back to Tutafy` text lines | They are plain text in a sentence, not the logo. |
| The lightning bolt on "Upgrade" buttons and the plan screens | It stands for the Pro plan, not for Tutafy. Kept on purpose; `tests/brand.test.ts` lists where it is allowed. |
| `docs/booking-design/`, `docs/directory-design/`, `docs/dashboard-redesign/` | Design samples that were approved earlier. They are history, not shipped. |
| `public/updates/*.webp`, `public/blog/*` | Screenshots and pictures made while the old logo was on screen: history, not checked picture by picture. |
| `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` | Leftovers of the Next.js starter. Not Tutafy marks and not used by any page. |

**Outside the repository (the owner's accounts, to upload by hand)**

Upload `public/brand/tutafy-icon-512.png` (or the 1024 px file) to each. The sign-in mail templates of Supabase live in its dashboard, not in the code; check them too.

- Polar, organization logo (plan checkout page).
- Stripe, Settings, Branding: icon and the brand colour `#4F46E5`.
- Google Cloud, OAuth consent screen: a 120 x 120 PNG (`tutafy-icon-128.png`, resize); Google may review a changed logo.
- Vercel project avatar; GitHub repository and owner avatar.
- Social profiles, Product Hunt and tutor directories: profile picture `tutafy-icon-512.png`; for a banner use the share picture `/og`.
- Supabase, Authentication, Email templates.
