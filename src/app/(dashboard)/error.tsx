'use client'

// Shown when a tutor page fails while it is drawn (T-0820): what failed, that nothing was changed, a retry.
// The wording is from docs/dashboard-redesign/states.html. The error text itself is never shown (it can name a table or a key);
// only the short reference Next.js gives (digest) is, so the owner can find the failure in the logs.
import Link from 'next/link'
import { CircleAlert, RotateCw } from 'lucide-react'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="dash-card dash-state" role="alert" data-testid="page-error">
      <div className="dash-state-ico"><CircleAlert className="h-6 w-6" aria-hidden="true" /></div>
      <h2>We could not load this page</h2>
      <p>Nothing was changed. Check your connection and try again. If it keeps failing, tell us and we will look.</p>
      <div className="dash-state-actions">
        <button type="button" className="dash-btn is-primary" onClick={reset}><RotateCw className="h-4 w-4" aria-hidden="true" /> Try again</button>
        <Link href="/contact" className="dash-btn">Contact support</Link>
      </div>
      {error.digest && <code>Reference {error.digest}</code>}
    </div>
  )
}
