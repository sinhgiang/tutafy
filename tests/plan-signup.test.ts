// T-1052: a visitor who is not signed in presses "Go Pro" or "Start Academy" and ends on THAT plan after signing up.
// The steps: /upgrade?plan= (the proxy sends a signed-out visitor to /register?plan=), the sign-up page keeps the plan (email sign-up goes
// to onboarding with it, Google sign-up leaves it in the hand-off cookie that /auth/callback reads), onboarding ends with a button to
// the plan, and /upgrade?plan= shows the pick. The proxy and the callback run for real over an in-memory Supabase; the pages are
// rendered; the click handlers are proved in a real browser (screenshots in the hand-over). Only "pro" and "academy" are ever kept.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const TUTOR = '92000000-0000-4000-8000-000000000001'
const NEWBIE = '92000000-0000-4000-8000-000000000002'

let db: FakeDb
let signedIn: { id: string; email: string } | null = null
let search = ''
const pushed: string[] = []

mock.module('@supabase/ssr', {
  exports: {
    createServerClient: () => ({
      auth: {
        getUser: async () => ({ data: { user: signedIn } }),
        exchangeCodeForSession: async () => ({ data: { user: { id: NEWBIE, email: 'new.tutor@example.com', user_metadata: { full_name: 'New Tutor' } } }, error: null }),
      },
      from: (t: string) => db.from(t),
    }),
  },
})
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: { createAdminClient: () => db, createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: signedIn } }) } }) },
})
mock.module('next/headers', { exports: { cookies: async () => ({ getAll: () => [], get: () => undefined, set: () => {} }) } })
mock.module('next/navigation', {
  exports: {
    useRouter: () => ({ push: (to: string) => { pushed.push(to) }, replace() {}, refresh() {} }),
    useSearchParams: () => new URLSearchParams(search),
    usePathname: () => '/register',
    redirect: (to: string) => { throw new Error(`NEXT_REDIRECT ${to}`) },
    notFound: () => { throw new Error('NEXT_NOT_FOUND') },
  },
})
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/client.ts')).href, { exports: { createClient: () => ({ auth: {} }) } })

const { proxy } = await import('@/proxy.ts')
const callback = await import('@/app/auth/callback/route.ts')
const registerPage = (await import('@/app/(auth)/register/page.tsx')).default as () => React.ReactElement
const loginPage = (await import('@/app/(auth)/login/page.tsx')).default as () => React.ReactElement
const { NextRequest } = await import('next/server.js')

beforeEach(() => {
  signedIn = null
  search = ''
  pushed.length = 0
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.invalid'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-for-this-test'
  delete process.env.RESEND_API_KEY
  db = createFakeDb({ tutors: [{ id: TUTOR, name: 'Ten', email: 'ten@example.com', subscription_status: 'free' }], students: [] })
})

const go = async (pathAndQuery: string) => {
  const res = await proxy(new NextRequest(`https://www.tutafy.com${pathAndQuery}`, { headers: { host: 'www.tutafy.com' } }))
  const loc = res.headers.get('location')
  return { status: res.status, to: loc ? new URL(loc).pathname + new URL(loc).search : null }
}

// ---- the proxy ----------------------------------------------------------------------------------------------------------------

test('signed out, "Go Pro" and "Start Academy" go to SIGN-UP with the plan; a bare /upgrade still goes to sign-in', async () => {
  assert.deepEqual(await go('/upgrade?plan=pro'), { status: 307, to: '/register?plan=pro' })
  assert.deepEqual(await go('/upgrade?plan=academy'), { status: 307, to: '/register?plan=academy' })
  assert.deepEqual(await go('/upgrade'), { status: 307, to: '/login' })
})

test('signed out, only the two plan words survive: anything else in the address is dropped and nothing can steer the redirect', async () => {
  for (const q of ['?plan=PRO', '?plan=free', '?plan=pro%20', '?plan=', '?plan=%2F%2Fevil.com', '?plan=pro,academy', '?plan[]=pro', '?plan=__proto__']) {
    assert.deepEqual(await go(`/upgrade${q}`), { status: 307, to: '/login' }, q)
  }
  // other parameters are not carried over to the sign-up address
  assert.deepEqual(await go('/upgrade?plan=pro&next=//evil.com&x=1'), { status: 307, to: '/register?plan=pro' })
  // a plan in the address of another dashboard page is ignored
  assert.deepEqual(await go('/dashboard?plan=pro'), { status: 307, to: '/login' })
})

test('a signed-in tutor who opens a sign-up or sign-in link with a plan goes on to that plan; with no plan, to the dashboard as before', async () => {
  signedIn = { id: TUTOR, email: 'ten@example.com' }
  assert.deepEqual(await go('/register?plan=academy'), { status: 307, to: '/upgrade?plan=academy' })
  assert.deepEqual(await go('/login?plan=pro'), { status: 307, to: '/upgrade?plan=pro' })
  assert.deepEqual(await go('/register'), { status: 307, to: '/dashboard' })
  assert.deepEqual(await go('/register?plan=evil'), { status: 307, to: '/dashboard' })
  assert.equal((await go('/upgrade?plan=pro')).status, 200, 'a signed-in tutor opens the upgrade page itself')
})

// ---- the Google hand-off --------------------------------------------------------------------------------------------------------

