import Link from 'next/link'
import { ArrowRight, ArrowLeft, TrendingUp } from 'lucide-react'
import { pageMetadata, PAGE_SEO } from '@/lib/page-meta'
import { jsonLdScript, pageJsonLd } from '@/lib/seo'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteLogo } from '@/components/SiteLogo'
import { TestimonialCards } from '@/components/customers/TestimonialCards'
import { TESTIMONIALS, publishable } from '@/lib/testimonials'

export const metadata = pageMetadata('customers')

// The stories come from src/lib/testimonials.ts (T-1032): a tutor appears only with their written consent, and the list is empty until the owner adds a real one
// (docs/testimonials.md). While it is empty this page says so honestly and invites tutors to be the first.
export default function CustomersPage() {
  const stories = publishable(TESTIMONIALS)
  return (
    <div className="min-h-screen bg-white">
      {pageJsonLd(PAGE_SEO.customers, 'Customer stories', 'CollectionPage').map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(d) }} />)}
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <SiteLogo />
          <Link href="/" className="flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-[12px] font-bold text-indigo-600 uppercase tracking-widest mb-3">Customer stories</p>
          <h1 className="text-[36px] font-extrabold text-gray-900 tracking-tight">Tutors growing with Tutafy</h1>
          <p className="text-[16px] text-gray-500 mt-3 max-w-lg mx-auto">
            Real stories from independent tutors and small centers running their whole business in one place.
          </p>
        </div>

        {stories.length > 0 ? (
          <TestimonialCards items={stories} />
        ) : (
          <div className="bg-gray-50 rounded-3xl p-10 md:p-14 text-center" data-testid="customers-empty">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-5">
              <TrendingUp className="h-6 w-6 text-indigo-500" />
            </div>
            <h2 className="text-[24px] font-bold text-gray-900">Your story could be the first</h2>
            <p className="text-[15px] text-gray-500 mt-3 max-w-lg mx-auto leading-relaxed">
              Tutafy is brand new. Join as a founding tutor, and if you love it we&apos;d be honored to feature how you grew your
              tutoring business here.
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-2 mt-7 text-[14px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors px-7 py-3 rounded-xl">
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
