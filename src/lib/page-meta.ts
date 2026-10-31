// Search-engine titles, descriptions, canonical addresses and indexing rules for
// every public page, in ONE place (T-0623). Pages call `pageMetadata(...)` /
// `blogPostMetadata(...)`; they never write their own title or canonical.
//
// Why a plain .ts file: page and layout files are .tsx, which the test runner
// cannot load, so everything a test needs to check lives here.
//
// Rules the tests keep (tests/seo-metadata.test.ts):
//   - every page has its own title and description, none repeated;
//   - title 20..60 characters, description 70..155 (Google cuts after about that);
//   - the canonical address is on the main site (src/lib/site-url.ts) and is the
//     same address the sitemap lists;
//   - sign-in and sign-up pages are noindex and are not in the sitemap.
import type { Metadata } from 'next'
import { absoluteUrl } from '@/lib/site-url'
import { tutorSeoText, type TutorSeoInput } from '@/lib/tutor-seo'
import { bookingSeoText, type BookingTutor } from '@/lib/booking-page'
import { languagePagePath, type LanguageGuide } from '@/lib/language-pages'
import { pairGuidePath, type PairGuide } from '@/lib/niche-pages'

export const TITLE_MAX = 60
export const TITLE_MIN = 20
export const DESCRIPTION_MAX = 155
export const DESCRIPTION_MIN = 70

// The share picture drawn by src/app/og/route.tsx: 1200 x 630 with the name Tutafy (T-0850). It was the 512 px app icon.
export const SOCIAL_IMAGE = { url: '/og', width: 1200, height: 630, alt: 'Tutafy: software for online tutors' }

export interface PageSeo {
  /** Path on the site; '/' is the home page. */
  path: string
  /** The whole <title>, brand included. Not combined with the layout's template. */
  title: string
  description: string
  /** Keep out of search results (sign-in and sign-up pages). They are also left out of the sitemap. */
  noindex?: boolean
}

export const PAGE_SEO = {
  home: {
    path: '/',
    title: 'Tutafy — All-in-one software for online tutors',
    description: 'All-in-one software for online tutors: bookings, video classroom, payments, AI tools and parent portals. Free forever, 0% commission.',
  },
  tutors: {
    path: '/tutors',
    title: 'Find an Online Language Tutor | Tutafy',
    description: 'Browse language tutors on Tutafy and book 1-on-1 online lessons. Compare languages, ratings and prices, then pick a time that suits you.',
  },
  findTutor: {
    path: '/find-a-tutor',
    title: 'Find Me a Tutor: 3 Tutors You Can Book Today | Tutafy',
    description: 'Tell us the language, level, price and time of day you want and get 3 online tutors with open times in the next 14 days. No account needed.',
  },
  blog: {
    path: '/blog',
    title: 'Tips & Guides for Online Tutors | Tutafy Blog',
    description: 'Practical advice on getting students, pricing lessons, running your tutoring business and keeping 100% of what you earn.',
  },
  updates: {
    path: '/updates',
    title: "What's New for Online Tutors | Tutafy Updates",
    description: "See what's new in Tutafy: every change tutors can see or use, from lesson settings and payments to phone support, newest first.",
  },
  about: {
    path: '/about',
    title: 'About Us: Built for Independent Tutors | Tutafy',
    description: 'Why we built Tutafy: an all-in-one home for independent tutors that charges a flat fee and never takes a cut of your income.',
  },
  customers: {
    path: '/customers',
    title: 'Customer Stories for Online Tutors | Tutafy',
    description: 'See how independent tutors and small tutoring centers run and grow their business with Tutafy.',
  },
  contact: {
    path: '/contact',
    title: 'Contact Us: Support, Questions, Feedback | Tutafy',
    description: 'Get in touch with the Tutafy team for support, product questions, billing help or feedback about the tutoring platform.',
  },
  privacy: {
    path: '/privacy',
    title: 'Privacy Policy: How We Handle Your Data | Tutafy',
    description: 'How Tutafy collects, uses and protects personal data, which cookies and analytics it uses, and how to contact us about your privacy.',
  },
  terms: {
    path: '/terms',
    title: 'Terms of Service: Your Account and Data | Tutafy',
    description: 'The terms for using Tutafy: your account, acceptable use, your data and content, payments, service availability and termination.',
  },
  register: {
    path: '/register',
    title: 'Create a Free Tutor Account | Tutafy',
    description: 'Sign up free to manage students, bookings, lessons and payments in one place. No card needed, and 0% commission on what you earn.',
    noindex: true,
  },
  login: {
    path: '/login',
    title: 'Tutor Log In | Tutafy',
    description: 'Log in to your Tutafy account to manage your students, lessons, bookings and payments.',
    noindex: true,
  },
  studentLogin: {
    path: '/student/login',
    title: 'Student Log In | Tutafy',
    description: 'Students: get a sign-in link by email to see your lessons, homework and progress with your tutor on Tutafy.',
    noindex: true,
  },
} as const satisfies Record<string, PageSeo>

