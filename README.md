<p align="center">
  <a href="https://www.tutafy.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="public/brand/tutafy-logo-dark.svg">
      <img src="public/brand/tutafy-logo.svg" alt="Tutafy" height="64">
    </picture>
  </a>
</p>

Tutafy is booking, lessons and payments for private tutors: a booking page, a video classroom, parent and student portals, AI lesson tools, 0% commission. Next.js 16, Supabase, Polar for plans. Live at [www.tutafy.com](https://www.tutafy.com).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). It needs `.env.local` with the Supabase settings (never commit it).

Checks before a pull request: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.

Where each feature lives and how to run and check it: `docs/feature-map.md` and `docs/features/`.

## Brand

The logo, colours, fonts, corners and voice are in [`docs/brand/BRAND.md`](docs/brand/BRAND.md). They are written once in `src/lib/brand.ts`; `npm run brand:build` writes everything that is generated from it (CSS variables, the logo files in `public/brand/`, the favicon and app icons, the one-page sheet), and `tests/brand.test.ts` fails when any of it differs from the source or when an old logo comes back. The one-page sheet to open and save as a picture is `public/brand/brand-sheet.html` (`/brand/brand-sheet.html` on the site).

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to load [Geist](https://vercel.com/font).

## Deploy

Vercel builds every pushed branch as a preview and the main branch as production.
