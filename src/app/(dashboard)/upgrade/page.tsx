import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Check, X, Zap, Crown, Users } from 'lucide-react'
import Link from 'next/link'

const PRO_URL = process.env.NEXT_PUBLIC_POLAR_CHECKOUT_PRO ?? '#'
const ACADEMY_URL = process.env.NEXT_PUBLIC_POLAR_CHECKOUT_ACADEMY ?? '#'
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutafy.com').replace(/[﻿​\s]/g, '').replace(/\/+$/, '')
// Where to manage/cancel an existing paid plan (downgrade). Polar's customer
// portal handles this; fall back to Settings if the portal URL isn't configured.
const MANAGE_URL = process.env.NEXT_PUBLIC_POLAR_PORTAL_URL || '/settings'

// Plan hierarchy so we can label each card as an upgrade or a downgrade relative
// to the tutor's current plan (never show "Upgrade to Pro" to an Academy user).
const RANK: Record<string, number> = { free: 0, pro: 1, academy: 2 }

// Attach the logged-in tutor's identity to the Polar checkout link. Prefilling
// customer_email means they pay with their Tutafy account email by default (so
// the webhook's email match succeeds), and customer_external_id lets the webhook
// tie the payment to this exact tutor even if they change the email at checkout.
// success_url brings them back INTO Tutafy (a congrats page) after paying instead
// of landing on a Polar-hosted page.
function withTutorRef(url: string, email: string, tutorId: string): string {
  if (!url || url === '#') return url
  const sep = url.includes('?') ? '&' : '?'
  const params = new URLSearchParams({
    customer_email: email,
    customer_external_id: tutorId,
    success_url: `${APP_URL}/upgrade/success`,
  })
  return `${url}${sep}${params.toString()}`
}

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    per: '',
    desc: 'To get started',
    color: 'bg-white border-gray-200',
    headerColor: 'text-gray-900',
    priceColor: 'text-gray-900',
    icon: null,
    cta: null,
    ctaStyle: '',
    features: [
      { text: 'Up to 10 students', ok: true },
      { text: '1 tutor', ok: true },
      { text: 'Booking page', ok: true },
      { text: 'Scheduling & reminders', ok: true },
      { text: 'Basic analytics', ok: true },
      { text: 'AI Tools', ok: false },
      { text: 'Payment links (PayPal/Paddle)', ok: false },
      { text: 'More than 10 students', ok: false },
      { text: 'Multiple tutors (team)', ok: false },
      { text: 'Priority support', ok: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 12,
    per: '/month',
    desc: 'For professional tutors',
    color: 'bg-indigo-500 border-indigo-500',
    headerColor: 'text-indigo-200',
    priceColor: 'text-white',
    icon: Zap,
    badge: 'Most popular',
    badgeColor: 'bg-white/20 text-white',
    cta: 'Upgrade to Pro',
    ctaStyle: 'bg-white text-indigo-600 hover:bg-indigo-50',
    checkoutUrl: PRO_URL,
    features: [
      { text: 'Unlimited students', ok: true },
      { text: '1 tutor', ok: true },
      { text: 'Booking page', ok: true },
      { text: 'Scheduling & reminders', ok: true },
      { text: 'Full analytics', ok: true },
      { text: 'AI Tools (lesson plans, content)', ok: true },
      { text: 'Payment links (PayPal/Paddle/Stripe)', ok: true },
      { text: 'Unlimited students', ok: true },
      { text: 'Multiple tutors (team)', ok: false },
      { text: 'Priority support', ok: false },
    ],
  },
  {
    id: 'academy',
    name: 'Academy',
    price: 29,
    per: '/month',
    desc: 'For centers & tutor teams',
    color: 'bg-white border-gray-200',
    headerColor: 'text-gray-500',
    priceColor: 'text-gray-900',
    icon: Users,
    cta: 'Upgrade to Academy',
    ctaStyle: 'bg-gray-900 text-white hover:bg-gray-800',
    checkoutUrl: ACADEMY_URL,
    features: [
      { text: 'Unlimited students', ok: true },
      { text: 'Up to 5 tutors (team)', ok: true },
      { text: 'Booking page per tutor', ok: true },
      { text: 'Scheduling & reminders', ok: true },
      { text: 'Full analytics + team report', ok: true },
      { text: 'AI Tools', ok: true },
      { text: 'Payment links (PayPal/Paddle/Stripe)', ok: true },
      { text: 'Unlimited students', ok: true },
      { text: 'Up to 5 tutors (team)', ok: true },
      { text: 'Priority support', ok: true },
    ],
  },
]

