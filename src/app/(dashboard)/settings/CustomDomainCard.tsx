'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ExternalLink, Loader2, CheckCircle, Copy, Check, RefreshCw, Trash2, Globe } from 'lucide-react'

type DnsRecord = { type: string; name: string; value: string }
type State = {
  domain: string | null
  configured?: boolean
  status?: 'active' | 'pending'
  records?: DnsRecord[]
  note?: string
  message?: string
}

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) }}
      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
      title="Copy"
    >
      {done ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

export function CustomDomainCard() {
  const [state, setState] = useState<State>({ domain: null })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [upgrade, setUpgrade] = useState(false)

  async function loadStatus() {
    try {
      const res = await fetch('/api/custom-domain', { cache: 'no-store' })
      if (res.status === 403) { setUpgrade(true); setLoading(false); return }
      const data = await res.json()
      setState(data)
      if (data.domain) setInput(data.domain)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { loadStatus() }, [])

  async function connect() {
    setConnecting(true)
    try {
      const res = await fetch('/api/custom-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: input }),
      })
      const data = await res.json()
      if (res.status === 403) { setUpgrade(true); return }
      if (res.status === 400) { toast.error('That doesn\'t look like a valid domain. Enter something like yourdomain.com'); return }
      if (data.error === 'vercel_unreachable') { toast.error('Vercel is unreachable. Try again in a moment.'); return }
      setState(data)
      if (data.message) toast.error(data.message)
      else toast.success('Domain saved. Now add the DNS records below.')
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
    setConnecting(false)
  }

  async function refresh() {
    setChecking(true)
    await loadStatus()
    setChecking(false)
    // small feedback
    setState(s => {
      if (s.status === 'active') toast.success('Your domain is live! 🎉')
      else toast.message('Still waiting for DNS to propagate — this can take up to 30 minutes.')
      return s
    })
  }

  async function remove() {
    setConnecting(true)
    try {
      await fetch('/api/custom-domain', { method: 'DELETE' })
      setState({ domain: null })
      setInput('')
      toast.success('Custom domain removed.')
    } catch { /* ignore */ }
    setConnecting(false)
  }

  const active = state.status === 'active'
  const connected = !!state.domain

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        <ExternalLink className="h-4 w-4 text-gray-400" />
        <p className="text-[13px] font-semibold text-gray-900">Custom Domain</p>
        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full ml-auto">PRO</span>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-[12px] text-gray-500 leading-relaxed">
          Use your own domain for your booking page (e.g. <span className="font-mono">booking.yourbrand.com</span>).
          Students go to your URL instead of tutafy.com — it looks fully like your own brand.
        </p>

        {upgrade ? (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-center">
            <p className="text-[13px] font-semibold text-indigo-900">Custom domain is a Pro feature</p>
            <p className="text-[12px] text-indigo-600 mt-1 mb-3">Upgrade to connect your own domain to your booking page.</p>
            <a href="/upgrade" className="inline-block text-[12px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-lg transition-colors">Upgrade to Pro</a>
          </div>
        ) : loading ? (
          <div className="flex items-center gap-2 text-gray-400 text-[12px]"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (
          <>
            {/* Domain input + connect */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Your domain</label>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="booking.yourdomain.com"
                  className="flex-1 text-[13px] px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
                />
                <button
                  onClick={connect}
                  disabled={connecting || !input.trim()}
                  className="text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 flex-shrink-0"
                >
                  {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {connected ? 'Update' : 'Connect'}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                Tip: a subdomain like <span className="font-mono">booking.yourdomain.com</span> is easiest.
                You can also use the root <span className="font-mono">yourdomain.com</span>.
              </p>
            </div>

            {connected && (
              <>
                {/* Status */}
                <div className={`flex items-center justify-between rounded-lg px-3 py-2.5 border ${active ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                  <div className="flex items-center gap-2">
                    {active
                      ? <CheckCircle className="h-4 w-4 text-emerald-500" />
                      : <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                    <div>
                      <p className={`text-[13px] font-semibold ${active ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {active ? 'Live & secured (SSL)' : 'Waiting for DNS'}
                      </p>
                      <p className={`text-[11px] ${active ? 'text-emerald-600' : 'text-amber-600'} font-mono`}>{state.domain}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={refresh} disabled={checking}
                      className="flex items-center gap-1 text-[11px] font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50">
                      <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} /> Check
                    </button>
                    <button onClick={remove} disabled={connecting}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors" title="Remove domain">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {state.configured === false && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-[11px] text-blue-700">
                    {state.note ?? 'Domain saved. A one-time Vercel setup is needed to issue SSL automatically.'}
                  </div>
                )}

                {/* DNS instructions */}
                {!active && state.records && state.records.length > 0 && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[12px] font-semibold text-gray-800">How to connect it (one time, ~5 min)</p>
                      <ol className="mt-2 space-y-1.5 text-[12px] text-gray-600">
                        <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 font-bold text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5">1</span> Log in to the site where you bought the domain (GoDaddy, Namecheap, Porkbun, Cloudflare, Hostinger…).</li>
                        <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 font-bold text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5">2</span> Open <strong>DNS settings</strong> (sometimes called “DNS records” or “Manage DNS”).</li>
                        <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 font-bold text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5">3</span> Add the record(s) below exactly as shown.</li>
                        <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 font-bold text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5">4</span> Save, wait 5–30 minutes, then click <strong>Check</strong> above. It turns green when live.</li>
                      </ol>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-[64px_1fr_1fr] bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2">
                        <span>Type</span><span>Name / Host</span><span>Value</span>
                      </div>
                      {state.records.map((r, i) => (
                        <div key={i} className="grid grid-cols-[64px_1fr_1fr] items-center px-3 py-2.5 border-t border-gray-100 text-[12px]">
                          <span className="font-bold text-gray-700">{r.type}</span>
                          <span className="flex items-center gap-1 min-w-0"><span className="font-mono text-gray-700 truncate">{r.name}</span><CopyBtn text={r.name} /></span>
                          <span className="flex items-center gap-1 min-w-0"><span className="font-mono text-gray-700 truncate">{r.value}</span><CopyBtn text={r.value} /></span>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Notes: for the root domain (e.g. <span className="font-mono">yourdomain.com</span>) the “Name / Host” is
                      usually <span className="font-mono">@</span>. For a subdomain, use just the prefix (e.g. <span className="font-mono">booking</span>).
                      Leave TTL as “Automatic”. SSL is issued automatically once DNS is correct — you don't do anything for HTTPS.
                    </p>
                  </div>
                )}

                {active && (
                  <a href={`https://${state.domain}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700">
                    <Globe className="h-3.5 w-3.5" /> Open your booking page
                  </a>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