export type PageKey = keyof typeof PAGE_SEO

/** Titles and descriptions for the search results of each blog post. The post's own `title` stays as the visible headline. */
const BLOG_SEO_BASE: Record<string, { title: string; description: string }> = {
  'get-your-first-tutoring-clients': {
    title: 'How to Get Your First 10 Tutoring Clients',
    description: 'A practical playbook for landing your first paying tutoring students without a marketplace, and keeping 100% of what you earn.',
  },
  'marketplace-vs-independent-the-real-math': {
    title: 'Preply vs iTalki vs Independent: The Real Math',
    description: 'Marketplaces bring students but take a commission on every lesson. See the real numbers and when going independent pays off for tutors.',
  },
  'preply-alternatives-for-tutors': {
    title: 'Best Preply Alternatives for Tutors in 2026',
    description: "Tired of Preply's commission and trial-lesson rules? Compare the best alternatives, from other marketplaces to going fully independent.",
  },
  'best-tutor-management-software': {
    title: 'Best Tutor Management Software in 2026, Compared',
    description: 'An honest comparison of TutorCruncher, Teachworks, TutorBird and Tutafy, so you can pick the tutor software that fits how you teach.',
  },
  'how-to-price-tutoring-lessons': {
    title: 'How to Price Tutoring Lessons: A 5-Step Framework',
    description: 'A five-step framework for setting tutoring rates that are fair to students and profitable for you, with real numbers to anchor on.',
  },
  'how-to-teach-english-online': {
    title: 'How to Teach English Online and Get Paid in 2026',
    description: 'A step-by-step guide to teaching English online: qualifications, tools, finding students, pricing and getting paid without a marketplace cut.',
  },
  'stop-tutoring-no-shows': {
    title: 'How to Stop Tutoring No-Shows and Cancellations',
    description: 'A practical system to cut missed lessons: reminders, timezones, cancellation policies and prepaid packages that stop empty slots costing you income.',
  },
  'how-to-start-an-online-tutoring-business': {
    title: 'How to Start an Online Tutoring Business in 2026',
    description: 'A practical guide to starting an online tutoring business: niche, offer, tools, booking page, first students and money, with a 30-day launch plan.',
  },
  'how-much-does-preply-take': {
    title: 'How Much Does Preply Take From Tutors? (2026)',
    description: "Preply's tutor commission explained: the sliding 18–33% cut, the free trial lesson, real take-home examples and how it compares to iTalki.",
  },
  'tutafy-review': {
    title: 'Tutafy Review (2026): Features, Pricing, Pros & Cons',
    description: 'A candid, in-depth Tutafy review: bookings, video classroom, payments, AI tools, portals, pricing, pros and cons, and how it compares.',
  },
  'tutafy-vs-alternatives': {
    title: 'Tutafy vs Preply, iTalki and TutorCruncher Compared',
    description: 'A head-to-head comparison of Tutafy with marketplaces and tutor software, including an honest look at when Tutafy is not the right pick.',
  },
  'free-tutor-management-software': {
    title: 'Best Free Tutor Management Software in 2026',
    description: 'An honest look at free tutor management software: what a free plan should include, options worth trying and how to run a tutoring business at $0.',
  },
  'how-to-write-a-tutoring-business-plan': {
    title: 'How to Write a Tutoring Business Plan (Template)',
    description: 'A one-page tutoring business plan that gets used: positioning, pricing, financial projections and the numbers to nail down before you start.',
  },
  'how-to-choose-a-tutoring-niche': {
    title: 'How to Choose a Tutoring Niche and Get Booked',
    description: 'A step-by-step framework for narrowing your tutoring focus, validating real demand and positioning a niche that fills your calendar faster.',
  },
  'how-to-build-a-tutor-website': {
    title: 'How to Build a Tutor Website That Gets Bookings',
    description: 'A page-by-page guide to a tutor website that turns visitors into booked trial lessons: no developer, no fake testimonials, one clear action.',
  },
  'group-tutoring-classes-pricing': {
    title: 'How to Price Group Tutoring Classes Profitably',
    description: 'A practical framework for pricing group tutoring: per-student rates, class-size caps, cancellation policy and protecting revenue from drop-off.',
  },
  'tutoring-cancellation-policy-and-contracts': {
    title: 'Tutoring Cancellation Policy and Contract Guide',
    description: 'What every independent tutor needs in a cancellation policy and lesson contract: payment terms, no-show rules and how to put it in writing.',
  },
  'how-to-retain-tutoring-students': {
    title: 'How to Retain Tutoring Students Before They Churn',
    description: 'Why tutoring students quietly stop rebooking, and the fixes for scheduling, engagement and communication that keep your roster full.',
  },
  'ai-tools-for-tutors': {
    title: 'Best AI Tools for Tutors (and Their Limits)',
    description: 'Where AI saves tutors real time, from lesson planning to grading and admin, and the failure modes to check before content reaches a student.',
  },
  'best-video-call-tool-for-tutors': {
    title: 'Best Video Call Tool for Tutors: Zoom vs Meet',
    description: 'Zoom, Google Meet, Skype, Jitsi or a built-in classroom? An honest comparison on install friction, reliability, recording and cost.',
  },
  'parent-communication-and-parent-portal': {
    title: 'Parent Communication for Tutors: Portal vs WhatsApp',
    description: 'Stop losing hours to scattered WhatsApp and email threads: how tutors can keep reminders, progress notes and invoices in one parent portal.',
  },
  'how-to-leave-preply-migration-guide': {
    title: 'How to Leave Preply: A Migration Guide for Tutors',
    description: 'A practical, ethical playbook for leaving Preply: build your own booking, payments and video setup first, then move students gracefully.',
  },
  'how-to-hire-tutors-and-build-a-team': {
    title: 'How to Hire Tutors and Grow From Solo to a Team',
    description: 'When to hire your first tutor, how to structure pay, classify contractors, vet and onboard, and run a small tutoring team day to day.',
  },
  'how-to-build-a-tutor-referral-program': {
    title: 'How to Build a Tutor Referral Program That Works',
    description: 'Why referrals beat paid ads for independent tutors, how to design an incentive that protects your margin and the best moments to ask.',
  },
  'how-to-take-card-payments-with-a-stripe-payment-link': {
    title: 'Take Card Payments With a Stripe Payment Link',
    description: 'Create a Stripe Payment Link, paste it into Tutafy so students see a Pay by card button, and learn the limits of one link before you rely on it.',
  },
  'calendly-alternatives-for-tutors': {
    title: 'Calendly Alternatives for Tutors (2026)',
    description: 'Calendly books a time, but tutors also need video, payment, packages and notes. Compare Calendly alternatives for tutors and which one fits how you teach.',
  },
  'schedule-tutoring-lessons-across-time-zones': {
    title: 'Schedule Tutoring Lessons Across Time Zones',
    description: 'Fix each lesson in one anchor time zone, show both times in every message, and plan for clock changes that hit the US and Europe on different dates.',
  },
  'tutoring-lesson-packages-explained': {
    title: 'Tutoring Lesson Packages, Explained',
    description: 'A tutoring lesson package is a set of lessons paid for up front. See how packages work, how to price one, and the four terms to write down before you sell.',
  },
  'real-hourly-rate-for-tutors': {
    title: 'Your Real Hourly Rate as a Tutor',
    description: 'Your real hourly rate is what you keep after commission, divided by every hour you work. Use the formula and a worked example week to find your own number.',
  },
  'how-to-handle-tutoring-reschedule-requests': {
    title: 'How to Handle Tutoring Reschedule Requests',
    description: 'Write one notice rule, apply it every time and confirm each new time in writing. Includes four message templates and what Tutafy does when a lesson moves.',
  },
  'tutoring-tech-stack-for-online-tutors': {
    title: 'Tools for Online Tutors: Audit Your Tech Stack',
    description: 'Map your tutoring tools to six jobs, count the copy-and-paste hand-offs in one lesson, then decide what to replace, link or keep. See what Tutafy covers.',
  },
  'how-to-ask-for-tutoring-payment': {
    title: 'How to Ask a Parent to Pay for Tutoring',
    description: 'Agree payment terms first, make paying take a minute, then follow a six-step ladder from invoice to pause. Message templates and what Tutafy automates.',
  },
  'do-tutors-have-to-pay-taxes': {
    title: 'Tutor Taxes: Do Tutors Have to Pay Taxes?',
    description: 'Do tutors have to pay taxes? A plain guide to tutoring income, US 1099-K and 1099-NEC forms, the UK trading allowance and records. Not tax advice.',
  },
  'online-tutoring-jobs': {
    title: 'Online Tutoring Jobs: Where Tutors Get Hired',
    description: 'Online tutoring jobs compared: who can apply to Preply, Wyzant, Varsity Tutors, Cambly and others, what each keeps or pays, checked 31 Oct 2026.',
  },
  'tutor-resume': {
    title: 'Tutor Resume: How to Write One, With Examples',
    description: 'Tutor resume guide: the sections, bullets that show results, examples by subject, what to write with no paid experience and when you do not need one.',
  },
  'ielts-speaking-part-2-topics': {
    title: 'IELTS Speaking Part 2 Topics and How to Practise',
    description: 'IELTS Speaking Part 2 topics: how the task card works by the official pages, why no latest list exists, 30 practice cards and a tutor routine.',
  },
  'wyzant-fees-for-tutors': {
    title: 'Wyzant Fees for Tutors: What You Keep',
    description: 'Wyzant fees for tutors: the 25% platform fee, the 9% student fee, what to post to take home a rate, referrals, payouts and taxes. Checked 31 Oct 2026.',
  },
  'how-to-find-an-online-tutor': {
    title: 'How to Find an Online Tutor: 10 Checks',
    description: 'How to find an online tutor: ten checks before you book, in the first lesson and after four lessons, with price, refund, payment and safety rules.',
  },
  'reading-tutor-for-your-child': {
    title: 'Reading Tutor for Your Child: Signs and Questions',
    description: 'Reading tutor for your child: warning signs by age, what the research says works, what an online reading session looks like and eight questions to ask.',
  },
  'online-whiteboard-for-tutoring': {
    title: 'Online Whiteboard for Tutoring: Free Options',
    description: 'Free online whiteboards for tutoring compared on limits, sharing with a student and saving the board, checked 31 Oct 2026. Says what Tutafy lacks.',
  },
  'free-tutoring-invoice-template': {
    title: 'Free Tutoring Invoice Template: Word, PDF',
    description: 'Download a free tutoring invoice template in Word, PDF or OpenDocument, with a late cancellation fee line and time zones. Worked examples included.',
  },
  'how-to-write-a-tutor-bio': {
    title: 'Tutor Bio: How to Write One, 15 Examples',
    description: 'A tutor bio says who you help, what a lesson is like and why you. Read 15 tutor bio examples, headline formulas, a before and after and a checklist.',
  },
}

