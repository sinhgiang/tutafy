// Public marketing facts that more than one place prints: the landing page, its
// structured data (JSON-LD) and /llms.txt. Edit them here and every place follows;
// never copy these texts by hand into another file.

export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutafy.com').replace(/[\uFEFF\u200B\s]/g, '').replace(/\/+$/, '') || 'https://tutafy.com'

export const SITE_NAME = 'Tutafy'

export const SITE_DESCRIPTION =
  'All-in-one software for online tutors: bookings, a built-in video classroom, payments, AI teaching tools, and student & parent portals — with 0% commission.'

export const AUDIENCE = 'Independent online tutors and small tutoring centers (students and parents get their own portal).'

export type FeatureId = 'bookings' | 'classroom' | 'ai' | 'payments' | 'students' | 'portals'

export const FEATURES: { id: FeatureId; title: string; desc: string }[] = [
  { id: 'bookings', title: 'Bookings that fill themselves', desc: 'Share one link. Students see your real availability in their timezone and book — no emails, no double-bookings.' },
  { id: 'classroom', title: 'A classroom built right in', desc: 'HD video with one click. No Zoom, no downloads, no 40-minute cut-off. Or connect your own Zoom / Google Meet.' },
  { id: 'ai', title: 'An AI teaching assistant', desc: 'Lesson plans, homework, feedback and progress reports written in seconds — tailored to each student.' },
  { id: 'payments', title: 'Get paid, keep it all', desc: 'PayPal, card and packages. Money lands in your account — Tutafy never takes a cut of your income.' },
  { id: 'students', title: 'Every student, organized', desc: 'Goals, notes, level and full lesson history in one profile. Finally out of the spreadsheet.' },
  { id: 'portals', title: 'Portals parents love', desc: 'Students and parents get their own login with lessons, homework, progress and vocab quizzes.' },
]

export const FAQ: { q: string; a: string }[] = [
  { q: 'Is it really free?', a: 'Yes. The Free plan covers up to 10 students with bookings, video and reminders — forever, no card required. Upgrade only when you outgrow it.' },
  { q: 'Do you take a commission on my earnings?', a: 'Never. Unlike marketplaces, Tutafy takes 0% of what your students pay you — on every plan. You only pay your normal payment-processor fee.' },
  { q: 'Do my students need to download anything?', a: 'No. Students book, join the video classroom and see their homework right in the browser — nothing to install.' },
  { q: 'Can I move over from Preply, iTalki or a spreadsheet?', a: 'Yes. Import your students from a CSV in a couple of clicks and pick up right where you left off.' },
  { q: 'What if I have a small team?', a: 'The Academy plan adds up to 5 tutors with team scheduling and built-in payroll — pay each tutor per lesson, per hour or on a revenue share.' },
  { q: 'Can I cancel anytime?', a: 'Anytime, in one click. No lock-in, no contracts, no hidden fees.' },
]

interface PlanSource {
  name: string
  monthlyUsd: number
  tagline: string
  features: string[]
  cta: string
  href: string
  highlight: boolean
  badge: string
}

const PLAN_SOURCES: PlanSource[] = [
  {
    name: 'Free', monthlyUsd: 0, tagline: 'Everything you need to start',
    features: ['Up to 10 students', 'Booking page', 'Built-in video classroom', 'Email & SMS reminders', 'Scheduling'],
    cta: 'Start for free', href: '/register', highlight: false, badge: '',
  },
  {
    name: 'Pro', monthlyUsd: 12, tagline: 'For serious independent tutors',
    features: ['Unlimited students', 'All 10 AI teaching tools', 'Payments (PayPal / card)', 'Full analytics & reports', 'Public API & Zapier'],
    cta: 'Go Pro', href: '/upgrade', highlight: true, badge: 'Most popular',
  },
  {
    name: 'Academy', monthlyUsd: 29, tagline: 'For small teams & centers',
    features: ['Everything in Pro', 'Up to 5 tutors', 'Team payroll & split pay', 'Booking page per tutor', 'Priority support'],
    cta: 'Start Academy', href: '/upgrade', highlight: false, badge: '',
  },
]

export const PLANS = PLAN_SOURCES.map(p => ({
  ...p,
  /** Shown on the pricing card, e.g. "$12". */
  price: `$${p.monthlyUsd}`,
  /** Shown next to the price; empty for the free plan. */
  per: p.monthlyUsd > 0 ? '/mo' : '',
}))

/** The public pages an assistant or crawler should know about. `description` repeats the page's own meta description. */
export const KEY_PAGES: { path: string; title: string; description: string }[] = [
  { path: '/', title: 'Home', description: SITE_DESCRIPTION },
  { path: '/blog', title: 'Blog', description: 'Practical advice on getting students, running your tutoring business, and keeping 100% of what you earn.' },
  { path: '/tutors', title: 'Find tutors', description: 'Expert language tutors: 1-on-1 lessons, flexible schedule, proven results.' },
  { path: '/about', title: 'About Tutafy', description: 'Why we built Tutafy: an all-in-one home for independent tutors that never takes a cut of your income.' },
  { path: '/customers', title: 'Customer stories', description: 'How independent tutors and small tutoring centers run and grow their business with Tutafy.' },
  { path: '/contact', title: 'Contact', description: 'Get in touch with the Tutafy team — support, questions and feedback.' },
]

export const LEGAL_PAGES: { path: string; title: string }[] = [
  { path: '/privacy', title: 'Privacy Policy' },
  { path: '/terms', title: 'Terms of Service' },
]
