# T-0959: five logo ideas and the list of every place the logo is used

Design only. `docs/brand/logo/` holds five logo ideas for the owner to choose from (SVG files for the horizontal logo and the icon on light
and dark, and a favicon for each), `compare.html` (the comparison page: each idea large, the favicon at 16 and 32 px as the browser draws it,
in a top bar and a sidebar), and the table of every place Tutafy uses its logo today (`where-logo-is-used.md`, written from `inventory.json`).
`README.md` in that folder says what each idea is, the colors, the usage rules and how the files were made.

Nothing in `src/` or `public/` changed and nothing on the site shows any of the new files. After the owner picks one, a separate ticket changes
the logo everywhere, working from the table.

What the check found: Tutafy has three different marks in use today (the lucide graduation cap in `SiteLogo`, the share picture and the
certificate; a lightning bolt in the tutor app sidebar and onboarding; plain text with no mark on the sign-in pages and the invoice).

`tests/logo-concepts.test.ts` keeps the five files per idea whole and plain, keeps the page and the Markdown table equal to `inventory.json`,
and fails when a source file the table names has moved.

Not checked: trademarks (stated on the page and in the README).
