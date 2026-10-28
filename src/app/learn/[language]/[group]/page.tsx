import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteLogo } from '@/components/SiteLogo'
import { TutorCard } from '@/components/directory/TutorCard'
import { getDirectory } from '@/lib/directory-cache'
import { refreshCards } from '@/lib/directory'
import { guideFor, pickLanguagePages, languagePagePath } from '@/lib/language-pages'
import { PAIR_MIN_TUTORS, groupLabelOf, pairGuideFor, pairGuidePath, pickPairPages, tutorsOfPair } from '@/lib/niche-pages'
import { pairPageMetadata } from '@/lib/page-meta'
import { faqPageJsonLd, jsonLdScript, pageJsonLd } from '@/lib/seo'

// A niche page (T-1033): /learn/<language>/<group>, for example /learn/english/working-professionals. It exists only while the pair has a guide written
// by hand AND at least PAIR_MIN_TUTORS tutors who can be booked today teach the language and ticked the group (src/lib/niche-pages.ts decides, the
// sitemap and /llms-languages.txt ask the same function). Anything else is a 404: no empty page, no copy of another page with one word changed.
// The tutors drawn are the same public cards as /tutors (src/lib/directory.ts: a fixed list of keys, never anything private).
const SHOWN = 12

type Props = { params: Promise<{ language: string; group: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { language, group } = await params
  const guide = pairGuideFor(language, group)
  if (!guide) return { title: 'Page not found', robots: { index: false, follow: false } }
  return pairPageMetadata(guide)
}

const longDate = (iso: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso))
const CHIP = 'inline-flex items-center min-h-11 px-4 rounded-full border border-gray-300 bg-white text-[14px] font-semibold text-gray-800 hover:border-indigo-300'

