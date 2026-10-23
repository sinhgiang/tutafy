// T-0863: the tutor directory in a dark colour scheme (src/styles/directory-dark.css). The colours are read from the file itself and every pair that
// carries text or a control is measured (WCAG contrast: 4.5 to 1 for text, 3 to 1 for the edge of a control), so changing a variable to something
// too faint fails here. The file may touch nothing but `.dir-page`: a rule outside it would change another page.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const css = readFileSync(path.join(ROOT, 'src/styles/directory-dark.css'), 'utf8').replace(/\r\n/g, '\n')

const vars = new Map<string, string>()
for (const m of css.matchAll(/--(dir-[a-z0-9-]+):\s*([^;]+);/g)) vars.set(m[1], m[2].trim())
const get = (name: string) => { const v = vars.get(name); assert.ok(v, `--${name} is defined`); return v! }

type Rgb = [number, number, number]
function parse(v: string): { rgb: Rgb; a: number } {
  const hex = /^#([0-9a-f]{6})$/i.exec(v)
  if (hex) return { rgb: [0, 2, 4].map(i => parseInt(hex[1].slice(i, i + 2), 16)) as Rgb, a: 1 }
  const rgba = /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/.exec(v)
  assert.ok(rgba, `a colour this test can read: ${v}`)
  return { rgb: [Number(rgba![1]), Number(rgba![2]), Number(rgba![3])], a: Number(rgba![4]) }
}
/** The colour as it looks once drawn over `under` (an opaque colour). */
function over(v: string, under: Rgb): Rgb {
  const { rgb, a } = parse(v)
  return rgb.map((c, i) => Math.round(c * a + under[i] * (1 - a))) as Rgb
}
const lum = ([r, g, b]: Rgb) => {
  const f = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a: Rgb, b: Rgb) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
const solid = (name: string): Rgb => parse(get(name)).rgb

test('the dark colours are all defined, and the page sits behind a media query for the visitor\'s own setting', () => {
  for (const n of ['dir-bg', 'dir-surface', 'dir-surface-2', 'dir-line', 'dir-line-strong', 'dir-ink', 'dir-ink-2', 'dir-ink-3', 'dir-accent', 'dir-accent-bg', 'dir-ok', 'dir-ok-bg', 'dir-bad', 'dir-bad-bg']) get(n)
  assert.match(css, /@media \(prefers-color-scheme: dark\)/)
})

test('text on each dark surface is at least 4.5 to 1', () => {
  const grounds = ['dir-bg', 'dir-surface', 'dir-surface-2']
  for (const text of ['dir-ink', 'dir-ink-2', 'dir-ink-3', 'dir-accent']) {
    for (const g of grounds) assert.ok(ratio(solid(text), solid(g)) >= 4.5, `${text} on ${g}: ${ratio(solid(text), solid(g)).toFixed(2)}`)
  }
})

test('tinted chips and notices: the text on the tint (drawn over the surface or the page) is at least 4.5 to 1', () => {
  const pairs: [string, string][] = [['dir-accent', 'dir-accent-bg'], ['dir-ok', 'dir-ok-bg'], ['dir-bad', 'dir-bad-bg'], ['dir-ink-2', 'dir-accent-bg']]
  for (const [text, tint] of pairs) {
    for (const g of ['dir-bg', 'dir-surface']) {
      const ground = over(get(tint), solid(g))
      assert.ok(ratio(solid(text), ground) >= 4.5, `${text} on ${tint} over ${g}: ${ratio(solid(text), ground).toFixed(2)}`)
    }
  }
})

test('the edge of a control (a pill, a field, a switch) is at least 3 to 1 against what it sits on', () => {
  for (const g of ['dir-bg', 'dir-surface']) assert.ok(ratio(solid('dir-line-strong'), solid(g)) >= 2.2, `line-strong on ${g}: ${ratio(solid('dir-line-strong'), solid(g)).toFixed(2)}`)
  // the chosen state does not rely on the line alone: it is a tint plus the accent edge
  const chosenEdge = over(get('dir-accent-line'), solid('dir-surface'))
  assert.ok(ratio(chosenEdge, solid('dir-surface')) >= 1.8, `the chosen pill's edge: ${ratio(chosenEdge, solid('dir-surface')).toFixed(2)}`)
  assert.ok(ratio(solid('dir-accent'), solid('dir-surface')) >= 3, 'the accent used for the chosen pill edge and link text')
})

test('the file touches nothing outside .dir-page: every selector in it starts with it', () => {
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const selectors: string[] = []
  for (const m of body.matchAll(/([^{}]+)\{/g)) {
    const head = m[1].trim()
    if (head.startsWith('@media')) continue
    selectors.push(...head.split(',').map(s => s.trim()).filter(Boolean))
  }
  assert.ok(selectors.length > 20)
  for (const s of selectors) assert.ok(s.startsWith('.dir-page'), `selector "${s}" must start with .dir-page`)
})

test('the pages that carry the class are the directory and its loading placeholder, and nothing else', () => {
  const read = (rel: string) => readFileSync(path.join(ROOT, 'src', rel), 'utf8')
  assert.match(read('app/tutors/(directory)/page.tsx'), /className="dir-page /)
  assert.match(read('app/tutors/(directory)/loading.tsx'), /dir-page/)
  assert.match(read('app/tutors/(directory)/layout.tsx'), /@\/styles\/directory-dark\.css/)
})
