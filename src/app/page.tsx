import Link from 'next/link'
import { GraduationCap, Users, Calendar, DollarSign, Sparkles, BookOpen, ArrowRight, Check } from 'lucide-react'

const FEATURES = [
  { icon: Users, title: 'Student Management', desc: 'Track every student — level, goals, notes, lesson history. Everything in one place.', color: 'bg-indigo-50 text-indigo-500' },
  { icon: Calendar, title: 'Smart Scheduling', desc: 'Set your availability, share your booking link. Students book themselves — no back-and-forth.', color: 'bg-violet-50 text-violet-500' },
  { icon: DollarSign, title: 'Payment Tracking', desc: 'Log lesson payments, see monthly revenue at a glance. Stripe integration coming soon.', color: 'bg-emerald-50 text-emerald-500' },
  { icon: Sparkles, title: 'AI Teaching Tools', desc: 'Generate lesson plans, homework, and student feedback in seconds with AI.', color: 'bg-amber-50 text-amber-500' },
  { icon: BookOpen, title: 'Lesson Notes', desc: 'Add notes and homework to every lesson. Build a complete history for each student.', color: 'bg-blue-50 text-blue-500' },
  { icon: GraduationCap, title: 'Public Booking Page', desc: 'Your own branded booking page. Share the link and students book directly with you.', color: 'bg-pink-50 text-pink-500' },
]

const HOW = [
  { step: '01', title: 'Create your account', desc: 'Sign up free and set up your tutor profile in under 2 minutes.' },
  { step: '02', title: 'Add your students', desc: 'Import or manually add students with their level, goals, and contact info.' },
  { step: '03', title: 'Share your booking link', desc: 'Students book directly from your public page. You get notified instantly.' },
]

