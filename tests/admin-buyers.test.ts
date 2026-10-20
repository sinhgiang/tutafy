// Admin Buyers page: who may open it, and that it lists exactly the paying rows
// of the tutors table. Supabase, next/navigation and @supabase/ssr are faked.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

// ---- fakes -----------------------------------------------------------------

let currentUser: { id: string; email: string } | null = null
const redirects: string[] = []

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: {
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }),
  },
})
mock.module('next/navigation', {
  exports: {
    redirect: (to: string) => {
      redirects.push(to)
      throw new Error(`NEXT_REDIRECT:${to}`)
    },
  },
})
mock.module('@supabase/ssr', {
  exports: {
    createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }),
  },
})

const { ADMIN_EMAIL, isAdminEmail, adminGateTarget } = await import('@/lib/admin.ts')
const { requireAdminPage } = await import('@/lib/admin-guard.ts')
const { loadBuyers, BUYERS_LIST_LIMIT } = await import('@/lib/buyers-data.ts')
const buyersLib = await import('@/lib/buyers.ts')
const { proxy } = await import('@/proxy.ts')
const { NextRequest } = await import('next/server.js')

beforeEach(() => {
  currentUser = null
  redirects.length = 0
})

const TUTOR = { id: 'u-1', email: 'ten@example.com' }
const ADMIN = { id: 'u-0', email: ADMIN_EMAIL }

// ---- the gate --------------------------------------------------------------

test('adminGateTarget: only the admin account gets through', () => {
  assert.equal(adminGateTarget(null), '/login')
  assert.equal(adminGateTarget(undefined), '/login')
  assert.equal(adminGateTarget(TUTOR), '/dashboard')
  assert.equal(adminGateTarget({ email: null }), '/dashboard')
  assert.equal(adminGateTarget({}), '/dashboard')
  assert.equal(adminGateTarget(ADMIN), null)
})

test('isAdminEmail: exact match only (no case or suffix tricks)', () => {
  assert.equal(isAdminEmail(ADMIN_EMAIL), true)
  assert.equal(isAdminEmail(ADMIN_EMAIL.toUpperCase()), false)
  assert.equal(isAdminEmail(`x${ADMIN_EMAIL}`), false)
  assert.equal(isAdminEmail(`${ADMIN_EMAIL}.evil.example`), false)
  assert.equal(isAdminEmail(''), false)
  assert.equal(isAdminEmail(null), false)
})

test('requireAdminPage: a non-admin tutor is sent to the dashboard', async () => {
  currentUser = TUTOR
  await assert.rejects(requireAdminPage(), /NEXT_REDIRECT:\/dashboard/)
  assert.deepEqual(redirects, ['/dashboard'])
})

test('requireAdminPage: a signed-out visitor is sent to login', async () => {
  await assert.rejects(requireAdminPage(), /NEXT_REDIRECT:\/login/)
})

test('requireAdminPage: the admin passes without a redirect', async () => {
  currentUser = ADMIN
  await requireAdminPage()
  assert.deepEqual(redirects, [])
})

async function callProxy(user: typeof currentUser, pathname: string) {
  currentUser = user
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.invalid'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-for-tests'
  const req = new NextRequest(`http://localhost:3000${pathname}`, { headers: { host: 'localhost:3000' } })
  const res = await proxy(req)
  return { status: res.status, location: res.headers.get('location') }
}

test('proxy: a non-admin tutor opening /admin/buyers is redirected to the dashboard', async () => {
  const r = await callProxy(TUTOR, '/admin/buyers')
  assert.equal(r.status, 307)
  assert.equal(new URL(r.location!).pathname, '/dashboard')
})

test('proxy: a signed-out visitor opening /admin/buyers is redirected to login', async () => {
  const r = await callProxy(null, '/admin/buyers')
  assert.equal(r.status, 307)
  assert.equal(new URL(r.location!).pathname, '/login')
})

test('proxy: the admin reaches /admin/buyers (no redirect)', async () => {
  const r = await callProxy(ADMIN, '/admin/buyers')
  assert.equal(r.location, null)
  assert.equal(r.status, 200)
})

// ---- structure: the pages really call the gate -----------------------------

const read = (rel: string) => readFileSync(path.join(SRC, rel), 'utf8')

test('the admin layout and the Buyers page both run the admin check themselves', () => {
  assert.match(read('app/(admin)/layout.tsx'), /await requireAdminPage\(\)/)
  const page = read('app/(admin)/admin/buyers/page.tsx')
  const gate = page.indexOf('await requireAdminPage()')
  const query = page.indexOf('createAdminClient()')
  assert.ok(gate > 0 && query > 0 && gate < query, 'the check must come before the service-role client is created')
})

test('the admin sidebar links to Buyers, and the Tutors page shows a Plan column', () => {
  assert.match(read('components/admin/AdminSidebar.tsx'), /href: '\/admin\/buyers', label: 'Buyers'/)
  const tutors = read('app/(admin)/admin/tutors/page.tsx')
  assert.match(tutors, />Plan<\/th>/)
  assert.match(tutors, /subscription_status/)
})

// ---- the data: exactly the paying rows of the tutors table -----------------