export default async function UpgradePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tutor } = await supabase
    .from('tutors')
    .select('subscription_status, name')
    .eq('id', user.id)
    .single()

  const currentPlan = tutor?.subscription_status ?? 'free'
  const currentRank = RANK[currentPlan] ?? 0
  const tutorName = tutor?.name?.split(' ')[0] ?? 'there'

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">

      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-[12px] font-bold px-4 py-1.5 rounded-full mb-4">
          <Zap className="h-3.5 w-3.5" fill="currentColor" />
          Choose your plan
        </div>
        <h1 className="text-[32px] font-bold text-gray-900">Upgrade Tutafy</h1>
        <p className="text-[14px] text-gray-500 mt-2">
          You're currently on the <span className="font-semibold capitalize text-gray-700">{currentPlan}</span> plan
          {currentPlan !== 'free' && <span className="text-emerald-600"> ✓</span>}
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
        {PLANS.map(plan => {
          const isActive = currentPlan === plan.id
          const planRank = RANK[plan.id] ?? 0
          const isUpgrade = planRank > currentRank
          const isDowngrade = planRank < currentRank
          const onPro = plan.id === 'pro'
          const Icon = plan.icon

          return (
            <div key={plan.id}
              className={`relative rounded-2xl border-2 overflow-hidden ${plan.color} ${isActive ? 'ring-4 ring-indigo-300' : ''}`}>

              {/* Badge */}
              {'badge' in plan && (
                <div className={`absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-full ${plan.badgeColor}`}>
                  {plan.badge}
                </div>
              )}

              {isActive && (
                <div className="absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-600">
                  Current plan
                </div>
              )}

              <div className="p-6">
                {/* Plan name */}
                <div className="flex items-center gap-2 mb-1">
                  {Icon && <Icon className={`h-4 w-4 ${plan.id === 'pro' ? 'text-indigo-200' : 'text-gray-500'}`} />}
                  <p className={`text-[12px] font-bold uppercase tracking-widest ${plan.headerColor}`}>
                    {plan.name}
                  </p>
                </div>

                {/* Price */}
                <div className="flex items-end gap-1 mb-1">
                  <span className={`text-[36px] font-black leading-none ${plan.priceColor}`}>
                    {plan.price === 0 ? '$0' : `$${plan.price}`}
                  </span>
                  {plan.per && (
                    <span className={`text-[13px] pb-1 ${plan.id === 'pro' ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {plan.per}
                    </span>
                  )}
                </div>
                <p className={`text-[12px] mb-6 ${plan.id === 'pro' ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {plan.desc}
                </p>

                {/* CTA button — labelled relative to the tutor's current plan */}
                {isActive ? (
                  <div className={`w-full py-2.5 rounded-xl text-[13px] font-bold text-center ${
                    onPro ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    ✓ Your current plan
                  </div>
                ) : isUpgrade && plan.checkoutUrl ? (
                  <a href={withTutorRef(plan.checkoutUrl, user.email ?? '', user.id)} target="_blank" rel="noopener noreferrer"
                    className={`block w-full py-2.5 rounded-xl text-[13px] font-bold text-center transition-colors ${plan.ctaStyle}`}>
                    Upgrade to {plan.name} →
                  </a>
                ) : isDowngrade ? (
                  <a href={MANAGE_URL} target={MANAGE_URL.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                    className={`block w-full py-2.5 rounded-xl text-[13px] font-semibold text-center transition-colors ${
                      onPro ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>
                    Downgrade to {plan.name}
                  </a>
                ) : (
                  <div className="w-full py-2.5 rounded-xl text-[13px] font-bold text-center bg-gray-100 text-gray-400">
                    Free
                  </div>
                )}
              </div>

              {/* Feature list */}
              <div className={`px-6 pb-6 space-y-2.5 border-t pt-5 ${plan.id === 'pro' ? 'border-indigo-400' : 'border-gray-100'}`}>
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    {f.ok ? (
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                        plan.id === 'pro' ? 'bg-white/20' : 'bg-emerald-100'
                      }`}>
                        <Check className={`h-2.5 w-2.5 ${plan.id === 'pro' ? 'text-white' : 'text-emerald-600'}`} />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100">
                        <X className="h-2.5 w-2.5 text-gray-300" />
                      </div>
                    )}
                    <span className={`text-[12px] ${
                      f.ok
                        ? (plan.id === 'pro' ? 'text-white' : 'text-gray-700')
                        : (plan.id === 'pro' ? 'text-indigo-300' : 'text-gray-300')
                    }`}>
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Payment note */}
      <div className="bg-gray-50 rounded-2xl p-6 text-center mb-6">
        <p className="text-[13px] text-gray-600 font-medium mb-1">Secure payment via Polar.sh</p>
        <p className="text-[12px] text-gray-400">
          Visa, Mastercard, PayPal supported · Cancel anytime · No hidden fees
        </p>
        <p className="text-[11px] text-gray-400 mt-3">
          After payment, your account is upgraded automatically within a few minutes.
          If you don't see the change after 10 minutes, email <strong>tubxeebyajtube@gmail.com</strong>
        </p>
      </div>

      {/* FAQ mini */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {[
          { q: 'Can I cancel anytime?', a: 'Yes. Cancel in Polar.sh and you won\'t be charged next month.' },
          { q: 'Will upgrading lose my data?', a: 'No. All your students and lessons stay exactly as they are.' },
          { q: 'Can I change plans?', a: 'Yes. Upgrade or downgrade anytime, billed pro-rata by day.' },
          { q: 'Which payment methods are supported?', a: 'Visa, Mastercard, PayPal, and many local methods.' },
        ].map(item => (
          <div key={item.q} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[13px] font-semibold text-gray-900 mb-1">{item.q}</p>
            <p className="text-[12px] text-gray-500">{item.a}</p>
          </div>
        ))}
      </div>

      <div className="text-center">
        <Link href="/settings" className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">
          ← Back to Settings
        </Link>
      </div>
    </div>
  )
}
