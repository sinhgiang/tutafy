import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Plus, Users, Search } from 'lucide-react'

const LEVEL_COLOR: Record<string, string> = {
  A1: 'bg-slate-100 text-slate-500', A2: 'bg-blue-50 text-blue-600',
  B1: 'bg-cyan-50 text-cyan-700', B2: 'bg-green-50 text-green-700',
  C1: 'bg-orange-50 text-orange-700', C2: 'bg-red-50 text-red-700',
  Native: 'bg-purple-50 text-purple-700',
}

export default async function StudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: students } = await supabase
    .from('students').select('*').eq('tutor_id', user!.id).order('created_at', { ascending: false })

  const active = students?.filter(s => s.status === 'active').length ?? 0

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Students</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">{students?.length ?? 0} total · {active} active</p>
        </div>
        <Link href="/students/new"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-4 py-2 rounded-lg">
          <Plus className="h-3.5 w-3.5" /> Add Student
        </Link>
      </div>

      {!students || students.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-indigo-400" />
          </div>
          <h3 className="text-[15px] font-semibold text-gray-900">No students yet</h3>
          <p className="text-[13px] text-gray-400 mt-1 text-center max-w-xs">Add your first student to start managing your tutoring business.</p>
          <Link href="/students/new"
            className="mt-5 flex items-center gap-1.5 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-4 py-2 rounded-lg">
            <Plus className="h-3.5 w-3.5" /> Add your first student
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Student</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Level</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Country</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Goals</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map(s => {
                const initials = s.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                return (
                  <Link key={s.id} href={`/students/${s.id}`} legacyBehavior>
                    <tr className="hover:bg-gray-50/60 transition-colors cursor-pointer">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-[11px] font-bold text-indigo-600">{initials}</span>
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-gray-900">{s.name}</p>
                            {s.email && <p className="text-[11px] text-gray-400">{s.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] px-2 py-0.5 rounded font-semibold ${LEVEL_COLOR[s.level] ?? 'bg-gray-100 text-gray-500'}`}>{s.level}</span>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-500">{s.country ?? '—'}</td>
                      <td className="px-5 py-3.5 text-[12px] text-gray-400 max-w-[200px]">
                        <p className="truncate">{s.goals ?? '—'}</p>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          s.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                          s.status === 'paused' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-gray-400">
                        {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  </Link>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