const PLANS = [
  {
    name: 'Free', price: '$0', desc: 'Dùng thử miễn phí',
    features: ['10 học sinh', 'Booking page', 'Lịch dạy', 'Email reminders'],
    missing: ['AI Tools', 'Payment links', 'Team tutors'],
    cta: 'Bắt đầu miễn phí', href: '/register', highlight: false, badge: '',
  },
  {
    name: 'Pro', price: '$12', per: '/month', desc: 'Cho tutor chuyên nghiệp',
    features: ['Học sinh không giới hạn', 'AI lesson planning', 'PayPal / Paddle / Stripe', 'Analytics đầy đủ', 'Email support'],
    missing: ['Team tutors'],
    cta: 'Nâng cấp Pro', href: '/upgrade', highlight: true, badge: 'Phổ biến nhất',
  },
  {
    name: 'Academy', price: '$29', per: '/month', desc: 'Cho trung tâm & nhóm',
    features: ['Mọi thứ trong Pro', 'Tối đa 5 tutors', 'Booking riêng từng tutor', 'Team analytics', 'Priority support'],
    missing: [],
    cta: 'Nâng cấp Academy', href: '/upgrade', highlight: false, badge: '',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center">
              <GraduationCap className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <span className="text-[17px] font-bold text-gray-900">Tutafy</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tutors" className="hidden sm:block text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2">
              Find tutors
            </Link>
            <Link href="/student/login" className="hidden sm:block text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2">
              Student login
            </Link>
            <Link href="/login" className="text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2">
              Tutor login
            </Link>
            <Link href="/register"
              className="text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-4 py-2 rounded-lg">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-8">
          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
          <span className="text-[12px] font-semibold text-indigo-700">AI-powered tutoring platform</span>
        </div>
        <h1 className="text-[32px] sm:text-[44px] md:text-[52px] font-extrabold text-gray-900 leading-[1.1] tracking-tight max-w-3xl mx-auto">
          Run your tutoring business{' '}
          <span className="text-indigo-500">smarter</span>
        </h1>
        <p className="text-[18px] text-gray-500 mt-6 max-w-xl mx-auto leading-relaxed">
          Manage students, schedule lessons, accept bookings, and generate AI lesson plans — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
          <Link href="/register"
            className="flex items-center gap-2 text-[14px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-6 py-3 rounded-xl shadow-sm shadow-indigo-200 w-full sm:w-auto justify-center">
            Start for free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/tutors"
            className="text-[14px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors px-6 py-3 rounded-xl w-full sm:w-auto text-center">
            Find a tutor →
          </Link>
        </div>
        <p className="text-[12px] text-gray-400 mt-4">Free forever · No credit card required</p>

        {/* Dashboard preview */}
        <div className="mt-16 relative">
          <div className="bg-[#0A0A0F] rounded-2xl p-1 shadow-2xl shadow-indigo-100 max-w-4xl mx-auto">
            <div className="bg-[#F7F8FA] rounded-xl overflow-hidden">
              {/* Fake dashboard */}
              <div className="flex">
                <div className="w-52 bg-[#0A0A0F] p-4 min-h-[340px]">
                  <div className="flex items-center gap-2 mb-6 mt-1">
                    <div className="w-6 h-6 bg-indigo-500 rounded-lg" />
                    <span className="text-[13px] font-bold text-white">Tutafy</span>
                  </div>
                  {['Dashboard', 'Students', 'Lessons', 'Calendar', 'Payments', 'AI Tools'].map((item, i) => (
                    <div key={item} className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 ${i === 0 ? 'bg-white/10' : ''}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-indigo-400' : 'bg-white/20'}`} />
                      <span className={`text-[12px] ${i === 0 ? 'text-white font-semibold' : 'text-white/40'}`}>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="flex-1 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[16px] font-bold text-gray-900">Good morning, Sarah 👋</p>
                      <p className="text-[11px] text-gray-400">Thursday, June 26, 2026</p>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-indigo-100" />
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { l: 'Students', v: '24', c: 'bg-indigo-50' },
                      { l: 'This Month', v: '18', c: 'bg-emerald-50' },
                      { l: 'Revenue', v: '$1,240', c: 'bg-violet-50' },
                      { l: 'Growth', v: '+12%', c: 'bg-amber-50' },
                    ].map(s => (
                      <div key={s.l} className={`${s.c} rounded-xl p-3`}>
                        <p className="text-[9px] text-gray-500">{s.l}</p>
                        <p className="text-[14px] font-bold text-gray-900 mt-0.5">{s.v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['Maria K.', 'Tanaka Y.', 'Liu Wei'].map(n => (
                      <div key={n} className="bg-white rounded-xl p-3 border border-gray-100">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 mb-2" />
                        <p className="text-[11px] font-semibold text-gray-900">{n}</p>
                        <p className="text-[9px] text-gray-400">10:00 AM today</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[12px] font-bold text-indigo-500 uppercase tracking-widest mb-3">Everything you need</p>
            <h2 className="text-[36px] font-extrabold text-gray-900 tracking-tight">Built for language tutors</h2>
            <p className="text-[16px] text-gray-500 mt-3 max-w-lg mx-auto">Stop juggling spreadsheets and WhatsApp. Tutafy puts your whole business in one clean dashboard.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
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

      {/* How it works */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[12px] font-bold text-indigo-500 uppercase tracking-widest mb-3">Simple setup</p>
            <h2 className="text-[36px] font-extrabold text-gray-900 tracking-tight">Up and running in minutes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW.map((h, i) => (
              <div key={h.step} className="text-center">
                <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-[13px] font-bold text-white">{h.step}</span>
                </div>
                {i < 2 && (
                  <div className="hidden" />
                )}
                <h3 className="text-[16px] font-bold text-gray-900">{h.title}</h3>
                <p className="text-[13px] text-gray-500 mt-2 leading-relaxed">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[12px] font-bold text-indigo-500 uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-[36px] font-extrabold text-gray-900 tracking-tight">Giá minh bạch, không phí ẩn</h2>
            <p className="text-[15px] text-gray-400 mt-3">Bắt đầu miễn phí · Nâng cấp khi sẵn sàng · Hủy bất kỳ lúc nào</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map(p => (
              <div key={p.name} className={`relative rounded-2xl p-7 border-2 ${p.highlight ? 'bg-indigo-500 border-indigo-500 shadow-xl shadow-indigo-200' : 'bg-white border-gray-100'}`}>
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wide">
                    {p.badge}
                  </div>
                )}
                <p className={`text-[11px] font-bold uppercase tracking-widest ${p.highlight ? 'text-indigo-200' : 'text-gray-400'}`}>{p.name}</p>
                <div className="flex items-end gap-1 mt-3 mb-1">
                  <span className={`text-[38px] font-extrabold leading-none ${p.highlight ? 'text-white' : 'text-gray-900'}`}>{p.price}</span>
                  {'per' in p && p.per && <span className={`text-[13px] mb-1.5 ${p.highlight ? 'text-indigo-200' : 'text-gray-400'}`}>{p.per}</span>}
                </div>
                <p className={`text-[12px] mb-6 ${p.highlight ? 'text-indigo-200' : 'text-gray-400'}`}>{p.desc}</p>
                <div className="space-y-2 mb-7">
                  {p.features.map(f => (
                    <div key={f} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${p.highlight ? 'bg-white/20' : 'bg-emerald-50'}`}>
                        <Check className={`h-2.5 w-2.5 ${p.highlight ? 'text-white' : 'text-emerald-500'}`} />
                      </div>
                      <span className={`text-[12px] ${p.highlight ? 'text-white' : 'text-gray-700'}`}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link href={p.href}
                  className={`block text-center text-[13px] font-bold py-3 rounded-xl transition-colors ${
                    p.highlight ? 'bg-white text-indigo-600 hover:bg-indigo-50' :
                    p.name === 'Academy' ? 'bg-gray-900 text-white hover:bg-gray-800' :
                    'bg-indigo-500 text-white hover:bg-indigo-600'
                  }`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-[36px] font-extrabold text-gray-900 tracking-tight">Ready to grow your tutoring business?</h2>
          <p className="text-[16px] text-gray-500 mt-4">Join tutors who use Tutafy to save hours every week.</p>
          <Link href="/register"
            className="inline-flex items-center gap-2 mt-8 text-[14px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-8 py-3.5 rounded-xl shadow-sm">
            Create free account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-500 rounded-lg flex items-center justify-center">
              <GraduationCap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[14px] font-bold text-gray-900">Tutafy</span>
          </div>
          <p className="text-[12px] text-gray-400">© 2026 Tutafy. Built for language tutors.</p>
          <div className="flex gap-5">
            <Link href="/login" className="text-[12px] text-gray-400 hover:text-gray-600">Log in</Link>
            <Link href="/register" className="text-[12px] text-gray-400 hover:text-gray-600">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
