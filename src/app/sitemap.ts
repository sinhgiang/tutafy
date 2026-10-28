import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { POSTS, postDates } from '@/lib/blog'
import { SITE_URL as SITE } from '@/lib/site-url'
import { newestUpdateDate } from '@/lib/updates'
import { listIndexableTutorSlugs, type TutorSlugClient } from '@/lib/tutor-sitemap'
import { tutorProfileUrl } from '@/lib/tutor-seo'
import { getDirectory } from '@/lib/directory-cache'
import { refreshCards } from '@/lib/directory'
import { pickLanguagePages, languagePagePath } from '@/lib/language-pages'
import { pairGuidePath, pickPairPages } from '@/lib/niche-pages'

// The tutor profiles are read from the database, so the list is rebuilt about every hour
// instead of on every request.
export const revalidate = 3600

/**
 * The server's own key, no cookies (T-0774): a visitor's key cannot read the tutors table, so the sitemap reads the one column it
 * needs (the slug) of the tutors whose page is on, here on the server. The key is read when the sitemap is built and never leaves
 * this file. Null when the database is not configured (tests, a build without the variables): the sitemap then lists its other pages.
 */
function serverClient(): TutorSlugClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!url.startsWith('http') || url.includes('your_') || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as TutorSlugClient
}

// Only public, indexable pages belong in the sitemap. The sign-in and sign-up pages
// (/login, /register, /student/login) are noindex (src/lib/page-meta.ts) and so are
// not listed.
// Static pages carry no lastModified: nothing records when they last changed, and
// stamping "today" on every build would tell crawlers a false date. Blog posts use
// their own publish date, and the blog index the date of its newest post; /updates takes the date of its
// newest entry (content/updates/).
// A tutor profile is listed only when the tutor turned the public page on and the profile is worth listing (src/lib/tutor-sitemap.ts, src/lib/profile-index.ts);
// it carries no lastModified, because nothing records when a profile last changed.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '', priority: 1.0, freq: 'weekly' },
    { path: '/tutors', priority: 0.8, freq: 'daily' },
    { path: '/find-a-tutor', priority: 0.7, freq: 'daily' },
    { path: '/blog', priority: 0.7, freq: 'weekly' },
    { path: '/updates', priority: 0.5, freq: 'weekly' },
    { path: '/about', priority: 0.6, freq: 'monthly' },
    { path: '/customers', priority: 0.6, freq: 'monthly' },
    { path: '/contact', priority: 0.5, freq: 'monthly' },
    { path: '/privacy', priority: 0.3, freq: 'yearly' },
    { path: '/terms', priority: 0.3, freq: 'yearly' },
  ]
  const postDate = (date: string) => new Date(date + 'T00:00:00')
  const newestPost = POSTS.reduce<Date | undefined>((latest, p) => (!latest || postDate(postDates(p).modified) > latest ? postDate(postDates(p).modified) : latest), undefined)
  const newestUpdate = newestUpdateDate()
  const staticUrls = pages.map(p => ({
    url: `${SITE}${p.path}`,
    ...(p.path === '/blog' && newestPost ? { lastModified: newestPost } : {}),
    ...(p.path === '/updates' && newestUpdate ? { lastModified: new Date(newestUpdate + 'T00:00:00Z') } : {}),
    changeFrequency: p.freq,
    priority: p.priority,
  }))
  const postUrls = POSTS.map(p => ({ url: `${SITE}/blog/${p.slug}`, lastModified: postDate(postDates(p).modified), changeFrequency: 'monthly' as const, priority: 0.6 }))
  // Only profiles worth listing (src/lib/profile-index.ts, T-1032): a real introduction, not a test account, one profile for each name.
  const tutorUrls = (await listIndexableTutorSlugs(serverClient())).map(slug => ({ url: tutorProfileUrl(slug), changeFrequency: 'weekly' as const, priority: 0.5 }))
  // A language page is listed only while it exists (src/lib/language-pages.ts): a language with too few tutors has no page and no entry.
  const directory = await getDirectory()
  const languageUrls = pickLanguagePages(directory?.open ? refreshCards(directory.cards, new Date()) : []).map(p => ({ url: `${SITE}${languagePagePath(p.guide.slug)}`, changeFrequency: 'weekly' as const, priority: 0.7 }))
  // A niche page (T-1033) the same way: listed only while at least 3 tutors who can be booked teach the language and ticked the group.
  const pairUrls = pickPairPages(directory?.open ? refreshCards(directory.cards, new Date()) : []).map(p => ({ url: `${SITE}${pairGuidePath(p.guide)}`, changeFrequency: 'weekly' as const, priority: 0.7 }))
  return [...staticUrls, ...languageUrls, ...pairUrls, ...postUrls, ...tutorUrls]
}
