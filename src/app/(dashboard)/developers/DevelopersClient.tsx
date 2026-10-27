'use client'

// API & Webhooks (T-0826): your keys as a table, the API in a short reference, the webhook events. A key is shown once when it is made.
// Keys are made, listed and revoked through /api/keys (Pro, the tutor's own); nothing here reads another tutor's keys.
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Check, CircleAlert, Code2, Copy, Key, Plus, Trash2, Webhook } from 'lucide-react'
import { StatRow } from '@/components/lists/StatRow'

interface ApiKey { id: string; name: string; key_prefix: string; last_used_at: string | null; created_at: string }

const EVENTS = ['student.created', 'lesson.created', 'lesson.completed', 'payment.received']
const ROUTES: [string, string, string][] = [
  ['GET', '/me', 'Your tutor profile (a test that your key works)'], ['GET', '/students', 'List students'], ['POST', '/students', 'Create a student'],
  ['GET', '/lessons', 'List lessons (?status=)'], ['GET', '/webhooks', 'List webhook subscriptions'], ['POST', '/webhooks', 'Subscribe to an event'], ['DELETE', '/webhooks/:id', 'Unsubscribe'],
]
const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export function DevelopersClient({ apiBase }: { apiBase: string }) {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [creating, setCreating] = useState(false)
  const [freshKey, setFreshKey] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  async function load() {
    try {
      const res = await fetch('/api/keys')
      if (!res.ok) throw new Error('load')
      setKeys((await res.json()).keys ?? [])
    } catch { setFailed(true) } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, []) // eslint-disable-line react-hooks/set-state-in-effect -- load once on arrival; the state is set when the answer comes back

  async function createKey() {
    setCreating(true)
    try {
      const res = await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'API key' }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error ?? 'Could not create the key'); return }
      setFreshKey(data.key)
      setKeys(prev => [{ id: data.id, name: data.name, key_prefix: data.key_prefix, last_used_at: null, created_at: data.created_at }, ...prev])
      toast.success('API key created. Copy it now: it is not shown again.')
    } catch { toast.error('Network error') } finally { setCreating(false) }
  }

  async function revoke(k: ApiKey) {
    if (!window.confirm(`Revoke the key starting ${k.key_prefix}? Anything using it stops working.`)) return
    const res = await fetch(`/api/keys/${k.id}`, { method: 'DELETE' })
    if (res.ok) { setKeys(prev => prev.filter(x => x.id !== k.id)); toast.success('Key revoked') } else toast.error('Could not revoke the key')
  }

  function copy(text: string, tag: string) {
    void navigator.clipboard.writeText(text).then(() => { setCopied(tag); setTimeout(() => setCopied(null), 1800) }).catch(() => toast.error('Could not copy'))
  }

  const used = keys.filter(k => k.last_used_at).length
  return (
    <div>
      <div className="dash-head">
        <div><h1>API and webhooks <span className="dash-chip is-brand-chip" style={{ verticalAlign: 'middle', marginLeft: 6 }}>Pro</span></h1><p>Connect Tutafy to Zapier and your own tools.</p></div>
        <div className="dash-head-actions"><button type="button" className="dash-btn is-primary" onClick={createKey} disabled={creating}><Plus className="h-4 w-4" aria-hidden="true" /> Generate key</button></div>
      </div>

      {failed && <div className="dash-card dash-card-b" role="alert" data-testid="keys-error" style={{ marginBottom: 16, display: 'flex', gap: 8, color: 'var(--d-err)', background: 'var(--d-err-soft)' }}><CircleAlert className="h-5 w-5" aria-hidden="true" />We could not load your keys. Reload the page; nothing was changed.</div>}

      <StatRow stats={[
        { id: 'keys', label: 'API keys', value: String(keys.length) },
        { id: 'used', label: 'Keys used', value: String(used), foot: keys.length - used > 0 ? `${keys.length - used} never used` : undefined },
        { id: 'events', label: 'Webhook events', value: String(EVENTS.length) },
      ]} />

      {freshKey && (
        <div className="dash-card dash-card-b" role="status" data-testid="fresh-key" style={{ marginBottom: 16, background: 'var(--d-ok-soft)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--d-ink)' }}><AlertTriangle className="h-4 w-4" aria-hidden="true" style={{ color: 'var(--d-ok)' }} /><b>Copy your new API key now</b></div>
          <p style={{ margin: '6px 0 12px', color: 'var(--d-ink-2)' }}>For your security this key is shown only once. Keep it somewhere safe.</p>
          <div className="dash-input" style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 'none', height: 'auto', padding: '8px 12px' }}>
            <code style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere', fontSize: 13 }}>{freshKey}</code>
            <button type="button" className="dash-btn" onClick={() => copy(freshKey, 'fresh')}>{copied === 'fresh' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />} {copied === 'fresh' ? 'Copied' : 'Copy'}</button>
          </div>
          <button type="button" className="dash-btn is-ghost" style={{ marginTop: 8 }} onClick={() => setFreshKey(null)}>I saved it, hide this</button>
        </div>
      )}

      <section className="dash-card" aria-labelledby="keys-h" style={{ marginBottom: 16 }}>
        <div className="dash-card-h"><h2 id="keys-h"><Key className="h-4 w-4" aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />API keys</h2></div>
        {loading ? <div role="status" className="dash-sk" style={{ height: 80, margin: 20 }}><span className="sr-only">Loading your keys</span></div> : keys.length === 0 ? (
          <div className="dash-state" data-testid="keys-empty"><h2>No API keys yet</h2><p>Generate one to start using the API.</p></div>
        ) : (
          <div className="dash-table-wrap overflow-x-auto" style={{ paddingTop: 12 }}>
            <table className="dash-table is-cards no-sel">
              <thead><tr><th>Key</th><th>Last used</th><th>Created</th><th><span className="sr-only">Revoke</span></th></tr></thead>
              <tbody>
                {keys.map(k => (
                  <tr key={k.id}>
                    <td className="c-main"><code style={{ fontSize: 13 }}>{k.key_prefix}...</code><div style={{ color: 'var(--d-ink-3)', fontSize: 13 }}>{k.name}</div></td>
                    <td className="c-sub">{k.last_used_at ? `Last used ${day(k.last_used_at)}` : 'Never used'}</td>
                    <td className="c-hide">{day(k.created_at)}</td>
                    <td className="is-num c-end"><button type="button" className="dash-icon-btn" style={{ display: 'inline-grid' }} onClick={() => revoke(k)} aria-label={`Revoke the key starting ${k.key_prefix}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="set-two">
        <section className="dash-card dash-card-b" aria-labelledby="api-h">
          <h2 id="api-h" style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 650, color: 'var(--d-ink)' }}><Code2 className="h-4 w-4" aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />REST API</h2>
          <div className="dash-input" style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 'none', height: 'auto', padding: '8px 12px' }}>
            <b style={{ fontSize: 12, color: 'var(--d-ink-3)' }}>BASE URL</b><code style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere', fontSize: 13 }}>{apiBase}</code>
            <button type="button" className="dash-icon-btn" onClick={() => copy(apiBase, 'base')} aria-label="Copy the base URL">{copied === 'base' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}</button>
          </div>
          <p style={{ margin: '12px 0 6px', color: 'var(--d-ink-2)' }}>Send your key with every request:</p>
          <pre className="dev-code">{`Authorization: Bearer tk_your_api_key`}</pre>
          <ul style={{ listStyle: 'none', margin: '12px 0', padding: 0, display: 'grid', gap: 6 }}>
            {ROUTES.map(([m, path, desc]) => (
              <li key={m + path} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <code style={{ width: 64, fontWeight: 700, color: m === 'GET' ? 'var(--d-ok)' : m === 'POST' ? 'var(--d-brand)' : 'var(--d-err)' }}>{m}</code>
                <code style={{ color: 'var(--d-ink)' }}>{path}</code><span style={{ color: 'var(--d-ink-3)' }}>{desc}</span>
              </li>
            ))}
          </ul>
          <pre className="dev-code">{`curl ${apiBase}/students \\\n  -H "Authorization: Bearer tk_your_api_key"`}</pre>
        </section>
        <section className="dash-card dash-card-b" aria-labelledby="hooks-h">
          <h2 id="hooks-h" style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 650, color: 'var(--d-ink)' }}><Webhook className="h-4 w-4" aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />Webhooks</h2>
          <p style={{ margin: '0 0 12px', color: 'var(--d-ink-2)' }}>Subscribe a URL to an event and Tutafy posts a JSON message there whenever it happens. It works for a Zapier Catch Hook or your own tools.</p>
          <div className="set-pills" style={{ marginBottom: 12 }}>{EVENTS.map(e => <code key={e} className="dash-chip is-brand-chip">{e}</code>)}</div>
          <pre className="dev-code">{`curl -X POST ${apiBase}/webhooks \\\n  -H "Authorization: Bearer tk_your_api_key" \\\n  -H "Content-Type: application/json" \\\n  -d '{"event":"student.created","target_url":"https://hooks.zapier.com/..."}'`}</pre>
        </section>
      </div>
    </div>
  )
}
