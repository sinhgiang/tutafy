import type { MetadataRoute } from 'next'
import { POSTS } from '@/lib/blog'

const SITE = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutafy.com').replace(/[﻿​\s]/g, '').replace(/\/+$/, '') || 'https://tutafy.com'

// Only public, indexable pages belong in the sitemap.
// Static pages carry no lastModified: nothing records when they last changed, and
// stamping "today" on every build would tell crawlers a false date. Blog posts use
// their own publish date, and the blog index the date of its newest post.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '', priority: 1.0, freq: 'weekly' },
    { path: '/tutors', priority: 0.8, freq: 'daily' },
    { path: '/blog', priority: 0.7, freq: 'weekly' },
    { path: '/about', priority: 0.6, freq: 'monthly' },
    { path: '/customers', priority: 0.6, freq: 'monthly' },
    { path: '/contact', priority: 0.5, freq: 'monthly' },
    { path: '/privacy', priority: 0.3, freq: 'yearly' },
    { path: '/terms', priority: 0.3, freq: 'yearly' },
    { path: '/register', priority: 0.7, freq: 'monthly' },
    { path: '/login', priority: 0.5, freq: 'monthly' },
    { path: '/student/login', priority: 0.5, freq: 'monthly' },
  ]
  const postDate = (date: string) => new Date(date + 'T00:00:00')
  const newestPost = POSTS.reduce<Date | undefined>((latest, p) => (!latest || postDate(p.date) > latest ? postDate(p.date) : latest), undefined)
  const staticUrls = pages.map(p => ({
    url: `${SITE}${p.path}`,
    ...(p.path === '/blog' && newestPost ? { lastModified: newestPost } : {}),
    changeFrequency: p.freq,
    priority: p.priority,
  }))
  const postUrls = POSTS.map(p => ({ url: `${SITE}/blog/${p.slug}`, lastModified: postDate(p.date), changeFrequency: 'monthly' as const, priority: 0.6 }))
  return [...staticUrls, ...postUrls]
}
