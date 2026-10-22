import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { tutorMetadata, tutorNotFoundMetadata } from '@/lib/page-meta'
import { tutorJsonLd, httpsImage } from '@/lib/tutor-seo'
import { jsonLdScript } from '@/lib/seo'
import { loadChosenDurations, resolveDurationConfig, describeDurations } from '@/lib/lesson-durations'
import { loadShowMadeWith } from '@/lib/branding'
import { loadPublicTutor } from '@/lib/public-tutor'
import { PROFILE_PAGE_COLUMNS } from '@/lib/public-tutor-columns'
import { loadFreeTimes, loadReviewLessonCounts, type ReadClient } from '@/lib/profile-data'
import {
  bioParagraphs, firstNameOf, hasTrial, initialsOf, joinedLabel, priceLabel, profileNotes, reviewText, safeZone, usableReviews,
} from '@/lib/tutor-profile'
import { MadeWithTutafy } from '@/components/MadeWithTutafy'
import { NextTimes, FreeTimesSection, StickyBookBar } from '@/components/profile/FreeTimes'
import Link from 'next/link'
import { SiteFooter } from '@/components/SiteFooter'
import { GraduationCap, Globe, Star, Sparkles, Languages, BookOpen, Check, Video, RefreshCw, Zap, Clock, ArrowRight } from 'lucide-react'

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'
  return (
    <div className="flex gap-0.5" role="img" aria-label={`Rated ${Number(rating).toFixed(1)} out of 5`}>
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`${cls} ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
      ))}
    </div>
  )
}

// One read of the tutor per request, shared by the page and its metadata. Read on the server with the admin client, only the public
// columns (T-0774); a tutor whose page is off is found only by that tutor themselves, signed in (their own preview), as the old policy did.
const getTutor = cache(async (slug: string) => {
  let viewerId: string | null = null
  try { viewerId = (await (await createClient()).auth.getUser()).data.user?.id ?? null } catch {}
  const data = await loadPublicTutor(createAdminClient(), slug, PROFILE_PAGE_COLUMNS, viewerId)
  return data
})

// Own title, description, canonical and structured data per profile (src/lib/tutor-seo.ts, src/lib/page-meta.ts).
// A profile whose tutor turned the public page off is noindex.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  let tutor: Awaited<ReturnType<typeof getTutor>> = null
  try { tutor = await getTutor(slug) } catch {}
  return tutor ? tutorMetadata(tutor) : tutorNotFoundMetadata()
}

const CARD = 'bg-white rounded-2xl border border-gray-100 shadow-sm'
const H2 = 'text-[18px] font-bold text-gray-900'

export default async function TutorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const tutor = await getTutor(slug)

  if (!tutor) notFound()

  const first = firstNameOf(tutor.name)
  const tutorTz = safeZone(tutor.timezone)
  const bookHref = `/book/${slug}`
  const bookable = !!tutor.booking_url_active

  // The lesson lengths this tutor takes (T-0698): the same two columns as the booking page, read apart from the rest so a
  // database without them still works; a tutor who chose nothing keeps the old sentence, all four lengths.
  const admin = createAdminClient()
  const chosen = await loadChosenDurations(admin, tutor.id)
  const lengths = resolveDurationConfig(chosen.lesson_durations, chosen.default_lesson_duration)
  // the small "Made with Tutafy" line: Free tutors always, paid tutors unless they turned it off (src/lib/branding.ts)
  const showMadeWith = await loadShowMadeWith(admin, tutor.id)

  // The admin client reads what a visitor's key cannot: the tutor (T-0774), the blocked days, the lessons. A failed read there means no times and no lesson counts.
  const getAdmin = () => admin as unknown as ReadClient

  // Public reviews: the newest 100 (the page shows six, the structured data ten), and only rows with a real 1-5 rating.
  let reviews: { id: string; rating: number; comment: string | null; created_at: string; student_id: string | null }[] = []
  try {
    const { data } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at, student_id')
      .eq('tutor_id', tutor.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(100)
    reviews = usableReviews(data ?? [])
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

  const shown = reviews.slice(0, 6)
  const [times, lessonsBy] = await Promise.all([
    bookable ? loadFreeTimes(supabase as unknown as ReadClient, getAdmin, tutor, lengths.defaultDuration) : Promise.resolve({ slots: [], state: 'unknown' as const }),
    loadReviewLessonCounts(getAdmin, tutor.id, shown.map(r => r.student_id ?? '')),
  ])

  const photo = httpsImage(tutor.avatar_url)
  const reviewCount = Number(tutor.review_count ?? 0)
  const hasReviews = reviewCount > 0 && shown.length > 0
  const isNew = !hasReviews && lessonCount === 0
  const joined = joinedLabel(tutor.created_at)
  const about = bioParagraphs(tutor.bio)
  const price = priceLabel(tutor.default_lesson_price, tutor.currency)
  const trial = hasTrial(tutor)
  const trialPrice = trial ? priceLabel(tutor.trial_price, tutor.currency) : null
  const notes = profileNotes(tutor, lengths.durations)
  const cancelHours = Number(tutor.cancellation_hours)
  const freeCancel = Number.isFinite(cancelHours) && cancelHours > 0
  const languages: string[] = Array.isArray(tutor.languages) ? tutor.languages.filter((l: unknown): l is string => typeof l === 'string' && l.trim() !== '') : []
  const timesProps = { slots: times.slots, state: times.state, tutorTz, bookHref, first }
  const noteIcon = { lessons: Clock, cancel: RefreshCw, trial: Zap, video: Video } as const

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-24 lg:pb-0">
      {tutor.booking_url_active && tutorJsonLd({ ...tutor, reviews: shown }).map((data, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }} />
      ))}
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
            {bookable && (
              <Link href={bookHref}
                className="hidden sm:inline-flex text-[13px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors px-4 py-2 rounded-lg">
                Book a lesson
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">

          {/* Left: the profile */}
          <div className="space-y-5 min-w-0">
            {/* Hero */}
            <section className={`${CARD} p-5 sm:p-6 flex flex-col sm:flex-row gap-5`} data-testid="profile-hero">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt={`Photo of ${tutor.name}`} width={160} height={200} data-testid="profile-photo"
                  className="w-32 sm:w-40 aspect-[4/5] rounded-2xl object-cover shrink-0 bg-indigo-50" />
              ) : (
                <div role="img" aria-label={`${tutor.name} has not added a photo yet`} data-testid="profile-monogram"
                  className="w-32 sm:w-40 aspect-[4/5] rounded-2xl shrink-0 bg-indigo-100 text-indigo-700 flex items-center justify-center text-[36px] font-bold">
                  {initialsOf(tutor.name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-[28px] sm:text-[32px] leading-tight font-extrabold text-gray-900 tracking-tight break-words">{tutor.name}</h1>
                {hasReviews ? (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2" data-testid="profile-rating">
                    <StarRow rating={Number(tutor.average_rating ?? 0)} size="md" />
                    <span className="text-[14px] font-bold text-gray-900">{Number(tutor.average_rating ?? 0).toFixed(1)}</span>
                    <span className="text-[13px] text-gray-600">({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</span>
                    {lessonCount > 0 && <span className="text-[13px] text-gray-600 sm:before:content-['·'] sm:before:mr-2">{lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'} taught</span>}
                  </div>
                ) : isNew ? (
                  <p className="mt-2" data-testid="profile-new">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[12.5px] font-semibold text-indigo-800">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> New on Tutafy{joined ? ` · joined ${joined}` : ''}
                    </span>
                  </p>
                ) : (
                  <p className="mt-2 text-[13px] text-gray-600 flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'} taught</p>
                )}
                <ul className="mt-4 space-y-1.5 text-[13.5px] text-gray-700">
                  {languages.length > 0 && (
                    <li className="flex items-center gap-2"><Languages className="h-4 w-4 text-gray-500 shrink-0" aria-hidden="true" /> <span><span className="sr-only">Teaches: </span>Teaches {languages.join(' · ')}</span></li>
                  )}
                  <li className="flex items-center gap-2"><Globe className="h-4 w-4 text-gray-500 shrink-0" aria-hidden="true" /> <span>Time zone: {tutorTz}</span></li>
                </ul>
                {(trial || freeCancel) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {trial && trialPrice && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[12.5px] font-semibold text-emerald-800"><Zap className="h-3.5 w-3.5" aria-hidden="true" /> Trial lesson {trialPrice}</span>}
                    {freeCancel && <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[12.5px] font-semibold text-indigo-800"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Free cancellation up to {cancelHours}h</span>}
                  </div>
                )}
              </div>
            </section>

            {/* About: only when the tutor wrote something */}
            {about.length > 0 && (
              <section className={`${CARD} p-5 sm:p-6`} aria-labelledby="about-title" data-testid="profile-about">
                <h2 id="about-title" className={H2}>About {first}</h2>
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-gray-700">
                  {about.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
                </div>
              </section>
            )}

            {/* Lessons and prices: only what the tutor has set */}
            {(price || trialPrice) && (
              <section className={`${CARD} p-5 sm:p-6`} aria-labelledby="prices-title" data-testid="profile-prices">
                <h2 id="prices-title" className={H2}>Lessons and prices</h2>
                <ul className="mt-2 divide-y divide-gray-100">
                  {trialPrice && (
                    <li className="flex items-start justify-between gap-4 py-3">
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">Trial lesson <span className="ml-1 align-middle rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">First lesson only</span></p>
                        <p className="text-[13px] text-gray-600 mt-0.5">Meet {first} and agree on a plan.</p>
                      </div>
                      <p className="text-[18px] font-extrabold text-gray-900 shrink-0">{trialPrice}</p>
                    </li>
                  )}
                  {price && (
                    <li className="flex items-start justify-between gap-4 py-3">
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">Lesson</p>
                        <p className="text-[13px] text-gray-600 mt-0.5">{describeDurations(lengths.durations)}. One price for every length.</p>
                      </div>
                      <p className="text-[18px] font-extrabold text-gray-900 shrink-0">{price}</p>
                    </li>
                  )}
                </ul>
              </section>
            )}

            {/* Reviews */}
            <section className={`${CARD} p-5 sm:p-6`} aria-labelledby="reviews-title" id="reviews" data-testid="profile-reviews">
              <h2 id="reviews-title" className={H2}>Reviews</h2>
              {hasReviews ? (
                <div className="mt-4">
                  <div className="flex items-center gap-4">
                    <p className="text-[40px] leading-none font-extrabold text-gray-900">{Number(tutor.average_rating ?? 0).toFixed(1)}</p>
                    <div>
                      <StarRow rating={Number(tutor.average_rating ?? 0)} size="md" />
                      <p className="text-[13px] text-gray-600 mt-1">{reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-1 gap-3">
                    {shown.map(r => {
                      const text = reviewText(r.comment)
                      const lessons = r.student_id ? lessonsBy.get(r.student_id) ?? 0 : 0
                      return (
                        <article key={r.id} className="rounded-xl bg-gray-50 p-4" data-testid="profile-review">
                          <StarRow rating={r.rating} />
                          {text && <p className="mt-2 text-[14px] leading-relaxed text-gray-700">&quot;{text}&quot;</p>}
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <p className="text-[12px] text-gray-500">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</p>
                            {lessons > 0 && (
                              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-800" data-testid="review-lessons">
                                <Check className="h-3.5 w-3.5" aria-hidden="true" /> {lessons} {lessons === 1 ? 'lesson' : 'lessons'} with {first}
                              </span>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4" data-testid="profile-no-reviews">
                  <Star className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-[14px] font-bold text-gray-900">No reviews yet</p>
                    <p className="text-[13px] text-gray-700 mt-0.5">{isNew && joined ? `${first} joined Tutafy in ${joined}. ` : ''}Reviews from {first}&apos;s students show up here after their lessons.</p>
                    {bookable && <Link href={bookHref} className="mt-3 inline-flex items-center h-10 px-4 text-[13px] font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Book a lesson</Link>}
                  </div>
                </div>
              )}
            </section>

            {/* Free times in the visitor's own time zone */}
            {bookable && <FreeTimesSection {...timesProps} />}

            {/* How booking works, with this tutor's own terms */}
            <section className={`${CARD} p-5 sm:p-6`} aria-labelledby="how-title" data-testid="profile-how">
              <h2 id="how-title" className={H2}>How booking works</h2>
              <ol className="mt-3 space-y-3">
                {[['Choose a time', 'Times are shown in your own time zone.'], ['Enter your name and email', 'No account, no password.'], ['Get your confirmation', 'It has the lesson link and a cancel link.']].map(([t, d], i) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 text-[12px] font-bold flex items-center justify-center shrink-0" aria-hidden="true">{i + 1}</span>
                    <p className="text-[14px] text-gray-700"><b className="text-gray-900">{t}.</b> {d}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {notes.map(n => {
                  const Icon = noteIcon[n.id]
                  return (
                    <div key={n.id} className="rounded-xl bg-gray-50 p-4" data-testid={`note-${n.id}`}>
                      <h3 className="flex items-center gap-1.5 text-[13px] font-bold text-gray-900"><Icon className="h-4 w-4 text-indigo-600" aria-hidden="true" /> {n.title}</h3>
                      <p className="text-[13px] text-gray-700 mt-1">{n.text}</p>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          {/* Right: the booking card (wide screens; on a phone the bar at the bottom does this job) */}
          <aside className="hidden lg:block lg:sticky lg:top-24" aria-label={`Book ${first}`}>
            <div className={`${CARD} p-6`} data-testid="booking-card">
              {price && (
                <p className="text-[32px] leading-none font-extrabold text-gray-900">{price}<span className="ml-1.5 text-[14px] font-normal text-gray-600">/ lesson</span></p>
              )}
              {trialPrice && (
                <p className="mt-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[12.5px] font-semibold text-emerald-800"><Zap className="h-3.5 w-3.5" aria-hidden="true" /> Trial lesson {trialPrice} · first lesson only</span></p>
              )}
              <p className="mt-4 flex items-center gap-2 text-[13px] text-gray-700"><Clock className="h-4 w-4 text-gray-500 shrink-0" aria-hidden="true" /><span>{describeDurations(lengths.durations)}</span></p>
              {bookable ? (
                <>
                  <NextTimes {...timesProps} />
                  <Link href={bookHref} data-testid="book-button"
                    className="mt-5 flex items-center justify-center gap-2 w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white text-[15px] font-bold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                    Book a lesson <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <ul className="mt-4 space-y-2 text-[13px] text-gray-700">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" /> No account needed</li>
                    {freeCancel && <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" /> Free cancellation up to {cancelHours} hours before</li>}
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" /> Video lesson in your browser</li>
                  </ul>
                </>
              ) : (
                <div className="mt-4 rounded-xl bg-gray-100 p-4 text-[13px] text-gray-700" data-testid="booking-closed">
                  <b className="text-gray-900">Booking currently unavailable.</b> {first} is not taking new bookings right now. You can still read the profile and reviews.
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <MadeWithTutafy show={showMadeWith} surface="profile-page" />
      <SiteFooter />
      {bookable && <StickyBookBar slots={times.slots} state={times.state} tutorTz={tutorTz} bookHref={bookHref} priceText={price ? `${price} / lesson${trialPrice ? ` · trial ${trialPrice}` : ''}` : null} buttonText={trialPrice ? 'Book trial' : 'Book a lesson'} />}
    </div>
  )
}
