'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function WaitlistActions({ entryId, name }: { entryId: string; name: string }) {
  const [deleted, setDeleted] = useState(false)
  const [busy, setBusy] = useState(false)

  async function remove() {
    setBusy(true)
    try {
      const res = await fetch('/api/waitlist', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: entryId }) })
      if (res.ok) setDeleted(true); else toast.error('Could not remove this person')
    } finally { setBusy(false) }
  }

  if (deleted) return <span style={{ color: 'var(--d-ink-3)' }}>Removed</span>
  return (
    <button type="button" className="dash-icon-btn" style={{ display: 'inline-grid' }} onClick={remove} disabled={busy} aria-label={`Remove ${name} from the waitlist`}>
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  )
}
