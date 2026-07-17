import type { Metadata } from 'next'
import Link from 'next/link'
import { GraduationCap, ArrowRight } from 'lucide-react'
import { POSTS, readingMinutes, heroFor } from '@/lib/blog'
import { BlogList, type BlogCard } from '@/components/blog/BlogList'

export const metadata: Metadata = {
  title: 'Blog — tips & guides for online tutors',
  description: 'Practical advice on getting students, running your tutoring business, and keeping 100% of what you earn.',
}

export default function BlogPage() {
  const cards: BlogCard[] = [...POSTS]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(p => ({ slug: p.slug, title: p.title, description: p.description, category: p.category, date: p.date, author: p.author, minutes: readingMinutes(p), hero: heroFor(p.slug) }))

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 sticky top-0 bg-white/90 backdrop-blur z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center">
              <GraduationCap className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <span className="text-[17px] font-bold text-gray-900">Tutafy</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/tutors" className="hidden sm:block text-[13px] font-medium text-gray-600 hover:text-gray-900 px-3 py-2">Find tutors</Link>
            <Link href="/register" className="text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-4 py-2 rounded-lg">Start free</Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-10">
        <p className="text-[12px] font-bold text-indigo-500 uppercase tracking-widest mb-3">The Tutafy blog</p>
        <h1 className="text-[40px] sm:text-[48px] font-extrabold text-gray-900 tracking-tight leading-[1.05] max-w-2xl">
          Tips & guides for online tutors
        </h1>
        <p className="text-[17px] text-gray-500 mt-4 max-w-xl leading-relaxed">
          Getting students, running the business side, and keeping more of what you earn — no fluff, just what works.
        </p>
      </section>

      {/* Posts */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <BlogList posts={cards} />
      </section>

      {/* Bottom CTA */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto bg-indigo-500 rounded-3xl px-8 py-12 text-center">
          <h2 className="text-[28px] font-extrabold text-white tracking-tight">Ready to run your tutoring business your way?</h2>
          <p className="text-[15px] text-indigo-100 mt-3 max-w-lg mx-auto">Bookings, video, payments and AI tools in one place — free, with 0% commission.</p>
          <Link href="/register" className="inline-flex items-center gap-2 mt-6 text-[14px] font-bold text-indigo-600 bg-white hover:bg-indigo-50 transition-colors px-7 py-3.5 rounded-xl">
            Start free — no credit card <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-500 rounded-lg flex items-center justify-center"><GraduationCap className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-[14px] font-bold text-gray-900">Tutafy</span>
          </div>
          <div className="flex gap-5">
            <Link href="/about" className="text-[12px] text-gray-400 hover:text-gray-600">About</Link>
            <Link href="/contact" className="text-[12px] text-gray-400 hover:text-gray-600">Contact</Link>
            <Link href="/privacy" className="text-[12px] text-gray-400 hover:text-gray-600">Privacy</Link>
            <Link href="/terms" className="text-[12px] text-gray-400 hover:text-gray-600">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
