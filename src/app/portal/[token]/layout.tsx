import { SiteLogo } from '@/components/SiteLogo'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <header className="bg-white border-b border-gray-100 h-[56px] flex items-center px-6">
        <div className="flex items-center gap-2">
          <SiteLogo size="sm" />
          <span className="text-[11px] text-gray-500 ml-1">Student Portal</span>
        </div>
      </header>
      <main className="max-w-[720px] mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
