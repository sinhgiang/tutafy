import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteLogo } from '@/components/SiteLogo'
import { SiteFooter } from '@/components/SiteFooter'

// The page for an address that does not exist (T-0843). Next answers it with status 404 and keeps it out of search results; this file gives
// it a title of its own (it used to carry the home page's title and description) and a way back.
export const metadata: Metadata = {
  title: { absolute: 'Page not found | Tutafy' },
  description: 'That address does not exist on Tutafy. Go back to the home page, find a tutor, read the blog or contact us.',
  robots: { index: false, follow: true },
}

const WAYS_BACK = [
  { href: '/', label: 'Home', note: 'What Tutafy does and what it costs' },
  { href: '/tutors', label: 'Find a tutor', note: 'Tutors you can book today' },
  { href: '/blog', label: 'Blog', note: 'Guides for online tutors' },
  { href: '/contact', label: 'Contact', note: 'Write to us if a link we gave you is broken' },
]

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto"><SiteLogo /></div>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-20">
        <p className="text-[12px] font-bold text-indigo-600 uppercase tracking-widest mb-3">Error 404</p>
        <h1 className="text-[34px] font-extrabold text-gray-900 tracking-tight">That page is not here.</h1>
        <p className="text-[16px] text-gray-600 mt-3 max-w-lg">The link may be old, or the address has a typo. These pages do exist:</p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {WAYS_BACK.map(w => (
            <li key={w.href}>
              <Link href={w.href} className="block rounded-2xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition">
                <span className="block text-[15px] font-bold text-gray-900">{w.label}</span>
                <span className="block text-[13px] text-gray-600 mt-1">{w.note}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </div>
  )
}
