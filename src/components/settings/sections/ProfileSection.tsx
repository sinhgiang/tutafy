'use client'

// Settings, section "Profile" (T-0844): one tab of the Settings page, loaded the first time it is opened. All the values live in the
// page (src/app/(dashboard)/settings/page.tsx) and arrive here as `ctx`, so switching sections never loses what is being typed.
import { User } from 'lucide-react'
import { IntroEditor } from '@/components/IntroEditor'
import { AvatarUploader } from '@/components/settings/AvatarUploader'
import { IntroVideoField } from '@/components/settings/IntroVideoField'
import { LEVEL_OPTIONS, cleanLevels } from '@/lib/tutor-levels'
import { GROUP_OPTIONS, cleanGroups } from '@/lib/tutor-groups'
import { SectionHead } from '@/components/settings/sections/SectionHead'
import type { SettingsCtx } from '@/components/settings/sections/context'

export default function ProfileSection({ ctx }: { ctx: SettingsCtx }) {
  const { form, setForm, avatarUrl, setAvatarUrl, introVideoUrl, setIntroVideoUrl } = ctx
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
            <IntroVideoField url={introVideoUrl} onChange={setIntroVideoUrl} />
            <div>
              <label htmlFor="settings-full-name" className="block text-[12px] font-medium text-gray-600 mb-1.5">Full name</label>
              <input id="settings-full-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
            </div>
            <IntroEditor value={form.bio} onChange={bio => setForm(f => ({ ...f, bio }))} />
            <fieldset data-testid="levels-taught">
              <legend className="block text-[12px] font-medium text-gray-600 mb-1.5">Student levels you teach</legend>
              <p className="text-[12px] text-gray-500 mb-2">Students can filter the tutor directory by level. Leave all unticked if you would rather not say.</p>
              <div className="set-pills">
                {LEVEL_OPTIONS.map(o => {
                  const on = cleanLevels(form.levels_taught).includes(o.id)
                  return (
                    <label key={o.id} className={`inline-flex items-center gap-2 min-h-9 px-3 rounded-full border text-[13px] cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500/40 ${on ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-semibold' : 'bg-white border-gray-200 text-gray-700'}`}>
                      <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={on}
                        onChange={() => setForm(f => ({ ...f, levels_taught: on ? cleanLevels(f.levels_taught).filter(l => l !== o.id) : cleanLevels([...f.levels_taught, o.id]) }))} />
                      {o.label} <span className="text-[12px] opacity-75">{o.hint}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
            <fieldset data-testid="learning-groups">
              <legend className="block text-[12px] font-medium text-gray-600 mb-1.5">Students you like to teach</legend>
              <p className="text-[12px] text-gray-500 mb-2">Students can find you by what they are learning for, and you can appear on pages such as English for working professionals. Leave all unticked if you would rather not say.</p>
              <div className="set-pills">
                {GROUP_OPTIONS.map(o => {
                  const on = cleanGroups(form.learning_groups).includes(o.id)
                  return (
                    <label key={o.id} className={`inline-flex items-center gap-2 min-h-9 px-3 rounded-full border text-[13px] cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500/40 ${on ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-semibold' : 'bg-white border-gray-200 text-gray-700'}`}>
                      <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={on}
                        onChange={() => setForm(f => ({ ...f, learning_groups: on ? cleanGroups(f.learning_groups).filter(g => g !== o.id) : cleanGroups([...f.learning_groups, o.id]) }))} />
                      {o.label} <span className="text-[12px] opacity-75">{o.hint}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          </div>
        </div>
    </>
  )
}
