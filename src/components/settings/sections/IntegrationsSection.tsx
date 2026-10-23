'use client'

// Settings, section "Integrations" (T-0844): one tab of the Settings page, loaded the first time it is opened. All the values live in the
// page (src/app/(dashboard)/settings/page.tsx) and arrive here as `ctx`, so switching sections never loses what is being typed.
import { toast } from 'sonner'
import { CheckCircle, Calendar, Bell } from 'lucide-react'
import PushSubscribe from '@/components/PushSubscribe'
import { SectionHead } from '@/components/settings/sections/SectionHead'
import type { SettingsCtx } from '@/components/settings/sections/context'

export default function IntegrationsSection({ ctx }: { ctx: SettingsCtx }) {
  const { gcalConnected, setGcalConnected, disconnectingGcal, setDisconnectingGcal } = ctx
  return (
    <>
      <SectionHead title="Integrations" text="Connect Tutafy to the tools you already use." />
        {/* Google Calendar */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <p className="text-[13px] font-semibold text-gray-900">Google Calendar</p>
          </div>
          <div className="p-5 space-y-3">
            {gcalConnected ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-[13px] font-medium text-gray-900">Connected</p>
                    <p className="text-[11px] text-gray-400">New lessons will sync to your Google Calendar</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    setDisconnectingGcal(true)
                    await fetch('/api/auth/google-calendar/disconnect', { method: 'POST' })
                    setGcalConnected(false)
                    toast.success('Google Calendar disconnected')
                    setDisconnectingGcal(false)
                  }}
                  disabled={disconnectingGcal}
                  className="text-[12px] text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[12px] text-gray-500">Sign in with your Google account and every lesson you schedule is added to your Google Calendar automatically. One click — nothing to install.</p>
                <a
                  href="/api/auth/google-calendar"
                  className="flex items-center justify-center gap-2 w-full text-[13px] font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] transition-colors py-2.5 rounded-lg"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 3H4v18h16V3zm-2 14H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2z"/>
                  </svg>
                  Connect with Google
                </a>
                <p className="text-[11px] text-gray-400">We only ask for calendar access. You can disconnect anytime.</p>
              </div>
            )}
          </div>
        </div>

        {/* Push Notifications */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <Bell className="h-4 w-4 text-gray-400" />
            <p className="text-[13px] font-semibold text-gray-900">Push Notifications</p>
          </div>
          <div className="p-5 flex items-center gap-3">
            <PushSubscribe />
            <div>
              <p className="text-[13px] text-gray-700 font-medium">Browser push notifications</p>
              <p className="text-[12px] text-gray-400 mt-0.5">Get notified instantly when a student messages you, even when Tutafy is not open.</p>
            </div>
          </div>
        </div>
    </>
  )
}
