import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BookingForm } from './BookingForm'
import { GraduationCap, Globe, Clock, Star } from 'lucide-react'

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: tutor } = await supabase
    .from('tutors')
    .select('id, name, bio, avatar_url, timezone, languages, cancellation_hours, booking_url_active, buffer_minutes, paypal_link, paddle_checkout_link, stripe_account_id, default_lesson_price, average_rating, review_count, contract_template, trial_enabled, trial_price, currency')
    .eq('slug', slug)
    .single()

  if (!tutor || !tutor.booking_url_active) notFound()

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

  // Fetch public reviews (graceful if table doesn't exist)
  let reviews: any[] = []
  try {
    const { data: r } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at')
      .eq('tutor_id', tutor.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(5)
    reviews = r ?? []
  } catch { /* table may not exist yet */ }

  // Fetch blocked dates (graceful if table doesn't exist)
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

  const initials = tutor.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-bold text-gray-900">Tutafy</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">

          {/* Left: Tutor Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 lg:sticky lg:top-8">
            {/* Avatar */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mb-4 ring-4 ring-indigo-50">
                {tutor.avatar_url ? (
                  <img src={tutor.avatar_url} alt={tutor.name} className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-indigo-600">{initials}</span>
                )}
              </div>
              <h1 className="text-[20px] font-bold text-gray-900">{tutor.name}</h1>
              {tutor.languages?.length > 0 && (
                <p className="text-[13px] text-indigo-600 font-medium mt-1">
                  Teaches: {tutor.languages.join(', ')}
                </p>
              )}
            </div>

            {tutor.bio && (
              <p className="text-[13px] text-gray-600 leading-relaxed text-center mb-6 pb-6 border-b border-gray-50">
                {tutor.bio}
              </p>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[13px] text-gray-500">
                <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                </div>
                <span>30, 45, 60 or 90 min sessions</span>
              </div>
              <div className="flex items-center gap-3 text-[13px] text-gray-500">
                <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Globe className="h-3.5 w-3.5 text-indigo-500" />
                </div>
                <span>{tutor.timezone ?? 'UTC'}</span>
              </div>
              {tutor.cancellation_hours > 0 && (
                <div className="flex items-start gap-3 text-[13px] text-gray-400 pt-2">
                  <div className="w-7 h-7 flex-shrink-0" />
                  <span>Cancel up to {tutor.cancellation_hours}h before lesson</span>
                </div>
              )}
            </div>

            {/* Reviews */}
            {(tutor as any).review_count > 0 && (
              <div className="mt-5 pt-5 border-t border-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round((tutor as any).average_rating ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <span className="text-[12px] font-semibold text-gray-700">{((tutor as any).average_rating ?? 0).toFixed(1)}</span>
                  <span className="text-[11px] text-gray-400">({(tutor as any).review_count} reviews)</span>
                </div>
                <div className="space-y-3">
                  {reviews.map((r: any) => (
                    <div key={r.id} className="bg-gray-50 rounded-xl px-4 py-3">
                      <div className="flex gap-0.5 mb-1.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`h-3 w-3 ${s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                      {r.comment && (
                        <p className="text-[12px] text-gray-600 leading-relaxed">&quot;{r.comment}&quot;</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Booking Form */}
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
            prefillName={prefillName}
            prefillEmail={prefillEmail}
          />
        </div>
      </div>
    </div>
  )
}
