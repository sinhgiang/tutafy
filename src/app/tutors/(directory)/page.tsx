import Link from 'next/link'
import { SiteFooter } from '@/components/SiteFooter'
import { DirectoryView } from '@/components/directory/DirectoryView'
import { getDirectory } from '@/lib/directory-cache'
import { TutorsFaq } from '@/components/directory/TutorsFaq'
import { parseFilters, refreshCards } from '@/lib/directory'
import { SiteLogo } from '@/components/SiteLogo'
import { PAGE_SEO } from '@/lib/page-meta'
import { jsonLdScript, pageJsonLd } from '@/lib/seo'
import { languagePagePath, pickLanguagePages } from '@/lib/language-pages'
import { groupLabelOf, pairGuidePath, pickPairPages } from '@/lib/niche-pages'

// The tutor directory (T-0769): only tutors a student can book today. The list comes from the server (src/lib/directory-cache.ts, kept a few
// minutes), is drawn into the page itself so search engines see real tutors, and DirectoryView does the filters in the browser. The filters
// are read from the address (?lang=...&price=...) with fixed lists, so a made-up address only ever gives a valid state.
export default async function TutorsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const directory = await getDirectory()
  const now = new Date()
  const cards = directory ? refreshCards(directory.cards, now) : []
  const languagePages = pickLanguagePages(cards)
  // the niche pages (/learn/<language>/<group>) that exist right now: the same rule as the sitemap and the language pages (src/lib/niche-pages.ts), so no empty page is linked
  const nichePages = pickPairPages(cards)

  return (
    <div className="dir-page min-h-screen bg-[#F7F8FA]">
      {directory !== null && pageJsonLd(PAGE_SEO.tutors, 'Find tutors', 'CollectionPage', cards.slice(0, 24).map(c => ({ name: c.name, path: `/tutors/${c.slug}` }))).map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(d) }} />)}
      <header className="bg-white border-b border-gray-100 px-6 py-3.5">
        <div className="max-w-[1120px] mx-auto flex items-center justify-between">
          <SiteLogo size="md" />
          <div className="flex items-center gap-4">
            <Link href="/register" className="hidden sm:inline text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors">For tutors</Link>
            <Link href="/student/login" className="text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors">Student login →</Link>
          </div>
        </div>
      </header>

      {/* a page that could not read the list is an error, not content: it must not be indexed (the status code of a page cannot be set here) */}
      {directory === null && <meta name="robots" content="noindex" />}
      <main>
        <DirectoryView cards={cards} listed={directory?.listed ?? 0} truncated={directory?.truncated ?? false}
        initial={parseFilters(params)} nowIso={now.toISOString()} error={directory === null} />
        {languagePages.length > 0 && (
          <nav aria-label="Tutors by language" className="max-w-[1120px] mx-auto px-4 pb-10" data-testid="language-links">
            <h2 className="text-[18px] font-extrabold text-gray-900">Browse tutors by language</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {languagePages.map(p => <li key={p.guide.slug}><Link href={languagePagePath(p.guide.slug)} className="inline-flex items-center min-h-11 px-4 rounded-full border border-gray-300 bg-white text-[14px] font-semibold text-gray-800 hover:border-indigo-300">{p.guide.name} tutors <span className="ml-1.5 text-[12.5px] text-gray-600">{p.count}</span></Link></li>)}
            </ul>
          </nav>
        )}
        {nichePages.length > 0 && (
          <nav aria-label="Tutors by reason for learning" className="max-w-[1120px] mx-auto px-4 pb-10" data-testid="niche-links">
            <h2 className="text-[18px] font-extrabold text-gray-900">Browse tutors by reason for learning</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {nichePages.map(n => <li key={pairGuidePath(n.guide)}><Link href={pairGuidePath(n.guide)} className="inline-flex items-center min-h-11 px-4 rounded-full border border-gray-300 bg-white text-[14px] font-semibold text-gray-800 hover:border-indigo-300">{n.guide.language} for {groupLabelOf(n.guide.group).toLowerCase()} <span className="ml-1.5 text-[12.5px] text-gray-600">{n.count}</span></Link></li>)}
            </ul>
          </nav>
        )}
        {cards.length > 0 && <TutorsFaq />}
      </main>

      <SiteFooter />
    </div>
  )
}
