import { TUTORS_FAQ } from '@/lib/site-content'
import { faqPageJsonLd, jsonLdScript } from '@/lib/seo'

// The questions under the tutor directory (T-0850): printed in full, so people and AI assistants read the same answers, and the
// FAQPage data is built from the same list (src/lib/site-content.ts), so the markup never says more than the page.
export function TutorsFaq() {
  return (
    <section aria-labelledby="tutors-faq" className="max-w-[1120px] mx-auto px-6 pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPageJsonLd(TUTORS_FAQ)) }} />
      <h2 id="tutors-faq" className="text-[22px] font-extrabold text-gray-900 tracking-tight">Booking a tutor on Tutafy</h2>
      <dl className="mt-5 grid gap-x-10 gap-y-6 md:grid-cols-2">
        {TUTORS_FAQ.map(f => (
          <div key={f.q}>
            <dt className="text-[15px] font-bold text-gray-900">{f.q}</dt>
            <dd className="text-[14px] text-gray-600 mt-1.5 leading-relaxed">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
