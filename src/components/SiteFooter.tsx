import Link from 'next/link'
import { GraduationCap } from 'lucide-react'

// The footer of the public pages. The links are written here once; the home page, the blog index and
// /switch keep their own footers and carry the same Updates link (tests/updates.test.ts checks every
// public page file for one or the other).
export const FOOTER_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/updates', label: 'Updates' },
  { href: '/customers', label: 'Customers' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
] as const

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-100 py-8 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-6 h-6 bg-indigo-500 rounded-lg flex items-center justify-center" aria-hidden="true"><GraduationCap className="h-3.5 w-3.5 text-white" /></span>
          <span className="text-[14px] font-bold text-gray-900">Tutafy</span>
        </Link>
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          {FOOTER_LINKS.map(l => (
            <Link key={l.href} href={l.href} className="text-[12px] text-gray-500 hover:text-gray-700">{l.label}</Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
