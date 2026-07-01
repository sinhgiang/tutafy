import { Zap } from 'lucide-react'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <header className="bg-white border-b border-gray-100 h-[56px] flex items-center px-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-white" fill="white" />
          </div>
          <span className="text-[14px] font-semibold text-gray-900">Tutafy</span>
          <span className="text-[11px] text-gray-400 ml-1">Student Portal</span>
        </div>
      </header>
      <main className="max-w-[720px] mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
