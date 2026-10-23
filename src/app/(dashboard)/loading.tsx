// Shown while a tutor page loads (T-0820). The shell stays; only the content shows its own shape,
// as in docs/dashboard-redesign/states.html. It is plain markup, so it adds nothing to the page's own weight.
export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" data-testid="page-loading">
      <span className="sr-only">Loading the page</span>
      <div className="dash-sk" style={{ height: 28, width: 220 }} />
      <div className="dash-sk" style={{ height: 14, width: 320, marginTop: 10, maxWidth: '100%' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 24 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="dash-card" style={{ padding: '16px 20px' }}>
            <div className="dash-sk" style={{ height: 14, width: '40%' }} />
            <div className="dash-sk" style={{ height: 30, width: '60%', marginTop: 12 }} />
          </div>
        ))}
      </div>
      <div className="dash-card" style={{ padding: 20, marginTop: 16 }}>
        <div className="dash-sk" style={{ height: 14, width: '28%' }} />
        {[0, 1, 2, 3, 4].map(i => <div key={i} className="dash-sk" style={{ height: 40, marginTop: 14 }} />)}
      </div>
    </div>
  )
}
