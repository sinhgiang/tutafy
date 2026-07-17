import type { Metadata } from 'next'
import Link from 'next/link'
import { GraduationCap, ArrowLeft, ArrowRight, Heart, Shield, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About Tutafy',
  description: 'Why we built Tutafy: an all-in-one home for independent tutors that never takes a cut of your income.',
}

const VALUES = [
  { icon: Shield, title: 'Your income is yours', desc: 'We charge tutors a small flat fee and take 0% commission on your lessons — forever. You earn it, you keep it.' },
  { icon: Heart, title: 'Built for real tutors', desc: 'Not agencies, not enterprises. Independent tutors and small centers who wear every hat and just want the busywork gone.' },
  { icon: Sparkles, title: 'Software should give time back', desc: 'AI drafts your lessons and reports, automation handles reminders and payments — so you spend your evenings living, not admin-ing.' },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
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

      <section className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-[12px] font-bold text-indigo-500 uppercase tracking-widest mb-3">Our story</p>
        <h1 className="text-[38px] font-extrabold text-gray-900 tracking-tight leading-tight">
          Tutoring should pay the tutor — not the middleman.
        </h1>

        <div className="mt-8 space-y-5 text-[15px] text-gray-700 leading-relaxed">
          <p>
            Tutafy started with a frustration a lot of tutors know well. You&apos;re great at teaching — but the business
            around it is a mess. Bookings live in one app, video in another, payments in a third, and your student notes
            in a spreadsheet you keep forgetting to update. And if you teach on a marketplace, a fifth to a third of every
            lesson quietly disappears before it reaches you.
          </p>
          <p>
            We didn&apos;t think that was fair. Tutors do the hard, human work of helping someone learn. The software should
            make that easier and get out of the way — not take a cut of it.
          </p>
          <p>
            So we built Tutafy: one place to manage students, take bookings, teach in a built-in video classroom, get paid,
            and generate lessons with AI. One flat, honest price. And a promise we don&apos;t plan to ever break —
            <b> we take 0% commission on what your students pay you.</b>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
          {VALUES.map(v => (
            <div key={v.title} className="bg-gray-50 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center mb-3">
                <v.icon className="h-5 w-5 text-indigo-500" />
              </div>
              <p className="text-[14px] font-bold text-gray-900">{v.title}</p>
              <p className="text-[12px] text-gray-500 mt-1.5 leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 space-y-5 text-[15px] text-gray-700 leading-relaxed">
          <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">Where we are today</h2>
          <p>
            We&apos;re a young company, building in the open and shipping improvements every week. That means you get a modern,
            fast product — and a real say in where it goes next. The tutors who join now aren&apos;t just customers; they&apos;re
            the founding voices shaping Tutafy.
          </p>
          <p>
            If that sounds like your kind of company, we&apos;d love to have you.
          </p>
        </div>

        <div className="mt-10">
          <Link href="/register" className="inline-flex items-center gap-2 text-[14px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-7 py-3.5 rounded-xl">
            Start free — no credit card <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
