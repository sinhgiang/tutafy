'use client'

// The Messages workspace (T-0823): the conversation list on the left, and whatever page is open (a thread with the student
// card, the broadcast form, or a "pick a conversation" note) on the right. From 1280px both show side by side; below that
// the list shows first and a conversation replaces it (data-open), with a Back link in the thread.
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Megaphone, MessageCircle, Search } from 'lucide-react'
import { filterConversations, type Conversation } from '@/lib/conversations'

export function MessagesShell({ conversations, totalUnread, failed, children }: { conversations: Conversation[]; totalUnread: number; failed: boolean; children: React.ReactNode }) {
  const pathname = usePathname()
  const open = pathname !== '/messages'
  const activeId = /^\/messages\/([^/]+)$/.exec(pathname)?.[1] ?? null
  const [q, setQ] = useState('')
  const shown = filterConversations(conversations, q)

  return (
    <div className="msg-shell" data-open={open} data-testid="messages-shell">
      <aside className="msg-list" aria-label="Conversations">
        <div className="msg-list-head">
          <h1>Messages {totalUnread > 0 && <span className="dash-chip is-brand-chip">{totalUnread} new</span>}</h1>
          <Link href="/messages/broadcast" className="dash-btn"><Megaphone className="h-4 w-4" aria-hidden="true" /> Broadcast</Link>
        </div>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--d-line)' }}>
          <div style={{ position: 'relative' }}>
            <Search className="h-4 w-4" aria-hidden="true" style={{ position: 'absolute', left: 10, top: 10, color: 'var(--d-ink-3)' }} />
            <input className="dash-input" style={{ width: '100%', maxWidth: 'none', paddingLeft: 32 }} type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search students" aria-label="Search conversations" />
          </div>
        </div>
        <div className="msg-list-rows">
          {failed ? (
            <p className="dash-card-b" role="alert" data-testid="messages-error" style={{ color: 'var(--d-err)' }}>We could not load your conversations. Reload the page to try again.</p>
          ) : conversations.length === 0 ? (
            <div className="dash-state" data-testid="messages-empty">
              <div className="dash-state-ico is-brand"><MessageCircle className="h-6 w-6" aria-hidden="true" /></div>
              <h2>No active students yet</h2>
              <p>Add students to start messaging.</p>
              <div className="dash-state-actions"><Link href="/students/new" className="dash-btn is-primary">Add a student</Link></div>
            </div>
          ) : shown.length === 0 ? (
            <p className="dash-card-b" style={{ color: 'var(--d-ink-3)' }}>No student matches.</p>
          ) : shown.map(c => {
            const unread = c.id === activeId ? 0 : c.unread
            const initials = c.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            return (
              <Link key={c.id} href={`/messages/${c.id}`} className="msg-row" aria-current={c.id === activeId ? 'page' : undefined}>
                <span className="dash-avatar" aria-hidden="true">{initials}</span>
                <span className="msg-body">
                  <b>{c.name}</b>
                  <small className={unread > 0 ? 'is-unread' : ''}>{c.latest ? `${c.latest.fromTutor ? 'You: ' : ''}${c.latest.content}` : 'No messages yet'}</small>
                </span>
                <span style={{ textAlign: 'right' }}>
                  {c.latest && <span className="msg-time">{new Date(c.latest.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                  {unread > 0 && <span className="dash-count" style={{ position: 'static', display: 'block', marginTop: 4, marginLeft: 'auto', width: 'max-content' }}>{unread > 9 ? '9+' : unread}</span>}
                </span>
              </Link>
            )
          })}
        </div>
      </aside>
      <div className="msg-main">{children}</div>
    </div>
  )
}
