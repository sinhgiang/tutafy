import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { POSTS, postDates } from '@/lib/blog'
import { SITE_URL as SITE } from '@/lib/site-url'
import { newestUpdateDate } from '@/lib/updates'
import { listPublicTutorSlugs, type TutorSlugClient } from '@/lib/tutor-sitemap'
import { tutorProfileUrl } from '@/lib/tutor-seo'

// The tutor profiles are read from the database, so the list is rebuilt about every hour
// instead of on every request.
export const revalidate = 3600

/**
 * The public (anon) key, no cookies: the sitemap is for crawlers, and with this key the
 * database only returns tutors who turned their public page on. Null when the database is
 * not configured (tests, a build without the variables).
 */
function publicClient(): TutorSlugClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
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
// A tutor profile is listed only when the tutor turned the public page on (src/lib/tutor-sitemap.ts);
// it carries no lastModified, because nothing records when a profile last changed.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '', priority: 1.0, freq: 'weekly' },
    { path: '/tutors', priority: 0.8, freq: 'daily' },
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
  const tutorUrls = (await listPublicTutorSlugs(publicClient())).map(slug => ({ url: tutorProfileUrl(slug), changeFrequency: 'weekly' as const, priority: 0.5 }))
  return [...staticUrls, ...postUrls, ...tutorUrls]
}
