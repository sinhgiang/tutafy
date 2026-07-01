import { createClient } from '@/lib/supabase/server'
import CalendarView from './CalendarView'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0)

  const { data: lessons } = await supabase
    .from('lessons')
    .select('*, students(name)')
    .eq('tutor_id', user!.id)
    .gte('starts_at', start.toISOString())
    .lte('starts_at', end.toISOString())
    .order('starts_at')

  return <CalendarView lessons={lessons ?? []} />
}
