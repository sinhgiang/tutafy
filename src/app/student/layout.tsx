import Link from 'next/link'
import { BrandLogo } from '@/components/brand/BrandLogo'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <header className="bg-white border-b border-gray-100 h-[56px] flex items-center px-6">
        <Link href="/" aria-label="Tutafy home" className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          <BrandLogo height={28} />
        </Link>
        <span className="text-[11px] text-gray-500 ml-2">· Student</span>
      </header>
      <main className="max-w-[720px] mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