export default async function NichePage({ params }: Props) {
  const { language, group } = await params
  const guide = pairGuideFor(language, group)
  if (!guide) notFound()
  const directory = await getDirectory()
  const now = new Date()
  const cards = directory?.open ? refreshCards(directory.cards, now) : []
  // The list could not be read: say so, and keep it out of search results. A pair that simply has too few tutors is a 404.
  if (directory === null) {
    return (
      <Shell>
        <meta name="robots" content="noindex" />
        <div className="max-w-[760px] mx-auto px-4 py-16">
          <h1 className="text-[28px] font-extrabold text-gray-900">We could not load these tutors</h1>
          <p className="mt-3 text-[15px] text-gray-600">Check your connection and try again, or <Link href="/tutors" className="font-bold text-indigo-700 underline underline-offset-2">see all tutors</Link>.</p>
        </div>
      </Shell>
    )
  }
  const pages = pickPairPages(cards)
  const mine = pages.find(p => p.guide === guide)
  if (!mine) notFound()

  const tutors = tutorsOfPair(cards, guide)
  const shown = tutors.slice(0, SHOWN)
  const label = groupLabelOf(guide.group)
  const langGuide = guideFor(guide.languageSlug)
  const hasLanguagePage = pickLanguagePages(cards).some(p => p.guide.slug === guide.languageSlug)
  const related = pages.filter(p => p.guide !== guide)
  const filterLink = (query: string) => `/tutors?lang=${guide.language}&for=${guide.group}${query}`
  const seo = { path: pairGuidePath(guide), title: guide.title, description: guide.description }

  return (
    <Shell>
      {pageJsonLd(seo, guide.title.replace(/ \| Tutafy$/, ''), 'CollectionPage', shown.map(c => ({ name: c.name, path: `/tutors/${c.slug}` }))).map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(d) }} />)}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPageJsonLd(guide.faq)) }} />
      <div className="max-w-[1120px] mx-auto px-4 pt-[18px] pb-10 min-[721px]:pt-7 min-[721px]:pb-14">
        <nav aria-label="Breadcrumb" className="text-[13px] text-gray-600">
          <Link href="/" className="hover:underline">Home</Link> <span aria-hidden="true">/</span> <Link href="/tutors" className="hover:underline">Find tutors</Link> <span aria-hidden="true">/</span>{' '}
          {hasLanguagePage ? <Link href={languagePagePath(guide.languageSlug)} className="hover:underline">{guide.language}</Link> : <span>{guide.language}</span>} <span aria-hidden="true">/</span> <span aria-current="page">{label}</span>
        </nav>
        <h1 className="mt-3 text-[28px] min-[721px]:text-[36px] leading-[1.1] tracking-tight font-extrabold text-gray-900">{guide.title.replace(/ \| Tutafy$/, '')}</h1>
        <p className="mt-3 text-[16px] min-[721px]:text-[17px] text-gray-700 max-w-[720px] leading-relaxed" data-testid="niche-answer">{guide.answer}</p>
        <p className="mt-2.5 text-[13px] text-gray-600" data-testid="niche-facts">{mine.count} {mine.count === 1 ? 'tutor teaches' : 'tutors teach'} {guide.language} for {label.toLowerCase()} and {mine.count === 1 ? 'has' : 'have'} open times in the next 14 days. List updated {longDate(directory.asOf)}.</p>

        <section aria-labelledby="tutors-h" className="mt-7">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h2 id="tutors-h" className="text-[22px] font-extrabold text-gray-900">{guide.language} tutors for {label.toLowerCase()}</h2>
            <Link href={filterLink('')} className="text-[14px] font-bold text-indigo-700 underline underline-offset-2" data-testid="niche-all">See these tutors with filters</Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3.5 min-[721px]:grid-cols-2 min-[721px]:gap-5 min-[1001px]:grid-cols-3" data-testid="niche-grid">
            {shown.map(c => <TutorCard key={c.slug} card={c} zone={c.tz} viewerZone={null} now={now} />)}
          </div>
          <p className="mt-3 text-[13px] text-gray-600">Times are shown in each tutor&apos;s own time zone. Open a tutor to see free times in yours.</p>
        </section>

        <section aria-labelledby="situations-h" className="mt-10">
          <h2 id="situations-h" className="text-[22px] font-extrabold text-gray-900">What you actually practise</h2>
          <ul className="mt-4 grid gap-4 min-[721px]:grid-cols-2" data-testid="niche-situations">
            {guide.situations.map(s => (
              <li key={s.title} className="bg-white border border-gray-100 rounded-[18px] p-5 shadow-sm">
                <h3 className="text-[16px] font-extrabold text-gray-900">{s.title}</h3>
                <p className="mt-1.5 text-[14px] text-gray-700 leading-relaxed">{s.text}</p>
                <p className="mt-3 text-[14px] text-gray-900 border-l-2 border-indigo-300 pl-3"><span className="sr-only">Example sentence: </span>“{s.sample}”</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="plan-h" className="mt-10 max-w-[820px]">
          <h2 id="plan-h" className="text-[22px] font-extrabold text-gray-900">A plan you can follow with your tutor</h2>
          <p className="mt-2 text-[14px] text-gray-600">Four blocks of two weeks. Your tutor will change it to fit your level and your date, so treat it as a starting point.</p>
          <ol className="mt-4 grid gap-3" data-testid="niche-plan">
            {guide.plan.map(p => (
              <li key={p.weeks} className="grid gap-1 min-[721px]:grid-cols-[130px_1fr] min-[721px]:gap-4 border-t border-gray-200 pt-3">
                <b className="text-[14px] text-indigo-700">{p.weeks}</b>
                <span className="text-[14.5px] text-gray-700 leading-relaxed">{p.text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="choose-h" className="mt-10">
          <h2 id="choose-h" className="text-[22px] font-extrabold text-gray-900">How to choose</h2>
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

        <section aria-labelledby="refine-h" className="mt-10">
          <h2 id="refine-h" className="text-[22px] font-extrabold text-gray-900">Narrow the list</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {[
              ['Beginner level', '&level=beginner'], ['Intermediate level', '&level=intermediate'], ['Advanced level', '&level=advanced'],
              ['With a trial lesson', '&trial=1'], ['Free in the evening', '&tod=evening'],
            ].map(([text, q]) => <li key={text}><Link href={filterLink(q)} className={CHIP}>{text}</Link></li>)}
          </ul>
        </section>

        <section aria-labelledby="faq-h" className="mt-10">
          <h2 id="faq-h" className="text-[22px] font-extrabold text-gray-900">Questions people ask</h2>
          <dl className="mt-5 grid gap-x-10 gap-y-6 md:grid-cols-2">
            {guide.faq.map(f => (
              <div key={f.q}>
                <dt className="text-[15px] font-bold text-gray-900">{f.q}</dt>
                <dd className="text-[14px] text-gray-600 mt-1.5 leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <nav aria-label="Related pages" className="mt-10">
          <h2 className="text-[16px] font-extrabold text-gray-900">Related</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {hasLanguagePage && langGuide && <li><Link href={languagePagePath(langGuide.slug)} className={CHIP}>All {guide.language} tutors</Link></li>}
            {related.map(r => <li key={pairGuidePath(r.guide)}><Link href={pairGuidePath(r.guide)} className={CHIP}>{r.guide.language} for {groupLabelOf(r.guide.group).toLowerCase()}</Link></li>)}
            <li><Link href="/tutors" className={CHIP}>All tutors</Link></li>
          </ul>
        </nav>
        <p className="mt-8 text-[12.5px] text-gray-600">This page exists while at least {PAIR_MIN_TUTORS} tutors who can be booked today teach {guide.language} and have ticked {label.toLowerCase()}.</p>
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
