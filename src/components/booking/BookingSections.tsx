// The parts of the public booking page that only read (T-0810): the hero, About, packages, reviews, "Booking and cancellation" and the
// questions. Server components. They draw what the tutor set and nothing else: a part the tutor left empty is a calm sentence or left out,
// never made-up text. The booking card itself is src/app/book/[slug]/BookingForm.tsx.
import { Star, Sparkles, Languages, Globe, BookOpenCheck, Gift, CalendarCheck, RefreshCw, Wallet, Check, ChevronDown } from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import { initialsOf, firstNameOf, bioParagraphs, reviewText } from '@/lib/tutor-profile'
import { describeDurations } from '@/lib/lesson-durations'
import type { FaqItem } from '@/lib/booking-page'

export const CARD = 'bg-white rounded-2xl border border-gray-200 shadow-sm'
const H2 = 'text-[18px] leading-snug font-bold text-gray-900'

export function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`Rated ${Number(rating).toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} width={size} height={size} aria-hidden="true" className={s <= Math.round(rating) ? 'text-amber-500 fill-amber-500' : 'text-gray-200'} />
      ))}
    </span>
  )
}

export type HeroProps = {
  name: string
  photo?: string
  languages: string[]
  zone: string
  rating: number | null
  reviewCount: number
  lessonCount: number
  joined: string | null
  isNew: boolean
  price: string | null
  trialPrice: string | null
  durations: number[]
  cancelHours: number
}

const fact = 'px-4 py-3.5 sm:px-5 sm:py-4'
const factLabel = 'text-[12px] font-semibold uppercase tracking-wide text-gray-600'

/** Photo or initials, name, rating, what the tutor teaches, and the four facts a student weighs first. */
export function Hero(p: HeroProps) {
  const hasReviews = p.reviewCount > 0 && p.rating !== null
  return (
    <section className={`${CARD} overflow-hidden`} aria-label={`About ${p.name}`} data-testid="booking-hero">
      <div className="p-5 sm:p-7 flex gap-4 sm:gap-6 items-start">
        {p.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photo} alt={`Photo of ${p.name}`} width={112} height={112} data-testid="booking-photo"
            className="h-20 w-20 sm:h-28 sm:w-28 rounded-[20px] sm:rounded-3xl object-cover shrink-0 bg-indigo-50" />
        ) : (
          <div role="img" aria-label={`${p.name} has not added a photo yet`} data-testid="booking-monogram"
            className="h-20 w-20 sm:h-28 sm:w-28 rounded-[20px] sm:rounded-3xl shrink-0 bg-indigo-100 text-indigo-700 flex items-center justify-center text-[28px] sm:text-[38px] font-bold">
            {initialsOf(p.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] sm:text-[30px] leading-tight font-bold tracking-tight text-gray-900 break-words">{p.name}</h1>
          {hasReviews ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1" data-testid="booking-rating">
              <StarRow rating={p.rating as number} />
              <span className="text-[15px] font-bold text-gray-900">{(p.rating as number).toFixed(1)}</span>
              <span className="text-[14px] text-gray-600">({p.reviewCount} {p.reviewCount === 1 ? 'review' : 'reviews'})</span>
            </div>
          ) : p.isNew ? (
            <p className="mt-2" data-testid="booking-new">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[13px] font-semibold text-amber-900">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> New on Tutafy{p.joined ? ` · joined ${p.joined}` : ''}
              </span>
            </p>
          ) : null}
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[14px] text-gray-700">
            {p.lessonCount > 0 && (
              <li className="flex items-center gap-1.5"><BookOpenCheck className="h-4 w-4 text-gray-600 shrink-0" aria-hidden="true" /> {p.lessonCount} {p.lessonCount === 1 ? 'lesson' : 'lessons'} taught</li>
            )}
            {p.languages.length > 0 && (
              <li className="flex items-center gap-1.5"><Languages className="h-4 w-4 text-gray-600 shrink-0" aria-hidden="true" /> Teaches {p.languages.join(', ')}</li>
            )}
            <li className="flex items-center gap-1.5"><Globe className="h-4 w-4 text-gray-600 shrink-0" aria-hidden="true" /> {p.zone}</li>
          </ul>
          {p.trialPrice && (
            <p className="mt-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[13px] font-semibold text-emerald-800"><Gift className="h-3.5 w-3.5" aria-hidden="true" /> Trial lesson {p.trialPrice}</span></p>
          )}
        </div>
      </div>
      <dl className="hidden sm:grid grid-cols-4 border-t border-gray-200 divide-x divide-gray-200" data-testid="booking-facts">
        <div className={fact}><dt className={factLabel}>Price</dt><dd className="mt-0.5 text-[20px] font-bold text-gray-900">{p.price ? <>{p.price}<span className="ml-1 text-[13px] font-medium text-gray-600">/ lesson</span></> : <span className="text-[16px] font-semibold text-gray-600">Ask the tutor</span>}</dd></div>
        <div className={fact}><dt className={factLabel}>Lesson lengths</dt><dd className="mt-0.5 text-[20px] font-bold text-gray-900">{p.durations.join(' · ')}<span className="ml-1 text-[13px] font-medium text-gray-600">min</span></dd></div>
        <div className={fact}><dt className={factLabel}>Trial lesson</dt><dd className="mt-0.5 text-[20px] font-bold text-gray-900">{p.trialPrice ?? <span className="text-[16px] font-semibold text-gray-600">Not offered</span>}</dd></div>
        <div className={fact}><dt className={factLabel}>Cancellation</dt><dd className="mt-0.5 text-[20px] font-bold text-gray-900">{p.cancelHours ? <>Free<span className="ml-1 text-[13px] font-medium text-gray-600">up to {p.cancelHours}h before</span></> : <span className="text-[16px] font-semibold text-gray-600">No free cancellation</span>}</dd></div>
      </dl>
    </section>
  )
}

/** About: the tutor's own words, as paragraphs. When they wrote nothing it says so, and booking still works. */
export function About({ name, bio }: { name: string; bio: unknown }) {
  const first = firstNameOf(name)
  const paras = bioParagraphs(bio)
  return (
    <section className={`${CARD} p-5 sm:p-6`} aria-labelledby="about-title" data-testid="booking-about">
      <h2 id="about-title" className={H2}>About {first}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-gray-700 max-w-[66ch]">
        {paras.length > 0
          ? paras.map((t, i) => <p key={i} className="whitespace-pre-line">{t}</p>)
          : <p className="text-gray-600">{first} has not written an introduction yet. You can still book a lesson, and say what you want to work on in the message.</p>}
      </div>
    </section>
  )
}

export type PackageItem = { id: string; name: string; description: string | null; lessons_count: number; price: number; href: string | null }

/** Lesson packages, when the tutor sells any: the price, the price per lesson, and a Buy link to where the tutor takes payment. */
export function Packages({ items, currency }: { items: PackageItem[]; currency: unknown }) {
  if (items.length === 0) return null
  const best = items.length > 1 ? items.reduce((a, b) => (b.price / b.lessons_count < a.price / a.lessons_count ? b : a)) : null
  return (
    <section className={`${CARD} p-5 sm:p-6`} aria-labelledby="packages-title" data-testid="booking-packages">
      <h2 id="packages-title" className={H2}>Lesson packages</h2>
      <p className="mt-1 text-[14px] text-gray-600">Buy several lessons at once and pay less per lesson. Paid directly to the tutor.</p>
      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map(pkg => (
          <li key={pkg.id} className={`rounded-xl border p-4 flex flex-col gap-1 ${best?.id === pkg.id ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-gray-200'}`}>
            {best?.id === pkg.id && <span className="self-start rounded-full bg-indigo-50 px-2.5 py-0.5 text-[12px] font-semibold text-indigo-800">Best value</span>}
            <p className="text-[15px] font-semibold text-gray-900">{pkg.name}</p>
            <p className="text-[22px] font-bold text-gray-900">{formatMoney(pkg.price, currency)} <span className="text-[13px] font-medium text-gray-600">· {formatMoney(pkg.price / pkg.lessons_count, currency)} / lesson</span></p>
            <p className="text-[13px] text-gray-600">{pkg.lessons_count} lessons{pkg.description ? ` · ${pkg.description}` : ''}</p>
            {pkg.href && (
              <a href={pkg.href} target="_blank" rel="noopener noreferrer"
                className="mt-2 inline-flex items-center justify-center min-h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[14px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                Buy pack
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

export type ReviewItem = { id: string; rating: number; comment: string | null; created_at: string; lessonsWithTutor: number }

/** Reviews: the rating, then up to three public reviews. With none, one calm sentence. */
export function Reviews({ name, rating, reviewCount, items, isNew, joined }: { name: string; rating: number | null; reviewCount: number; items: ReviewItem[]; isNew: boolean; joined: string | null }) {
  const first = firstNameOf(name)
  const has = reviewCount > 0 && rating !== null && items.length > 0
  return (
    <section className={`${CARD} p-5 sm:p-6`} aria-labelledby="reviews-title" id="reviews" data-testid="booking-reviews">
      <h2 id="reviews-title" className={H2}>Reviews</h2>
      {has ? (
        <>
          <div className="mt-3 flex items-center gap-4">
            <p className="text-[40px] leading-none font-bold tracking-tight text-gray-900">{(rating as number).toFixed(1)}</p>
            <div><StarRow rating={rating as number} /><p className="mt-1 text-[14px] text-gray-600">{reviewCount} {reviewCount === 1 ? 'review' : 'reviews'} from students</p></div>
          </div>
          <div className="mt-4 divide-y divide-gray-200">
            {items.slice(0, 3).map(r => {
              const text = reviewText(r.comment)
              return (
                <article key={r.id} className="py-4 first:pt-0" data-testid="booking-review">
                  <StarRow rating={r.rating} size={14} />
                  {text && <p className="mt-1.5 text-[15px] leading-relaxed text-gray-700">&quot;{text}&quot;</p>}
                  <p className="mt-1 text-[13px] text-gray-600">
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                    {r.lessonsWithTutor > 0 && <span className="ml-3 inline-flex items-center gap-1 font-semibold text-emerald-800"><Check className="h-3.5 w-3.5" aria-hidden="true" />{r.lessonsWithTutor} {r.lessonsWithTutor === 1 ? 'lesson' : 'lessons'} with {first}</span>}
                  </p>
                </article>
              )
            })}
          </div>
        </>
      ) : (
        <p className="mt-3 text-[15px] text-gray-700" data-testid="booking-no-reviews">
          No reviews yet. {isNew ? `${first} is new on Tutafy${joined ? ` (joined ${joined})` : ''}. ` : ''}Reviews from {first}&apos;s students show up here after their lessons.
        </p>
      )}
    </section>
  )
}

/** Booking and cancellation: how it works and the tutor's own terms. */
export function Policy({ name, cancelHours, durations }: { name: string; cancelHours: number; durations: number[] }) {
  const first = firstNameOf(name)
  const rows = [
    { Icon: CalendarCheck, t: 'Pick a time, get an email', d: `You book a time with ${first} directly. Your confirmation and the lesson link arrive by email. ${describeDurations(durations)}${durations.length > 1 ? '. You pick one when you book.' : '.'}` },
    cancelHours
      ? { Icon: RefreshCw, t: `Free cancellation up to ${cancelHours} ${cancelHours === 1 ? 'hour' : 'hours'} before`, d: `Cancel or move the lesson more than ${cancelHours} ${cancelHours === 1 ? 'hour' : 'hours'} before it starts and nothing is owed.` }
      : { Icon: RefreshCw, t: 'No free cancellation window', d: `${first} has not set a free-cancellation window. Ask before you book if you may need to change the time.` },
    { Icon: Wallet, t: 'You pay the tutor directly', d: `Tutafy does not take payment for lessons. After you book, you see how to pay ${first}.` },
  ]
  return (
    <section className={`${CARD} p-5 sm:p-6`} aria-labelledby="policy-title" data-testid="booking-policy">
      <h2 id="policy-title" className={H2}>Booking and cancellation</h2>
      <ul className="mt-3 space-y-4">
        {rows.map(({ Icon, t, d }) => (
          <li key={t} className="flex gap-3 items-start">
            <Icon className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" aria-hidden="true" />
            <div><p className="text-[15px] font-semibold text-gray-900">{t}</p><p className="text-[14px] text-gray-600">{d}</p></div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Questions students ask: the same list the FAQPage markup carries. */
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <section className={`${CARD} p-5 sm:p-6`} aria-labelledby="faq-title" data-testid="booking-faq">
      <h2 id="faq-title" className={H2}>Questions students ask</h2>
      <div className="mt-2 divide-y divide-gray-200">
        {items.map(i => (
          <details key={i.q} className="group py-3.5 first:pt-2">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-gray-900 [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md">
              {i.q}<ChevronDown className="h-4 w-4 shrink-0 text-gray-600 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="mt-1 text-[15px] leading-relaxed text-gray-700 max-w-[66ch]">{i.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

/** The bar fixed to the bottom of a phone: the price and a link down to the booking card. Hidden from the large breakpoint up. */
export function MobileBookBar({ priceText }: { priceText: string | null }) {
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-gray-200 bg-white shadow-[0_-6px_20px_rgba(17,24,39,0.08)] pb-[env(safe-area-inset-bottom)]" data-testid="booking-mobile-bar">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
        {priceText && <p className="text-[13px] leading-tight text-gray-600"><b className="block text-[18px] text-gray-900">{priceText}</b>per lesson</p>}
        <a href="#book" className="flex-1 inline-flex items-center justify-center min-h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[15px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">Book a lesson</a>
      </div>
    </div>
  )
}
