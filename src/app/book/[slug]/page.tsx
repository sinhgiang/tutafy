import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { loadPublicTutor, loadBlockedDates } from '@/lib/public-tutor'
import { BOOKING_PAGE_COLUMNS } from '@/lib/public-tutor-columns'
import { BookingForm } from './BookingForm'
import { isStripeEnabled } from '@/lib/stripe/availability'
import { loadChosenDurations, resolveDurationConfig } from '@/lib/lesson-durations'
import { loadShowMadeWith } from '@/lib/branding'
import { MadeWithTutafy } from '@/components/MadeWithTutafy'
import { bookingMetadata, tutorNotFoundMetadata } from '@/lib/page-meta'
import { bookingFaq, cancelHoursOf, faqJsonLd, packageBuyUrl } from '@/lib/booking-page'
import { jsonLdScript } from '@/lib/seo'
import { httpsImage } from '@/lib/tutor-seo'
import { loadFreeTimes, loadReviewLessonCounts, type ReadClient } from '@/lib/profile-data'
import { hasTrial, joinedLabel, priceLabel, safeZone, usableReviews } from '@/lib/tutor-profile'
import { About, Faq, Hero, MobileBookBar, Packages, Policy, Reviews, type PackageItem } from '@/components/booking/BookingSections'
import { SiteLogo } from '@/components/SiteLogo'
import { planToHighlight } from '@/lib/business-lists'

// One read of the tutor per request, shared by the page and its metadata. Read on the server with the admin client, only the public
// columns (T-0774): a visitor's own key cannot read the tutors table. The other tables below (hours, plans, reviews, packages) stay public reads.
const getTutor = cache(async (slug: string) => loadPublicTutor(createAdminClient(), slug, BOOKING_PAGE_COLUMNS))

// Its own title and description, and the canonical is the tutor's profile (src/lib/page-meta.ts: bookingMetadata says why).
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  let tutor: Awaited<ReturnType<typeof getTutor>> = null
  try { tutor = await getTutor(slug) } catch {}
  return tutor && tutor.booking_url_active ? bookingMetadata(slug, tutor) : tutorNotFoundMetadata()
}

