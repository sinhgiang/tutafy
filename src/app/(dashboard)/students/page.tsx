import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Search } from 'lucide-react'

const levelColors: Record<string, string> = {
  A1: 'bg-red-100 text-red-700',
  A2: 'bg-orange-100 text-orange-700',
  B1: 'bg-yellow-100 text-yellow-700',
  B2: 'bg-green-100 text-green-700',
  C1: 'bg-blue-100 text-blue-700',
  C2: 'bg-purple-100 text-purple-700',
  Native: 'bg-gray-100 text-gray-700',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-gray-100 text-gray-600',
}

export default async function StudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: students } = await supabase
    .from('students')
    .select('*')
    .eq('tutor_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-1">{students?.length ?? 0} students total</p>
        </div>
        <Link href="/students/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Student
          </Button>
        </Link>
      </div>

      {!students || students.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="bg-blue-50 p-4 rounded-full mb-4">
              <Search className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No students yet</h3>
            <p className="text-sm text-gray-500 mt-1 text-center max-w-sm">
              Add your first student to get started managing your tutoring business.
            </p>
            <Link href="/students/new" className="mt-4">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add your first student
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {students.map((student) => {
            const initials = student.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
            return (
              <Link key={student.id} href={`/students/${student.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-gray-900 truncate">{student.name}</p>
                          <Badge className={statusColors[student.status]} variant="secondary">
                            {student.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={levelColors[student.level]} variant="secondary">
                            {student.level}
                          </Badge>
                          {student.country && (
                            <span className="text-xs text-gray-500">{student.country}</span>
                          )}
                        </div>
                        {student.goals && (
                          <p className="text-xs text-gray-500 mt-2 line-clamp-2">{student.goals}</p>
                        )}
                        {student.tags?.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-2">
                            {student.tags.slice(0, 3).map((tag: string) => (
                              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
