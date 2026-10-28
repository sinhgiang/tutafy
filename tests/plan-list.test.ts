// T-1052: ONE list of plans for the landing page, /upgrade, /switch, /llms.txt (and the "locked feature" sheet). Every line of it
// has code behind it, a plan never repeats a line, and "Priority support" (no code behind it) is gone. The REAL /upgrade and /switch
// pages are rendered over an in-memory Supabase; the landing page and llms files print from the same list.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import {
  PLAN_LIST, LOCKED_SHEET_LINES, parsePaidPlan, planOfUpgradeHref, upgradeHref, registerHref, loginHref, onboardingHref, planById,
} from '@/lib/plan-list'
import { PLANS } from '@/lib/site-content'
import { PLAN_PRICE, FEATURE_PLAN, polarCheckoutLink, polarCheckoutUrl } from '@/lib/plans'
import { buildLlmsTxt, buildLlmsFullTxt } from '@/lib/llms'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const TUTOR = '91000000-0000-4000-8000-000000000001'

let db: FakeDb
let session: { id: string; email: string } | null
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    createAdminClient: () => db,
    createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: session } }) } }),
  },
})
mock.module('next/navigation', {
  namedExports: { notFound: () => { throw new Error('NEXT_NOT_FOUND') }, redirect: (to: string) => { throw new Error(`NEXT_REDIRECT ${to}`) }, useRouter: () => ({ push() {}, replace() {}, refresh() {} }), usePathname: () => '/upgrade' },
})
const upgradePage = (await import('@/app/(dashboard)/upgrade/page.tsx')).default as (p: { searchParams: Promise<{ plan?: string | string[] }> }) => Promise<React.ReactElement>
const switchPage = (await import('@/app/switch/page.tsx')).default as (p: { searchParams: Promise<{ from?: string }> }) => Promise<React.ReactElement>

const ENV = ['NEXT_PUBLIC_POLAR_CHECKOUT_PRO', 'NEXT_PUBLIC_POLAR_CHECKOUT_ACADEMY', 'NEXT_PUBLIC_POLAR_PORTAL_URL', 'NEXT_PUBLIC_APP_URL'] as const
beforeEach(() => {
  for (const k of ENV) delete process.env[k]
  session = { id: TUTOR, email: 'tutor@example.com' }
  db = createFakeDb({ tutors: [{ id: TUTOR, name: 'Ten', email: 'tutor@example.com', subscription_status: 'free' }] })
})

const upgrade = async (plan?: string | string[]) => renderToStaticMarkup(await upgradePage({ searchParams: Promise.resolve(plan === undefined ? {} : { plan }) }))
const text = (html: string) => html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, '\n').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\n+/g, '\n')
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1

// ---- the list -----------------------------------------------------------------------------------------------------------

test('the plan list: three plans, the prices, no feature twice in a plan, no empty line', () => {
  assert.deepEqual(PLAN_LIST.map(p => [p.id, p.name, p.monthlyUsd]), [['free', 'Free', 0], ['pro', 'Pro', 12], ['academy', 'Academy', 29]])
  for (const p of PLAN_LIST) {
    assert.equal(new Set(p.features).size, p.features.length, `${p.name} repeats a line`)
    for (const f of p.features) assert.ok(f.trim() === f && f.length > 3, `${p.name}: "${f}"`)
  }
  // the short labels used by the sidebar and the locked-feature sheet agree with the list
  for (const p of PLAN_LIST) assert.equal(PLAN_PRICE[p.id], p.monthlyUsd === 0 ? '$0' : `$${p.monthlyUsd}/mo`, p.name)
})

test('"Priority support" is not offered anywhere (no queue or process stands behind it)', () => {
  const hits: string[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (/\.(tsx?|md|txt)$/.test(name) && /priority support/i.test(readFileSync(full, 'utf8'))) hits.push(path.relative(ROOT, full))
    }
  }
  walk(SRC)
  assert.deepEqual(hits, [])
  for (const p of PLAN_LIST) assert.ok(!p.features.some(f => /priority support/i.test(f)), p.name)
})

