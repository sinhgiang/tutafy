import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  GraduationCap, Users, Calendar, Sparkles, BookOpen, ArrowRight, Check, X,
  Video, CreditCard, Shield, Lock, Quote, Star,
  TrendingUp, Clock, HeartHandshake,
} from 'lucide-react'
import { OAuthCatcher } from '@/components/OAuthCatcher'

// Real testimonials only — add an entry the moment a tutor gives you a genuine
// quote. Never invent fake reviews. While empty, an honest "founding tutor"
// invite shows instead.
const TESTIMONIALS: { name: string; role: string; quote: string; initials: string }[] = []

const TRUST = [
  { icon: Shield, title: '0% commission', desc: 'Keep 100% of what your students pay you — on every plan.' },
  { icon: Lock, title: 'Your data is yours', desc: 'Export students, lessons and payments anytime.' },
  { icon: CreditCard, title: 'Secure payments', desc: 'Powered by Stripe, PayPal & Paddle.' },
  { icon: Check, title: 'Free forever', desc: 'No credit card required to get started.' },
]

const PAINS = [
  { icon: TrendingUp, text: 'Marketplaces skim 20–33% off every lesson you teach — and 100% of your trials.' },
  { icon: Clock, text: 'Your week disappears into Zoom links, Calendly, spreadsheets and WhatsApp.' },
  { icon: CreditCard, text: 'You chase students for payments instead of preparing great lessons.' },
  { icon: BookOpen, text: 'Lesson prep, homework and progress reports eat the evenings you don\'t get paid for.' },
]

const FEATURES = [
  { icon: Calendar, title: 'Bookings that fill themselves', desc: 'Share one link. Students see your real availability in their timezone and book — no emails, no double-bookings.', color: 'bg-violet-50 text-violet-500' },
  { icon: Video, title: 'A classroom built right in', desc: 'HD video with one click. No Zoom, no downloads, no 40-minute cut-off. Or connect your own Zoom / Google Meet.', color: 'bg-rose-50 text-rose-500' },
  { icon: Sparkles, title: 'An AI teaching assistant', desc: 'Lesson plans, homework, feedback and progress reports written in seconds — tailored to each student.', color: 'bg-amber-50 text-amber-500' },
  { icon: CreditCard, title: 'Get paid, keep it all', desc: 'PayPal, card and packages. Money lands in your account — Tutafy never takes a cut of your income.', color: 'bg-emerald-50 text-emerald-500' },
  { icon: Users, title: 'Every student, organized', desc: 'Goals, notes, level and full lesson history in one profile. Finally out of the spreadsheet.', color: 'bg-indigo-50 text-indigo-500' },
  { icon: GraduationCap, title: 'Portals parents love', desc: 'Students and parents get their own login with lessons, homework, progress and vocab quizzes.', color: 'bg-blue-50 text-blue-500' },
]

const COMPARE = [
  { label: 'Commission on your income', tutafy: '0%', market: '20–33%' },
  { label: 'Built-in video classroom', tutafy: true, market: false },
  { label: 'AI lesson & homework tools', tutafy: true, market: false },
  { label: 'You own the student relationship', tutafy: true, market: false },
  { label: 'Monthly price', tutafy: 'From $0', market: 'Free, but takes a cut' },
]

const HOW = [
  { step: '01', title: 'Create your free account', desc: 'Set up your tutor profile in under two minutes. No credit card.' },
  { step: '02', title: 'Add students & availability', desc: 'Import from another platform or add them in seconds, then set your hours.' },
  { step: '03', title: 'Share your link & teach', desc: 'Students book, pay and join class — you just show up and teach.' },
]

const FAQ = [
  { q: 'Is it really free?', a: 'Yes. The Free plan covers up to 10 students with bookings, video and reminders — forever, no card required. Upgrade only when you outgrow it.' },
  { q: 'Do you take a commission on my earnings?', a: 'Never. Unlike marketplaces, Tutafy takes 0% of what your students pay you — on every plan. You only pay your normal payment-processor fee.' },
  { q: 'Do my students need to download anything?', a: 'No. Students book, join the video classroom and see their homework right in the browser — nothing to install.' },
  { q: 'Can I move over from Preply, iTalki or a spreadsheet?', a: 'Yes. Import your students from a CSV in a couple of clicks and pick up right where you left off.' },
  { q: 'What if I have a small team?', a: 'The Academy plan adds up to 5 tutors with team scheduling and built-in payroll — pay each tutor per lesson, per hour or on a revenue share.' },
  { q: 'Can I cancel anytime?', a: 'Anytime, in one click. No lock-in, no contracts, no hidden fees.' },
]

