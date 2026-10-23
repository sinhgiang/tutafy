'use client'

// Settings, section "Profile" (T-0844): one tab of the Settings page, loaded the first time it is opened. All the values live in the
// page (src/app/(dashboard)/settings/page.tsx) and arrive here as `ctx`, so switching sections never loses what is being typed.
import { User } from 'lucide-react'
import { IntroEditor } from '@/components/IntroEditor'
import { AvatarUploader } from '@/components/settings/AvatarUploader'
import { SectionHead } from '@/components/settings/sections/SectionHead'
import type { SettingsCtx } from '@/components/settings/sections/context'

export default function ProfileSection({ ctx }: { ctx: SettingsCtx }) {
  const { form, setForm, avatarUrl, setAvatarUrl } = ctx
  return (
    <>
      <SectionHead title="Profile" text="Your name, photo and introduction. Students read this first." />
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <p className="text-[13px] font-semibold text-gray-900">Profile</p>
          </div>
          <div className="p-5 space-y-4">
            <AvatarUploader name={form.name} url={avatarUrl} onChange={setAvatarUrl} />
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Full name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
            </div>
            <IntroEditor value={form.bio} onChange={bio => setForm(f => ({ ...f, bio }))} />
          </div>
        </div>
    </>
  )
}