test('every line of the list has code behind it: a named file and what it must contain (a new line needs its own proof)', () => {
  const has = (rel: string, ...needles: (string | RegExp)[]) => {
    assert.ok(existsSync(path.join(ROOT, rel)), `${rel} exists`)
    const src = read(rel)
    for (const n of needles) assert.ok(typeof n === 'string' ? src.includes(n) : n.test(src), `${rel} holds ${n}`)
  }
  const gated = (...segments: string[]) => { for (const s of segments) assert.equal(FEATURE_PLAN[s], 'pro', `${s} is a Pro page`) }
  const proof: Record<string, () => void> = {
    'Up to 10 students': () => has('supabase/migrations/012_student_limit.sql', '10'),
    'Booking page': () => has('src/app/book/[slug]/BookingForm.tsx'),
    'Built-in video classroom': () => has('src/components/VideoRoom.tsx'),
    'Email reminders': () => has('src/app/api/cron/reminders/route.ts', 'resend'),
    'Calendar & scheduling': () => has('src/app/(dashboard)/calendar/page.tsx'),
    'PayPal payment link': () => has('src/components/settings/sections/PaymentsSection.tsx', 'paypal_link'),
    'Unlimited students': () => has('supabase/migrations/012_student_limit.sql', 'free'),
    'All 7 AI teaching tools': () => {
      has('src/app/(dashboard)/ai/AiToolsClient.tsx')
      assert.equal((read('src/app/(dashboard)/ai/AiToolsClient.tsx').match(/^ {4}id: '/gm) ?? []).length, 7, 'seven tools in the AI page')
      gated('ai')
    },
    'Card payments with Stripe': () => has('src/app/api/stripe/checkout/route.ts', "hasPlan(tutor?.subscription_status, 'pro')"),
    'Lesson packages, coupons & student subscriptions': () => gated('packages', 'coupons', 'subscriptions'),
    'Waitlist & student import': () => gated('waitlist', 'import'),
    'Reports & accounting export': () => { gated('reports'); has('src/app/api/accounting/export/route.ts', "requireApiPlan('pro')") },
    'Public API & webhooks': () => { gated('developers'); has('src/app/api/keys/route.ts', "requireApiPlan('pro')") },
    'Custom domain': () => has('src/app/api/custom-domain/route.ts', "hasPlan(tutor?.subscription_status, 'pro')"),
    'Everything in Pro': () => assert.deepEqual(planById('academy').features[0], 'Everything in Pro'),
    'Up to 5 tutors': () => has('src/app/api/team/route.ts', 'MAX_TEAM_SEATS = 5'),
    'Team payroll (per lesson, per hour or revenue share)': () => { has('src/lib/payroll.ts', "'per_lesson' | 'per_hour' | 'revenue_share'"); assert.equal(FEATURE_PLAN.team, 'academy') },
    'Booking page per tutor': () => has('src/app/(dashboard)/team/TeamClient.tsx', '/book/${tutorSlug}/${member.slug}'),
  }
  const all = PLAN_LIST.flatMap(p => p.features)
  for (const f of all) assert.ok(proof[f], `no proof for "${f}": add the code that backs it, or drop the line`)
  for (const key of Object.keys(proof)) assert.ok(all.includes(key), `proof for a line that is not in the list: "${key}"`)
  for (const f of all) proof[f]()
})

// ---- one list, four places ------------------------------------------------------------------------------------------------

test('the landing page data, structured data and /llms.txt are made from the one list (same names, prices, lines)', () => {
  assert.deepEqual(PLANS.map(p => [p.name, p.monthlyUsd, p.features, p.href]), PLAN_LIST.map(p => [p.name, p.monthlyUsd, p.features, p.href]))
  for (const body of [buildLlmsTxt(), buildLlmsFullTxt()]) {
    for (const p of PLAN_LIST) assert.ok(body.includes(`- ${p.name}: `), p.name)
    assert.ok(!/priority support/i.test(body))
  }
  const full = buildLlmsFullTxt()
  for (const p of PLAN_LIST) for (const f of p.features) assert.ok(full.includes(f), `${p.name}: ${f}`)
  assert.ok(!/Zapier|SMS/.test(full.slice(full.indexOf('## Pricing'), full.indexOf('## Pricing') + 2500)), 'no promise without code in the pricing block')
})

test('the landing page and /switch print the cards from PLANS and type no plan line of their own', () => {
  for (const file of ['src/app/page.tsx', 'src/app/switch/page.tsx']) {
    const src = read(file)
    assert.match(src, /import \{[^}]*\bPLANS\b[^}]*\} from '@\/lib\/site-content'/, `${file} imports PLANS`)
    assert.match(src, /\{PLANS\.map\(/, `${file} renders from PLANS`)
    assert.doesNotMatch(src, /\bconst PLANS\s*=/, `${file} declares its own PLANS`)
    // (the landing page has a comparison table with its own rows; what it must not have is a list of plan lines)
    assert.doesNotMatch(src, /features:\s*\[/, `${file} types a list of plan lines`)
    assert.doesNotMatch(src, /\bcheckoutUrl\b/, `${file} builds a checkout address`)
  }
  const upgrade = read('src/app/(dashboard)/upgrade/page.tsx')
  assert.doesNotMatch(upgrade, /features:\s*\[/)
  assert.match(upgrade, /from '@\/lib\/plan-list'/)
  assert.match(upgrade, /PLAN_LIST\.map\(/)
  for (const p of PLAN_LIST) for (const f of p.features) assert.ok(!upgrade.includes(`'${f}'`), `/upgrade types "${f}"`)
})

test('/upgrade shows every plan line of the list exactly once, and nothing else (no "Priority support", no repeats)', async () => {
  const t = text(await upgrade())
  for (const p of PLAN_LIST) for (const f of p.features) {
    const expected = PLAN_LIST.filter(q => q.features.includes(f)).length // "Everything in Pro" is only on Academy
    assert.equal(count(t, `\n${f}\n`), expected, `"${f}" is shown ${expected} time(s)`)
  }
  assert.ok(!/Priority support/i.test(t))
  // the Free card no longer lists things it does not include (crossed-out lines): only included lines are shown
  assert.equal(count(t, 'Unlimited students'), 1)
  assert.equal(count(t, 'Up to 5 tutors'), 1)
  for (const price of ['$0', '$12', '$29']) assert.ok(t.includes(`\n${price}\n`), price)
})

test('/switch shows the same plan lines and its buttons lead to the plan the visitor picks (paid plans to /upgrade?plan=)', async () => {
  const html = renderToStaticMarkup(await switchPage({ searchParams: Promise.resolve({}) }))
  const t = text(html)
  for (const p of PLAN_LIST) for (const f of p.features) assert.ok(t.includes(`\n${f}\n`), `/switch: ${f}`)
  assert.ok(html.includes('href="/upgrade?plan=pro"') && html.includes('href="/upgrade?plan=academy"'))
  assert.ok(!html.includes('href="/upgrade"'), 'no bare /upgrade button')
  assert.ok(!/Priority support/i.test(t))
})

test('the landing page buttons: Free to sign-up, Pro and Academy to the upgrade page of THAT plan', () => {
  assert.equal(planById('free').href, '/register')
  assert.equal(planById('pro').href, upgradeHref('pro'))
  assert.equal(planById('academy').href, upgradeHref('academy'))
  assert.equal(upgradeHref('pro'), '/upgrade?plan=pro')
})

test('the "locked feature" sheet lists the top of the same list, not its own copy', async () => {
  const { LockedFeature } = await import('@/components/plan/LockedFeature.tsx')
  for (const id of ['pro', 'academy'] as const) {
    const html = renderToStaticMarkup(createElement(LockedFeature,{ required: id, plan: 'free', feature: 'Packages', email: 'tutor@example.com', tutorId: TUTOR }))
    const t = text(html)
    for (const f of planById(id).features.slice(0, LOCKED_SHEET_LINES)) assert.ok(t.includes(`\n${f}\n`), `${id}: ${f}`)
    assert.ok(!/Priority support/i.test(t))
  }
})

// ---- the plan picked before sign-up ----------------------------------------------------------------------------------------

test('only "pro" and "academy" are a plan in an address; everything else is nothing', () => {
  assert.equal(parsePaidPlan('pro'), 'pro')
  assert.equal(parsePaidPlan('academy'), 'academy')
  for (const bad of ['PRO', 'Pro', ' pro', 'pro ', 'free', '', 'pro,academy', 'academy/../x', '__proto__', 'constructor', 'toString', 'pro\n', ['pro'], [], null, undefined, 1, {}]) {
    assert.equal(parsePaidPlan(bad), null, JSON.stringify(bad))
  }
  assert.equal(planOfUpgradeHref('/upgrade?plan=pro'), 'pro')
  for (const bad of ['/upgrade?plan=free', '/upgrade?plan=pro&x=1', '/upgrade', '//evil.com/upgrade?plan=pro', 'https://evil.com/upgrade?plan=pro', '/dashboard', '/upgrade?plan=pro#x', '', null, undefined, 5]) {
    assert.equal(planOfUpgradeHref(bad), null, JSON.stringify(bad))
  }
  assert.equal(registerHref('pro'), '/register?plan=pro')
  assert.equal(registerHref(null), '/register')
  assert.equal(loginHref('academy'), '/login?plan=academy')
  assert.equal(loginHref(null), '/login')
  assert.equal(onboardingHref('pro'), '/onboarding?signup=1&plan=pro')
  assert.equal(onboardingHref(null), '/onboarding?signup=1')
})

test('/upgrade?plan=academy for a signed-in Free tutor: the pick is named, the Academy card is marked, and the button leads to Polar with the tutor attached', async () => {
  process.env.NEXT_PUBLIC_POLAR_CHECKOUT_ACADEMY = 'https://polar.example.com/checkout/academy'
  process.env.NEXT_PUBLIC_POLAR_CHECKOUT_PRO = 'https://polar.example.com/checkout/pro'
  const html = await upgrade('academy')
  assert.match(html, /data-testid="chosen-plan"/)
  assert.match(text(html), /You picked Academy: \$29\/month\./)
  const academyCard = html.slice(html.indexOf('data-testid="plan-academy"'))
  assert.ok(academyCard.includes('Your pick'))
  assert.ok(!html.slice(html.indexOf('data-testid="plan-pro"'), html.indexOf('data-testid="plan-academy"')).includes('Your pick'))
  const href = /href="(https:\/\/polar\.example\.com\/checkout\/academy[^"]*)"/.exec(html)?.[1]?.replace(/&amp;/g, '&')
  assert.ok(href, 'the Academy button leads to the Academy checkout')
  const q = new URL(href!).searchParams
  assert.equal(q.get('customer_external_id'), TUTOR)
  assert.equal(q.get('customer_email'), 'tutor@example.com')
  assert.match(q.get('success_url')!, /\/upgrade\/success$/)
})

test('a plan the visitor did not pick, or a made-up one, is never shown as picked', async () => {
  for (const plan of [undefined, 'free', 'PRO', 'pro ', '<script>', '__proto__', ['pro', 'academy']] as const) {
    const html = await upgrade(plan as string | string[] | undefined)
    assert.doesNotMatch(html, /data-testid="chosen-plan"/, JSON.stringify(plan))
    assert.ok(!html.includes('Your pick'), JSON.stringify(plan))
  }
})

test('a tutor already on Pro who follows a "Go Pro" link is told so, with no second payment button for Pro', async () => {
  db.tables.tutors[0].subscription_status = 'pro'
  process.env.NEXT_PUBLIC_POLAR_CHECKOUT_PRO = 'https://polar.example.com/checkout/pro'
  process.env.NEXT_PUBLIC_POLAR_CHECKOUT_ACADEMY = 'https://polar.example.com/checkout/academy'
  const html = await upgrade('pro')
  assert.match(text(html), /You are already on Pro\./)
  db.tables.tutors[0].subscription_status = 'academy'
  assert.match(text(await upgrade('pro')), /You are on Academy, which already includes everything in Pro\./)
  db.tables.tutors[0].subscription_status = 'pro'
  assert.ok(!html.includes('polar.example.com/checkout/pro'))
  assert.ok(html.includes('polar.example.com/checkout/academy'), 'Academy can still be bought')
})

test('signed out: /upgrade sends the visitor to sign-up WITH the plan (the proxy does it first; the page does the same if reached)', async () => {
  session = null
  await assert.rejects(upgrade('pro'), /NEXT_REDIRECT \/register\?plan=pro$/)
  await assert.rejects(upgrade('academy'), /NEXT_REDIRECT \/register\?plan=academy$/)
  await assert.rejects(upgrade(), /NEXT_REDIRECT \/login$/)
  await assert.rejects(upgrade('PRO'), /NEXT_REDIRECT \/login$/)
})

test('no checkout address on the server: the page says so and gives a way out; no button points at "#" or back at itself', async () => {
  const html = await upgrade('pro')
  assert.match(html, /data-testid="checkout-unavailable"/)
  assert.doesNotMatch(html, /href="#"/)
  assert.doesNotMatch(html, /Upgrade to (Pro|Academy) →/)
  assert.equal(polarCheckoutLink('pro', 'tutor@example.com', TUTOR), null)
  assert.equal(polarCheckoutUrl('pro', 'tutor@example.com', TUTOR), '/upgrade', 'the old helper still falls back to the pricing page')
  process.env.NEXT_PUBLIC_POLAR_CHECKOUT_PRO = '  https://polar.example.com/c?x=1  '
  assert.match(polarCheckoutLink('pro', 'tutor@example.com', TUTOR)!, /^https:\/\/polar\.example\.com\/c\?x=1&customer_email=/)
})

test('a downgrade button only exists when the customer portal address is set; otherwise the page says to write to support', async () => {
  db.tables.tutors[0].subscription_status = 'academy'
  const without = await upgrade()
  assert.ok(!without.includes('Downgrade to'))
  assert.match(text(without), /To move to Pro, email/)
  process.env.NEXT_PUBLIC_POLAR_PORTAL_URL = 'https://polar.example.com/portal'
  const withPortal = await upgrade()
  assert.match(withPortal, /href="https:\/\/polar\.example\.com\/portal"[^>]*>Downgrade to (Free|Pro)/)
  assert.ok(!/To move to Pro, email/.test(text(withPortal)))
})

test('the upgrade page promise about cancelling matches what the webhook does (keep the plan to the end of the paid period)', async () => {
  const html = text(await upgrade())
  assert.match(html, /you keep your plan until the end of the period you already paid for/)
  assert.doesNotMatch(html, /you won't be charged next month/i)
})
