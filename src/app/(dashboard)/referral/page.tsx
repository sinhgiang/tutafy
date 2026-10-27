'use client'

// Refer & Earn (T-0826): your link, the figures, how it works, and a table of the tutors you invited (short name, when they joined,
// whether they pay). Share with the phone's share sheet when there is one, otherwise copy.
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CircleAlert, Copy, Gift, Share2, Users } from 'lucide-react'
import { StatRow } from '@/components/lists/StatRow'
import type { ReferredRow } from '@/lib/referral'

type Data = { referral_code: string; referral_link: string; referral_count: number; credits: number; referred: ReferredRow[] }

export default function ReferralPage() {
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [data, setData] = useState<Data | null>(null)

  useEffect(() => {
    fetch('/api/referral')
      .then(r => { if (!r.ok) throw new Error('load'); return r.json() })
      .then((d: Data) => setData(d))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [])

  function copy(text: string) {
    void navigator.clipboard.writeText(text).then(() => toast.success('Link copied')).catch(() => toast.error('Could not copy the link'))
  }

  async function share() {
    if (!data) return
    if (navigator.share) {
      try { await navigator.share({ title: 'Join me on Tutafy', text: 'I use Tutafy to manage my tutoring business. Try it free.', url: data.referral_link }) } catch { /* the person closed the sheet */ }
    } else copy(data.referral_link)
  }

  return (
    <div>
      <div className="dash-head">
        <div><h1>Refer and earn</h1><p>Invite other tutors and earn a free month of Pro for each one who subscribes.</p></div>
      </div>

      {loading && <div role="status" className="dash-sk" style={{ height: 200 }}><span className="sr-only">Loading your referrals</span></div>}

      {failed && (
        <div className="dash-card dash-state" role="alert" data-testid="referral-error">
          <div className="dash-state-ico"><CircleAlert className="h-6 w-6" aria-hidden="true" /></div>
          <h2>We could not load your referrals</h2>
          <p>Nothing was changed. Reload the page to try again.</p>
        </div>
      )}

      {data && (
        <>
          <StatRow stats={[
            { id: 'referred', label: 'Tutors referred', value: String(data.referral_count) },
            { id: 'paying', label: 'Who subscribed', value: String(data.referred.filter(r => r.paid).length) },
            { id: 'credits', label: 'Free months earned', value: String(data.credits) },
          ]} />

          <div className="set-two">
            <section className="dash-card" aria-labelledby="ref-table-h">
              <div className="dash-card-h"><h2 id="ref-table-h">Tutors you invited</h2><span>{data.referred.length} shown</span></div>
              {data.referred.length === 0 ? (
                <div className="dash-state" data-testid="referral-empty">
                  <div className="dash-state-ico is-brand"><Users className="h-6 w-6" aria-hidden="true" /></div>
                  <h2>No one has joined yet</h2>
                  <p>Share your link with a tutor you know. They show up here when they sign up with it.</p>
                </div>
              ) : (
                <div className="dash-table-wrap overflow-x-auto" style={{ paddingTop: 12 }}>
                  <table className="dash-table is-cards no-sel" data-testid="referral-table">
                    <thead><tr><th>Tutor</th><th>Joined</th><th>Plan</th></tr></thead>
                    <tbody>
                      {data.referred.map((r, i) => (
                        <tr key={i}>
                          <td className="c-main"><b style={{ fontWeight: 650 }}>{r.name}</b></td>
                          <td className="c-end">{new Date(r.joined).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                          <td className="c-sub"><span className={`dash-chip ${r.paid ? 'is-ok' : ''}`}>{r.paid ? 'Subscribed' : 'Free so far'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
              <section className="dash-card dash-card-b" aria-labelledby="ref-link-h">
                <h2 id="ref-link-h" style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 650, color: 'var(--d-ink)' }}>Your link</h2>
                <div className="dash-input" style={{ display: 'flex', alignItems: 'center', maxWidth: 'none', height: 'auto', padding: '10px 12px' }}>
                  <code style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere', fontSize: 13 }} data-testid="referral-link">{data.referral_link}</code>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button type="button" className="dash-btn is-primary" style={{ flex: 1 }} onClick={share}><Share2 className="h-4 w-4" aria-hidden="true" /> Share</button>
                  <button type="button" className="dash-btn" onClick={() => copy(data.referral_link)}><Copy className="h-4 w-4" aria-hidden="true" /> Copy</button>
                </div>
              </section>
              <section className="dash-card dash-card-b" aria-labelledby="ref-how-h">
                <h2 id="ref-how-h" style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 650, color: 'var(--d-ink)' }}>How it works</h2>
                <ol style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 8, color: 'var(--d-ink-2)', listStyle: 'decimal' }}>
                  <li>Share your link with another tutor.</li>
                  <li>They sign up and subscribe to Pro.</li>
                  <li><Gift className="h-4 w-4" aria-hidden="true" style={{ display: 'inline', verticalAlign: '-3px', marginRight: 4, color: 'var(--d-brand)' }} />You earn one free month of Pro for each one.</li>
                </ol>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
