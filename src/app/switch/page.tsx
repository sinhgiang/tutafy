import type { Metadata } from 'next'
import Link from 'next/link'
import {
  GraduationCap, ArrowRight, Check, X, Shield, Lock, CreditCard,
  UploadCloud, Link2, Send, Percent, Clock, Users, Video, Sparkles,
} from 'lucide-react'
import { CommissionCalculator } from '@/components/blog/CommissionCalculator'

// Dedicated, distraction-free landing page for Google Ads "switching / alternative"
// keywords (preply alternative, italki alternative, commission free tutoring platform...).
// Message-matches the ad via ?from=<competitor> — see COMPETITORS below.
// Kept out of the site nav and out of the sitemap on purpose (noindex, follow).

const COMPETITORS: Record<string, { name: string; rate: string; calcRate: number }> = {
  preply: { name: 'Preply', rate: '18–33%', calcRate: 25 },
  italki: { name: 'iTalki', rate: '~15%', calcRate: 15 },
  wyzant: { name: 'Wyzant', rate: '~25%', calcRate: 25 },
  cambly: { name: 'Cambly', rate: 'a per-minute cut', calcRate: 20 },
  verbling: { name: 'Verbling', rate: '~15%', calcRate: 15 },
  superprof: { name: 'Superprof', rate: 'a subscription + lead fees', calcRate: 20 },
}

function competitorFrom(param?: string) {
  if (!param) return null
  return COMPETITORS[param.toLowerCase().trim()] ?? null
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ from?: string }> }): Promise<Metadata> {
  const { from } = await searchParams
  const comp = competitorFrom(from)
  const title = comp
    ? `Leaving ${comp.name}? Keep 100% of What You Earn — Tutafy`
    : 'Switch From a Tutoring Marketplace — Keep 100% at Tutafy'
  const description = comp
    ? `Moving off ${comp.name}? Import your students in minutes and keep 100% of what you earn — 0% commission, forever, on every Tutafy plan.`
    : 'Moving off a tutoring marketplace? Import your students in minutes and keep 100% of what you earn — 0% commission, forever, on every Tutafy plan.'
  return {
    title,
    description,
    alternates: { canonical: '/switch' },
    robots: { index: false, follow: true },
    openGraph: { type: 'website', title, description },
    twitter: { card: 'summary_large_image', title, description },
  }
}

const PAIN = [
  { icon: Percent, title: 'The cut on every lesson', text: 'Marketplaces typically keep 15–33% of what a student pays you — and most take 100% of the first trial lesson too.' },
  { icon: Clock, title: 'Five apps to run one business', text: 'Zoom for class, Calendly or spreadsheets for booking, WhatsApp for reminders, a notebook for progress — none of it talks to the others.' },
  { icon: Users, title: 'You don’t own the relationship', text: 'Message a student off-platform and some marketplaces can suspend your account. Your student list lives in their database, not yours.' },
]

const STEPS = [
  { icon: UploadCloud, step: '01', title: 'Export your student list', desc: 'A CSV with names and emails is enough — most marketplaces let you download this from account settings.' },
  { icon: Link2, step: '02', title: 'Import into Tutafy', desc: 'Drop the CSV in and your students are set up in minutes, with their lesson history if you have it.' },
  { icon: Send, step: '03', title: 'Share your new booking link', desc: 'Students see your real availability in their timezone, book, pay, and join class — no marketplace in the middle.' },
]

const FEATURES = [
  { icon: CreditCard, title: 'Keep 100% of what you earn', desc: 'PayPal, card and lesson packages. The money lands in your account — Tutafy never takes a cut of your income.' },
  { icon: Video, title: 'A classroom built right in', desc: 'HD video with one click, no 40-minute cut-off. Or keep using your own Zoom or Google Meet link.' },
  { icon: Users, title: 'Every student, organized', desc: 'Goals, notes, level and full lesson history in one profile — imported from your CSV, not rebuilt by hand.' },
  { icon: Sparkles, title: 'AI teaching tools included', desc: 'Lesson plans, homework and progress reports drafted in seconds, included free on every plan.' },
]

const PLANS = [
  { name: 'Free', price: '$0', per: '', tagline: 'Everything you need to start', features: ['Up to 10 students', 'Booking page', 'Built-in video classroom', 'Email & SMS reminders'], cta: 'Start free', href: '/register', highlight: false },
  { name: 'Pro', price: '$12', per: '/mo', tagline: 'For serious independent tutors', features: ['Unlimited students', 'All 10 AI teaching tools', 'Payments (PayPal / card)', 'Full analytics & reports'], cta: 'Go Pro', href: '/register', highlight: true, badge: 'Most popular' },
  { name: 'Academy', price: '$29', per: '/mo', tagline: 'For small teams & centers', features: ['Everything in Pro', 'Up to 5 tutors', 'Team payroll & split pay', 'Booking page per tutor'], cta: 'Start Academy', href: '/register', highlight: false },
]

