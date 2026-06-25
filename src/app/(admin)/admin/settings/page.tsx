import { Shield, Mail, Globe, Key } from 'lucide-react'

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Platform configuration</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Admin Account</p>
            <p className="text-xs text-gray-500 mt-0.5">tubxeebyajtube@gmail.com</p>
          </div>
          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">Owner</span>
        </div>

        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Globe className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Platform Domain</p>
            <p className="text-xs text-gray-500 mt-0.5">tutafy.com (custom domain — configure in Vercel)</p>
          </div>
        </div>

        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Mail className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Transactional Email</p>
            <p className="text-xs text-gray-500 mt-0.5">Resend — configure RESEND_API_KEY in Vercel env vars</p>
          </div>
        </div>

        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Key className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Stripe Connect</p>
            <p className="text-xs text-gray-500 mt-0.5">Payment processing — configure STRIPE_SECRET_KEY in Vercel env vars</p>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <p className="text-sm font-medium text-yellow-800">Coming soon in Phase 2</p>
        <ul className="text-xs text-yellow-700 mt-2 space-y-1 list-disc list-inside">
          <li>Platform fee percentage (Stripe Connect)</li>
          <li>Email templates customization</li>
          <li>Feature flags per tutor</li>
          <li>Subscription plan management</li>
          <li>Announcement broadcasts to all tutors</li>
        </ul>
      </div>
    </div>
  )
}