type Row = Record<string, unknown>
const TUTORS: Row[] = [
  { id: 'a', name: 'Ann', email: 'ann@example.com', created_at: '2026-10-01T00:00:00Z', subscription_status: 'pro', timezone: 'Asia/Ho_Chi_Minh', students: [{ count: 4 }], lessons: [{ count: 9 }] },
  { id: 'b', name: 'Ben', email: 'ben@example.com', created_at: '2026-10-15T00:00:00Z', subscription_status: 'academy', timezone: null, students: [{ count: 0 }], lessons: [{ count: 0 }] },
  { id: 'c', name: 'Cy', email: 'cy@example.com', created_at: '2026-10-10T00:00:00Z', subscription_status: 'free', timezone: 'UTC', students: [{ count: 1 }], lessons: [{ count: 1 }] },
  { id: 'd', name: 'Di', email: 'di@example.com', created_at: '2026-10-12T00:00:00Z', subscription_status: 'pro', timezone: 'Europe/Paris', students: [{ count: 2 }], lessons: [{ count: 3 }] },
  { id: 'e', name: 'Ed', email: 'ed@example.com', created_at: '2026-10-02T00:00:00Z', subscription_status: null, timezone: 'UTC', students: [], lessons: [] },
]

/** In-memory stand-in for supabase.from('tutors'): honours select(head count), eq, in, order, limit. */
function fakeAdmin(rows: Row[], selects: string[] = []) {
  return {
    from(table: string) {
      assert.equal(table, 'tutors')
      let result = [...rows]
      let head = false
      const q = {
        select(cols: string, opts?: { head?: boolean }) { selects.push(cols); head = !!opts?.head; return q },
        eq(col: string, v: unknown) { result = result.filter(r => r[col] === v); return q },
        in(col: string, vs: unknown[]) { result = result.filter(r => vs.includes(r[col])); return q },
        order(col: string, o: { ascending: boolean }) {
          result.sort((x, y) => String(x[col]).localeCompare(String(y[col])) * (o.ascending ? 1 : -1))
          return q
        },
        limit(n: number) { result = result.slice(0, n); return q },
        then(resolve: (v: unknown) => unknown) {
          resolve(head ? { count: result.length, data: null } : { data: result, count: null })
        },
      }
      return q
    },
  }
}

test('loadBuyers: counts and list match the tutors table (Pro and Academy only, newest first)', async () => {
  const selects: string[] = []
  const r = await loadBuyers(fakeAdmin(TUTORS, selects))
  assert.equal(r.pro, 2)
  assert.equal(r.academy, 1)
  assert.equal(r.total, 3)
  assert.deepEqual(r.buyers.map(b => b.id), ['b', 'd', 'a'])
  assert.ok(r.buyers.every(b => buyersLib.isBuyerPlan(b.subscription_status)))
  // tutors has no country column (only students does); asking for one would break the live query
  assert.ok(selects.every(s => !/country/i.test(s)), selects.join(' | '))
})

test('loadBuyers: nobody has bought yet', async () => {
  const r = await loadBuyers(fakeAdmin(TUTORS.filter(t => t.subscription_status === 'free')))
  assert.deepEqual({ pro: r.pro, academy: r.academy, total: r.total, n: r.buyers.length }, { pro: 0, academy: 0, total: 0, n: 0 })
})

test('loadBuyers: the list is capped but the totals still count everyone', async () => {
  const many = Array.from({ length: BUYERS_LIST_LIMIT + 5 }, (_, i) => ({
    id: `p${i}`, name: 'P', email: 'p@example.com', created_at: new Date(2026, 0, 1 + (i % 28)).toISOString(),
    subscription_status: 'pro', timezone: null, students: [], lessons: [],
  }))
  const r = await loadBuyers(fakeAdmin(many))
  assert.equal(r.buyers.length, BUYERS_LIST_LIMIT)
  assert.equal(r.total, BUYERS_LIST_LIMIT + 5)
})

test('plan helpers: labels and badges, unknown values read as Free', () => {
  assert.equal(buyersLib.planLabel('pro'), 'Pro')
  assert.equal(buyersLib.planLabel('academy'), 'Academy')
  assert.equal(buyersLib.planLabel(null), 'Free')
  assert.equal(buyersLib.planLabel(''), 'Free')
  assert.notEqual(buyersLib.planBadgeClass('pro'), buyersLib.planBadgeClass('academy'))
  assert.equal(buyersLib.planBadgeClass('whatever'), buyersLib.planBadgeClass(null))
  assert.equal(buyersLib.isBuyerPlan('free'), false)
  assert.equal(buyersLib.isBuyerPlan(null), false)
})

// ---- a failing query must not look like "nobody has bought" ----------------

/** Like fakeAdmin, but every query answers with an error (and no rows). */
function failingAdmin(which: 'counts' | 'list' | 'all') {
  return {
    from() {
      let head = false
      const q = {
        select(_cols: string, opts?: { head?: boolean }) { head = !!opts?.head; return q },
        eq() { return q },
        in() { return q },
        order() { return q },
        limit() { return q },
        then(resolve: (v: unknown) => unknown) {
          const boom = { message: 'permission denied' }
          if (head) resolve(which === 'list' ? { count: 1, data: null } : { count: null, data: null, error: boom })
          else resolve(which === 'counts' ? { data: [], count: null } : { data: null, count: null, error: boom })
        },
      }
      return q
    },
  }
}

test('loadBuyers: an error from any query is reported, not shown as 0 / 0 / 0', async () => {
  for (const which of ['counts', 'list', 'all'] as const) {
    const r = await loadBuyers(failingAdmin(which))
    assert.equal(r.failed, true, which)
  }
})

test('loadBuyers: no error means failed is false, even when nobody has bought', async () => {
  const r = await loadBuyers(fakeAdmin([]))
  assert.equal(r.failed, false)
  assert.equal(r.total, 0)
})

test('Buyers page: shows an error line and dashes (not zeros) when the read failed', () => {
  const page = read('app/(admin)/admin/buyers/page.tsx')
  assert.match(page, /\{failed && \(/)
  assert.match(page, /data-testid="buyers-error"/)
  assert.match(page, /\{failed \? '—' : pro\}/)
  assert.match(page, /buyers\.length === 0 && !failed/)
})
