// Public marketing facts that more than one place prints: the landing page, its
// structured data (JSON-LD) and /llms.txt. Edit them here and every place follows;
// never copy these texts by hand into another file.
import { PAGE_SEO } from '@/lib/page-meta'
import { PLAN_LIST } from '@/lib/plan-list'

// The main address (www) lives once in site-url.ts; it is not read from the environment.
export { SITE_URL } from '@/lib/site-url'

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
  { q: 'What is Tutafy?', a: 'Tutafy is software for independent online tutors and small tutoring centers. It puts a booking page, a built-in video classroom, payments, AI lesson tools and portals for students and parents in one place, and it takes 0% commission on your lessons.' },
  { q: 'Who is Tutafy for?', a: 'Independent online tutors, such as language tutors, and small tutoring centers. The Free plan covers up to 10 students; the Academy plan adds up to 5 tutors. Your students and their parents get their own portal.' },
  { q: 'How is Tutafy different from Preply or iTalki?', a: 'Preply and iTalki are marketplaces: they find students for you and take a commission on each lesson. Tutafy is the software you run your own tutoring business with, not a marketplace. You keep the student relationship, Tutafy takes none of the lesson price, and you pay a flat monthly fee only if you choose a paid plan.' },
  { q: 'Is it really free?', a: 'Yes. The Free plan covers up to 10 students with bookings, video and reminders — forever, no card required. Upgrade only when you outgrow it.' },
  { q: 'Do you take a commission on my earnings?', a: 'Never. Unlike marketplaces, Tutafy takes 0% of what your students pay you — on every plan. You only pay your normal payment-processor fee.' },
  { q: 'Do my students need to download anything?', a: 'No. Students book, join the video classroom and see their homework right in the browser — nothing to install.' },
  { q: 'Can I move over from Preply, iTalki or a spreadsheet?', a: 'Yes. Import your students from a CSV in a couple of clicks and pick up right where you left off.' },
  { q: 'What if I have a small team?', a: 'The Academy plan adds up to 5 tutors with team scheduling and built-in payroll — pay each tutor per lesson, per hour or on a revenue share.' },
  { q: 'Can I cancel anytime?', a: 'Anytime, in one click. No lock-in, no contracts, no hidden fees.' },
]

/**
 * Questions a student asks on the tutor directory (/tutors), answered only with what that page already says (T-0850): the 14-day rule is
 * in src/lib/directory.ts, "name and email" and "free to start, no commission" are printed on the page. The page draws exactly these
 * and its FAQPage data is built from the same list (tests/seo-brand.test.ts).
 */
export const TUTORS_FAQ: { q: string; a: string }[] = [
  { q: 'How do I book a lesson with a tutor?', a: 'Open a tutor, choose one of their free times and book with just your name and email. You do not need an account.' },
  { q: 'Which tutors are listed here?', a: 'Only tutors who have free times in the next 14 days, so every tutor you see can be booked today.' },
  { q: 'Who sets the price of a lesson?', a: 'Each tutor sets their own price, in their own currency, and some offer a 30-minute trial lesson at a lower price. Use the trial lesson filter to see them.' },
  { q: 'How do I list myself as a tutor?', a: 'Create your free page and set your free hours, and students can book you here. It is free to start and Tutafy takes no commission on your lessons.' },
]

/**
 * Questions a student asks on the finder (/find-a-tutor), answered only with what the finder does (T-0897): the 14-day rule and the order are
 * in src/lib/directory.ts, the answers asked are the form's own. The page draws exactly these and its FAQPage data is built from the same list.
 */
export const FIND_TUTOR_FAQ: { q: string; a: string }[] = [
  { q: 'How does Tutafy pick the three tutors?', a: 'It takes every tutor with free times in the next 14 days, keeps the ones that fit your answers (language, level, price, time of day and trial lesson) and shows the three that come first in the tutor list. A tutor with a free time in the next two days, a complete profile and more reviews comes first.' },
  { q: 'Do I need an account to book?', a: 'No. Open a tutor, choose one of their free times and book with just your name and email.' },
  { q: 'What if no tutor fits my answers?', a: 'The page says so and shows what to change, for example how many more tutors fit if you drop one answer. The tutor list shows everyone you can book.' },
  { q: 'Are the times shown in my time zone?', a: 'Yes, once your browser tells us your time zone. You can change the time zone on the form, and it is kept in the page address so a shared link shows the same times.' },
]

// The plans come from the one list in plan-list.ts (T-1052); /upgrade, /switch and the locked-feature sheet print from it too.
export const PLANS = PLAN_LIST.map(p => ({
  ...p,
  /** Shown on the pricing card, e.g. "$12". */
  price: `$${p.monthlyUsd}`,
  /** Shown next to the price; empty for the free plan. */
  per: p.monthlyUsd > 0 ? '/mo' : '',
}))

/** The public pages an assistant or crawler should know about. `description` is the page's own meta description (src/lib/page-meta.ts). */
export const KEY_PAGES: { path: string; title: string; description: string }[] = [
  { path: '/', title: 'Home', description: PAGE_SEO.home.description },
  { path: '/blog', title: 'Blog', description: PAGE_SEO.blog.description },
  { path: '/tutors', title: 'Find tutors', description: PAGE_SEO.tutors.description },
  { path: '/find-a-tutor', title: 'Find me a tutor', description: PAGE_SEO.findTutor.description },
  { path: '/about', title: 'About Tutafy', description: PAGE_SEO.about.description },
  { path: '/customers', title: 'Customer stories', description: PAGE_SEO.customers.description },
  { path: '/updates', title: 'Updates', description: PAGE_SEO.updates.description },
  { path: '/contact', title: 'Contact', description: PAGE_SEO.contact.description },
]

export const LEGAL_PAGES: { path: string; title: string }[] = [
  { path: '/privacy', title: 'Privacy Policy' },
  { path: '/terms', title: 'Terms of Service' },
]
