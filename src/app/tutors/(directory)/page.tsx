import Link from 'next/link'
import { SiteFooter } from '@/components/SiteFooter'
import { DirectoryView } from '@/components/directory/DirectoryView'
import { getDirectory } from '@/lib/directory-cache'
import { TutorsFaq } from '@/components/directory/TutorsFaq'
import { parseFilters, refreshCards } from '@/lib/directory'
import { SiteLogo } from '@/components/SiteLogo'

// The tutor directory (T-0769): only tutors a student can book today. The list comes from the server (src/lib/directory-cache.ts, kept a few
// minutes), is drawn into the page itself so search engines see real tutors, and DirectoryView does the filters in the browser. The filters
// are read from the address (?lang=...&price=...) with fixed lists, so a made-up address only ever gives a valid state.
export default async function TutorsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const directory = await getDirectory()
  const now = new Date()
  const cards = directory ? refreshCards(directory.cards, now) : []

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
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
        {cards.length > 0 && <TutorsFaq />}
      </main>

      <SiteFooter />
    </div>
  )
}
