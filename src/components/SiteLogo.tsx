import Link from 'next/link'
import { BrandLogo } from '@/components/brand/BrandLogo'

// The Tutafy logo of every public page (T-0818). It is always a real link to the home page "/": one place, so no page can ship
// a logo that is only a picture. tests/logo-home.test.ts fails when a public page draws the logo any other way.
// Since T-0969 the logo is the horizontal logo D2 (src/components/brand/BrandLogo.tsx), the same drawing as public/brand/tutafy-logo.svg.
// Sizes (the height of the whole logo; the tile inside is 94 % of it): lg = top bar of a content page (tile 32 px), md = top bar of a
// booking or profile page (28 px), sm = footer (24 px).
const SIZES = { lg: 34, md: 30, sm: 26 } as const

export function SiteLogo({ size = 'lg', dark = false }: { size?: keyof typeof SIZES; dark?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Tutafy home"
      className="inline-flex min-h-11 items-center rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <BrandLogo height={SIZES[size]} theme={dark ? 'dark' : 'light'} />
    </Link>
  )
}
