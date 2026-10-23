// Packages (T-0825): the tutor's lesson bundles as a list with a row of figures. A Pro feature: the lock is a quiet "Pro" tag
// and an upgrade sheet (LockedFeature); the routes check the plan again.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireFeature } from '@/lib/guard'
import { loadTutorCurrency } from '@/lib/tutor-currency'
import { PackageManager, type Pkg } from './PackageManager'

export default async function PackagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locked = await requireFeature('pro', 'Lesson packages')
  if (locked) return locked

  const { data, error } = await supabase.from('packages').select('*').eq('tutor_id', user.id).eq('active', true).order('created_at', { ascending: false })
  const currency = await loadTutorCurrency(supabase, user.id)
  return <PackageManager initialPackages={(data ?? []) as Pkg[]} currency={currency} loadFailed={!!error} />
}