const callbackWith = async (cookie: string) => {
  const res = await callback.GET(new NextRequest('https://www.tutafy.com/auth/callback?code=abc', { headers: { cookie } }) as never)
  const loc = new URL(res.headers.get('location')!)
  return loc.pathname + loc.search
}

test('Google sign-up with a plan picked: the new tutor goes through onboarding WITH the plan; a new tutor is made once', async () => {
  const dest = await callbackWith(`tutafy_oauth_role=tutor; tutafy_oauth_next=${encodeURIComponent('/upgrade?plan=pro')}`)
  assert.equal(dest, '/onboarding?signup=1&plan=pro')
  assert.equal(db.tables.tutors.filter(t => t.id === NEWBIE).length, 1)
  db.tables.tutors = db.tables.tutors.filter(t => t.id !== NEWBIE) // a different new tutor, not the one made above
  const academy = await callbackWith(`tutafy_oauth_role=tutor; tutafy_oauth_next=${encodeURIComponent('/upgrade?plan=academy')}`)
  assert.equal(academy, '/onboarding?signup=1&plan=academy')
})

test('Google sign-up with no plan, or with a hand-off value that is not exactly a plan address, keeps the plain onboarding address', async () => {
  assert.equal(await callbackWith('tutafy_oauth_role=tutor'), '/onboarding?signup=1')
  for (const next of ['/dashboard', '/upgrade', '/upgrade?plan=free', '/upgrade?plan=pro&x=1', '//evil.com/upgrade?plan=pro', 'https://evil.com', '/onboarding?plan=pro']) {
    db.tables.tutors = db.tables.tutors.filter(t => t.id !== NEWBIE)
    assert.equal(await callbackWith(`tutafy_oauth_role=tutor; tutafy_oauth_next=${encodeURIComponent(next)}`), '/onboarding?signup=1', next)
  }
})

test('Google sign-in of a tutor who already exists, with a plan picked, goes straight to that plan', async () => {
  db.tables.tutors.push({ id: NEWBIE, name: 'New Tutor', email: 'new.tutor@example.com', subscription_status: 'free' })
  assert.equal(await callbackWith(`tutafy_oauth_role=tutor; tutafy_oauth_next=${encodeURIComponent('/upgrade?plan=academy')}`), '/upgrade?plan=academy')
})

// ---- the pages -----------------------------------------------------------------------------------------------------------------

test('the sign-up page names the plan picked, keeps it in the sign-in link, and says nothing for a made-up plan', () => {
  search = 'plan=pro'
  const pro = renderToStaticMarkup(registerPage())
  assert.match(pro, /data-testid="plan-note"/)
  assert.match(pro.replace(/<!-- -->/g, ''), /You picked <b>Pro<\/b>\./)
  assert.match(pro.replace(/<!-- -->/g, ''), /Next step: pay for Pro \(\$12\/month\)/)
  assert.ok(pro.includes('href="/login?plan=pro"'), 'a tutor who already has an account keeps the plan when they sign in instead')
  search = 'plan=academy'
  assert.match(renderToStaticMarkup(registerPage()), /You picked <b>Academy<\/b>/)
  for (const bad of ['', 'plan=free', 'plan=PRO', 'plan=<script>', 'plan=__proto__', 'plan=']) {
    search = bad
    const html = renderToStaticMarkup(registerPage())
    assert.doesNotMatch(html, /data-testid="plan-note"/, bad)
    assert.ok(html.includes('href="/login"'), bad)
  }
  search = ''
  assert.match(renderToStaticMarkup(registerPage()).replace(/<!-- -->/g, ''), /Free forever\. Up to 10 students\./, 'the free limit is the one in the plan list, not 5')
})

test('the sign-in page keeps the plan in its "Create one free" link', () => {
  search = 'plan=academy'
  assert.ok(renderToStaticMarkup(loginPage()).includes('href="/register?plan=academy"'))
  search = 'plan=x'
  assert.ok(renderToStaticMarkup(loginPage()).includes('href="/register"'))
})

test('email sign-up goes to onboarding with the plan; the sign-in and Google buttons carry it; onboarding ends with a button to the plan', () => {
  const register = read('src/app/(auth)/register/page.tsx')
  assert.match(register, /router\.push\(onboardingHref\(plan\)\)/)
  assert.match(register, /tutafy_oauth_next=\$\{encodeURIComponent\(upgradeHref\(plan\)\)\}/)
  const login = read('src/app/(auth)/login/page.tsx')
  assert.match(login, /router\.push\(plan \? upgradeHref\(plan\) : '\/dashboard'\)/)
  assert.match(login, /tutafy_oauth_next=\$\{encodeURIComponent\(upgradeHref\(plan\)\)\}/)
  const onboarding = read('src/app/onboarding/page.tsx')
  assert.match(onboarding, /parsePaidPlan\(params\.get\('plan'\)\)/)
  assert.match(onboarding, /router\.push\(upgradeHref\(plan\)\)/)
  assert.match(onboarding, /data-testid="continue-to-plan"/)
  // the address is read BEFORE onboarding rewrites it to a plain /onboarding
  assert.ok(onboarding.indexOf("parsePaidPlan(params.get('plan'))") < onboarding.indexOf("window.history.replaceState({}, '', '/onboarding')"))
})

test('the sign-up page no longer says "5 students" while the Free plan allows 10', () => {
  assert.doesNotMatch(read('src/app/(auth)/register/page.tsx'), /up to 5 students/i)
})
