import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Mail, Phone, Globe, BookOpen, Calendar } from 'lucide-react'

const levelColors: Record<string, string> = {
  A1: 'bg-red-100 text-red-700', A2: 'bg-orange-100 text-orange-700',
  B1: 'bg-yellow-100 text-yellow-700', B2: 'bg-green-100 text-green-700',
  C1: 'bg-blue-100 text-blue-700', C2: 'bg-purple-100 text-purple-700',
  Native: 'bg-gray-100 text-gray-700',
}

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .eq('tutor_id', user.id)
    .single()

  if (!student) notFound()

  const { data: lessons } = await supabase
    .from('lessons')
    .select('*')
    .eq('student_id', id)
    .order('starts_at', { ascending: false })
    .limit(10)

  const initials = student.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const totalLessons = lessons?.length ?? 0
  const completedLessons = lessons?.filter(l => l.status === 'completed').length ?? 0
  const totalRevenue = lessons?.filter(l => l.status === 'completed').reduce((s, l) => s + (l.price ?? 0), 0) ?? 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/students">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Student Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-20 w-20 mb-3">
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold text-gray-900">{student.name}</h2>
                <div className="flex gap-2 mt-2">
                  <Badge className={levelColors[student.level]} variant="secondary">{student.level}</Badge>
                  <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>{student.status}</Badge>
                </div>
                {student.goals && <p className="text-sm text-gray-500 mt-3">{student.goals}</p>}
              </div>

              <div className="mt-4 space-y-2 border-t pt-4">
                {student.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />{student.email}
                  </div>
                )}
                {student.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />{student.phone}
                  </div>
                )}
                {student.country && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Globe className="h-4 w-4" />{student.country}
                    {student.native_language && ` · ${student.native_language}`}
                  </div>
                )}
              </div>

              {student.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {student.tags.map((tag: string) => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Link href={`/students/${id}/edit`} className="flex-1">
                  <Button variant="outline" className="w-full text-sm">Edit</Button>
                </Link>
                <Link href={`/lessons/new?student=${id}`} className="flex-1">
                  <Button className="w-full text-sm">Schedule</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Lessons', value: totalLessons, icon: BookOpen },
              { label: 'Completed', value: completedLessons, icon: Calendar },
              { label: 'Revenue', value: `$${totalRevenue}`, icon: Mail },
            ].map(stat => (
              <Card key={stat.label}>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {student.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Private Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{student.notes}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Lesson History</CardTitle>
                <Link href={`/lessons/new?student=${id}`}>
                  <Button size="sm" variant="outline">+ Add Lesson</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {!lessons || lessons.length === 0 ? (
                <p className="text-sm text-gray-500">No lessons yet.</p>
              ) : (
                <div className="space-y-2">
                  {lessons.map(lesson => (
                    <Link key={lesson.id} href={`/lessons/${lesson.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(lesson.starts_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(lesson.starts_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} · {lesson.duration_minutes}min
                          </p>
                        </div>
                        <Badge variant={lesson.status === 'completed' ? 'default' : 'secondary'}>
                          {lesson.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
