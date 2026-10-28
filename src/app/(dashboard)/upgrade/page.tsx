import { PageColumn } from '@/components/layout/PageFrame'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Check, Zap, Users } from 'lucide-react'
import Link from 'next/link'
import { ContactEmails } from '@/components/ContactEmails'
import { TrackedCheckoutLink } from '@/components/plan/TrackedCheckoutLink'
import { polarCheckoutLink, PLAN_RANK, PLAN_LABEL, type Plan } from '@/lib/plans'
import { PLAN_LIST, parsePaidPlan, registerHref } from '@/lib/plan-list'

// The cards print the one plan list (src/lib/plan-list.ts), the same lines as the landing page, /switch and /llms.txt.
const ICON: Record<string, typeof Zap | null> = { free: null, pro: Zap, academy: Users }

export const dynamic = 'force-dynamic'

export default async function UpgradePage({ searchParams }: { searchParams: Promise<{ plan?: string | string[] }> }) {
  const { plan: planParam } = await searchParams
  // The plan somebody picked on the landing page or /switch; only "pro" or "academy" count (src/lib/plan-list.ts).
  const chosen = parsePaidPlan(planParam)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // The proxy sends a signed-out visitor to sign-up before this page runs; this is the same rule for a direct render.
  if (!user) redirect(chosen ? registerHref(chosen) : '/login')

  const { data: tutor } = await supabase
    .from('tutors')
    .select('subscription_status, name')
    .eq('id', user.id)
    .single()

  const currentPlan = (tutor?.subscription_status ?? 'free') as Plan
  const currentRank = PLAN_RANK[currentPlan] ?? 0
  const chosenItem = chosen ? PLAN_LIST.find(p => p.id === chosen) : null
  const chosenRank = chosen ? PLAN_RANK[chosen] : 0
  const alreadyThere = !!chosen && currentRank >= chosenRank
  // Where to manage/cancel an existing paid plan (downgrade): Polar's customer portal. With no portal address the page says to
  // write to support, because Settings has no way to change a plan.
  const manageUrl = process.env.NEXT_PUBLIC_POLAR_PORTAL_URL || ''

  return (
    <PageColumn size="list">

      {/* Header: the same page head as every tutor page (T-0826) */}
      <div className="dash-head">
        <div>
          <h1>Upgrade Tutafy</h1>
          <p>You are on the <b style={{ textTransform: 'capitalize', color: 'var(--d-ink)' }}>{currentPlan}</b> plan{currentPlan !== 'free' ? '. Thank you.' : '. Pick a plan when you are ready.'}</p>
        </div>
        <div className="dash-head-actions"><Link href="/settings" className="dash-btn">Back to Settings</Link></div>
      </div>

      {/* The plan picked before sign-up (T-1052): said once, above the cards, with what to press next */}
      {chosenItem && (
        <div className="mb-6 rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-5" data-testid="chosen-plan">
          <p className="text-[14px] font-bold text-gray-900">
            {alreadyThere
              ? (currentPlan === chosen
                ? `You are already on ${chosenItem.name}.`
                : `You are on ${PLAN_LABEL[currentPlan]}, which already includes everything in ${chosenItem.name}.`)
              : `You picked ${chosenItem.name}: ${chosenItem.monthlyUsd === 0 ? '$0' : `$${chosenItem.monthlyUsd}`}/month.`}
          </p>
          {!alreadyThere && (
            <p className="text-[13px] text-gray-600 mt-1">Check the list below, then press <b>Upgrade to {chosenItem.name}</b> to pay on Polar. Your account is upgraded as soon as the payment goes through.</p>
          )}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-12">
        {PLAN_LIST.map(plan => {
          const isActive = currentPlan === plan.id
          const planRank = PLAN_RANK[plan.id] ?? 0
          const isUpgrade = planRank > currentRank
          const isDowngrade = planRank < currentRank
          const onPro = plan.highlight
          const Icon = ICON[plan.id]
          const isChosen = chosen === plan.id
          const checkout = isUpgrade && plan.id !== 'free' ? polarCheckoutLink(plan.id, user.email ?? '', user.id) : null

          return (
            <div key={plan.id} data-testid={`plan-${plan.id}`}
              className={`relative rounded-2xl border-2 overflow-hidden ${onPro ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'} ${isActive ? 'ring-4 ring-indigo-300' : ''} ${isChosen && !isActive ? 'ring-4 ring-amber-300' : ''}`}>

              {/* Badge */}
              {plan.badge && !isChosen && !isActive && (
                <div className="absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-800 text-white">
                  {plan.badge}
                </div>
              )}

              {isChosen && !isActive && (
                <div className="absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                  Your pick
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
                  {Icon && <Icon className={`h-4 w-4 ${onPro ? 'text-indigo-100' : 'text-gray-500'}`} />}
                  <p className={`text-[12px] font-bold uppercase tracking-widest ${onPro ? 'text-indigo-100' : 'text-gray-500'}`}>
                    {plan.name}
                  </p>
                </div>

                {/* Price */}
                <div className="flex items-end gap-1 mb-1">
                  <span className={`text-[36px] font-black leading-none ${onPro ? 'text-white' : 'text-gray-900'}`}>
                    {`$${plan.monthlyUsd}`}
                  </span>
                  {plan.monthlyUsd > 0 && (
                    <span className={`text-[13px] pb-1 ${onPro ? 'text-indigo-100' : 'text-gray-500'}`}>
                      /month
                    </span>
                  )}
                </div>
                <p className={`text-[12px] mb-6 ${onPro ? 'text-indigo-100' : 'text-gray-500'}`}>
                  {plan.tagline}
                </p>

                {/* CTA button — labelled relative to the tutor's current plan */}
                {isActive ? (
                  <div className={`w-full py-2.5 rounded-xl text-[13px] font-bold text-center ${
                    onPro ? 'bg-indigo-800 text-white' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    ✓ Your current plan
                  </div>
                ) : isUpgrade && plan.id !== 'free' ? (
                  checkout ? (
                    <TrackedCheckoutLink href={checkout} plan={plan.id as 'pro' | 'academy'}
                      className={`block w-full py-2.5 rounded-xl text-[13px] font-bold text-center transition-colors ${
                        onPro ? 'bg-white text-indigo-600 hover:bg-indigo-50' : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}>
                      Upgrade to {plan.name} →
                    </TrackedCheckoutLink>
                  ) : (
                    <p data-testid="checkout-unavailable" className={`text-[12px] text-center rounded-xl px-3 py-2.5 ${onPro ? 'bg-indigo-800 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      Checkout is not available right now. Email <strong><ContactEmails /></strong> and we will upgrade you.
                    </p>
                  )
                ) : isDowngrade ? (
                  manageUrl ? (
                    <a href={manageUrl} target="_blank" rel="noopener noreferrer"
                      className={`block w-full py-2.5 rounded-xl text-[13px] font-semibold text-center transition-colors ${
                        onPro ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      Downgrade to {plan.name}
                    </a>
                  ) : (
                    <p className={`text-[12px] text-center rounded-xl px-3 py-2.5 ${onPro ? 'bg-indigo-800 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      To move to {plan.name}, email <strong><ContactEmails /></strong>.
                    </p>
                  )
                ) : (
                  <div className="w-full py-2.5 rounded-xl text-[13px] font-bold text-center bg-gray-100 text-gray-600">
                    Free
                  </div>
                )}
              </div>

              {/* Feature list */}
              <div className={`px-6 pb-6 space-y-2.5 border-t pt-5 ${onPro ? 'border-indigo-400' : 'border-gray-100'}`}>
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                      onPro ? 'bg-white/20' : 'bg-emerald-100'
                    }`}>
                      <Check className={`h-2.5 w-2.5 ${onPro ? 'text-white' : 'text-emerald-600'}`} />
                    </div>
                    <span className={`text-[12px] ${onPro ? 'text-white' : 'text-gray-700'}`}>
                      {f}
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
        <p className="text-[12px] text-gray-500">
          Visa, Mastercard, PayPal supported · Cancel anytime · No hidden fees
        </p>
        <p className="text-[11px] text-gray-500 mt-3">
          After payment, your account is upgraded automatically within a few minutes.
          If you don&apos;t see the change after 10 minutes, email <strong><ContactEmails /></strong>
        </p>
      </div>

      {/* FAQ mini */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {[
          { q: 'Can I cancel anytime?', a: 'Yes. Cancel in Polar.sh and you keep your plan until the end of the period you already paid for. You are not charged again.' },
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
        <Link href="/settings" className="text-[13px] text-gray-500 hover:text-gray-700 transition-colors max-lg:inline-flex max-lg:items-center max-lg:min-h-[44px]">
          ← Back to Settings
        </Link>
      </div>
    </PageColumn>
  )
}
