import { createClient } from '@/lib/supabase/server'
import { Users, Trash2, Mail } from 'lucide-react'
import { WaitlistActions } from './WaitlistActions'

export default async function WaitlistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let entries: any[] = []
  try {
    const { data } = await supabase
      .from('waitlist')
      .select('*')
      .eq('tutor_id', user!.id)
      .order('created_at', { ascending: false })
    entries = data ?? []
  } catch { /* table may not exist */ }

  return (
    <div className="max-w-[640px] space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Waitlist</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Students who want to book but your schedule is full</p>
      </div>

      {entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-16">
          <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
            <Users className="h-5 w-5 text-indigo-400" />
          </div>
          <p className="text-[13px] text-gray-400">No waitlist entries yet</p>
          <p className="text-[12px] text-gray-300 mt-0.5">Students are added when your booking page has no availability</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <p className="text-[13px] font-semibold text-gray-900">{entries.length} student{entries.length !== 1 ? 's' : ''} waiting</p>
          </div>
          <div className="divide-y divide-gray-50">
            {entries.map(e => (
              <div key={e.id} className="flex items-start gap-4 px-5 py-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-[12px] font-bold text-indigo-600">
                  {e.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900">{e.name}</p>
                  <a href={`mailto:${e.email}`} className="text-[12px] text-indigo-500 hover:text-indigo-700 flex items-center gap-1 mt-0.5">
                    <Mail className="h-3 w-3" /> {e.email}
                  </a>
                  {e.message && (
                    <p className="text-[12px] text-gray-500 mt-1.5 italic">&quot;{e.message}&quot;</p>
                  )}
                  <p className="text-[10px] text-gray-300 mt-1">
                    {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <WaitlistActions entryId={e.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
        <p className="text-[12px] font-semibold text-amber-900">Tip: Notify your waitlist</p>
        <p className="text-[12px] text-amber-700 mt-1">When you open new availability slots, email your waitlist to let them know. Click any email address above to open your mail client.</p>
      </div>
    </div>
  )
}
