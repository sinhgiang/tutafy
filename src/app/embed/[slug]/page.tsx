import { notFound } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { loadPublicTutor, loadBlockedDates } from '@/lib/public-tutor'
import { EMBED_PAGE_COLUMNS } from '@/lib/public-tutor-columns'
import { BookingForm } from '../../book/[slug]/BookingForm'
import { isStripeEnabled } from '@/lib/stripe/availability'
import { loadChosenDurations, resolveDurationConfig } from '@/lib/lesson-durations'
import { loadShowMadeWith } from '@/lib/branding'
import { MadeWithTutafy } from '@/components/MadeWithTutafy'

export const metadata = { robots: 'noindex' }

export default async function EmbedBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  // The tutor and the blocked days are read on the server with the admin client, only the public columns (T-0774).
  const admin = createAdminClient()

  const tutor = await loadPublicTutor(admin, slug, EMBED_PAGE_COLUMNS)

  if (!tutor || !tutor.booking_url_active) notFound()

  // The lesson lengths this tutor takes (read apart from the rest, so a database without the columns still works)
  const chosen = await loadChosenDurations(admin, tutor.id)
  const lengths = resolveDurationConfig(chosen.lesson_durations, chosen.default_lesson_duration)
  const showMadeWith = await loadShowMadeWith(admin, tutor.id)

  const { data: availability } = await supabase
    .from('availability')
    .select('*')
    .eq('tutor_id', tutor.id)
    .order('day_of_week')

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

  const blockedDates = await loadBlockedDates(admin, tutor.id)

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

  return (
    <main className="min-h-screen bg-white p-4 max-w-[480px] mx-auto">
      <BookingForm
        tutor={tutor}
        cardCheckoutEnabled={isStripeEnabled()}
        availability={availability ?? []}
        subscriptionPlans={subscriptionPlans}
        contractTemplate={(tutor as any).contract_template ?? null}
        blockedDates={blockedDates}
        packages={packages}
        trialEnabled={(tutor as any).trial_enabled ?? false}
        trialPrice={(tutor as any).trial_price ?? null}
        tutorSlug={slug}
        durations={lengths.durations}
        defaultDuration={lengths.defaultDuration}
      />
      <MadeWithTutafy show={showMadeWith} surface="booking-embed" />
    </main>
  )
}
