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

export const TITLE_MAX = 60
export const TITLE_MIN = 20
export const DESCRIPTION_MAX = 155
export const DESCRIPTION_MIN = 70

const SOCIAL_IMAGE = { url: '/icon-512.png', width: 512, height: 512, alt: 'Tutafy' }

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
    title: 'Find an Online Language Tutor | Tutafy Tutors',
    description: 'Browse language tutors on Tutafy and book 1-on-1 online lessons. Compare languages, ratings and prices, then pick a time that suits you.',
  },
  blog: {
    path: '/blog',
    title: 'Tutafy Blog: Tips & Guides for Online Tutors',
    description: 'Practical advice on getting students, pricing lessons, running your tutoring business and keeping 100% of what you earn.',
  },
  about: {
    path: '/about',
    title: 'About Tutafy: Software Built for Independent Tutors',
    description: 'Why we built Tutafy: an all-in-one home for independent tutors that charges a flat fee and never takes a cut of your income.',
  },
  customers: {
    path: '/customers',
    title: 'Tutafy Customer Stories for Online Tutors',
    description: 'See how independent tutors and small tutoring centers run and grow their business with Tutafy.',
  },
  contact: {
    path: '/contact',
    title: 'Contact Tutafy: Support, Questions and Feedback',
    description: 'Get in touch with the Tutafy team for support, product questions, billing help or feedback about the tutoring platform.',
  },
  privacy: {
    path: '/privacy',
    title: 'Privacy Policy: How Tutafy Handles Your Data',
    description: 'How Tutafy collects, uses and protects personal data, which cookies and analytics it uses, and how to contact us about your privacy.',
  },
  terms: {
    path: '/terms',
    title: 'Terms of Service for Using Tutafy',
    description: 'The terms for using Tutafy: your account, acceptable use, your data and content, payments, service availability and termination.',
  },
  register: {
    path: '/register',
    title: 'Create a Free Tutor Account | Tutafy Sign Up',
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
    title: 'Student Log In | View Your Lessons on Tutafy',
    description: 'Students: get a sign-in link by email to see your lessons, homework and progress with your tutor on Tutafy.',
    noindex: true,
  },
} as const satisfies Record<string, PageSeo>

export type PageKey = keyof typeof PAGE_SEO

/** Titles and descriptions for the search results of each blog post. The post's own `title` stays as the visible headline. */
export const BLOG_SEO: Record<string, { title: string; description: string }> = {
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
    title: 'How to Stop Tutoring No-Shows and Late Cancellations',
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
    title: 'How to Write a Tutoring Business Plan (Free Template)',
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
    title: 'Best AI Tools for Tutors and Where They Need a Human',
    description: 'Where AI saves tutors real time, from lesson planning to grading and admin, and the failure modes to check before content reaches a student.',
  },
  'best-video-call-tool-for-tutors': {
    title: 'Best Video Call Tool for Tutors: Zoom vs Meet vs More',
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
}

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
      card: opts.image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: [image.url],
    },
  }
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
 * public page on is noindex; it is not in the sitemap either (src/lib/tutor-sitemap.ts).
 */
export function tutorMetadata(t: TutorSeoInput): Metadata {
  const seo = tutorSeoText(t)
  return build(`/tutors/${t.slug}`, seo.title, seo.description, { noindex: t.booking_url_active !== true })
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
