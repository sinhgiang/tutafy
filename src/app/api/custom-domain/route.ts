import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasPlan } from '@/lib/plans'

// Self-serve custom domains for a tutor's booking page.
//  - POST { domain }  → save it, register it on the Vercel project, return DNS to set
//  - GET              → current domain + live verification status
//  - DELETE           → remove it from Vercel + clear it
//
// Needs (owner adds in Vercel env): VERCEL_TOKEN, VERCEL_PROJECT_ID, optional
// VERCEL_TEAM_ID. Without them we still save the domain (so the proxy routes it)
// and return the correct manual DNS instructions.

const VERCEL_API = 'https://api.vercel.com'
const APEX_IP = '76.76.21.21'
const CNAME_TARGET = 'cname.vercel-dns.com'

function vercelConfigured() {
  return !!(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID)
}

function teamQuery() {
  const t = process.env.VERCEL_TEAM_ID?.trim()
  return t ? `?teamId=${t}` : ''
}
function withTeam(path: string) {
  const t = process.env.VERCEL_TEAM_ID?.trim()
  if (!t) return path
  return path + (path.includes('?') ? '&' : '?') + `teamId=${t}`
}

async function vercel(path: string, init?: RequestInit) {
  return fetch(`${VERCEL_API}${withTeam(path)}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })
}

// Normalise what the user typed into a bare hostname.
function cleanDomain(input: string): string {
  return (input ?? '')
    .trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\s+/g, '')
    .replace(/\.$/, '')
}

// Rough apex detection for the no-token fallback (Vercel tells us for real).
function isApexHeuristic(domain: string): boolean {
  return domain.split('.').filter(Boolean).length <= 2
}

type DnsRecord = { type: string; name: string; value: string }

function buildRecords(domain: string, apexName: string, verification: any[]): DnsRecord[] {
  const isApex = domain === apexName
  const records: DnsRecord[] = isApex
    ? [{ type: 'A', name: '@', value: APEX_IP }]
    : [{ type: 'CNAME', name: domain.slice(0, Math.max(0, domain.length - apexName.length - 1)) || domain, value: CNAME_TARGET }]
  for (const v of verification ?? []) {
    if (v?.type === 'TXT' && v?.domain && v?.value) {
      records.push({ type: 'TXT', name: v.domain, value: v.value })
    }
  }
  return records
}

async function statusFor(domain: string) {
  const pid = process.env.VERCEL_PROJECT_ID
  let verified = false
  let misconfigured = true
  let apexName = isApexHeuristic(domain) ? domain : domain.split('.').slice(-2).join('.')
  let verification: any[] = []

  try {
    const r = await vercel(`/v9/projects/${pid}/domains/${domain}`)
    if (r.ok) {
      const d = await r.json()
      verified = !!d.verified
      apexName = d.apexName ?? apexName
      verification = d.verification ?? []
    }
  } catch { /* ignore */ }

  try {
    const c = await vercel(`/v6/domains/${domain}/config`)
    if (c.ok) {
      const cfg = await c.json()
      misconfigured = !!cfg.misconfigured
    }
  } catch { /* ignore */ }

  const status = verified && !misconfigured ? 'active' : 'pending'
  return { status, verified, misconfigured, records: buildRecords(domain, apexName, verification) }
}

async function requireProUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  const { data: tutor } = await supabase.from('tutors').select('subscription_status, custom_domain').eq('id', user.id).single()
  if (!hasPlan(tutor?.subscription_status, 'pro')) {
    return { error: NextResponse.json({ error: 'upgrade_required' }, { status: 403 }) }
  }
  return { supabase, userId: user.id, current: (tutor as any)?.custom_domain as string | null }
}

export async function GET() {
  const ctx = await requireProUser()
  if ('error' in ctx) return ctx.error
  const domain = ctx.current
  if (!domain) return NextResponse.json({ domain: null, configured: vercelConfigured() })
  if (!vercelConfigured()) {
    const apex = isApexHeuristic(domain) ? domain : domain.split('.').slice(-2).join('.')
    return NextResponse.json({ domain, configured: false, status: 'pending', records: buildRecords(domain, apex, []) })
  }
  const st = await statusFor(domain)
  return NextResponse.json({ domain, configured: true, ...st })
}

export async function POST(req: NextRequest) {
  const ctx = await requireProUser()
  if ('error' in ctx) return ctx.error

  const body = await req.json().catch(() => ({}))
  const domain = cleanDomain(body.domain ?? '')
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return NextResponse.json({ error: 'invalid_domain' }, { status: 400 })
  }

  // Save it so the proxy can route requests hitting this hostname.
  await ctx.supabase.from('tutors').update({ custom_domain: domain }).eq('id', ctx.userId)

  if (!vercelConfigured()) {
    const apex = isApexHeuristic(domain) ? domain : domain.split('.').slice(-2).join('.')
    return NextResponse.json({
      domain, configured: false, status: 'pending',
      records: buildRecords(domain, apex, []),
      note: 'Domain saved. Ask the Tutafy team to finish the one-time Vercel setup so SSL is issued automatically.',
    })
  }

  // Register the domain on the Vercel project (idempotent — 409 = already added).
  try {
    const add = await vercel(`/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains`, {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    })
    if (!add.ok && add.status !== 409) {
      const detail = await add.json().catch(() => ({}))
      // 403/409-on-another-project → domain owned elsewhere; surface a clear message.
      return NextResponse.json({
        domain, configured: true, status: 'pending', error: 'vercel_add_failed',
        code: detail?.error?.code ?? add.status,
        message: detail?.error?.message ?? 'Could not add the domain on Vercel.',
        records: (await statusFor(domain)).records,
      }, { status: 200 })
    }
  } catch {
    return NextResponse.json({ error: 'vercel_unreachable' }, { status: 502 })
  }

  const st = await statusFor(domain)
  return NextResponse.json({ domain, configured: true, ...st })
}

export async function DELETE() {
  const ctx = await requireProUser()
  if ('error' in ctx) return ctx.error
  const domain = ctx.current

  if (domain && vercelConfigured()) {
    try { await vercel(`/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}`, { method: 'DELETE' }) } catch { /* ignore */ }
  }
  await ctx.supabase.from('tutors').update({ custom_domain: null }).eq('id', ctx.userId)
  return NextResponse.json({ ok: true })
}
