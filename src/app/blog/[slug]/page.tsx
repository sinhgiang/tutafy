import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  GraduationCap, ArrowLeft, ArrowRight, Check, X, Lightbulb, AlertTriangle, Info, ListChecks,
} from 'lucide-react'
import { POSTS, getPost, readingMinutes, getFaq, heroFor, type PostBlock } from '@/lib/blog'
import { CommissionCalculator } from '@/components/blog/CommissionCalculator'
import { AuthorAvatar } from '@/components/blog/AuthorAvatar'

const SITE = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutafy.com').replace(/[﻿​\s]/g, '').replace(/\/+$/, '') || 'https://tutafy.com'

export function generateStaticParams() {
  return POSTS.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return { title: 'Post not found' }
  const hero = heroFor(post.slug)
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article', title: post.title, description: post.description,
      images: hero ? [{ url: hero.webp, width: 1200, height: 630, alt: hero.alt }] : undefined,
    },
    twitter: { card: 'summary_large_image', images: hero ? [hero.webp] : undefined },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  const faq = getFaq(post)
  const hero = heroFor(post.slug)
  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org', '@type': 'BlogPosting',
      headline: post.title, description: post.description, datePublished: post.date,
      author: { '@type': 'Person', name: post.author }, publisher: { '@type': 'Organization', name: 'Tutafy' },
      mainEntityOfPage: `${SITE}/blog/${post.slug}`,
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE}/blog/${post.slug}` },
      ],
    },
  ]
  if (faq.length > 0) {
    jsonLd.push({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    })
  }

  return (
    <div className="min-h-screen bg-white">
      {jsonLd.map((s, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />)}

      <nav className="border-b border-gray-100 px-6 py-4 sticky top-0 bg-white/90 backdrop-blur z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center">
              <GraduationCap className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <span className="text-[17px] font-bold text-gray-900">Tutafy</span>
          </Link>
          <Link href="/blog" className="flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" /> All posts
          </Link>
        </div>
      </nav>

      <article className="max-w-2xl mx-auto px-6 py-14">
        {/* Breadcrumb (visible, matches JSON-LD position 3) */}
        <nav className="text-[12px] text-gray-400 mb-5">
          <Link href="/" className="hover:text-gray-600">Home</Link> <span className="mx-1">/</span>
          <Link href="/blog" className="hover:text-gray-600">Blog</Link> <span className="mx-1">/</span>
          <span className="text-gray-500">{post.category}</span>
        </nav>

        <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 rounded-full px-2.5 py-1">{post.category}</span>
        <h1 className="text-[32px] sm:text-[38px] font-extrabold text-gray-900 tracking-tight leading-tight mt-4">{post.title}</h1>

        {/* Byline */}
        <div className="flex items-center gap-3 mt-5">
          <AuthorAvatar size={36} />
          <div>
            <p className="text-[13px] font-semibold text-gray-900">{post.author}</p>
            <p className="text-[11px] text-gray-400">
              {new Date(post.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {readingMinutes(post)} min read
            </p>
          </div>
        </div>

        {/* Hero image */}
        {hero && (
          <picture>
            <source srcSet={hero.avif} type="image/avif" />
            <img src={hero.webp} alt={hero.alt} width={1200} height={630} className="w-full rounded-2xl mt-8 border border-gray-100" />
          </picture>
        )}

        <div className="mt-8 space-y-5">
          {post.content.map((b, i) => <Block key={i} b={b} />)}
        </div>

        {/* Author bio (E-E-A-T) */}
        <div className="mt-12 flex items-start gap-3 bg-gray-50 rounded-2xl p-5">
          <AuthorAvatar size={40} />
          <div>
            <p className="text-[13px] font-semibold text-gray-900">{post.author}</p>
            <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">{post.authorBio} <Link href="/about" className="text-indigo-500 hover:underline">About Tutafy →</Link></p>
          </div>
        </div>

        {/* Related posts */}
        {POSTS.filter(p => p.slug !== post.slug).length > 0 && (
          <div className="mt-12">
            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-4">Keep reading</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {POSTS.filter(p => p.slug !== post.slug).slice(0, 2).map(p => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all">
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">{p.category}</span>
                  <p className="text-[15px] font-bold text-gray-900 mt-3 leading-snug group-hover:text-indigo-600 transition-colors">{p.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  )
}

function Block({ b }: { b: PostBlock }) {
  switch (b.type) {
    case 'h2': return <h2 className="text-[22px] font-bold text-gray-900 tracking-tight pt-4">{b.text}</h2>
    case 'h3': return <h3 className="text-[18px] font-bold text-gray-900 pt-2">{b.text}</h3>
    case 'p': return <p className="text-[15px] text-gray-700 leading-relaxed">{b.text}</p>
    case 'ul': return (
      <ul className="space-y-2 pl-1">
        {b.items.map((it, j) => (
          <li key={j} className="flex items-start gap-2.5 text-[15px] text-gray-700 leading-relaxed">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />{it}
          </li>
        ))}
      </ul>
    )
    case 'takeaways': return (
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 not-prose">
        <div className="flex items-center gap-2 mb-3"><ListChecks className="h-4 w-4 text-indigo-500" /><p className="text-[13px] font-bold text-indigo-900">Key takeaways</p></div>
        <ul className="space-y-2">
          {b.items.map((it, j) => (
            <li key={j} className="flex items-start gap-2.5 text-[13px] text-indigo-900/80 leading-relaxed">
              <Check className="h-3.5 w-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />{it}
            </li>
          ))}
        </ul>
      </div>
    )
    case 'callout': {
      const styles = { tip: { bg: 'bg-emerald-50 border-emerald-100', ic: 'text-emerald-500', Icon: Lightbulb }, warn: { bg: 'bg-amber-50 border-amber-100', ic: 'text-amber-500', Icon: AlertTriangle }, info: { bg: 'bg-blue-50 border-blue-100', ic: 'text-blue-500', Icon: Info } }[b.variant ?? 'info']
      const Icon = styles.Icon
      return (
        <div className={`rounded-2xl border p-4 flex items-start gap-3 ${styles.bg}`}>
          <Icon className={`h-4.5 w-4.5 flex-shrink-0 mt-0.5 ${styles.ic}`} style={{ width: 18, height: 18 }} />
          <div>
            {b.title && <p className="text-[13px] font-bold text-gray-900 mb-0.5">{b.title}</p>}
            <p className="text-[13px] text-gray-600 leading-relaxed">{b.text}</p>
          </div>
        </div>
      )
    }
    case 'statCards': return (
      <div className="grid grid-cols-3 gap-3 not-prose">
        {b.cards.map((c, j) => (
          <div key={j} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-[22px] font-extrabold text-indigo-600 leading-none">{c.value}</p>
            <p className="text-[11px] text-gray-400 mt-1.5 leading-tight">{c.label}</p>
          </div>
        ))}
      </div>
    )
    case 'compare': return (
      <div className="not-prose">
        <div className="rounded-2xl border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50">
                {b.headers.map((h, j) => <th key={j} className={`text-[11px] font-bold uppercase tracking-wider px-4 py-3 ${j === b.headers.length - 1 ? 'text-indigo-600' : 'text-gray-400'}`}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((row, r) => (
                <tr key={r} className="border-t border-gray-50">
                  {row.map((cell, c) => (
                    <td key={c} className={`px-4 py-3 text-[13px] ${c === 0 ? 'text-gray-700 font-medium' : c === row.length - 1 ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                      {typeof cell === 'boolean' ? (cell ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-gray-300" />) : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {b.caption && <p className="text-[11px] text-gray-400 mt-2">{b.caption}</p>}
      </div>
    )
    case 'prosCons': return (
      <div className="grid sm:grid-cols-2 gap-4 not-prose">
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
          <p className="text-[12px] font-bold text-emerald-700 uppercase tracking-wider mb-3">Pros</p>
          <ul className="space-y-2">{b.pros.map((p, j) => <li key={j} className="flex items-start gap-2 text-[13px] text-gray-700"><Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />{p}</li>)}</ul>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
          <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-3">Cons</p>
          <ul className="space-y-2">{b.cons.map((p, j) => <li key={j} className="flex items-start gap-2 text-[13px] text-gray-600"><X className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />{p}</li>)}</ul>
        </div>
      </div>
    )
    case 'cta': return (
      <div className="bg-indigo-500 rounded-2xl p-6 text-center not-prose">
        <p className="text-[16px] font-bold text-white">{b.title}</p>
        {b.text && <p className="text-[13px] text-indigo-100 mt-1.5 max-w-md mx-auto leading-relaxed">{b.text}</p>}
        <Link href={b.href} className="inline-flex items-center gap-2 mt-4 text-[13px] font-bold text-indigo-600 bg-white hover:bg-indigo-50 transition-colors px-5 py-2.5 rounded-xl">
          {b.button} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
    case 'calculator': return <CommissionCalculator />
    case 'image': return (
      <figure className="not-prose my-7">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50" style={{ aspectRatio: '1100 / 619' }}>
          <picture>
            <source srcSet={`${b.src}.avif`} type="image/avif" />
            <source srcSet={`${b.src}.webp`} type="image/webp" />
            <img src={`${b.src}.webp`} alt={b.alt} width={1100} height={619} loading="lazy" decoding="async" className="w-full h-full object-cover" />
          </picture>
        </div>
        {(b.caption || b.credit) && (
          <figcaption className="text-[12px] text-gray-400 mt-2.5 text-center">
            {b.caption}{b.caption && b.credit ? ' · ' : ''}{b.credit && <span className="text-gray-300">{b.credit}</span>}
          </figcaption>
        )}
      </figure>
    )
    case 'faq': return (
      <div className="not-prose pt-2">
        <h2 className="text-[22px] font-bold text-gray-900 tracking-tight mb-4">Frequently asked questions</h2>
        <div className="space-y-3">
          {b.items.map((item, j) => (
            <details key={j} className="group bg-gray-50 rounded-2xl p-5 [&_summary]:cursor-pointer">
              <summary className="flex items-center justify-between text-[14px] font-semibold text-gray-900 list-none">
                {item.q}<span className="text-indigo-400 group-open:rotate-45 transition-transform text-[20px] leading-none">+</span>
              </summary>
              <p className="text-[13px] text-gray-500 mt-3 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    )
  }
}
