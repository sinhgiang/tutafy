// T-0915: the tutor profile in a dark colour scheme (src/styles/profile-dark.css, on top of directory-dark.css). The colours are the directory's own
// variables plus a few fixed ones; every pair that carries text or an icon is measured here (WCAG: 4.5 to 1 for text, 3 to 1 for an icon or an edge),
// and the file may touch nothing outside `.dir-page` and the video poster, so no other page changes. The real pages are checked in a browser too
// (the screenshots of the ticket, and a Lighthouse run for accessibility).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const read = (f: string) => readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n')
const dir = read('src/styles/directory-dark.css')
const prof = read('src/styles/profile-dark.css')
const video = read('src/styles/profile-video.css')

const vars = new Map<string, string>()
for (const m of dir.matchAll(/--(dir-[a-z0-9-]+):\s*([^;]+);/g)) vars.set(m[1], m[2].trim())
type Rgb = [number, number, number]
const hex = (value: string): Rgb => {
  const m = /^#([0-9a-f]{6})$/i.exec(value.trim())
  assert.ok(m, `a hex colour: ${value}`)
  return [0, 2, 4].map(i => parseInt(m![1].slice(i, i + 2), 16)) as Rgb
}
const lum = ([r, g, b]: Rgb) => {
  const f = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a: Rgb, b: Rgb) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
const v = (name: string) => hex(vars.get(name)!)

/** The colour a rule of profile-dark.css gives to `selector`, resolved through the directory's variables. */
function colourOf(selector: string): Rgb {
  const start = prof.indexOf(selector + ' {')
  assert.ok(start >= 0, `a rule for ${selector}`)
  const body = prof.slice(start, prof.indexOf('}', start))
  const m = /color:\s*([^;]+);/.exec(body)
  assert.ok(m, `a colour in the rule for ${selector}`)
  const value = m![1].trim()
  const ref = /^var\(--(dir-[a-z0-9-]+)\)$/.exec(value)
  return ref ? v(ref[1]) : hex(value)
}

/** A translucent tint (rgba) drawn over a surface, as the page shows it. */
function tinted(variable: string, surface: Rgb): Rgb {
  const m = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(vars.get(variable)!)
  assert.ok(m, `${variable} is an rgba colour`)
  const a = Number(m![4])
  return [1, 2, 3].map((i, k) => Math.round(Number(m![i]) * a + surface[k] * (1 - a))) as Rgb
}

test('the text the profile uses that the directory does not remap is readable on every dark surface (4.5 to 1), and an empty star is visible (3 to 1)', () => {
  const grounds = ['dir-bg', 'dir-surface', 'dir-surface-2']
  for (const sel of ['.dir-page .text-indigo-800', '.dir-page .text-emerald-700', '.dir-page .text-emerald-600']) {
    for (const g of grounds) assert.ok(ratio(colourOf(sel), v(g)) >= 4.5, `${sel} on ${g}: ${ratio(colourOf(sel), v(g)).toFixed(2)}`)
  }
  for (const g of grounds) assert.ok(ratio(colourOf('.dir-page .text-gray-200'), v(g)) >= 3, `an empty star on ${g}: ${ratio(colourOf('.dir-page .text-gray-200'), v(g)).toFixed(2)}`)
})

test('the badge and the free-cancellation pill keep their text readable on their tinted fills (the fills are the directory\'s own variables)', () => {
  const surface = v('dir-surface')
  assert.ok(ratio(v('dir-accent'), tinted('dir-accent-bg', surface)) >= 4.5, `accent on the indigo tint: ${ratio(v('dir-accent'), tinted('dir-accent-bg', surface)).toFixed(2)}`)
  assert.ok(ratio(v('dir-ok'), tinted('dir-ok-bg', surface)) >= 4.5, `green on its tint: ${ratio(v('dir-ok'), tinted('dir-ok-bg', surface)).toFixed(2)}`)
  const base = v('dir-bg')
  assert.ok(ratio(v('dir-ok'), tinted('dir-ok-bg', base)) >= 4.5, 'green on its tint over the page')
})

test('the video poster is the same dark panel in both schemes, and its text is far above 4.5 to 1', () => {
  const colours = [...video.matchAll(/#[0-9a-f]{6}/gi)].map(m => m[0])
  assert.ok(colours.length >= 4)
  const lightest = hex('#1c2140')
  for (const text of ['#e6e9f5', '#f2f4fa', '#ffffff']) assert.ok(ratio(hex(text), lightest) >= 4.5, `${text} on the lightest poster colour`)
  assert.ok(!video.replace(/\/\*[\s\S]*?\*\//g, '').includes('prefers-color-scheme'), 'the poster does not change with the scheme')
})

test('the file touches only the profile (.dir-page) and the poster: every selector starts with .dir-page or .vid-', () => {
  const body = prof.replace(/\/\*[\s\S]*?\*\//g, '')
  const selectors = [...body.matchAll(/([^{}@]+)\{/g)].map(m => m[1].trim()).filter(s => s !== '' && !s.startsWith('media '))
  assert.ok(selectors.length >= 6)
  for (const s of selectors) assert.match(s, /^(\.dir-page |\.vid-)/, s)
  assert.ok(prof.includes('@media (prefers-color-scheme: dark)'))
})

test('the profile page carries the dark-scheme root class and its layout loads the three stylesheets', () => {
  assert.ok(read('src/app/tutors/[slug]/page.tsx').includes('className="min-h-screen bg-[#F7F8FA] pb-24 lg:pb-0 dir-page"'))
  const layout = read('src/app/tutors/[slug]/layout.tsx')
  for (const f of ['directory-dark.css', 'profile-video.css', 'profile-dark.css']) assert.ok(layout.includes(`@/styles/${f}`), f)
})
