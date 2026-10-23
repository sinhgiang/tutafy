import Link from 'next/link'
import { pageMetadata, PAGE_SEO } from '@/lib/page-meta'
import { jsonLdScript, pageJsonLd } from '@/lib/seo'
import { loadUpdates } from '@/lib/updates'
import { SiteFooter } from '@/components/SiteFooter'
import { UpdatesBrowser } from '@/components/updates/UpdatesBrowser'
import { SiteLogo } from '@/components/SiteLogo'

export const metadata = pageMetadata('updates')

// Built from the files in content/updates/ (src/lib/updates.ts): a new file is a new entry, and a file with a
// missing version or date stops the build instead of reaching this page. The LAYOUT follows the owner's pick (a
// small label, a big title, a version list on the left that scrolls by itself and the chosen version on the right);
// the colours, type and corners are Tutafy's own, like the blog index (same header, same label and title style).
export default function UpdatesPage() {
  const updates = loadUpdates()
  return (
    <div className="min-h-screen bg-white">
      {pageJsonLd(PAGE_SEO.updates, 'Updates', 'CollectionPage').map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(d) }} />)}
      <nav className="border-b border-gray-100 px-6 py-4 sticky top-0 bg-white/90 backdrop-blur z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <SiteLogo />
          <div className="flex items-center gap-2">
            <Link href="/blog" className="hidden sm:block text-[13px] font-medium text-gray-600 hover:text-gray-900 px-3 py-2">Blog</Link>
            <Link href="/tutors" className="hidden sm:block text-[13px] font-medium text-gray-600 hover:text-gray-900 px-3 py-2">Find tutors</Link>
            <Link href="/register" className="text-[13px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors px-4 py-2 rounded-lg">Start free</Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-10">
          <p className="text-[12px] font-bold text-indigo-600 uppercase tracking-widest mb-3">Changelog</p>
          <h1 className="text-[44px] sm:text-[64px] font-extrabold text-gray-900 tracking-tight leading-[1.05]">Updates</h1>
          <p className="text-[17px] text-gray-500 mt-4 max-w-xl leading-relaxed">
            What changed in every version of Tutafy, newest first. Pictures use sample data.
          </p>
        </section>

        <div className="border-t border-gray-100">
          <UpdatesBrowser entries={updates} />
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
