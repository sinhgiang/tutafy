import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteLogo } from '@/components/SiteLogo'
import { TutorCard } from '@/components/directory/TutorCard'
import { getDirectory } from '@/lib/directory-cache'
import { refreshCards } from '@/lib/directory'
import { guideFor, pickLanguagePages, tutorsOf, languagePagePath, NICHE_MIN_TUTORS } from '@/lib/language-pages'
import { groupLabelOf, pairGuidePath, pickPairPages } from '@/lib/niche-pages'
import { languagePageMetadata } from '@/lib/page-meta'
import { faqPageJsonLd, jsonLdScript, pageJsonLd } from '@/lib/seo'

// A language page (T-0875): /learn/<language>. It exists only while the language has a written guide AND at least NICHE_MIN_TUTORS tutors who can be
// booked today (src/lib/language-pages.ts decides, the sitemap and /llms-languages.txt ask the same function). Anything else is a 404: no empty page.
// The tutors drawn are the same public cards as /tutors (src/lib/directory.ts: a fixed list of keys, never anything private).
const SHOWN = 12

type Props = { params: Promise<{ language: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = guideFor((await params).language)
  if (!guide) return { title: 'Page not found', robots: { index: false, follow: false } }
  return languagePageMetadata(guide)
}

const longDate = (iso: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso))