/**
 * The same list with the brand on every title (T-0850): a title that does not name Tutafy ends with " | Tutafy", so the
 * name is in every search result, and tests/seo-brand.test.ts keeps the whole title within 60 characters.
 */
export const BLOG_SEO: Record<string, { title: string; description: string }> = Object.fromEntries(
  Object.entries(BLOG_SEO_BASE).map(([slug, s]) => [slug, { ...s, title: /Tutafy/.test(s.title) ? s.title : `${s.title} | Tutafy` }]),
)

function build(path: string, title: string, description: string, opts: { noindex?: boolean; article?: boolean; image?: { url: string; width?: number; height?: number; alt?: string } } = {}): Metadata {
  const url = absoluteUrl(path)
  const image = opts.image ?? SOCIAL_IMAGE
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    ...(opts.noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: opts.article ? 'article' : 'website',
      url,
      title,
      description,
      siteName: 'Tutafy',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.url],
    },
  }
}

/** The metadata of a language page (/learn/<language>, T-0875): its own title and description from the guide, canonical on the main site. */
export function languagePageMetadata(guide: Pick<LanguageGuide, 'slug' | 'title' | 'description'>): Metadata {
  return build(languagePagePath(guide.slug), guide.title, guide.description)
}

/** The metadata of a niche page, /learn/<language>/<group> (T-1033): the guide's own title and description, canonical on the main site. */
export function pairPageMetadata(guide: Pick<PairGuide, 'languageSlug' | 'group' | 'title' | 'description'>): Metadata {
  return build(pairGuidePath(guide), guide.title, guide.description)
}

