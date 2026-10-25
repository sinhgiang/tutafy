// Builds the Tutafy logo concepts (T-0959): SVG files (letters converted to outlines) and compare.html.
//
// Needs, in a throwaway folder (not part of the repo):
//   npm install opentype.js @fontsource/manrope @fontsource/dm-sans @fontsource/space-grotesk @fontsource/sora @fontsource/outfit
// Copy this file there and run:  node build-logos.mjs <output folder>
// The SVG files are the source of truth and can be edited by hand. This script only documents how the outlines were made.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(path.join(process.cwd(), 'x.js'))
const opentype = require('opentype.js')

const out = (process.argv[2] || './out').replace(/[\\/]?$/, '/')
mkdirSync(out, { recursive: true })

const load = (pkg, file) => {
  const b = readFileSync(`node_modules/@fontsource/${pkg}/files/${file}`)
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))
}
const FONT = {
  manrope800: load('manrope', 'manrope-latin-800-normal.woff'),
  dmsans700: load('dm-sans', 'dm-sans-latin-700-normal.woff'),
  grotesk700: load('space-grotesk', 'space-grotesk-latin-700-normal.woff'),
  sora700: load('sora', 'sora-latin-700-normal.woff'),
  outfit600: load('outfit', 'outfit-latin-600-normal.woff'),
}

// The brand indigo is the one the tutor app already uses (--d-brand in src/styles/dashboard-shell.css: #4F46E5 light, #818CF8 dark).
// Every idea keeps it as the main color. The amber is the single accent, used only where an idea has a "booked" or "live" detail.
const PAL = {
  light: { main: '#4F46E5', deep: '#3730A3', soft: '#C7D2FE', accent: '#F59E0B', text: '#0F172A', tile: '#4F46E5' },
  dark: { main: '#818CF8', deep: '#6366F1', soft: '#A5B4FC', accent: '#FBBF24', text: '#F8FAFC', tile: '#6366F1' },
}
const WHITE = '#FFFFFF'

// ------------------------------------------------------------------------------------------------ icons on a 64 x 64 grid
// Each returns SVG markup. fav = true: drawn for the 32 px favicon, full-bleed on its own tile, chunkier, all glyphs white (amber stays).

const tileRect = (p, fav) => (fav
  ? `<rect width="64" height="64" rx="15" fill="${p.tile}"/>`
  : `<rect x="2" y="2" width="60" height="60" rx="16" fill="${p.tile}"/>`)
const favTile = () =>`<rect width="64" height="64" rx="15" fill="${PAL.light.main}"/>`

// A. Page T: a T whose bar is an open book seen from the front (two pages) and whose stem is the spine.
function iconPage(p, fav) {
  const l = fav ? 11 : 12, r = fav ? 53 : 52, top = fav ? 14 : 15, bar = fav ? 28 : 27
  const sw = fav ? 11 : 9, slit = fav ? 1.9 : 1.6, bottom = fav ? 52 : 50
  const cx = 32
  const rr = 6 // outer corners of the two pages
  const lp = `M${l} ${top + rr}A${rr} ${rr} 0 0 1 ${l + rr} ${top}H${cx - slit}V${bar}H${l}Z`
  const rp = `M${cx + slit} ${top}H${r - rr}A${rr} ${rr} 0 0 1 ${r} ${top + rr}V${bar}H${cx + slit}Z`
  const x0 = cx - sw / 2, x1 = cx + sw / 2
  const stem = `M${x0} ${bar - 1}H${x1}V${bottom - 2}A2 2 0 0 1 ${x1 - 2} ${bottom}H${x0 + 2}A2 2 0 0 1 ${x0} ${bottom - 2}Z`
  return `${tileRect(p, fav)}<g fill="${WHITE}"><path d="${lp}"/><path d="${rp}"/><path d="${stem}"/></g>`
}

// B. Bubble: a speech bubble (the live lesson, the message) with a T standing in it.
function iconBubble(p, fav) {
  const c = fav ? WHITE : p.main
  const sw = fav ? 6.5 : 5
  const bub = 'M20 8H44A14 14 0 0 1 58 22V32A14 14 0 0 1 44 46H34L20 58V46A14 14 0 0 1 6 32V22A14 14 0 0 1 20 8Z'
  const t = fav
    ? `<rect x="19" y="17" width="26" height="9" rx="2.5" fill="${c}"/><rect x="28" y="24" width="8" height="14" rx="2" fill="${c}"/>`
    : `<rect x="20" y="18" width="24" height="7.5" rx="2" fill="${c}"/><rect x="28.5" y="24" width="7" height="13" rx="2" fill="${c}"/>`
  return `${fav ? favTile(p) : ''}<path d="${bub}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linejoin="round"/>${t}`
}

