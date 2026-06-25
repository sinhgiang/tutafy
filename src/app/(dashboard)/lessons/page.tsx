import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, BookOpen } from 'lucide-react'

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-gray-100 text-gray-600',
}

export default async function LessonsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: lessons } = await supabase
    .from('lessons')
    .select('*, students(name, level)')
    .eq('tutor_id', user!.id)
    .order('starts_at', { ascending: false })

  const upcoming = lessons?.filter(l => new Date(l.starts_at) >= new Date() && l.status === 'scheduled') ?? []
  const past = lessons?.filter(l => new Date(l.starts_at) < new Date() || l.status !== 'scheduled') ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lessons</h1>
          <p className="text-sm text-gray-500 mt-1">{lessons?.length ?? 0} total lessons</p>
        </div>
        <Link href="/lessons/new">
          <Button className="gap-2"><Plus className="h-4 w-4" />Schedule Lesson</Button>
        </Link>
      </div>

      {!lessons || lessons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <div className="bg-blue-50 p-4 rounded-full mb-4">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No lessons yet</h3>
            <p className="text-sm text-gray-500 mt-1">Schedule your first lesson or share your booking link.</p>
            <Link href="/lessons/new" className="mt-4">
              <Button className="gap-2"><Plus className="h-4 w-4" />Schedule a lesson</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Upcoming</h2>
              <div className="space-y-2">
                {upcoming.map(lesson => <LessonRow key={lesson.id} lesson={lesson} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Past</h2>
              <div className="space-y-2">
                {past.map(lesson => <LessonRow key={lesson.id} lesson={lesson} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LessonRow({ lesson }: { lesson: any }) {
  const start = new Date(lesson.starts_at)
  return (
    <Link href={`/lessons/${lesson.id}`}>
      <Card className="hover:shadow-sm transition-shadow cursor-pointer">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-4">
            <div className="text-center min-w-[52px]">
              <p className="text-xs text-gray-400 uppercase">{start.toLocaleDateString('en', { month: 'short' })}</p>
              <p className="text-2xl font-bold text-gray-900 leading-none">{start.getDate()}</p>
              <p className="text-xs text-gray-400">{start.toLocaleDateString('en', { weekday: 'short' })}</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{lesson.students?.name ?? 'Unknown student'}</p>
              <p className="text-sm text-gray-500">
                {start.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })} · {lesson.duration_minutes}min
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lesson.price && <span className="text-sm font-medium text-gray-700">${lesson.price}</span>}
              <Badge className={statusColors[lesson.status]} variant="secondary">{lesson.status}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
