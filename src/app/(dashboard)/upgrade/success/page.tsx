import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Sparkles, LayoutDashboard } from 'lucide-react'

// Where Polar sends the tutor after a successful checkout. The subscription is
// activated asynchronously by the Polar webhook, so the plan may still read
// "free" for a few seconds right after payment — we reassure the user and the
// page reads the freshest status on every load (and auto-refreshes once).
export const dynamic = 'force-dynamic'

const PLAN_LABEL: Record<string, string> = {
  pro: 'Pro',
  academy: 'Academy',
}

export default async function UpgradeSuccessPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tutor } = await supabase
    .from('tutors')
    .select('subscription_status, name')
    .eq('id', user.id)
    .single()

  const status = tutor?.subscription_status ?? 'free'
  const upgraded = status === 'pro' || status === 'academy'
  const planLabel = PLAN_LABEL[status] ?? ''
  const firstName = tutor?.name?.split(' ')[0] ?? 'there'

  return (
    <div className="max-w-lg mx-auto py-16 px-4">
      {/* Auto-refresh once after 5s if the webhook hasn't landed yet */}
      {!upgraded && (
        <meta httpEquiv="refresh" content="5" />
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        {upgraded ? (
          <>
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-600 text-[12px] font-bold px-3 py-1 rounded-full mb-3">
              <Sparkles className="h-3.5 w-3.5" fill="currentColor" />
              Upgrade successful
            </div>
            <h1 className="text-[24px] font-bold text-gray-900">Congratulations {firstName}! 🎉</h1>
            <p className="text-[14px] text-gray-500 mt-2">
              Your account has been upgraded to the{' '}
              <span className="font-bold text-indigo-600">{planLabel}</span> plan.
              All premium features are now unlocked.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <h1 className="text-[24px] font-bold text-gray-900">Thank you! 🎉</h1>
            <p className="text-[14px] text-gray-500 mt-2">
              Payment successful. Your plan is being activated — this usually takes
              a few seconds. This page will update automatically, nothing else to do.
            </p>
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link href="/dashboard"
            className="inline-flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white text-[13px] font-bold px-5 py-2.5 rounded-xl transition-colors">
            <LayoutDashboard className="h-4 w-4" />
            Go to Dashboard
          </Link>
          <Link href="/upgrade"
            className="inline-flex items-center justify-center text-[13px] font-semibold text-gray-500 hover:text-gray-800 px-5 py-2.5 rounded-xl transition-colors">
            View my plan
          </Link>
        </div>
      </div>

      <p className="text-[11px] text-gray-400 text-center mt-5">
        If you still don't see the upgrade after 10 minutes, please email tubxeebyajtube@gmail.com
      </p>
    </div>
  )
}
