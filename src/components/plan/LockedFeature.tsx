'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { Lock, Sparkles, Users, Check, ArrowRight, Loader2, Zap } from 'lucide-react'
import { polarCheckoutUrl, PLAN_LABEL, PLAN_PRICE, type Plan } from '@/lib/plans'

const BENEFITS: Record<Plan, string[]> = {
  free: [],
  pro: [
    'Unlimited students',
    '7 AI teaching tools',
    'Payment links & online payments',
    'Full reports & analytics',
  ],
  academy: [
    'Everything in Pro',
    'Up to 5 tutors on your team',
    'Automatic payroll & pay runs',
    'Priority support',
  ],
}

export function LockedFeature({
  required,
  plan,
  feature,
  email,
  tutorId,
  canInstantUpgrade = false,
}: {
  required: Plan
  plan: Plan
  feature: string
  email: string
  tutorId: string
  canInstantUpgrade?: boolean
}) {
  const router = useRouter()
  const isAcademy = required === 'academy'
  const Icon = isAcademy ? Users : Sparkles
  const checkoutHref = polarCheckoutUrl(required, email, tutorId)
  const [charging, setCharging] = useState(false)
  const [confirming, setConfirming] = useState(false)

  // One-click, no-checkout upgrade: charge the saved card via Polar's API and
  // unlock the page in place. Falls back to the hosted checkout if the tutor has
  // no card on file yet (first paid upgrade) or the API isn't configured.
  async function instantUpgrade() {
    setCharging(true)
    try {
      const res = await fetch('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: required }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        toast.success(`You're on ${PLAN_LABEL[required]} now — enjoy!`)
        router.refresh()
        return
      }
      if (data.needsCheckout || res.status === 503 || res.status === 409) {
        window.location.href = checkoutHref // no saved card → collect one via checkout
        return
      }
      if (res.status === 402) {
        toast.error('Your card was declined. Please update your payment method.')
        window.location.href = checkoutHref
        return
      }
      toast.error('Could not complete the upgrade. Opening checkout…')
      window.location.href = checkoutHref
    } catch {
      window.location.href = checkoutHref
    } finally {
      setCharging(false)
    }
  }

  return (
    <div className="relative min-h-[72vh] w-full overflow-hidden rounded-2xl">
      {/* Blurred faux preview behind the glass */}
      <div aria-hidden className="absolute inset-0 select-none pointer-events-none blur-[6px] opacity-60 p-6">
        <div className="h-7 w-52 bg-gray-200 rounded-lg mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="w-9 h-9 rounded-lg bg-gray-100 mb-4" />
              <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3">
          <div className="h-4 w-40 bg-gray-200 rounded" />
          <div className="h-3 w-full bg-gray-100 rounded" />
          <div className="h-3 w-5/6 bg-gray-100 rounded" />
          <div className="h-3 w-2/3 bg-gray-100 rounded" />
        </div>
      </div>

      {/* Frosted scrim */}
      <div className="absolute inset-0 bg-white/55 backdrop-blur-[2px]" />

      {/* Upgrade card */}
      <div className="relative z-10 flex items-center justify-center min-h-[72vh] px-4 py-10">
        <div className="w-full max-w-[440px] bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className={`px-8 pt-8 pb-7 text-center ${isAcademy ? 'bg-amber-500' : 'bg-indigo-500'}`}>
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 relative">
              <Icon className="h-7 w-7 text-white" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow">
                <Lock className={`h-3 w-3 ${isAcademy ? 'text-amber-500' : 'text-indigo-500'}`} />
              </div>
            </div>
            <p className={`text-[11px] font-bold uppercase tracking-widest ${isAcademy ? 'text-amber-100' : 'text-indigo-200'}`}>
              {PLAN_LABEL[required]} feature
            </p>
            <h2 className="text-[21px] font-bold text-white mt-1">{feature}</h2>
            <p className={`text-[13px] mt-1.5 ${isAcademy ? 'text-amber-100' : 'text-indigo-100'}`}>
              This is part of the <strong className="text-white">{PLAN_LABEL[required]}</strong> plan.
              You're currently on <strong className="text-white capitalize">{PLAN_LABEL[plan]}</strong>.
            </p>
          </div>

          <div className="p-8">
            <div className="space-y-2.5 mb-6">
              {BENEFITS[required].map(b => (
                <div key={b} className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${isAcademy ? 'bg-amber-50' : 'bg-indigo-50'}`}>
                    <Check className={`h-2.5 w-2.5 ${isAcademy ? 'text-amber-600' : 'text-indigo-600'}`} />
                  </div>
                  <span className="text-[13px] text-gray-700">{b}</span>
                </div>
              ))}
            </div>

            {canInstantUpgrade ? (
              // Card already on file → ask for confirmation, then charge instantly
              // (no checkout page).
              <button
                onClick={() => setConfirming(true)}
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[14px] font-bold text-white transition-colors ${
                  isAcademy ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-500 hover:bg-indigo-600'
                }`}
              >
                <Zap className="h-4 w-4" fill="currentColor" /> Upgrade to {PLAN_LABEL[required]} — {PLAN_PRICE[required]}
              </button>
            ) : (
              // No card yet (first paid upgrade) → prefilled hosted checkout.
              <a
                href={checkoutHref}
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[14px] font-bold text-white transition-colors ${
                  isAcademy ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-500 hover:bg-indigo-600'
                }`}
              >
                Upgrade to {PLAN_LABEL[required]} — {PLAN_PRICE[required]}
                <ArrowRight className="h-4 w-4" />
              </a>
            )}

            <Link
              href="/upgrade"
              className="block text-center mt-3 text-[12.5px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              Compare all plans
            </Link>

            <p className="text-[11px] text-gray-400 text-center mt-5 leading-relaxed">
              {canInstantUpgrade
                ? 'One click charges your saved card and unlocks instantly · Cancel anytime'
                : 'Instant access after payment · Cancel anytime · We never take a cut of your income'}
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation dialog before charging the saved card */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-[1px]"
            onClick={() => !charging && setConfirming(false)}
          />
          <div className="relative w-full max-w-[400px] bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className={`px-7 pt-7 pb-5 text-center ${isAcademy ? 'bg-amber-500' : 'bg-indigo-500'}`}>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Zap className="h-6 w-6 text-white" fill="currentColor" />
              </div>
              <h3 className="text-[18px] font-bold text-white">Upgrade to {PLAN_LABEL[required]} now?</h3>
            </div>
            <div className="p-7">
              <p className="text-[13.5px] text-gray-600 leading-relaxed text-center">
                This is the <strong className="text-gray-900">{PLAN_LABEL[required]}</strong> plan
                ({PLAN_PRICE[required]}). If you continue, we'll charge the prorated difference for the
                rest of your billing period to your card on file <strong className="text-gray-900">right now</strong>,
                and unlock {PLAN_LABEL[required]} immediately — no checkout needed.
              </p>

              <button
                onClick={instantUpgrade}
                disabled={charging}
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[14px] font-bold text-white transition-colors disabled:opacity-70 mt-6 ${
                  isAcademy ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-500 hover:bg-indigo-600'
                }`}
              >
                {charging ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Charging your card…</>
                ) : (
                  <>Yes, upgrade &amp; pay now</>
                )}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={charging}
                className="w-full py-2.5 mt-2 rounded-xl text-[13px] font-semibold text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                No, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
