'use client'

// Settings, section "Plan" (T-0844): one tab of the Settings page, loaded the first time it is opened. All the values live in the
// page (src/app/(dashboard)/settings/page.tsx) and arrive here as `ctx`, so switching sections never loses what is being typed.
import { CheckCircle, Zap } from 'lucide-react'
import NextLink from 'next/link'
import { SectionHead } from '@/components/settings/sections/SectionHead'
import type { SettingsCtx } from '@/components/settings/sections/context'

export default function PlanSection({ ctx }: { ctx: SettingsCtx }) {
  const { subscriptionStatus, isPaid, planLabel } = ctx
  return (
    <>
      <SectionHead title="Plan" text="Your Tutafy plan." />
        <div className={`rounded-xl border overflow-hidden ${isPaid ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-gray-100'}`}>
          <div className={`px-5 py-4 border-b flex items-center gap-2 ${isPaid ? 'border-indigo-400' : 'border-gray-50'}`}>
            <Zap className={`h-4 w-4 ${isPaid ? 'text-indigo-200' : 'text-gray-400'}`} />
            <p className={`text-[13px] font-semibold ${isPaid ? 'text-white' : 'text-gray-900'}`}>Tutafy Plan</p>
          </div>
          <div className="p-5 space-y-3">
            {isPaid ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white">{planLabel} Plan — Active</p>
                    <p className="text-[11px] text-indigo-200">
                      {subscriptionStatus === 'academy' ? 'Team, payroll & all Pro features' : 'Unlimited students, AI tools, all features'}
                    </p>
                  </div>
                </div>
                <NextLink href="/upgrade" className="text-[12px] font-semibold text-white/80 hover:text-white transition-colors">
                  Manage →
                </NextLink>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-gray-900">Free Plan</p>
                    <p className="text-[11px] text-gray-400">Limited to 10 students · Basic features</p>
                  </div>
                  <span className="text-[11px] bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">Free</span>
                </div>
                <NextLink href="/upgrade"
                  className="flex items-center justify-center gap-2 w-full text-[13px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors py-2.5 rounded-lg">
                  <Zap className="h-3.5 w-3.5" fill="currentColor" /> Upgrade to Pro — $12/month
                </NextLink>
              </>
            )}
          </div>
        </div>
    </>
  )
}
