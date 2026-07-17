'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingUp, DollarSign, Scale, BookOpen, ArrowRight, GraduationCap } from 'lucide-react'
import { AuthorAvatar } from './AuthorAvatar'

export interface BlogCard {
  slug: string
  title: string
  description: string
  category: string
  date: string
  author: string
  minutes: number
  hero?: { avif: string; webp: string; alt: string } | null
}

// Category → gradient + icon. Gives each card a visual "thumbnail" without needing
// a real image, the way modern SaaS blogs (Linear, Vercel, Resend) do it.
const STYLE: Record<string, { grad: string; icon: typeof TrendingUp }> = {
  Growth: { grad: 'from-violet-500 to-indigo-500', icon: TrendingUp },
  Business: { grad: 'from-emerald-500 to-teal-500', icon: DollarSign },
  Comparison: { grad: 'from-amber-500 to-orange-500', icon: Scale },
  'How-to': { grad: 'from-sky-500 to-blue-500', icon: BookOpen },
}
const fallback = { grad: 'from-gray-500 to-gray-700', icon: GraduationCap }
const styleFor = (c: string) => STYLE[c] ?? fallback

function fmt(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Thumb({ category, hero, big = false }: { category: string; hero?: BlogCard['hero']; big?: boolean }) {
  if (hero) {
    return (
      <div className={`relative overflow-hidden ${big ? 'h-full min-h-[220px]' : 'h-44'}`}>
        <picture>
          <source srcSet={hero.avif} type="image/avif" />
          <img src={hero.webp} alt={hero.alt} className="w-full h-full object-cover" loading="lazy" />
        </picture>
      </div>
    )
  }
  const s = styleFor(category)
  const Icon = s.icon
  return (
    <div className={`relative bg-gradient-to-br ${s.grad} overflow-hidden ${big ? 'h-full min-h-[220px]' : 'h-44'}`}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
      <Icon className={`absolute ${big ? 'right-6 bottom-6 h-20 w-20' : 'right-4 bottom-4 h-14 w-14'} text-white/25`} />
      <span className="absolute left-4 top-4 text-[11px] font-bold text-white bg-white/20 backdrop-blur rounded-full px-2.5 py-1">{category}</span>
    </div>
  )
}

export function BlogList({ posts }: { posts: BlogCard[] }) {
  const categories = ['All', ...Array.from(new Set(posts.map(p => p.category)))]
  const [active, setActive] = useState('All')

  const filtered = active === 'All' ? posts : posts.filter(p => p.category === active)
  const [featured, ...rest] = filtered

  return (
    <div>
      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map(c => (
          <button key={c} onClick={() => setActive(c)}
            className={`text-[13px] font-semibold px-3.5 py-1.5 rounded-full transition-colors ${
              active === c ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {c}
          </button>
        ))}
      </div>

      {/* Featured */}
      {featured && (
        <Link href={`/blog/${featured.slug}`}
          className="group grid md:grid-cols-2 rounded-3xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all mb-8">
          <Thumb category={featured.category} hero={featured.hero} big />
          <div className="p-7 flex flex-col justify-center">
            <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest mb-2">Featured</p>
            <h2 className="text-[24px] font-extrabold text-gray-900 tracking-tight leading-snug group-hover:text-indigo-600 transition-colors">{featured.title}</h2>
            <p className="text-[14px] text-gray-500 mt-3 leading-relaxed line-clamp-2">{featured.description}</p>
            <div className="flex items-center gap-3 mt-5">
              <AuthorAvatar size={32} />
              <div className="text-[12px] text-gray-400"><span className="font-semibold text-gray-700">{featured.author}</span> · {fmt(featured.date)} · {featured.minutes} min</div>
            </div>
          </div>
        </Link>
      )}

      {/* Grid */}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {rest.map(p => (
            <Link key={p.slug} href={`/blog/${p.slug}`}
              className="group rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all bg-white">
              <Thumb category={p.category} hero={p.hero} />
              <div className="p-5">
                <h3 className="text-[16px] font-bold text-gray-900 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">{p.title}</h3>
                <p className="text-[13px] text-gray-500 mt-2 leading-relaxed line-clamp-2">{p.description}</p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    <AuthorAvatar size={24} />
                    <span className="text-[11px] text-gray-400">{fmt(p.date)} · {p.minutes} min</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
