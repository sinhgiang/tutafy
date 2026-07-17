import type { Metadata } from 'next'
import Link from 'next/link'
import { GraduationCap, ArrowRight, ArrowLeft, TrendingUp, Quote } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Customer stories',
  description: 'How independent tutors and small tutoring centers run and grow their business with Tutafy.',
}

// Add a real case study here once a tutor agrees to be featured. Keep it honest —
// only publish stories from actual customers (with their permission).
const CASE_STUDIES: {
  slug: string; name: string; role: string; summary: string; quote: string
  metrics: { label: string; value: string }[]
}[] = []

export default function CustomersPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center">
              <GraduationCap className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <span className="text-[17px] font-bold text-gray-900">Tutafy</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>
      </nav>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-[12px] font-bold text-indigo-500 uppercase tracking-widest mb-3">Customer stories</p>
          <h1 className="text-[36px] font-extrabold text-gray-900 tracking-tight">Tutors growing with Tutafy</h1>
          <p className="text-[16px] text-gray-500 mt-3 max-w-lg mx-auto">
            Real stories from independent tutors and small centers running their whole business in one place.
          </p>
        </div>

        {CASE_STUDIES.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {CASE_STUDIES.map(c => (
              <div key={c.slug} className="bg-white rounded-2xl border border-gray-100 p-7">
                <Quote className="h-6 w-6 text-indigo-200 mb-3" />
                <p className="text-[15px] text-gray-700 leading-relaxed">{c.quote}</p>
                <div className="flex gap-6 mt-6 mb-5">
                  {c.metrics.map(m => (
                    <div key={m.label}>
                      <p className="text-[22px] font-bold text-indigo-600">{m.value}</p>
                      <p className="text-[11px] text-gray-400">{m.label}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-50 pt-4">
                  <p className="text-[13px] font-semibold text-gray-900">{c.name}</p>
                  <p className="text-[12px] text-gray-400">{c.role}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-3xl p-10 md:p-14 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-5">
              <TrendingUp className="h-6 w-6 text-indigo-500" />
            </div>
            <h2 className="text-[24px] font-bold text-gray-900">Your story could be the first</h2>
            <p className="text-[15px] text-gray-500 mt-3 max-w-lg mx-auto leading-relaxed">
              Tutafy is brand new. Join as a founding tutor, and if you love it we'd be honored to feature how you grew your
              tutoring business here.
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-2 mt-7 text-[14px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-7 py-3 rounded-xl">
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