/** The metadata of a fixed page. */
export function pageMetadata(key: PageKey): Metadata {
  const p: PageSeo = PAGE_SEO[key]
  return build(p.path, p.title, p.description, { noindex: p.noindex })
}

/** The metadata of a blog post; `hero` is the post's hero image, when it has one. */
export function blogPostMetadata(slug: string, hero?: { webp: string; alt: string }): Metadata {
  const seo = BLOG_SEO[slug]
  if (!seo) return { title: 'Post not found', robots: { index: false, follow: false } }
  return build(`/blog/${slug}`, seo.title, seo.description, {
    article: true,
    image: hero ? { url: hero.webp, width: 1200, height: 630, alt: hero.alt } : undefined,
  })
}

/**
 * The metadata of a tutor's public profile (/tutors/<slug>): a title and description of its own
 * (src/lib/tutor-seo.ts) and the canonical on the main site. A profile whose tutor has not turned the
 * public page on is noindex; it is not in the sitemap either (src/lib/tutor-sitemap.ts). So is a profile that is not worth listing
 * (`indexable` false: no real introduction, a test account or a copy of another profile of the same name, src/lib/profile-index.ts, T-1032).
 */
export function tutorMetadata(t: TutorSeoInput, indexable = true): Metadata {
  const seo = tutorSeoText(t)
  return build(`/tutors/${t.slug}`, seo.title, seo.description, { noindex: t.booking_url_active !== true || !indexable })
}

