import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { GraduationCap, Globe, Clock, Star, BookOpen, MessageCircle, ArrowRight, CheckCircle } from 'lucide-react'

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`${cls} ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
      ))}
    </div>
  )
}

export default async function TutorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: tutor } = await supabase
    .from('tutors')
    .select('id, name, bio, avatar_url, timezone, languages, slug, average_rating, review_count, default_lesson_price, booking_url_active, cancellation_hours, trial_enabled, trial_price')
    .eq('slug', slug)
    .single()

  if (!tutor) notFound()

  const initials = tutor.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  let reviews: any[] = []
  try {
    const { data } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at')
      .eq('tutor_id', tutor.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(6)
    reviews = data ?? []
  } catch {}

  let lessonCount = 0
  try {
    const { count } = await supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('tutor_id', tutor.id)
      .eq('status', 'completed')
    lessonCount = count ?? 0
  } catch {}

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Nav */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-bold text-gray-900">Tutafy</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/tutors" className="text-[13px] text-gray-500 hover:text-gray-800 transition-colors">All tutors</Link>
            {tutor.booking_url_active && (
              <Link href={`/book/${slug}`}
                className="text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-4 py-2 rounded-lg">
                Book a lesson
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">

          {/* Left — Main profile */}
          <div className="space-y-6">
            {/* Hero */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="w-20 h-20 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0 ring-4 ring-indigo-50">
                  {tutor.avatar_url ? (
                    <img src={tutor.avatar_url} alt={tutor.name} className="w-20 h-20 rounded-2xl object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-indigo-600">{initials}</span>
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-[24px] font-bold text-gray-900">{tutor.name}</h1>
                  {tutor.languages?.length > 0 && (
                    <p className="text-[14px] text-indigo-600 font-medium mt-1">
                      Teaches: {tutor.languages.join(' · ')}
                    </p>
                  )}
                  {(tutor.review_count ?? 0) > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <StarRow rating={tutor.average_rating ?? 0} size="md" />
                      <span className="text-[14px] font-bold text-gray-800">{Number(tutor.average_rating ?? 0).toFixed(1)}</span>
                      <span className="text-[13px] text-gray-400">({tutor.review_count} reviews)</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 mt-3">
                    {tutor.timezone && (
                      <span className="flex items-center gap-1.5 text-[12px] text-gray-500">
                        <Globe className="h-3.5 w-3.5 text-gray-400" /> {tutor.timezone}
                      </span>
                    )}
                    {lessonCount > 0 && (
                      <span className="flex items-center gap-1.5 text-[12px] text-gray-500">
                        <BookOpen className="h-3.5 w-3.5 text-gray-400" /> {lessonCount} lessons taught
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {tutor.bio && (
                <div className="mt-5 pt-5 border-t border-gray-50">
                  <p className="text-[14px] text-gray-600 leading-relaxed">{tutor.bio}</p>
                </div>
              )}
            </div>

            {/* What you get */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-[16px] font-bold text-gray-900 mb-4">What to expect</h2>
              <div className="space-y-3">
                {[
                  'Personalized 1-on-1 lesson tailored to your level',
                  'Flexible scheduling — book any available slot',
                  'Video lesson via Jitsi Meet — link generated after booking (no download required)',
                  tutor.cancellation_hours > 0 ? `Free cancellation up to ${tutor.cancellation_hours}h before lesson` : 'Flexible cancellation policy',
                  (tutor as any).trial_enabled && (tutor as any).trial_price ? `Trial lesson available at $${Number((tutor as any).trial_price).toFixed(2)}` : null,
                ].filter(Boolean).map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <p className="text-[13px] text-gray-700">{item as string}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="text-[16px] font-bold text-gray-900">Student reviews</h2>
                  <span className="text-[12px] text-gray-400">{tutor.review_count} total</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {reviews.map(r => (
                    <div key={r.id} className="bg-gray-50 rounded-xl p-4">
                      <StarRow rating={r.rating} />
                      {r.comment && (
                        <p className="text-[13px] text-gray-600 mt-2 leading-relaxed">&quot;{r.comment}&quot;</p>
                      )}
                      <p className="text-[10px] text-gray-300 mt-2">
                        {new Date(r.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — Booking CTA */}
          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              {tutor.default_lesson_price && (
                <div className="mb-4">
                  <p className="text-[13px] text-gray-400">Starting from</p>
                  <p className="text-[28px] font-black text-gray-900">${Number(tutor.default_lesson_price).toFixed(0)}<span className="text-[14px] font-normal text-gray-400">/lesson</span></p>
                  {(tutor as any).trial_enabled && (tutor as any).trial_price && (
                    <p className="text-[12px] text-emerald-600 font-medium mt-1">
                      Trial lesson: ${Number((tutor as any).trial_price).toFixed(0)}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2.5 mb-5">
                <div className="flex items-center gap-2 text-[13px] text-gray-600">
                  <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  30, 45, 60 or 90 min sessions
                </div>
                <div className="flex items-center gap-2 text-[13px] text-gray-600">
                  <MessageCircle className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  Free cancellation (policy applies)
                </div>
              </div>

              {tutor.booking_url_active ? (
                <Link href={`/book/${slug}`}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-[14px] font-bold rounded-xl transition-colors">
                  Book a lesson <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <div className="text-center py-3 bg-gray-100 rounded-xl text-[13px] text-gray-400">
                  Booking currently unavailable
                </div>
              )}
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <p className="text-[12px] font-semibold text-indigo-900">No account needed</p>
              <p className="text-[12px] text-indigo-700 mt-0.5">Book instantly — just your name and email. You&apos;ll get a confirmation with all details.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
