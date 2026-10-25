# Tutafy logo ideas

Status: five ideas for the owner to choose from. None is chosen yet. Ticket T-0959. Design only: nothing on the site, in the app or in an email uses any of these files.

**Not checked against trademarks.** Nobody has searched trademark registers (US, EU or elsewhere) or domain and app-store name conflicts for any of these marks. None is copied from another company's logo as far as the designer could judge by eye, but that is not a legal check. Search before the chosen one is used in public.

Look at them side by side: open `compare.html` in a browser (it needs no server; it loads the SVG files next to it). It also holds the table of every place the logo is used today.

## The five ideas

| Id | Name | Idea | Type |
|---|---|---|---|
| `page` | A. Page T | A T whose bar is two pages with a thin gap, and whose stem is the spine. White glyph on an indigo tile. | Manrope 800 |
| `bubble` | B. Bubble | A speech bubble (the lesson, the message) with a T standing in it. Drawn with a line, no tile. | DM Sans 700 |
| `slots` | C. Slots | A T built from time blocks, like a booked day on a calendar. The last block is amber: the slot just booked. | Space Grotesk 700 |
| `facet` | D. Facet | A mortarboard cut from two facets, amber tassel. The closest to today's idea, redrawn as geometry. | Sora 700 |
| `dot` | E. Dot t | One line drawn as a lowercase t, with a round amber dot for the student. Name set in lowercase, tutafy. | Outfit 600 |

## Files

For each id there are five SVG files:

- `<id>-horizontal-on-light.svg` and `<id>-horizontal-on-dark.svg`: icon plus the word (56 high, icon 44 high).
- `<id>-icon-on-light.svg` and `<id>-icon-on-dark.svg`: the icon alone (64 x 64 grid).
- `<id>-favicon.svg`: 32 x 32, chunkier, drawn on its own indigo tile so it works on any browser tab. `compare.html` shows it at 16 and 32 pixels, as the browser rasterizes it.

Plus `compare.html` (the comparison page), `inventory.json` (the places the logo is used, the one source), `where-logo-is-used.md` (the same table as Markdown), `build-logos.mjs` and `build-pages.mjs` (how the files were generated).

All SVGs have a transparent background (except the favicon tile), no `<text>` (letters are outlines), no scripts, no external references and no font files to load.

## Colors

The indigo is the one the tutor app already uses (`--d-brand` in `src/styles/dashboard-shell.css`). One amber accent is used only where an idea has a "booked" or "live" detail.

| Role | On light | On dark |
|---|---|---|
| Main | `#4F46E5` | `#818CF8` |
| Deep (second facet) | `#3730A3` | `#6366F1` |
| Accent (amber) | `#F59E0B` | `#FBBF24` |
| Text | `#0F172A` | `#F8FAFC` |
| Tile of idea A | `#4F46E5` | `#6366F1` |

## Usage rules to follow once one is chosen

- Clear space around the logo: half the height of the icon.
- Smallest sizes: icon 16 px (favicon version), horizontal logo 24 px tall.
- Do not stretch, rotate, outline, add shadows or change the colors outside the table.
- Put the dark version on dark backgrounds and the light version on light backgrounds.
- At build time, export 180, 192 and 512 px PNGs from the chosen icon (`apple-touch-icon`, the web app manifest, push notifications), a maskable 512 version with a safe zone, a 1200 x 630 share picture, and a 48 px ICO for `src/app/favicon.ico`. Mail clients block SVG, so a logo in a mail has to be a PNG at an absolute address.

## Fonts

Letters were converted to outlines from Manrope, DM Sans, Space Grotesk, Sora and Outfit (fontsource 5.3.0 packages), all under the SIL Open Font License 1.1, which allows this.

## Regenerating

The SVG files are the source of truth and can be edited by hand. In a throwaway folder (not in this repository):

```
npm install opentype.js @fontsource/manrope @fontsource/dm-sans @fontsource/space-grotesk @fontsource/sora @fontsource/outfit
node <repo>/docs/brand/logo/build-logos.mjs <repo>/docs/brand/logo
```

Then, after any edit of `inventory.json`, from this folder: `node build-pages.mjs`. `tests/logo-concepts.test.ts` fails when the page, the Markdown table and `inventory.json` differ, or when a file the table names no longer exists.
