import Link from 'next/link'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteLogo } from '@/components/SiteLogo'
import { FindTutorView } from '@/components/find/FindTutorView'
import { getDirectory } from '@/lib/directory-cache'
import { parseFilters, refreshCards } from '@/lib/directory'
import { formFilters } from '@/lib/find-tutor'
import { PAGE_SEO } from '@/lib/page-meta'
import { FIND_TUTOR_FAQ } from '@/lib/site-content'
import { faqPageJsonLd, jsonLdScript, pageJsonLd } from '@/lib/seo'

// "Find me a tutor" (T-0897): a student answers a few questions and gets the three tutors that fit best. The tutors are the public cards of the
// directory (src/lib/directory-cache.ts: only tutors who can be booked today, a fixed list of keys), so the finder cannot show a tutor the
// directory would not. The answers come from the address (?lang=...&level=...), checked against fixed lists like the directory's.
type Params = Record<string, string | string[] | undefined>

/** A form sends an empty value for "Any" next to a chosen one (a button and the "More…" list share the name `lang`): the first value that is not empty wins. */
function firstFilled(params: Params): Params {
  const out: Params = {}
  for (const [k, v] of Object.entries(params)) out[k] = Array.isArray(v) ? (v.find(x => x !== '') ?? '') : v
  return out
}

export default async function FindTutorPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = firstFilled(await searchParams)
  const directory = await getDirectory()
  const now = new Date()
  const cards = directory ? refreshCards(directory.cards, now) : []

  return (
    <div className="dir-page min-h-screen bg-[#F7F8FA]">
      {directory !== null && pageJsonLd(PAGE_SEO.findTutor, 'Find me a tutor', 'CollectionPage').map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(d) }} />)}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPageJsonLd(FIND_TUTOR_FAQ)) }} />
      <header className="bg-white border-b border-gray-100 px-6 py-3.5">
        <div className="max-w-[1120px] mx-auto flex items-center justify-between">
          <SiteLogo size="md" />
          <div className="flex items-center gap-4">
            <Link href="/tutors" className="text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors">All tutors</Link>
            <Link href="/student/login" className="text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors">Student login →</Link>
          </div>
        </div>
      </header>

      {/* a page that could not read the list is an error, not content: it must not be indexed (the status code of a page cannot be set here) */}
      {directory === null && <meta name="robots" content="noindex" />}
      <main>
        <FindTutorView cards={cards} initial={formFilters(parseFilters(params))} nowIso={now.toISOString()} error={directory === null} listed={directory?.listed ?? 0} />
        <section aria-labelledby="find-faq-h" className="max-w-[1120px] mx-auto px-4 pb-12">
          <h2 id="find-faq-h" className="text-[22px] font-extrabold text-gray-900">Questions about finding a tutor</h2>
          <dl className="mt-5 grid gap-x-10 gap-y-6 md:grid-cols-2">
            {FIND_TUTOR_FAQ.map(f => (
              <div key={f.q}>
                <dt className="text-[15px] font-bold text-gray-900">{f.q}</dt>
                <dd className="text-[14px] text-gray-700 mt-1.5 leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
