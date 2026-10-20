'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Star, Globe, Clock, Search, GraduationCap, Zap } from 'lucide-react'

interface PublicTutor {
  id: string
  name: string
  bio: string | null
  avatar_url: string | null
  timezone: string | null
  languages: string[] | null
  slug: string
  average_rating: number | null
  review_count: number | null
  default_lesson_price: number | null
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`h-3 w-3 ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
      ))}
    </div>
  )
}

export default function TutorsPage() {
  const [tutors, setTutors] = useState<PublicTutor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('All')

  useEffect(() => {
    fetch('/api/tutors/public')
      .then(r => r.json())
      .then(d => { setTutors(d.tutors ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const allLanguages = ['All', ...Array.from(new Set(tutors.flatMap(t => t.languages ?? []).filter(Boolean))).sort()]

  const filtered = tutors.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.bio?.toLowerCase().includes(search.toLowerCase())
    const matchLang = selectedLanguage === 'All' || (t.languages ?? []).includes(selectedLanguage)
    return matchSearch && matchLang
  })

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <header className="bg-white border-b border-gray-100 px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" fill="white" />
            </div>
            <span className="text-[15px] font-bold text-gray-900">Tutafy</span>
          </Link>
          <Link href="/student/login"
            className="text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors">
            Student login →
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-4">
            <GraduationCap className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-[12px] font-semibold text-indigo-600">Find your tutor</span>
          </div>
          <h1 className="text-[32px] font-bold text-gray-900 tracking-tight">Expert language tutors</h1>
          <p className="text-[15px] text-gray-500 mt-2">1-on-1 lessons, flexible schedule, proven results</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tutors..."
              className="w-full text-[13px] pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {allLanguages.slice(0, 8).map(lang => (
              <button key={lang} onClick={() => setSelectedLanguage(lang)}
                className={`text-[12px] font-medium px-3.5 py-2 rounded-xl transition-colors ${
                  selectedLanguage === lang
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                }`}>
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4" />
                <div className="h-4 bg-gray-100 rounded w-3/4 mx-auto mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[15px] font-semibold text-gray-400">No tutors found</p>
            <p className="text-[13px] text-gray-300 mt-1">Try adjusting your search or language filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(tutor => {
              const initials = tutor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              return (
                <div key={tutor.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-6 text-center">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4 ring-4 ring-indigo-50">
                      {tutor.avatar_url ? (
                        <img src={tutor.avatar_url} alt={tutor.name} className="w-16 h-16 rounded-full object-cover" />
                      ) : (
                        <span className="text-[20px] font-bold text-indigo-600">{initials}</span>
                      )}
                    </div>

                    <h2 className="text-[16px] font-bold text-gray-900">{tutor.name}</h2>

                    {/* Languages */}
                    {(tutor.languages ?? []).length > 0 && (
                      <p className="text-[12px] text-indigo-600 font-medium mt-1">
                        {tutor.languages!.join(' · ')}
                      </p>
                    )}

                    {/* Rating */}
                    {(tutor.review_count ?? 0) > 0 && (
                      <div className="flex items-center justify-center gap-1.5 mt-2">
                        <StarRating rating={tutor.average_rating ?? 0} />
                        <span className="text-[11px] text-gray-400">
                          {tutor.average_rating?.toFixed(1)} ({tutor.review_count})
                        </span>
                      </div>
                    )}

                    {/* Bio */}
                    {tutor.bio && (
                      <p className="text-[12px] text-gray-500 mt-3 leading-relaxed line-clamp-3">
                        {tutor.bio}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center justify-center gap-4 mt-4 text-[11px] text-gray-400">
                      {tutor.timezone && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />{tutor.timezone.split('/')[1]?.replace('_', ' ') ?? tutor.timezone}
                        </span>
                      )}
                      {tutor.default_lesson_price && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />${tutor.default_lesson_price}/lesson
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-6 pb-5 space-y-2">
                    <Link href={`/tutors/${tutor.slug}`}
                      className="block w-full text-center text-[13px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors py-2 rounded-xl">
                      View profile
                    </Link>
                    <Link href={`/book/${tutor.slug}`}
                      className="block w-full text-center text-[13px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors py-2.5 rounded-xl">
                      Book a lesson →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
