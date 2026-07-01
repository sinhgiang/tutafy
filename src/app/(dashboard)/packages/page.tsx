import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package, Plus } from 'lucide-react'
import { PackageManager } from './PackageManager'

export default async function PackagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: packages } = await supabase
    .from('packages')
    .select('*')
    .eq('tutor_id', user.id)
    .eq('active', true)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-[640px] space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/payments"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">Lesson Packages</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Sell bundles of lessons at a discount</p>
        </div>
      </div>

      <PackageManager initialPackages={packages ?? []} />
    </div>
  )
}