export default async function BookingPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<{ plan?: string | string[] }> }) {
  const { slug } = await params
  const { plan: planParam } = (await searchParams) ?? {} // a tutor's "Copy link" for one plan (T-0841)
  const supabase = await createClient()
  const admin = createAdminClient()

  const tutor = await getTutor(slug)

  if (!tutor || !tutor.booking_url_active) notFound()

  // The lesson lengths this tutor takes (read apart from the rest, so a database without the columns still works)
  const chosen = await loadChosenDurations(admin, tutor.id)
  const lengths = resolveDurationConfig(chosen.lesson_durations, chosen.default_lesson_duration)
  // the small "Made with Tutafy" line: Free tutors always, paid tutors unless they turned it off (src/lib/branding.ts)
  const showMadeWith = await loadShowMadeWith(admin, tutor.id)

  // If a student is signed in (e.g. via "Continue with Google"), pre-fill the form
  const { data: { user } } = await supabase.auth.getUser()
  const prefillName = (user?.user_metadata?.full_name as string) ?? (user?.user_metadata?.name as string) ?? ''
  const prefillEmail = user?.email ?? ''

  const { data: availability } = await supabase
    .from('availability')
    .select('*')
    .eq('tutor_id', tutor.id)
    .order('day_of_week')

  // Fetch active subscription plans (graceful if table doesn't exist)
  let subscriptionPlans: any[] = []
  try {
    const { data: plans } = await supabase
      .from('subscription_plans')
      .select('id, name, description, price, currency, lessons_per_period, period, duration_minutes')
      .eq('tutor_id', tutor.id)
      .eq('is_active', true)
      .order('price')
    subscriptionPlans = plans ?? []
  } catch { /* table may not exist yet */ }

  // Fetch public reviews (graceful if table doesn't exist). The student id only counts that student's lessons on the server; it is never sent on.
  let reviews: { id: string; rating: number; comment: string | null; created_at: string; student_id: string | null }[] = []
  try {
    const { data: r } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at, student_id')
      .eq('tutor_id', tutor.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(5)
    reviews = usableReviews(r ?? [])
  } catch { /* table may not exist yet */ }

  // Blocked dates: the date only, never the tutor's note for the day (graceful if the table doesn't exist)
  const blockedDates = await loadBlockedDates(admin, tutor.id)

  // Fetch active packages (graceful if table doesn't exist)
  let packages: any[] = []
  try {
    const { data: pkgs } = await supabase
      .from('packages')
      .select('id, name, description, lessons_count, price')
      .eq('tutor_id', tutor.id)
      .eq('active', true)
      .order('price')
    packages = pkgs ?? []
  } catch { /* table may not exist yet */ }

  // A number only: how many lessons this tutor has completed (a visitor's session cannot read lessons).
  let lessonCount = 0
  try {
    const { count } = await admin.from('lessons').select('id', { count: 'exact', head: true }).eq('tutor_id', tutor.id).eq('status', 'completed')
    lessonCount = count ?? 0
  } catch {}

  // The soonest free times (the same read the profile page makes) and how many lessons each reviewing student had with the tutor.
  const getAdmin = () => admin as unknown as ReadClient
  const [times, lessonsBy] = await Promise.all([
    loadFreeTimes(supabase as unknown as ReadClient, getAdmin, tutor, lengths.defaultDuration),
    loadReviewLessonCounts(getAdmin, tutor.id, reviews.map(r => r.student_id ?? '')),
  ])
  const soonest = times.state === 'ok' ? times.slots.slice(0, 3) : []

  const reviewCount = Number(tutor.review_count ?? 0)
  const rating = reviewCount > 0 ? Number(tutor.average_rating ?? 0) : null
  const isNew = !(reviewCount > 0 && reviews.length > 0) && lessonCount === 0
  const price = priceLabel(tutor.default_lesson_price, tutor.currency)
  const trialPrice = hasTrial(tutor) ? priceLabel(tutor.trial_price, tutor.currency) : null
  const cancelHours = cancelHoursOf(tutor)
  const languages: string[] = Array.isArray(tutor.languages) ? tutor.languages.filter((l: unknown): l is string => typeof l === 'string' && l.trim() !== '') : []
  const faq = bookingFaq({ ...tutor, durations: lengths.durations })
  const packageItems: PackageItem[] = packages.map(p => ({
    id: p.id, name: p.name, description: p.description, lessons_count: p.lessons_count, price: p.price, href: packageBuyUrl(tutor, Number(p.price)),
  }))

  return (
    <div className="min-h-screen bg-[#F6F7FB] pb-24 lg:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(faq, slug)) }} />
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[1120px] mx-auto px-4 h-14 flex items-center">
          <SiteLogo size="md" />
        </div>
      </header>

      <main className="max-w-[1120px] mx-auto px-4 py-4 sm:py-6">
        <Hero
          name={tutor.name}
          photo={httpsImage(tutor.avatar_url)}
          languages={languages}
          zone={safeZone(tutor.timezone)}
          rating={rating}
          reviewCount={reviewCount}
          lessonCount={lessonCount}
          joined={joinedLabel(tutor.created_at)}
          isNew={isNew}
          price={price}
          trialPrice={trialPrice}
          durations={lengths.durations}
          cancelHours={cancelHours}
        />

        <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-4 sm:gap-6 items-start">
          {/* On a phone the booking card comes straight after the hero; on a wide screen it stays in view at the side */}
          <aside id="book" aria-label={`Book a lesson with ${tutor.name}`} className="order-1 lg:order-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto scroll-mt-4 p-1 -m-1">
            <BookingForm
              tutor={tutor}
              cardCheckoutEnabled={isStripeEnabled()}
              availability={availability ?? []}
              subscriptionPlans={subscriptionPlans}
              highlightPlanId={planToHighlight(planParam, subscriptionPlans)}
              contractTemplate={(tutor as any).contract_template ?? null}
              blockedDates={blockedDates}
              packages={[]}
              trialEnabled={(tutor as any).trial_enabled ?? false}
              trialPrice={(tutor as any).trial_price ?? null}
              tutorSlug={slug}
              durations={lengths.durations}
              defaultDuration={lengths.defaultDuration}
              soonest={soonest}
              prefillName={prefillName}
              prefillEmail={prefillEmail}
            />
          </aside>

          <div className="order-2 lg:order-1 space-y-4 sm:space-y-6 min-w-0">
            <About name={tutor.name} bio={tutor.bio} />
            <Packages items={packageItems} currency={tutor.currency} />
            <Reviews
              name={tutor.name}
              rating={rating}
              reviewCount={reviewCount}
              isNew={isNew}
              joined={joinedLabel(tutor.created_at)}
              items={reviews.map(r => ({ id: r.id, rating: r.rating, comment: r.comment, created_at: r.created_at, lessonsWithTutor: r.student_id ? lessonsBy.get(r.student_id) ?? 0 : 0 }))}
            />
            <Policy name={tutor.name} cancelHours={cancelHours} durations={lengths.durations} />
            <Faq items={faq} />
          </div>
        </div>
      </main>
      <MadeWithTutafy show={showMadeWith} surface="booking-page" />
      <MobileBookBar priceText={price} />
    </div>
  )
}
