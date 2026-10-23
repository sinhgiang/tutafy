import { notFound } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { BookingForm } from '../BookingForm'
import { loadPublicTutor, loadBlockedDates } from '@/lib/public-tutor'
import { MEMBER_PAGE_COLUMNS } from '@/lib/public-tutor-columns'
import { isStripeEnabled } from '@/lib/stripe/availability'
import { loadChosenDurations, resolveDurationConfig, describeDurations } from '@/lib/lesson-durations'
import { loadShowMadeWith } from '@/lib/branding'
import { MadeWithTutafy } from '@/components/MadeWithTutafy'
import { Globe, Clock } from 'lucide-react'
import { SiteLogo } from '@/components/SiteLogo'

// Booking page for a single Academy team member — same flow as /book/[slug],
// but availability + the bookable identity belong to the team member, while
// payment methods, contract and packages still belong to the owning tutor
// (money always flows through the tutor's account).
export default async function TeamMemberBookingPage({ params }: { params: Promise<{ slug: string; member: string }> }) {
  const { slug, member: memberSlug } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  // The tutor and the blocked days are read here on the server, only the public columns (T-0774): a visitor's own key cannot read the tutors table.
  const tutor = await loadPublicTutor(admin, slug, MEMBER_PAGE_COLUMNS)

  if (!tutor || !tutor.booking_url_active) notFound()

  // The lesson lengths this tutor takes (read apart from the rest, so a database without the columns still works)
  const chosen = await loadChosenDurations(admin, tutor.id)
  const lengths = resolveDurationConfig(chosen.lesson_durations, chosen.default_lesson_duration)
  const showMadeWith = await loadShowMadeWith(admin, tutor.id)

  // Use the admin client for the member lookup so we only ever select the
  // non-sensitive columns needed for a public page (never pay_rate/email).
  const { data: member } = await admin
    .from('team_members')
    .select('id, name, bio, avatar_url, timezone')
    .eq('owner_id', tutor.id)
    .eq('slug', memberSlug)
    .eq('active', true)
    .eq('booking_url_active', true)
    .single()

  if (!member) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const prefillName = (user?.user_metadata?.full_name as string) ?? (user?.user_metadata?.name as string) ?? ''
  const prefillEmail = user?.email ?? ''

  const { data: availability } = await supabase
    .from('availability')
    .select('*')
    .eq('tutor_id', tutor.id)
    .eq('team_member_id', member.id)
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

  const memberTutorView = { ...tutor, name: member.name }
  const initials = member.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const timezone = member.timezone || tutor.timezone || 'UTC'

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <header className="bg-white border-b border-gray-100 px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center">
          <SiteLogo size="md" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 lg:sticky lg:top-8">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mb-4 ring-4 ring-indigo-50">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt={member.name} className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-indigo-600">{initials}</span>
                )}
              </div>
              <h1 className="text-[20px] font-bold text-gray-900">{member.name}</h1>
              {tutor.languages?.length > 0 && (
                <p className="text-[13px] text-indigo-600 font-medium mt-1">
                  Teaches: {tutor.languages.join(', ')}
                </p>
              )}
            </div>

            {member.bio && (
              <p className="text-[13px] text-gray-600 leading-relaxed text-center mb-6 pb-6 border-b border-gray-50">
                {member.bio}
              </p>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[13px] text-gray-500">
                <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                </div>
                <span>{describeDurations(lengths.durations)}</span>
              </div>
              <div className="flex items-center gap-3 text-[13px] text-gray-500">
                <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Globe className="h-3.5 w-3.5 text-indigo-500" />
                </div>
                <span>{timezone}</span>
              </div>
              {tutor.cancellation_hours > 0 && (
                <div className="flex items-start gap-3 text-[13px] text-gray-500 pt-2">
                  <div className="w-7 h-7 flex-shrink-0" />
                  <span>Cancel up to {tutor.cancellation_hours}h before lesson</span>
                </div>
              )}
            </div>
          </div>

          <BookingForm
            tutor={{ ...memberTutorView, timezone } as any}
            cardCheckoutEnabled={isStripeEnabled()}
            availability={availability ?? []}
            subscriptionPlans={subscriptionPlans}
            contractTemplate={(tutor as any).contract_template ?? null}
            blockedDates={blockedDates}
            packages={packages}
            trialEnabled={(tutor as any).trial_enabled ?? false}
            trialPrice={(tutor as any).trial_price ?? null}
            tutorSlug={`${slug}/${memberSlug}`}
            prefillName={prefillName}
            prefillEmail={prefillEmail}
            teamMemberId={member.id}
            durations={lengths.durations}
            defaultDuration={lengths.defaultDuration}
          />
        </div>
      </main>
      <MadeWithTutafy show={showMadeWith} surface="booking-page" />
    </div>
  )
}