export default async function SwitchLandingPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams
  const comp = competitorFrom(from)

  const eyebrow = comp ? `Built for tutors leaving ${comp.name}` : 'Built for tutors leaving marketplace commissions'
  const headline = comp
    ? <>Leaving {comp.name}? <span className="text-indigo-500">Keep 100% of what you earn.</span></>
    : <>Leaving a marketplace? <span className="text-indigo-500">Keep 100% of what you earn.</span></>
  const subhead = comp
    ? `${comp.name} typically keeps ${comp.rate} of every lesson. Move your students to Tutafy and that cut goes to 0% — on every plan, forever.`
    : 'Marketplaces typically keep 15–33% of every lesson. Move your students to Tutafy and that cut goes to 0% — on every plan, forever.'

  const faq = [
    { q: 'Will I lose the students I already have?', a: 'No. You keep the relationship — you’re just moving where bookings and payments happen. Import their names and emails from a CSV and invite them to book on your new link.' },
    comp
      ? { q: `Do I have to leave ${comp.name} on day one?`, a: `No. Most tutors run both for a few weeks — keep taking bookings on ${comp.name} while you move existing students to Tutafy at their own pace.` }
      : { q: 'Do I have to leave my marketplace on day one?', a: 'No. Most tutors run both for a few weeks — keep taking bookings on the marketplace while you move existing students to Tutafy at their own pace.' },
    { q: 'Is it really 0% commission, forever?', a: 'Yes, on every plan including Free. You only pay the normal payment-processor fee when a student pays by card — Tutafy never takes a cut.' },
    { q: 'Is there a contract or lock-in?', a: 'No. Cancel anytime, in one click. No contracts, no hidden fees.' },
    { q: 'What if I run a small team, not just myself?', a: 'The Academy plan ($29/mo) adds up to 5 tutors with team scheduling and built-in payroll — pay each tutor per lesson, per hour, or on a revenue share.' },
    { q: 'Do my students need to download anything?', a: 'No. They book, join the video classroom and see homework right in the browser — nothing to install.' },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Minimal header — logo + single CTA, no nav links off this page */}
      <header className="border-b border-gray-100 px-6 py-4 sticky top-0 bg-white/90 backdrop-blur z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center">
              <GraduationCap className="text-white" style={{ width: 18, height: 18 }} />
            </div>
            <span className="text-[17px] font-bold text-gray-900">Tutafy</span>
          </div>
          <Link href="/register" className="text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-4 py-2 rounded-lg">
            Start free
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-7">
          <Shield className="h-3.5 w-3.5 text-indigo-500" />
          <span className="text-[12px] font-semibold text-indigo-700">{eyebrow}</span>
        </div>
        <h1 className="text-[32px] sm:text-[44px] md:text-[52px] font-extrabold text-gray-900 leading-[1.08] tracking-tight max-w-3xl mx-auto text-balance">
          {headline}
        </h1>
        <p className="text-[17px] text-gray-500 mt-6 max-w-xl mx-auto leading-relaxed">
          {subhead}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <Link href="/register" className="flex items-center gap-2 text-[15px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-7 py-3.5 rounded-xl shadow-lg shadow-indigo-200 w-full sm:w-auto justify-center">
            Start free — no credit card <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#how" className="text-[15px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors px-7 py-3.5 rounded-xl w-full sm:w-auto text-center">
            How switching works
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12.5px] text-gray-500 mt-6">
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> 0% commission, always</span>
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> Free forever plan</span>
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> Cancel anytime</span>
        </div>
      </section>

      {/* Why tutors leave — pain points */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PAIN.map(p => (
              <div key={p.title} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                  <p.icon className="h-4.5 w-4.5 text-red-400" style={{ width: 18, height: 18 }} />
                </div>
                <h3 className="text-[14px] font-bold text-gray-900">{p.title}</h3>
                <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Do the math */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[12px] font-bold text-indigo-500 uppercase tracking-widest mb-3">Do the math</p>
            <h2 className="text-[28px] font-extrabold text-gray-900 tracking-tight text-balance">
              {comp ? `What ${comp.name} costs you vs. Tutafy` : 'What a marketplace costs you vs. Tutafy'}
            </h2>
            <p className="text-[14px] text-gray-500 mt-3">Plug in your own numbers — this isn’t a hypothetical, it’s your money.</p>
          </div>
          <CommissionCalculator
            initialCommission={comp ? comp.calcRate : 25}
            title={comp ? `What ${comp.name} is costing you` : 'What your marketplace is costing you'}
          />
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mt-6">
            <div className="grid grid-cols-3 text-[12px] font-bold text-gray-400 uppercase tracking-wider px-5 py-3 border-b border-gray-50">
              <span></span>
              <span className="text-center text-indigo-600">Tutafy</span>
              <span className="text-center">{comp ? comp.name : 'Marketplace'}</span>
            </div>
            {[
              { label: 'Cut of your first trial lesson', tutafy: '0%', market: 'often 100%' },
              { label: 'Built-in video classroom', tutafy: true, market: false },
              { label: 'You own the student relationship', tutafy: true, market: false },
              { label: 'Monthly price', tutafy: 'From $0', market: 'Free, but takes a cut' },
            ].map(row => (
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
          <p className="text-[12px] text-gray-400 text-center mt-4">
            Commission ranges are typical published rates and can vary by tutor tier or region — check your own account for your exact rate.
          </p>
        </div>
      </section>

      {/* How switching works */}
      <section id="how" className="bg-gray-50 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[12px] font-bold text-indigo-500 uppercase tracking-widest mb-3">No big migration project</p>
            <h2 className="text-[30px] font-extrabold text-gray-900 tracking-tight">Three steps, most tutors are done same day</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map(s => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <s.icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-[11px] font-bold text-indigo-400 tracking-widest mb-1">STEP {s.step}</p>
                <h3 className="text-[15px] font-bold text-gray-900">{s.title}</h3>
                <p className="text-[13px] text-gray-500 mt-2 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature highlights — trimmed to the four that matter most to switchers */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[12px] font-bold text-indigo-500 uppercase tracking-widest mb-3">What you get on day one</p>
            <h2 className="text-[30px] font-extrabold text-gray-900 tracking-tight">Everything the marketplace did — minus the cut</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-indigo-500" />
                </div>
                <h3 className="text-[15px] font-bold text-gray-900">{f.title}</h3>
                <p className="text-[13px] text-gray-500 mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[12px] font-bold text-indigo-500 uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-[30px] font-extrabold text-gray-900 tracking-tight">Simple pricing. No commission. Ever.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map(p => (
              <div key={p.name} className={`relative rounded-2xl p-7 border-2 ${p.highlight ? 'bg-indigo-500 border-indigo-500 shadow-xl shadow-indigo-200' : 'bg-white border-gray-100'}`}>
                {p.badge && (<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wide">{p.badge}</div>)}
                <p className={`text-[11px] font-bold uppercase tracking-widest ${p.highlight ? 'text-indigo-200' : 'text-gray-400'}`}>{p.name}</p>
                <div className="flex items-end gap-1 mt-3 mb-1">
                  <span className={`text-[34px] font-extrabold leading-none ${p.highlight ? 'text-white' : 'text-gray-900'}`}>{p.price}</span>
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

      {/* FAQ — objections specific to switching */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[12px] font-bold text-indigo-500 uppercase tracking-widest mb-3">Before you switch</p>
            <h2 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Questions every tutor asks first</h2>
          </div>
          <div className="space-y-3">
            {faq.map(item => (
              <details key={item.q} className="group bg-gray-50 rounded-2xl border border-gray-100 p-5 [&_summary]:cursor-pointer">
                <summary className="flex items-center justify-between text-[14.5px] font-semibold text-gray-900 list-none gap-3">
                  {item.q}
                  <span className="text-indigo-400 group-open:rotate-45 transition-transform text-[20px] leading-none flex-shrink-0">+</span>
                </summary>
                <p className="text-[13.5px] text-gray-500 mt-3 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gray-50 py-20 px-6 pb-28 sm:pb-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-[32px] font-extrabold text-gray-900 tracking-tight leading-tight text-balance">
            {comp ? `Move your students off ${comp.name} today.` : 'Move your students off the marketplace today.'}
          </h2>
          <p className="text-[16px] text-gray-500 mt-4 max-w-lg mx-auto">Set up your account in two minutes and take your first commission-free booking today.</p>
          <Link href="/register" className="inline-flex items-center gap-2 mt-8 text-[15px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-8 py-4 rounded-xl shadow-lg shadow-indigo-200">
            Start free — no credit card <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-[12px] text-gray-400 mt-4">Free forever · Set up in 2 minutes · Cancel anytime</p>
        </div>
      </section>

      {/* Minimal footer — legal links only, no exit paths to the rest of the site */}
      <footer className="border-t border-gray-100 py-6 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-gray-400">© 2026 Tutafy.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="text-[12px] text-gray-400 hover:text-gray-600">Privacy</Link>
            <Link href="/terms" className="text-[12px] text-gray-400 hover:text-gray-600">Terms</Link>
          </div>
        </div>
      </footer>

      {/* Sticky mobile CTA — keeps the primary action reachable without scrolling back up */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-t border-gray-100 p-3">
        <Link href="/register" className="flex items-center justify-center gap-2 text-[14px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-6 py-3 rounded-xl">
          Start free — no credit card <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
