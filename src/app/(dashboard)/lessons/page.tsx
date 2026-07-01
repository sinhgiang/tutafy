import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Plus, BookOpen } from 'lucide-react'
import { LessonsClient } from './LessonsClient'

export default async function LessonsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: lessons } = await supabase
    .from('lessons').select('*, students(name, level)').eq('tutor_id', user!.id).order('starts_at', { ascending: false })

  const now = new Date()
  const upcoming = lessons?.filter(l => new Date(l.starts_at) >= now && l.status === 'scheduled') ?? []
  const past = lessons?.filter(l => new Date(l.starts_at) < now || l.status !== 'scheduled') ?? []

  return (
    <div className="space-y-6 max-w-[900px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Lessons</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">{upcoming.length} upcoming · {past.length} past · Select lessons to bulk-update</p>
        </div>
        <Link href="/lessons/new"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-4 py-2 rounded-lg">
          <Plus className="h-3.5 w-3.5" /> Schedule Lesson
        </Link>
      </div>

      {!lessons || lessons.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="h-6 w-6 text-indigo-400" />
          </div>
          <h3 className="text-[15px] font-semibold text-gray-900">No lessons yet</h3>
          <p className="text-[13px] text-gray-400 mt-1">Schedule your first lesson or share your booking link.</p>
          <Link href="/lessons/new"
            className="mt-5 flex items-center gap-1.5 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-4 py-2 rounded-lg">
            <Plus className="h-3.5 w-3.5" /> Schedule a lesson
          </Link>
        </div>
      ) : (
        <LessonsClient upcoming={upcoming as any} past={past as any} />
      )}
    </div>
  )
}