/**
 * The metadata of /book/<slug> (T-0810): its own title and description (src/lib/booking-page.ts), so a shared booking link reads
 * well, and the canonical is the tutor's PROFILE, /tutors/<slug>. The profile is the page search engines should list for a tutor:
 * it has the structured data (ProfilePage, Person, reviews), the sitemap entry and the links from the directory, while the booking
 * page is the page the tutor shares to get a booking. Two pages with the same facts must not compete, so this one points to that.
 */
export function bookingMetadata(slug: string, t: BookingTutor): Metadata {
  const seo = bookingSeoText(t)
  return { ...build(`/tutors/${slug}`, seo.title, seo.description) }
}

/** For a profile that does not exist (or is not visible): never indexed. */
export function tutorNotFoundMetadata(): Metadata {
  return { title: 'Tutor not found', robots: { index: false, follow: false } }
}

/** Paths of the pages that must not be indexed (and so are not in the sitemap). */
export function noindexPaths(): string[] {
  return Object.values(PAGE_SEO as Record<string, PageSeo>).filter(p => p.noindex).map(p => p.path)
}

/** Defaults for the whole site (root layout); each page replaces them with its own via `pageMetadata`. */
export const ROOT_METADATA: Metadata = {
  metadataBase: new URL(absoluteUrl('/')),
  title: { default: PAGE_SEO.home.title, template: '%s · Tutafy' },
  description: PAGE_SEO.home.description,
  applicationName: 'Tutafy',
  verification: { google: 'm76JXehNAqFGxJqYMSnmW1-N0tfnms1WKJ_2NvM8Tu8' },
  keywords: [
    'tutor management software', 'online tutoring platform', 'tutor booking software',
    'tutor scheduling software', 'tutor CRM', 'language tutor software', 'teach online',
    'tutor payment software', 'AI tutoring tools', 'tutoring business software', 'tutor invoicing',
  ],
  authors: [{ name: 'Tutafy' }],
  creator: 'Tutafy',
  publisher: 'Tutafy',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Tutafy' },
  formatDetection: { telephone: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/'),
    title: PAGE_SEO.home.title,
    description: PAGE_SEO.home.description,
    siteName: 'Tutafy',
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_SEO.home.title,
    description: PAGE_SEO.home.description,
    images: [SOCIAL_IMAGE.url],
  },
}