export default async function LanguagePage({ params }: Props) {
  const slug = (await params).language
  const guide = guideFor(slug)
  if (!guide) notFound()
  const directory = await getDirectory()
  const now = new Date()
  const cards = directory?.open ? refreshCards(directory.cards, now) : []
  const pages = pickLanguagePages(cards)
  const mine = pages.find(p => p.guide.slug === guide.slug)
  // The list could not be read: say so, and keep it out of search results. A language that simply has too few tutors is a 404.
  if (directory === null) {
    return (
      <Shell>
        <meta name="robots" content="noindex" />
        <div className="max-w-[760px] mx-auto px-4 py-16">
          <h1 className="text-[28px] font-extrabold text-gray-900">We could not load the {guide.name} tutors</h1>
          <p className="mt-3 text-[15px] text-gray-600">Check your connection and try again, or <Link href="/tutors" className="font-bold text-indigo-700 underline underline-offset-2">see all tutors</Link>.</p>
        </div>
      </Shell>
    )
  }
  if (!mine) notFound()

  const tutors = tutorsOf(cards, guide)
  const shown = tutors.slice(0, SHOWN)
  const others = pages.filter(p => p.guide.slug !== guide.slug)
  const niches = pickPairPages(cards).filter(p => p.guide.languageSlug === guide.slug)
  const filterLink = (query: string) => `/tutors?lang=${guide.name}${query}`
  const seo = { path: languagePagePath(guide.slug), title: guide.title, description: guide.description }

  return (
    <Shell>
      {pageJsonLd(seo, `${guide.name} tutors`, 'CollectionPage', shown.map(c => ({ name: c.name, path: `/tutors/${c.slug}` }))).map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(d) }} />)}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPageJsonLd(guide.faq)) }} />
      <div className="max-w-[1120px] mx-auto px-4 pt-[18px] pb-10 min-[721px]:pt-7 min-[721px]:pb-14">
        <nav aria-label="Breadcrumb" className="text-[13px] text-gray-600">
          <Link href="/" className="hover:underline">Home</Link> <span aria-hidden="true">/</span> <Link href="/tutors" className="hover:underline">Find tutors</Link> <span aria-hidden="true">/</span> <span aria-current="page">{guide.name}</span>
        </nav>
        <h1 className="mt-3 text-[28px] min-[721px]:text-[36px] leading-[1.1] tracking-tight font-extrabold text-gray-900">{guide.name} tutors you can book today</h1>
        <p className="mt-3 text-[16px] min-[721px]:text-[17px] text-gray-700 max-w-[720px] leading-relaxed" data-testid="language-answer">{guide.answer}</p>
        <p className="mt-2.5 text-[13px] text-gray-600" data-testid="language-facts">{mine.count} {mine.count === 1 ? 'tutor' : 'tutors'} teach {guide.name} and have open times in the next 14 days. List updated {longDate(directory.asOf)}.</p>

        <section aria-labelledby="tutors-h" className="mt-7">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h2 id="tutors-h" className="text-[22px] font-extrabold text-gray-900">{guide.name} tutors with open times</h2>
            <Link href={filterLink('')} className="text-[14px] font-bold text-indigo-700 underline underline-offset-2" data-testid="language-all">See all {guide.name} tutors with filters</Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3.5 min-[721px]:grid-cols-2 min-[721px]:gap-5 min-[1001px]:grid-cols-3" data-testid="language-grid">
            {shown.map(c => <TutorCard key={c.slug} card={c} zone={c.tz} viewerZone={null} now={now} />)}
          </div>
          <p className="mt-3 text-[13px] text-gray-600">Times are shown in each tutor&apos;s own time zone. Open a tutor to see free times in yours.</p>
        </section>

        <section aria-labelledby="learn-h" className="mt-10 max-w-[760px]">
          <h2 id="learn-h" className="text-[22px] font-extrabold text-gray-900">How learning {guide.name} with a tutor works</h2>
          {guide.learn.map(p => <p key={p.slice(0, 24)} className="mt-3 text-[15px] text-gray-700 leading-relaxed">{p}</p>)}
          <ul className="mt-4 flex flex-wrap gap-2" aria-label={`Common reasons to learn ${guide.name}`}>
            {guide.goals.map(g => <li key={g} className="text-[13px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1">{g}</li>)}
          </ul>
        </section>

        <section aria-labelledby="choose-h" className="mt-10">
          <h2 id="choose-h" className="text-[22px] font-extrabold text-gray-900">How to choose a {guide.name} tutor</h2>
          <ol className="mt-4 grid gap-4 min-[721px]:grid-cols-2">
            {guide.choose.map((c, i) => (
              <li key={c.title} className="bg-white border border-gray-100 rounded-[18px] p-5 shadow-sm">
                <p className="text-[12px] font-bold text-indigo-700">Step {i + 1}</p>
                <h3 className="mt-1 text-[16px] font-extrabold text-gray-900">{c.title}</h3>
                <p className="mt-1.5 text-[14px] text-gray-700 leading-relaxed">{c.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {niches.length > 0 && (
          <section aria-labelledby="niche-h" className="mt-10" data-testid="language-niches">
            <h2 id="niche-h" className="text-[22px] font-extrabold text-gray-900">{guide.name} for a specific reason</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {niches.map(n => <li key={pairGuidePath(n.guide)}><Link href={pairGuidePath(n.guide)} className="inline-flex items-center min-h-11 px-4 rounded-full border border-gray-300 bg-white text-[14px] font-semibold text-gray-800 hover:border-indigo-300">{guide.name} for {groupLabelOf(n.guide.group).toLowerCase()} <span className="ml-1.5 text-[12.5px] text-gray-600">{n.count}</span></Link></li>)}
            </ul>
          </section>
        )}

        <section aria-labelledby="refine-h" className="mt-10">
          <h2 id="refine-h" className="text-[22px] font-extrabold text-gray-900">Narrow the list</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {[
              ['Beginner level', '&level=beginner'], ['Intermediate level', '&level=intermediate'], ['Advanced level', '&level=advanced'],
              ['With a trial lesson', '&trial=1'], ['Up to $15 a lesson', '&price=up15'], ['Free in the evening', '&tod=evening'],
            ].map(([label, q]) => (
              <li key={label}><Link href={filterLink(q)} className="inline-flex items-center min-h-11 px-4 rounded-full border border-gray-300 bg-white text-[14px] font-semibold text-gray-800 hover:border-indigo-300">{label}</Link></li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="faq-h" className="mt-10">
          <h2 id="faq-h" className="text-[22px] font-extrabold text-gray-900">Questions about learning {guide.name} online</h2>
          <dl className="mt-5 grid gap-x-10 gap-y-6 md:grid-cols-2">
            {guide.faq.map(f => (
              <div key={f.q}>
                <dt className="text-[15px] font-bold text-gray-900">{f.q}</dt>
                <dd className="text-[14px] text-gray-600 mt-1.5 leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {others.length > 0 && (
          <nav aria-label="Other languages" className="mt-10">
            <h2 className="text-[16px] font-extrabold text-gray-900">Other languages</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {others.map(o => <li key={o.guide.slug}><Link href={languagePagePath(o.guide.slug)} className="inline-flex items-center min-h-11 px-4 rounded-full border border-gray-300 bg-white text-[14px] font-semibold text-gray-800 hover:border-indigo-300">{o.guide.name} tutors</Link></li>)}
              <li><Link href="/tutors" className="inline-flex items-center min-h-11 px-4 rounded-full border border-gray-300 bg-white text-[14px] font-semibold text-gray-800 hover:border-indigo-300">All tutors</Link></li>
            </ul>
          </nav>
        )}
        <p className="mt-8 text-[12.5px] text-gray-600">A language gets its own page here once at least {NICHE_MIN_TUTORS} tutors who can be booked today teach it.</p>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dir-page min-h-screen bg-[#F7F8FA]">
      <header className="bg-white border-b border-gray-100 px-6 py-3.5">
        <div className="max-w-[1120px] mx-auto flex items-center justify-between">
          <SiteLogo size="md" />
          <div className="flex items-center gap-4">
            <Link href="/register" className="hidden sm:inline text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors">For tutors</Link>
            <Link href="/student/login" className="text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors">Student login →</Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <SiteFooter />
    </div>
  )
}
