import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BookingForm } from '../../book/[slug]/BookingForm'

export const metadata = { robots: 'noindex' }

export default async function EmbedBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: tutor } = await supabase
    .from('tutors')
    .select('id, name, bio, avatar_url, timezone, languages, cancellation_hours, booking_url_active, buffer_minutes, paypal_link, paddle_checkout_link, stripe_account_id, default_lesson_price, average_rating, review_count, contract_template, trial_enabled, trial_price')
    .eq('slug', slug)
    .single()

  if (!tutor || !tutor.booking_url_active) notFound()

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

  let blockedDates: string[] = []
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data: exc } = await supabase
      .from('availability_exceptions')
      .select('date')
      .eq('tutor_id', tutor.id)
      .gte('date', today)
    blockedDates = (exc ?? []).map((e: any) => e.date)
  } catch { /* table may not exist yet */ }

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
    <div className="min-h-screen bg-white p-4 max-w-[480px] mx-auto">
      <BookingForm
        tutor={tutor}
        availability={availability ?? []}
        subscriptionPlans={subscriptionPlans}
        contractTemplate={(tutor as any).contract_template ?? null}
        blockedDates={blockedDates}
        packages={packages}
        trialEnabled={(tutor as any).trial_enabled ?? false}
        trialPrice={(tutor as any).trial_price ?? null}
        tutorSlug={slug}
      />
      <p className="text-center text-[11px] text-gray-300 mt-6">Powered by Tutafy</p>
    </div>
  )
}
