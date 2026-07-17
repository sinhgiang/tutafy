'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Key, Plus, Trash2, Copy, Check, Loader2, Webhook, Code2, AlertTriangle } from 'lucide-react'

interface ApiKey { id: string; name: string; key_prefix: string; last_used_at: string | null; created_at: string }

const EVENTS = ['student.created', 'lesson.created', 'lesson.completed', 'payment.received']

export function DevelopersClient({ apiBase }: { apiBase: string }) {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [freshKey, setFreshKey] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { load() }, [])
  async function load() {
    try {
      const res = await fetch('/api/keys')
      const data = await res.json()
      setKeys(data.keys ?? [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function createKey() {
    setCreating(true)
    try {
      const res = await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'API key' }) })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to create key'); return }
      setFreshKey(data.key)
      setKeys(prev => [{ id: data.id, name: data.name, key_prefix: data.key_prefix, last_used_at: null, created_at: data.created_at }, ...prev])
      toast.success('API key created — copy it now, it won\'t be shown again')
    } catch { toast.error('Network error') } finally { setCreating(false) }
  }

  async function revoke(id: string) {
    setKeys(prev => prev.filter(k => k.id !== id))
    try { await fetch(`/api/keys/${id}`, { method: 'DELETE' }) } catch { /* ignore */ }
    toast.success('Key revoked')
  }

  function copy(text: string, tag: string) {
    navigator.clipboard.writeText(text)
    setCopied(tag); setTimeout(() => setCopied(null), 1800)
  }

  return (
    <div className="max-w-[820px] space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Developers · API & Webhooks</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Connect Tutafy to Zapier and your own tools with a REST API and webhooks.</p>
      </div>

      {/* Fresh key banner */}
      {freshKey && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-emerald-600" />
            <p className="text-[13px] font-bold text-emerald-800">Copy your new API key now</p>
          </div>
          <p className="text-[12px] text-emerald-700 mb-3">For security this key is shown only once. Store it somewhere safe.</p>
          <div className="flex items-center gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-2">
            <code className="flex-1 text-[12px] text-gray-800 break-all font-mono">{freshKey}</code>
            <button onClick={() => copy(freshKey, 'fresh')} className="flex items-center gap-1 text-[12px] font-semibold text-emerald-600 hover:text-emerald-800">
              {copied === 'fresh' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === 'fresh' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button onClick={() => setFreshKey(null)} className="text-[12px] text-emerald-600 hover:text-emerald-800 mt-2">I've saved it — dismiss</button>
        </div>
      )}

      {/* API keys */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-gray-400" />
            <h2 className="text-[13px] font-semibold text-gray-900">API Keys</h2>
          </div>
          <button onClick={createKey} disabled={creating}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors">
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Generate key
          </button>
        </div>
        {loading ? (
          <div className="px-5 py-8 text-center"><Loader2 className="h-5 w-5 text-gray-300 animate-spin mx-auto" /></div>
        ) : keys.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-gray-400">No API keys yet. Generate one to start using the API.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {keys.map(k => (
              <div key={k.id} className="flex items-center gap-3 px-5 py-3.5">
                <code className="text-[12px] font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">{k.key_prefix}…</code>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-900">{k.name}</p>
                  <p className="text-[11px] text-gray-400">
                    {k.last_used_at ? `Last used ${new Date(k.last_used_at).toLocaleDateString('en-US')}` : 'Never used'}
                    <span className="mx-1.5">·</span>
                    Created {new Date(k.created_at).toLocaleDateString('en-US')}
                  </p>
                </div>
                <button onClick={() => revoke(k.id)} className="text-gray-300 hover:text-red-500 transition-colors" title="Revoke">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API reference */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-indigo-500" />
          <h2 className="text-[13px] font-semibold text-gray-900">REST API</h2>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Base URL</span>
          <code className="flex-1 text-[12px] font-mono text-gray-800">{apiBase}</code>
          <button onClick={() => copy(apiBase, 'base')} className="text-gray-400 hover:text-gray-700">
            {copied === 'base' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
        <p className="text-[12px] text-gray-500">Authenticate every request with your key:</p>
        <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-[11px] font-mono overflow-x-auto">{`Authorization: Bearer tk_your_api_key`}</pre>
        <div className="space-y-1.5">
          {[
            ['GET', '/me', 'Your tutor profile (auth test)'],
            ['GET', '/students', 'List students'],
            ['POST', '/students', 'Create a student'],
            ['GET', '/lessons', 'List lessons (?status=…)'],
            ['GET', '/webhooks', 'List webhook subscriptions'],
            ['POST', '/webhooks', 'Subscribe to an event'],
            ['DELETE', '/webhooks/:id', 'Unsubscribe'],
          ].map(([m, path, desc]) => (
            <div key={path + m} className="flex items-center gap-3 text-[12px]">
              <span className={`font-mono font-bold w-14 ${m === 'GET' ? 'text-emerald-600' : m === 'POST' ? 'text-indigo-600' : 'text-red-500'}`}>{m}</span>
              <code className="font-mono text-gray-700 w-40">{path}</code>
              <span className="text-gray-400">{desc}</span>
            </div>
          ))}
        </div>
        <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-[11px] font-mono overflow-x-auto">{`curl ${apiBase}/students \\
  -H "Authorization: Bearer tk_your_api_key"`}</pre>
      </div>

      {/* Webhooks */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-violet-500" />
          <h2 className="text-[13px] font-semibold text-gray-900">Webhooks (for Zapier triggers)</h2>
        </div>
        <p className="text-[12px] text-gray-500 leading-relaxed">
          Subscribe a URL to an event and Tutafy will POST a JSON payload there whenever it happens.
          Perfect for Zapier &quot;Catch Hook&quot; triggers or your own automations.
        </p>
        <div className="flex flex-wrap gap-2">
          {EVENTS.map(e => (
            <code key={e} className="text-[11px] font-mono bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full">{e}</code>
          ))}
        </div>
        <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-[11px] font-mono overflow-x-auto">{`curl -X POST ${apiBase}/webhooks \\
  -H "Authorization: Bearer tk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"event":"student.created","target_url":"https://hooks.zapier.com/..."}'`}</pre>
      </div>
    </div>
  )
}