const PLANS = [
  {
    name: 'Free', price: '$0', per: '', tagline: 'Everything you need to start',
    features: ['Up to 10 students', 'Booking page', 'Built-in video classroom', 'Email & SMS reminders', 'Scheduling'],
    cta: 'Start for free', href: '/register', highlight: false, badge: '',
  },
  {
    name: 'Pro', price: '$12', per: '/mo', tagline: 'For serious independent tutors',
    features: ['Unlimited students', 'All 10 AI teaching tools', 'Payments (PayPal / card)', 'Full analytics & reports', 'Public API & Zapier'],
    cta: 'Go Pro', href: '/upgrade', highlight: true, badge: 'Most popular',
  },
  {
    name: 'Academy', price: '$29', per: '/mo', tagline: 'For small teams & centers',
    features: ['Everything in Pro', 'Up to 5 tutors', 'Team payroll & split pay', 'Booking page per tutor', 'Priority support'],
    cta: 'Start Academy', href: '/upgrade', highlight: false, badge: '',
  },
]

export default async function LandingPage({ searchParams }: { searchParams: Promise<{ code?: string; next?: string }> }) {
  const { code, next } = await searchParams
  if (code) {
    const qs = new URLSearchParams({ code })
    if (next) qs.set('next', next)
    redirect(`/auth/callback?${qs.toString()}`)
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Tutafy',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'All-in-one software for online tutors: bookings, a built-in video classroom, payments, AI teaching tools, and student & parent portals — with 0% commission.',
    url: (process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutafy.com').replace(/[﻿​\s]/g, '').replace(/\/+$/, '') || 'https://tutafy.com',
    offers: [
      { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Pro', price: '12', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Academy', price: '29', priceCurrency: 'USD' },
    ],
  }

  return (
    <OAuthCatcher>
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 sticky top-0 bg-white/90 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center">
              <GraduationCap className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <span className="text-[17px] font-bold text-gray-900">Tutafy</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/blog" className="hidden sm:block text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2">Blog</Link>
            <Link href="/tutors" className="hidden md:block text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2">Find tutors</Link>
            <Link href="/login" className="text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2">Log in</Link>
            <Link href="/register" className="text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-4 py-2 rounded-lg">Start free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-7">
          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
          <span className="text-[12px] font-semibold text-indigo-700">Built for independent tutors & small centers</span>
        </div>
        <h1 className="text-[34px] sm:text-[46px] md:text-[56px] font-extrabold text-gray-900 leading-[1.05] tracking-tight max-w-4xl mx-auto">
          Run your whole tutoring business in one place —{' '}
          <span className="text-indigo-500">and keep 100% of what you earn.</span>
        </h1>
        <p className="text-[18px] text-gray-500 mt-6 max-w-2xl mx-auto leading-relaxed">
          Bookings, a built-in video classroom, payments, and AI lesson tools — everything you're juggling
          across five apps, finally in one. Free to start, and we never take a cut of your income.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-9">
          <Link href="/register" className="flex items-center gap-2 text-[15px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-7 py-3.5 rounded-xl shadow-lg shadow-indigo-200 w-full sm:w-auto justify-center">
            Start free — no credit card <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#how" className="text-[15px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors px-7 py-3.5 rounded-xl w-full sm:w-auto text-center">
            See how it works
          </a>
        </div>
        <p className="text-[12px] text-gray-400 mt-4">Free forever · Set up in 2 minutes · Cancel anytime</p>

        {/* Hero product mockup — framed like a browser for realism */}
        <div className="mt-14 max-w-4xl mx-auto">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-2xl shadow-indigo-100/60 overflow-hidden text-left">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 h-10 bg-gray-50 border-b border-gray-100">
              <span className="w-3 h-3 rounded-full bg-red-300" />
              <span className="w-3 h-3 rounded-full bg-amber-300" />
              <span className="w-3 h-3 rounded-full bg-emerald-300" />
              <div className="ml-3 flex-1 max-w-xs h-5 rounded-md bg-white border border-gray-100 flex items-center px-2">
                <span className="text-[10px] text-gray-400">app.tutafy.com/dashboard</span>
              </div>
            </div>
            <div className="flex">
              {/* Sidebar */}
              <div className="w-48 bg-[#0A0A0F] p-4 min-h-[380px] hidden sm:block">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-6 h-6 bg-indigo-500 rounded-lg" />
                  <span className="text-[13px] font-bold text-white">Tutafy</span>
                </div>
                {['Dashboard', 'Students', 'Lessons', 'Calendar', 'Messages', 'Payments', 'AI Tools', 'Reports'].map((item, i) => (
                  <div key={item} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg mb-0.5 ${i === 0 ? 'bg-white/10' : ''}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-indigo-400' : 'bg-white/20'}`} />
                    <span className={`text-[12px] ${i === 0 ? 'text-white font-semibold' : 'text-white/40'}`}>{item}</span>
                  </div>
                ))}
              </div>
              {/* Content */}
              <div className="flex-1 p-5 bg-[#F7F8FA]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[16px] font-bold text-gray-900">Good morning, Sarah 👋</p>
                    <p className="text-[11px] text-gray-400">You have 3 lessons today</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-indigo-100" />
                </div>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[{ l: 'Students', v: '24' }, { l: 'This month', v: '18' }, { l: 'Revenue', v: '$1,240' }, { l: 'Growth', v: '+12%' }].map((s, i) => (
                    <div key={s.l} className={`rounded-xl p-3 ${['bg-indigo-50', 'bg-emerald-50', 'bg-violet-50', 'bg-amber-50'][i]}`}>
                      <p className="text-[9px] text-gray-500">{s.l}</p>
                      <p className="text-[15px] font-bold text-gray-900 mt-0.5">{s.v}</p>
                    </div>
                  ))}
                </div>
                {/* mini chart */}
                <div className="bg-white rounded-xl border border-gray-100 p-3 mb-3">
                  <p className="text-[10px] font-semibold text-gray-400 mb-2">Monthly revenue</p>
                  <div className="flex items-end justify-between gap-1.5 h-16">
                    {[40, 55, 45, 70, 60, 85].map((h, i) => (
                      <div key={i} className="flex-1 bg-violet-400 rounded-t" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['Maria K.', 'Tanaka Y.', 'Liu Wei'].map(n => (
                    <div key={n} className="bg-white rounded-xl p-2.5 border border-gray-100">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 mb-1.5" />
                      <p className="text-[10px] font-semibold text-gray-900">{n}</p>
                      <p className="text-[8px] text-gray-400">10:00 AM</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="px-6 pb-4">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[13px] text-gray-500">
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> 0% commission</span>
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> HD video included</span>
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> 10 AI tools</span>
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> Unlimited students on Pro</span>
        </div>
      </section>

      {/* Problem / agitation */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-[32px] font-extrabold text-gray-900 tracking-tight">Teaching is the easy part.<br className="hidden sm:block" /> The business side is a mess.</h2>
          <p className="text-[16px] text-gray-500 mt-4 max-w-xl mx-auto">You didn't become a tutor to manage seven browser tabs and hand a third of your income to a marketplace.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10 text-left">
            {PAINS.map(p => (
              <div key={p.text} className="flex items-start gap-3 bg-gray-50 rounded-2xl p-5">
                <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                  <p.icon className="h-4.5 w-4.5 text-red-400" style={{ width: 18, height: 18 }} />
                </div>
                <p className="text-[14px] text-gray-700 leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
          <p className="text-[17px] font-semibold text-gray-900 mt-10">Tutafy puts it all in one place — and hands the busywork to AI.</p>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[12px] font-bold text-indigo-500 uppercase tracking-widest mb-3">One tool, not five</p>
            <h2 className="text-[36px] font-extrabold text-gray-900 tracking-tight">Everything your tutoring business needs</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-[15px] font-bold text-gray-900">{f.title}</h3>
                <p className="text-[13px] text-gray-500 mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI spotlight */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 bg-white rounded-2xl border border-gray-100 p-5 shadow-xl shadow-gray-200/60">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center"><Sparkles className="h-4 w-4 text-amber-500" /></div>
              <span className="text-[13px] font-bold text-gray-900">AI Lesson Planner</span>
              <span className="ml-auto text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">Ready in 4s</span>
            </div>
            <div className="space-y-2">
              {['w-full', 'w-11/12', 'w-4/5', 'w-1/2', 'w-full', 'w-10/12'].map((w, i) => (
                <div key={i} className={`h-2.5 rounded-full ${i === 3 ? 'bg-indigo-200' : 'bg-gray-100'} ${w}`} />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Lesson plan', 'Homework', 'Feedback', 'Flashcards', 'Progress report'].map(t => (
                <span key={t} className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 rounded-full px-2.5 py-1">{t}</span>
              ))}
            </div>
          </div>
          <div className="order-1 md:order-2">
            <div className="inline-flex items-center gap-2 bg-amber-50 rounded-full px-3 py-1 mb-5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /><span className="text-[12px] font-semibold text-amber-600">10 AI teaching tools</span>
            </div>
            <h2 className="text-[30px] font-extrabold text-gray-900 tracking-tight leading-tight">Get your evenings back</h2>
            <p className="text-[15px] text-gray-500 mt-4 leading-relaxed">
              Tutafy's AI writes lesson plans, homework, essay corrections, student feedback and monthly progress reports —
              tailored to each student's level and goals. What used to take an hour now takes seconds.
            </p>
            <Link href="/register" className="inline-flex items-center gap-1.5 text-[14px] font-bold text-indigo-600 hover:text-indigo-700 mt-6">
              Try it free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Comparison — the wedge */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[12px] font-bold text-indigo-500 uppercase tracking-widest mb-3">Do the math</p>
            <h2 className="text-[34px] font-extrabold text-gray-900 tracking-tight">Why tutors are leaving the marketplaces</h2>
            <p className="text-[15px] text-gray-500 mt-3">A marketplace can quietly cost you thousands a year. Tutafy costs the price of two coffees.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-3 text-[12px] font-bold text-gray-400 uppercase tracking-wider px-5 py-3 border-b border-gray-50">
              <span></span><span className="text-center text-indigo-600">Tutafy</span><span className="text-center">Marketplaces</span>
            </div>
            {COMPARE.map(row => (
              <div key={row.label} className="grid grid-cols-3 items-center px-5 py-3.5 border-b border-gray-50 last:border-0">
                <span className="text-[13px] text-gray-700">{row.label}</span>
                <span className="text-center">{typeof row.tutafy === 'boolean'
                  ? (row.tutafy ? <Check className="h-5 w-5 text-emerald-500 mx-auto" /> : <X className="h-5 w-5 text-gray-300 mx-auto" />)
                  : <span className="text-[13px] font-bold text-emerald-600">{row.tutafy}</span>}</span>
                <span className="text-center">{typeof row.market === 'boolean'
                  ? (row.market ? <Check className="h-5 w-5 text-emerald-500 mx-auto" /> : <X className="h-5 w-5 text-gray-300 mx-auto" />)
                  : <span className="text-[13px] text-gray-500">{row.market}</span>}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[12px] font-bold text-indigo-500 uppercase tracking-widest mb-3">Up and running today</p>
            <h2 className="text-[36px] font-extrabold text-gray-900 tracking-tight">Three steps to your first booking</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW.map(h => (
              <div key={h.step} className="text-center">
                <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-[13px] font-bold text-white">{h.step}</span>
                </div>
                <h3 className="text-[16px] font-bold text-gray-900">{h.title}</h3>
                <p className="text-[13px] text-gray-500 mt-2 leading-relaxed">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust + founding tutor */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            {TRUST.map(t => (
              <div key={t.title} className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-3"><t.icon className="h-5 w-5 text-indigo-500" /></div>
                <p className="text-[14px] font-bold text-gray-900">{t.title}</p>
                <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
          {TESTIMONIALS.length > 0 ? (
            <>
              <div className="text-center mb-12">
                <p className="text-[12px] font-bold text-indigo-500 uppercase tracking-widest mb-3">Loved by tutors</p>
                <h2 className="text-[36px] font-extrabold text-gray-900 tracking-tight">What tutors say</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {TESTIMONIALS.map(t => (
                  <div key={t.name} className="bg-white rounded-2xl border border-gray-100 p-6">
                    <Quote className="h-6 w-6 text-indigo-200 mb-3" />
                    <p className="text-[14px] text-gray-700 leading-relaxed">{t.quote}</p>
                    <div className="flex items-center gap-3 mt-5">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center"><span className="text-[12px] font-bold text-indigo-600">{t.initials}</span></div>
                      <div><p className="text-[13px] font-semibold text-gray-900">{t.name}</p><p className="text-[11px] text-gray-400">{t.role}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-indigo-500 rounded-3xl p-10 md:p-12 text-center">
              <div className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1 mb-4">
                <Star className="h-3.5 w-3.5 text-amber-300" fill="currentColor" /><span className="text-[12px] font-semibold text-white">Founding tutors — early access</span>
              </div>
              <h2 className="text-[28px] md:text-[32px] font-extrabold text-white tracking-tight max-w-2xl mx-auto leading-tight">Be one of the first tutors to run their business on Tutafy</h2>
              <p className="text-[15px] text-indigo-100 mt-4 max-w-xl mx-auto leading-relaxed">We're just getting started. Join now, shape the product with your feedback, and lock in every feature free while we grow.</p>
              <Link href="/register" className="inline-flex items-center gap-2 mt-8 text-[14px] font-bold text-indigo-600 bg-white hover:bg-indigo-50 transition-colors px-7 py-3 rounded-xl">Start free — no credit card <ArrowRight className="h-4 w-4" /></Link>
            </div>
          )}
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[12px] font-bold text-indigo-500 uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-[36px] font-extrabold text-gray-900 tracking-tight">Simple pricing. No commission. Ever.</h2>
            <p className="text-[15px] text-gray-400 mt-3">Start free · Upgrade when you're ready · Cancel anytime</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map(p => (
              <div key={p.name} className={`relative rounded-2xl p-7 border-2 ${p.highlight ? 'bg-indigo-500 border-indigo-500 shadow-xl shadow-indigo-200' : 'bg-white border-gray-100'}`}>
                {p.badge && (<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wide">{p.badge}</div>)}
                <p className={`text-[11px] font-bold uppercase tracking-widest ${p.highlight ? 'text-indigo-200' : 'text-gray-400'}`}>{p.name}</p>
                <div className="flex items-end gap-1 mt-3 mb-1">
                  <span className={`text-[38px] font-extrabold leading-none ${p.highlight ? 'text-white' : 'text-gray-900'}`}>{p.price}</span>
                  {p.per && <span className={`text-[13px] mb-1.5 ${p.highlight ? 'text-indigo-200' : 'text-gray-400'}`}>{p.per}</span>}
                </div>
                <p className={`text-[12px] mb-6 ${p.highlight ? 'text-indigo-200' : 'text-gray-400'}`}>{p.tagline}</p>
                <div className="space-y-2 mb-7">
                  {p.features.map(f => (
                    <div key={f} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${p.highlight ? 'bg-white/20' : 'bg-emerald-50'}`}><Check className={`h-2.5 w-2.5 ${p.highlight ? 'text-white' : 'text-emerald-500'}`} /></div>
                      <span className={`text-[12px] ${p.highlight ? 'text-white' : 'text-gray-700'}`}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link href={p.href} className={`block text-center text-[13px] font-bold py-3 rounded-xl transition-colors ${p.highlight ? 'bg-white text-indigo-600 hover:bg-indigo-50' : p.name === 'Academy' ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}>{p.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[12px] font-bold text-indigo-500 uppercase tracking-widest mb-3">Questions</p>
            <h2 className="text-[34px] font-extrabold text-gray-900 tracking-tight">Everything else you're wondering</h2>
          </div>
          <div className="space-y-3">
            {FAQ.map(item => (
              <details key={item.q} className="group bg-white rounded-2xl border border-gray-100 p-5 [&_summary]:cursor-pointer">
                <summary className="flex items-center justify-between text-[15px] font-semibold text-gray-900 list-none">
                  {item.q}
                  <span className="text-indigo-400 group-open:rotate-45 transition-transform text-[20px] leading-none">+</span>
                </summary>
                <p className="text-[14px] text-gray-500 mt-3 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <HeartHandshake className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-[38px] font-extrabold text-gray-900 tracking-tight leading-tight">Spend less time on admin.<br />More time doing what you love.</h2>
          <p className="text-[17px] text-gray-500 mt-5 max-w-xl mx-auto">Set up your account in two minutes and take your first booking today — free, with zero commission.</p>
          <Link href="/register" className="inline-flex items-center gap-2 mt-9 text-[15px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-8 py-4 rounded-xl shadow-lg shadow-indigo-200">
            Start free — no credit card <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-[12px] text-gray-400 mt-4">Join the first tutors building their business on Tutafy.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-500 rounded-lg flex items-center justify-center"><GraduationCap className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-[14px] font-bold text-gray-900">Tutafy</span>
          </div>
          <p className="text-[12px] text-gray-400">© 2026 Tutafy. Built for tutors, by people who get it.</p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            <Link href="/about" className="text-[12px] text-gray-400 hover:text-gray-600">About</Link>
            <Link href="/blog" className="text-[12px] text-gray-400 hover:text-gray-600">Blog</Link>
            <Link href="/customers" className="text-[12px] text-gray-400 hover:text-gray-600">Customers</Link>
            <Link href="/contact" className="text-[12px] text-gray-400 hover:text-gray-600">Contact</Link>
            <Link href="/privacy" className="text-[12px] text-gray-400 hover:text-gray-600">Privacy</Link>
            <Link href="/terms" className="text-[12px] text-gray-400 hover:text-gray-600">Terms</Link>
            <Link href="/login" className="text-[12px] text-gray-400 hover:text-gray-600">Log in</Link>
            <Link href="/register" className="text-[12px] text-gray-400 hover:text-gray-600">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
    </OAuthCatcher>
  )
}