// C. Slots: a T built from time blocks, the way a booked day looks on a calendar. The last block is the booked one.
function iconSlots(p, fav) {
  const main = fav ? WHITE : p.main
  return `${fav ? favTile(p) : ''}<rect x="8" y="8" width="48" height="14" rx="7" fill="${main}"/>`
    + `<rect x="22" y="26" width="20" height="13" rx="5" fill="${main}"/>`
    + `<rect x="22" y="43" width="20" height="13" rx="5" fill="${p.accent}"/>`
}

// D. Facet: a mortarboard cut from two facets, with the tassel in amber.
function iconFacet(p, fav) {
  const top = fav ? WHITE : p.main
  const bot = fav ? PAL.light.soft : p.deep
  const pts = fav ? { l: [3, 26], t: [32, 9], r: [61, 26], b: [32, 43] } : { l: [4, 26], t: [32, 10], r: [60, 26], b: [32, 42] }
  const tx = fav ? 52 : 52
  const ty = pts.r[1] + (pts.r[0] - tx) / (pts.r[0] - pts.b[0]) * (pts.b[1] - pts.r[1])
  const sw = fav ? 5 : 3.5
  return `${fav ? favTile(p) : ''}<path d="M${pts.l} L${pts.t} L${pts.r} Z" fill="${top}"/><path d="M${pts.l} L${pts.r} L${pts.b} Z" fill="${bot}"/>`
    + `<path d="M${tx} ${ty + 1}V${fav ? 49 : 48}" stroke="${p.accent}" stroke-width="${sw}" stroke-linecap="round" fill="none"/>`
    + `<circle cx="${tx}" cy="${fav ? 52 : 51}" r="${fav ? 5 : 4.2}" fill="${p.accent}"/>`
}

// E. Dot t: one plain line drawn as a lowercase t, with a round amber dot for the student.
function iconDot(p, fav) {
  const c = fav ? WHITE : p.main
  const sw = fav ? 9 : 7
  const d = `M17 25H43M30 9V41Q30 53 42 53H46`
  return `${fav ? favTile(p) : ''}<path d="${d}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<circle cx="${fav ? 50 : 50}" cy="${fav ? 15 : 14}" r="${fav ? 7 : 6}" fill="${p.accent}"/>`
}

const CONCEPTS = [
  { id: 'page', name: 'A. Page T', icon: iconPage, font: 'manrope800', word: 'Tutafy', track: -0.01, size: 30 },
  { id: 'bubble', name: 'B. Bubble', icon: iconBubble, font: 'dmsans700', word: 'Tutafy', track: -0.01, size: 30 },
  { id: 'slots', name: 'C. Slots', icon: iconSlots, font: 'grotesk700', word: 'Tutafy', track: -0.015, size: 31 },
  { id: 'facet', name: 'D. Facet', icon: iconFacet, font: 'sora700', word: 'Tutafy', track: -0.02, size: 28 },
  { id: 'dot', name: 'E. Dot t', icon: iconDot, font: 'outfit600', word: 'tutafy', track: 0, size: 33 },
]

// ------------------------------------------------------------------------------------------------ text as outlines
function outline(font, text, size, tracking = 0) {
  const scale = size / font.unitsPerEm
  let x = 0
  let d = ''
  for (const ch of text) {
    const g = font.charToGlyph(ch)
    d += g.getPath(x, 0, size).toPathData(2)
    x += g.advanceWidth * scale + tracking * size
  }
  return { d, width: x - tracking * size }
}
const capHeight = (font, size) => ((font.tables.os2.sCapHeight || 0.7 * font.unitsPerEm) / font.unitsPerEm) * size

// ------------------------------------------------------------------------------------------------ files
const wrap = (w, h, inner, label = 'Tutafy') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}"><title>${label}</title>${inner}</svg>\n`
const files = {}

for (const c of CONCEPTS) {
  for (const mode of ['light', 'dark']) {
    const p = PAL[mode]
    // icon alone, 64 x 64
    files[`${c.id}-icon-on-${mode}.svg`] = wrap(64, 64, c.icon(p, false))
    // horizontal: icon 44 high, then the word, 56 high
    const font = FONT[c.font]
    const txt = outline(font, c.word, c.size, c.track)
    const gap = 12
    const iconPx = 44
    const s = iconPx / 64
    const baseline = 28 + capHeight(font, c.size) / 2
    const w = Math.ceil(iconPx + gap + txt.width + 2)
    files[`${c.id}-horizontal-on-${mode}.svg`] = wrap(
      w, 56,
      `<g transform="translate(0 6) scale(${s})">${c.icon(p, false)}</g><path transform="translate(${iconPx + gap} ${baseline.toFixed(2)})" d="${txt.d}" fill="${p.text}"/>`,
    )
  }
  files[`${c.id}-favicon.svg`] = wrap(32, 32, `<g transform="scale(0.5)">${c.icon(PAL.light, true)}</g>`)
}
for (const [name, body] of Object.entries(files)) writeFileSync(out + name, body)

console.log(`wrote ${Object.keys(files).length} SVG files to ${out}`)
