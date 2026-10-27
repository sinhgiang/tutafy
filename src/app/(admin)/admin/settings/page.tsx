import { Shield, Mail, Globe, Key } from 'lucide-react'
import { requireAdminPage } from '@/lib/admin-guard'
import { getAdminT } from '@/lib/admin-lang'
import { createClient } from '@/lib/supabase/server'

export default async function AdminSettingsPage() {
  // Own check (the layout alone is not a safe gate): this page names the admin account.
  await requireAdminPage()
  const { t } = await getAdminT()
  // The page is for the admin only (checked above), so the signed-in account is the admin account.
  const { data: { user } } = await (await createClient()).auth.getUser()
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{t('settings.account')}</p>
            <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
          </div>
          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">{t('settings.owner')}</span>
        </div>

        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Globe className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{t('settings.domain')}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t('settings.domainNote')}</p>
          </div>
        </div>

        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Mail className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{t('settings.email')}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t('settings.emailNote')}</p>
          </div>
        </div>

        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Key className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{t('settings.stripe')}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t('settings.stripeNote')}</p>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <p className="text-sm font-medium text-yellow-800">{t('settings.soon')}</p>
        <ul className="text-xs text-yellow-700 mt-2 space-y-1 list-disc list-inside">
          <li>{t('settings.soon1')}</li>
          <li>{t('settings.soon2')}</li>
          <li>{t('settings.soon3')}</li>
          <li>{t('settings.soon4')}</li>
          <li>{t('settings.soon5')}</li>
        </ul>
      </div>
    </div>
  )
}
