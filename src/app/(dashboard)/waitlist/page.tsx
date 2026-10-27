// Waitlist (T-0825): students who asked to be told when the tutor has room. A Pro feature. Reads only the tutor's own entries.
import { redirect } from 'next/navigation'
import { CircleAlert, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireFeature } from '@/lib/guard'
import { StatRow } from '@/components/lists/StatRow'
import { ago, waitlistStats } from '@/lib/business-lists'
import { WaitlistActions } from './WaitlistActions'

type Entry = { id: string; name: string; email: string; message: string | null; created_at: string }

export default async function WaitlistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locked = await requireFeature('pro', 'Waitlist')
  if (locked) return locked

  const { data, error } = await supabase.from('waitlist').select('id, name, email, message, created_at').eq('tutor_id', user.id).order('created_at', { ascending: false })
  const entries = (data ?? []) as Entry[]
  const now = new Date()
  const stats = waitlistStats(entries, now)

  return (
    <div>
      <div className="dash-head">
        <div><h1>Waitlist <span className="dash-chip is-brand-chip" style={{ verticalAlign: 'middle', marginLeft: 6 }}>Pro</span></h1><p>Students who want to book while your schedule is full.</p></div>
      </div>

      {error ? (
        <div className="dash-card dash-state" role="alert" data-testid="waitlist-error">
          <div className="dash-state-ico"><CircleAlert className="h-6 w-6" aria-hidden="true" /></div>
          <h2>We could not load your waitlist</h2>
          <p>Nothing was changed. Reload the page to try again.</p>
        </div>
      ) : (
        <>
          <StatRow stats={[
            { id: 'waiting', label: 'Waiting', value: String(stats.waiting) },
            { id: 'week', label: 'Joined this week', value: String(stats.thisWeek) },
            { id: 'message', label: 'With a message', value: String(stats.withMessage) },
          ]} />
          <section className="dash-card" aria-label="Waitlist">
            {entries.length === 0 ? (
              <div className="dash-state" data-testid="waitlist-empty">
                <div className="dash-state-ico is-brand"><Users className="h-6 w-6" aria-hidden="true" /></div>
                <h2>No one is waiting</h2>
                <p>Students are added when your booking page has no free time and they ask to be told.</p>
              </div>
            ) : (
              <div className="dash-table-wrap overflow-x-auto">
                <table className="dash-table is-cards no-sel">
                  <thead><tr><th>Student</th><th>Email</th><th>Message</th><th>Joined</th><th><span className="sr-only">Remove</span></th></tr></thead>
                  <tbody>
                    {entries.map(e => (
                      <tr key={e.id}>
                        <td className="c-main"><b style={{ fontWeight: 650 }}>{e.name}</b></td>
                        <td className="c-sub"><a href={`mailto:${encodeURIComponent(e.email).replace('%40', '@')}`} style={{ color: 'var(--d-brand)' }}>{e.email}</a></td>
                        <td className="c-sub" style={{ color: 'var(--d-ink-2)' }}>{e.message ? `"${e.message}"` : <span style={{ color: 'var(--d-ink-3)' }}>No message</span>}</td>
                        <td className="c-end">{ago(e.created_at, now)}</td>
                        <td className="is-num c-sub"><WaitlistActions entryId={e.id} name={e.name} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <p style={{ color: 'var(--d-ink-3)', marginTop: 16 }}>When you open new free time, email the people on this list so they can book first.</p>
        </>
      )}
    </div>
  )
}
