import Link from 'next/link'
import { GraduationCap } from 'lucide-react'

// The Tutafy logo of every public page (T-0818). It is always a real link to the home page "/": one place, so no page can ship
// a logo that is only a picture. tests/logo-home.test.ts fails when a public page draws the logo any other way.
// Sizes: lg = top bar of a content page, md = top bar of a booking or profile page, sm = footer.
const SIZES = {
  lg: { box: 'w-8 h-8 rounded-xl', icon: 18, text: 'text-[17px]' },
  md: { box: 'w-7 h-7 rounded-lg', icon: 16, text: 'text-[16px]' },
  sm: { box: 'w-6 h-6 rounded-lg', icon: 14, text: 'text-[14px]' },
} as const

export function SiteLogo({ size = 'lg', dark = false }: { size?: keyof typeof SIZES; dark?: boolean }) {
  const s = SIZES[size]
  return (
    <Link
      href="/"
      aria-label="Tutafy home"
      className="inline-flex min-h-11 items-center gap-2 rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <span className={`${s.box} bg-indigo-500 flex items-center justify-center`} aria-hidden="true">
        <GraduationCap className="text-white" style={{ width: s.icon, height: s.icon }} />
      </span>
      <span className={`${s.text} font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Tutafy</span>
    </Link>
  )
}
