// Builds the text and picture of every generated brand file, from src/lib/brand.ts only (T-0969). Used by scripts/build-brand.mjs to write
// them and by tests/brand.test.ts to check that what is committed is what this builds. Keys are paths from the repository root.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import {
  BRAND_COLORS, BRAND_COLOR_USE, DASH_TOKENS, BRAND_FONT, BRAND_NAME, BRAND_RADIUS, BRAND_SPACE, BRAND_TYPE, LOGO_CLEAR_SPACE, LOGO_COLORS, LOGO_MIN, brandVar,
} from '@/lib/brand'
import { adaptiveFaviconSvg, badgeSvg, fullBleedIconSvg, iconSvg, logoSvg, maskableIconSvg } from '@/lib/brand-svg'

export type BrandFiles = Record<string, string | Buffer>

export const ICON_PNG_SIZES = [16, 32, 48, 64, 128, 180, 192, 256, 512, 1024] as const
const SHEET_DATE = '25 Oct 2026'

export function tokensCss(): string {
  const lines: string[] = []
  for (const [name, hex] of Object.entries(BRAND_COLORS)) lines.push(`  ${brandVar(name)}: ${hex};`)
  lines.push(`  --brand-font: ${BRAND_FONT.stack};`)
  for (const [name, t] of Object.entries(BRAND_TYPE)) {
    lines.push(`  --brand-text-${name}: ${t.size}px;`, `  --brand-leading-${name}: ${t.line}px;`, `  --brand-weight-${name}: ${t.weight};`, `  --brand-tracking-${name}: ${t.tracking};`)
  }
  for (const [name, px] of Object.entries(BRAND_RADIUS)) lines.push(`  --brand-radius-${name}: ${px}px;`)
  BRAND_SPACE.forEach((px, i) => lines.push(`  --brand-space-${i + 1}: ${px}px;`))
  // The colours of the logo that follows the theme (BrandMark / BrandLogo with theme="auto"): light by default, the dark-surface set in the app's dark theme.
  const logoLight = `  --brand-logo-tile: var(${brandVar('primary')});\n  --brand-logo-tassel: var(${brandVar('accent')});\n  --brand-logo-word: var(${brandVar('ink')});`
  const logoDark = `  --brand-logo-tile: var(${brandVar('primaryOnDark')});\n  --brand-logo-tassel: var(${brandVar('accentOnDark')});\n  --brand-logo-word: var(${brandVar('white')});`
  return `/* Written by \`npm run brand:build\` from src/lib/brand.ts. Do not edit by hand: tests/brand.test.ts fails when this file and brand.ts differ.\n   Described in words in docs/brand/BRAND.md. */\n:root {\n${lines.join('\n')}\n${logoLight}\n}\n.dash[data-theme="dark"], .dark {\n${logoDark}\n}\n`
}

const ROOT = path.resolve(import.meta.dirname, '../..')

function rgba(hex: string, alpha: string): string {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** The colour lines of one theme of the tutor app shell, as they stand between the brand marks of src/styles/dashboard-shell.css. */
export function dashTokenLines(theme: 'light' | 'dark'): string {
  const map = DASH_TOKENS[theme]
  const names = Object.keys(map)
  const rows: string[] = []
  let at = 0
  for (const n of [5, 3, 5, 6]) {
    rows.push(`  ${names.slice(at, at + n).map(k => `${k}: ${BRAND_COLORS[map[k]]};`).join(' ')}`)
    at += n
  }
  const focus = theme === 'light' ? rgba(BRAND_COLORS.primary, '.28') : rgba(BRAND_COLORS.primaryTextOnDark, '.4')
  rows.push(`  --d-focus: 0 0 0 3px ${focus};`)
  return rows.join('\n')
}

/** The shell stylesheet with its two brand blocks rewritten from brand.ts; everything outside the marks is left as it is. */
export function patchDashCss(css: string): string {
  return css.replace(/(\/\* brand:begin (light|dark)[^\n]*\*\/\n)[\s\S]*?(\n\s*\/\* brand:end \*\/)/g, (_m, head: string, theme: 'light' | 'dark', tail: string) => `${head}${dashTokenLines(theme)}${tail}`)
}

// ---- The tables in docs/brand/BRAND.md ------------------------------------------------------------------------------------
function docColors(): string {
  const rows = (Object.keys(BRAND_COLORS) as (keyof typeof BRAND_COLORS)[]).map(n => `| \`${n}\` | \`${BRAND_COLORS[n]}\` | \`${brandVar(n)}\` | ${BRAND_COLOR_USE[n]} |`)
  return ['| Name | Hex | CSS variable | Use |', '|---|---|---|---|', ...rows].join('\n')
}

function docType(): string {
  const rows = Object.entries(BRAND_TYPE).map(([n, t]) => `| \`${n}\` | ${t.size} / ${t.line} px | ${t.weight} | ${t.tracking} | \`--brand-text-${n}\`, \`--brand-leading-${n}\`, \`--brand-weight-${n}\`, \`--brand-tracking-${n}\` |`)
  return ['| Style | Size / line | Weight | Tracking | CSS variables |', '|---|---|---|---|---|', ...rows].join('\n')
}

function docShape(): string {
  const radius = Object.entries(BRAND_RADIUS).map(([n, px]) => `| \`${n}\` | ${px === 999 ? 'full (999 px)' : `${px} px`} | \`--brand-radius-${n}\` |`)
  const space = BRAND_SPACE.map((px, i) => `| ${i + 1} | ${px} px | \`--brand-space-${i + 1}\` |`)
  return ['Corners:', '', '| Name | Radius | CSS variable |', '|---|---|---|', ...radius, '', 'Spacing, on a 4 px grid:', '', '| Step | Size | CSS variable |', '|---|---|---|', ...space].join('\n')
}

/** BRAND.md with its generated tables rewritten from brand.ts; the words around them are the author's. */
export function patchBrandDoc(md: string): string {
  const blocks: Record<string, string> = { colors: docColors(), type: docType(), shape: docShape() }
  return md.replace(/(<!-- brand:(colors|type|shape):begin -->\n)[\s\S]*?(<!-- brand:\2:end -->)/g, (_m, head: string, name: string, tail: string) => `${head}${blocks[name]}\n${tail}`)
}

async function png(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
}

// An .ico that holds PNG pictures (every browser since 2008 reads this): 16, 32 and 48 px.
async function ico(): Promise<Buffer> {
  const sizes = [16, 32, 48]
  const pics = await Promise.all(sizes.map(n => png(iconSvg('light', n))))
  const head = Buffer.alloc(6)
  head.writeUInt16LE(0, 0)
  head.writeUInt16LE(1, 2)
  head.writeUInt16LE(sizes.length, 4)
  let offset = 6 + 16 * sizes.length
  const dir = sizes.map((n, i) => {
    const e = Buffer.alloc(16)
    e.writeUInt8(n, 0)
    e.writeUInt8(n, 1)
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(pics[i].length, 8)
    e.writeUInt32LE(offset, 12)
    offset += pics[i].length
    return e
  })
  return Buffer.concat([head, ...dir, ...pics])
}

export async function buildBrandFiles(): Promise<BrandFiles> {
  const out: BrandFiles = {}
  out['src/styles/brand-tokens.css'] = tokensCss()
  out['docs/brand/BRAND.md'] = patchBrandDoc(fs.readFileSync(path.join(ROOT, 'docs/brand/BRAND.md'), 'utf8'))
  out['src/styles/dashboard-shell.css'] = patchDashCss(fs.readFileSync(path.join(ROOT, 'src/styles/dashboard-shell.css'), 'utf8'))

  // Icon, as text
  out['public/brand/tutafy-icon.svg'] = iconSvg('light')
  out['public/brand/tutafy-icon-dark.svg'] = iconSvg('dark')
  out['public/brand/tutafy-icon-mono-black.svg'] = iconSvg('mono-black')
  out['public/brand/tutafy-icon-mono-white.svg'] = iconSvg('mono-white')
  out['public/brand/tutafy-icon-maskable.svg'] = maskableIconSvg()
  out['public/brand/tutafy-badge.svg'] = badgeSvg()
  // Horizontal logo, as text
  out['public/brand/tutafy-logo.svg'] = logoSvg('light')
  out['public/brand/tutafy-logo-dark.svg'] = logoSvg('dark')
  out['public/brand/tutafy-logo-mono-black.svg'] = logoSvg('mono-black')
  out['public/brand/tutafy-logo-mono-white.svg'] = logoSvg('mono-white')

  // Icon, as pictures
  for (const n of ICON_PNG_SIZES) out[`public/brand/tutafy-icon-${n}.png`] = await png(iconSvg('light', n))
  out['public/brand/tutafy-icon-dark-512.png'] = await png(iconSvg('dark', 512))
  out['public/brand/tutafy-icon-mono-black-512.png'] = await png(iconSvg('mono-black', 512))
  out['public/brand/tutafy-icon-mono-white-512.png'] = await png(iconSvg('mono-white', 512))
  out['public/brand/tutafy-icon-maskable-192.png'] = await png(maskableIconSvg(192))
  out['public/brand/tutafy-icon-maskable-512.png'] = await png(maskableIconSvg(512))
  out['public/brand/tutafy-badge-96.png'] = await png(badgeSvg(96))
  // Horizontal logo, as pictures: 5 times the grid, so 1020 x 320
  out['public/brand/tutafy-logo.png'] = await png(logoSvg('light', 320))
  out['public/brand/tutafy-logo-dark.png'] = await png(logoSvg('dark', 320))
  out['public/brand/tutafy-logo-mono-black.png'] = await png(logoSvg('mono-black', 320))
  out['public/brand/tutafy-logo-mono-white.png'] = await png(logoSvg('mono-white', 320))

  // The names browsers, phones, push notifications and structured data look for
  out['public/icon-192.png'] = out['public/brand/tutafy-icon-192.png']
  out['public/icon-512.png'] = out['public/brand/tutafy-icon-512.png']
  out['src/app/icon.svg'] = adaptiveFaviconSvg()
  out['src/app/favicon.ico'] = await ico()
  out['src/app/apple-icon.png'] = await png(fullBleedIconSvg(0.9, 180))

  out['public/brand/brand-sheet.html'] = sheetHtml()
  return out
}

// ---- The one-page brand sheet ----------------------------------------------------------------------------------------------
const C = BRAND_COLORS

// Black or white text on a chip, whichever reads better on that colour.
function onColor(hex: string): string {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150 ? C.ink : '#FFFFFF'
}

function swatch(name: keyof typeof BRAND_COLORS, label: string, note: string): string {
  const hex = C[name]
  const edge = name === 'surface' || name === 'white' ? `box-shadow:inset 0 0 0 1px ${C.line};` : ''
  return `<div class="sw"><div class="chip" style="background:${hex};color:${onColor(hex)};${edge}">${hex}</div><b>${label}</b><span>${brandVar(name)}</span><em>${note}</em></div>`
}

function sheetHtml(): string {
  const l = LOGO_COLORS
  const type = Object.entries(BRAND_TYPE)
    .map(([n, t]) => `<div class="trow"><code>${n}</code><span style="font-size:${n === 'display' ? 40 : t.size}px;line-height:1.15;font-weight:${t.weight};letter-spacing:${t.tracking}">${n === 'caption' ? 'CAPTION LABEL' : 'Run your tutoring business'}</span><i>${t.size}/${t.line} · ${t.weight}</i></div>`)
    .join('\n      ')
  const radius = Object.entries(BRAND_RADIUS)
    .map(([n, px]) => `<div class="rad"><div style="border-radius:${Math.min(px, 28)}px"></div><code>${n} ${px === 999 ? 'full' : px + 'px'}</code></div>`)
    .join('')
  const space = BRAND_SPACE.map(px => `<div class="spc"><div style="width:${px}px;height:${px}px"></div><code>${px}</code></div>`).join('')
  const dont = (cls: string, label: string, inner: string) => `<div class="dont"><div class="stage ${cls}">${inner}</div><p><span class="x">✕</span> ${label}</p></div>`
  const logo = (file: string, h: number, style = '') => `<img src="${file}" height="${h}" alt="Tutafy logo" style="${style}">`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Tutafy brand sheet</title>
<style>
@font-face { font-family: "Geist"; src: url("fonts/Geist-Variable.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
:root {
${Object.entries(BRAND_COLORS).map(([n, v]) => `  ${brandVar(n)}: ${v};`).join('\n')}
  --brand-font: ${BRAND_FONT.stack};
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--brand-canvas); color: var(--brand-ink); font-family: var(--brand-font); font-size: 16px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
.sheet { max-width: 1440px; margin: 0 auto; padding: 48px 56px 56px; }
header { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; padding-bottom: 28px; border-bottom: 1px solid var(--brand-line); }
header p { margin: 0; color: var(--brand-ink-3); font-size: 14px; text-align: right; }
h2 { margin: 44px 0 16px; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--brand-ink-3); }
.grid { display: grid; gap: 16px; }
.g4 { grid-template-columns: repeat(4, 1fr); } .g3 { grid-template-columns: repeat(3, 1fr); } .g2 { grid-template-columns: 1.4fr 1fr; } .g6 { grid-template-columns: repeat(6, 1fr); }
.panel { border-radius: 16px; display: flex; align-items: center; justify-content: center; min-height: 168px; padding: 24px; position: relative; }
.panel small { position: absolute; left: 14px; bottom: 10px; font-size: 12px; font-weight: 600; opacity: .75; }
.p-light { background: #fff; box-shadow: inset 0 0 0 1px var(--brand-line); } .p-dark { background: var(--brand-canvas-dark); color: #fff; }
.p-brand { background: var(--brand-primary); color: #fff; } .p-soft { background: var(--brand-primary-soft); }
.card { background: #fff; border: 1px solid var(--brand-line); border-radius: 16px; padding: 24px; }
.card h3 { margin: 0 0 6px; font-size: 18px; letter-spacing: -.01em; } .card p { margin: 0; color: var(--brand-ink-2); font-size: 14px; }
.clear { display: flex; align-items: center; justify-content: center; padding: 18px; }
.clear .box { outline: 1px dashed var(--brand-primary); outline-offset: 0; padding: ${LOGO_CLEAR_SPACE * 96}px; background: repeating-linear-gradient(45deg, #fff 0 6px, var(--brand-primary-soft) 6px 7px); }
.clear .box > div { background: #fff; line-height: 0; }
.mins { display: flex; align-items: flex-end; gap: 28px; margin-top: 14px; }
.mins figure { margin: 0; text-align: center; font-size: 12px; color: var(--brand-ink-3); } .mins img { display: block; margin: 0 auto 6px; }
.sw .chip { height: 72px; border-radius: 12px; display: flex; align-items: flex-end; padding: 8px 10px; font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }
.sw b { display: block; margin-top: 8px; font-size: 14px; } .sw span { display: block; font-size: 12px; color: var(--brand-ink-3); font-family: ui-monospace, Menlo, Consolas, monospace; } .sw em { display: block; font-style: normal; font-size: 12px; color: var(--brand-ink-2); }
.colors { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px 14px; }
.trow { display: grid; grid-template-columns: 90px 1fr 120px; align-items: baseline; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--brand-line); } .trow code, .trow i, code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; color: var(--brand-ink-3); font-style: normal; }
.shapes { display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-end; margin-top: 8px; } .rad div { width: 64px; height: 64px; background: var(--brand-primary-soft); border: 2px solid var(--brand-primary); margin-bottom: 6px; } .spc { display: inline-block; margin-right: 14px; vertical-align: bottom; } .spc div { background: var(--brand-primary); margin-bottom: 6px; }
.dont .stage { height: 120px; border-radius: 12px; background: #fff; box-shadow: inset 0 0 0 1px var(--brand-line); display: flex; align-items: center; justify-content: center; overflow: hidden; } .dont p { margin: 8px 0 0; font-size: 13px; color: var(--brand-ink-2); } .x { color: var(--brand-danger); font-weight: 800; }
.voice { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; } .voice blockquote { margin: 0; padding: 14px 16px; border-radius: 12px; font-size: 15px; } .yes { background: #E8F7F0; border-left: 4px solid var(--brand-ok); } .no { background: #FDECEA; border-left: 4px solid var(--brand-danger); }
.voice b { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px; }
footer { margin-top: 40px; padding-top: 18px; border-top: 1px solid var(--brand-line); color: var(--brand-ink-3); font-size: 13px; display: flex; justify-content: space-between; gap: 24px; }
@media (max-width: 900px) { .sheet { padding: 24px 16px 32px; } header { flex-direction: column; align-items: flex-start; } header p { text-align: left; } .g4, .g3, .g2, .g6, .voice { grid-template-columns: 1fr 1fr; } .colors { grid-template-columns: repeat(2, 1fr); } .trow { grid-template-columns: 70px 1fr; } .trow i { display: none; } }
@media (max-width: 520px) { .g4, .g3, .g2, .g6, .voice { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<main class="sheet">
  <header>
    ${logo('tutafy-logo.svg', 56)}
    <p><b>Brand sheet</b> · logo D2 · ${SHEET_DATE}<br>Full rules: docs/brand/BRAND.md · files: /brand/</p>
  </header>

  <h2>Logo</h2>
  <div class="grid g4">
    <div class="panel p-light">${logo('tutafy-logo.svg', 56)}<small>Light surface</small></div>
    <div class="panel p-dark">${logo('tutafy-logo-dark.svg', 56)}<small>Dark surface</small></div>
    <div class="panel p-brand">${logo('tutafy-logo-mono-white.svg', 56)}<small>One colour, white</small></div>
    <div class="panel p-soft">${logo('tutafy-logo-mono-black.svg', 56)}<small>One colour, black</small></div>
  </div>
  <div class="grid g6" style="margin-top:16px">
    <div class="panel p-light">${logo('tutafy-icon.svg', 72)}<small>Icon</small></div>
    <div class="panel p-dark">${logo('tutafy-icon-dark.svg', 72)}<small>Icon, dark</small></div>
    <div class="panel p-soft">${logo('tutafy-icon-mono-black.svg', 72)}<small>Icon, black</small></div>
    <div class="panel p-brand">${logo('tutafy-icon-mono-white.svg', 72)}<small>Icon, white</small></div>
    <div class="panel p-light"><img src="tutafy-icon-maskable.svg" height="72" alt="Maskable app icon" style="border-radius:50%"><small>App icon, circle crop</small></div>
    <div class="panel" style="background:#8a8f9c"><img src="tutafy-badge.svg" height="72" alt="Notification badge"><small style="color:#fff">Push badge</small></div>
  </div>

  <h2>Space, size and misuse</h2>
  <div class="grid g2">
    <div class="card">
      <h3>Clear space and smallest size</h3>
      <p>Keep a quarter of the icon's height free on every side (the corner radius of the tile). Nothing enters that space. The icon is never drawn under ${LOGO_MIN.iconPx} px; the horizontal logo is never lower than ${LOGO_MIN.horizontalHeightPx} px high.</p>
      <div class="clear"><div class="box"><div>${logo('tutafy-logo.svg', 72)}</div></div></div>
      <div class="mins"><figure>${logo('tutafy-icon.svg', 16)}16 px<br>smallest</figure><figure>${logo('tutafy-icon.svg', 32)}32</figure><figure>${logo('tutafy-icon.svg', 48)}48</figure><figure>${logo('tutafy-logo.svg', 24)}horizontal, 24 px high</figure><figure>${logo('tutafy-logo.svg', 40)}40</figure></div>
    </div>
    <div class="card">
      <h3>Do not</h3>
      <div class="grid g3" style="margin-top:12px">
        ${dont('', 'Stretch or squash it', logo('tutafy-logo.svg', 44, 'transform:scale(1.2,.75)'))}
        ${dont('', 'Change its colours', logo('tutafy-logo.svg', 44, 'filter:hue-rotate(140deg) saturate(1.4)'))}
        ${dont('', 'Rotate or tilt it', logo('tutafy-logo.svg', 44, 'transform:rotate(-12deg)'))}
        ${dont('', 'Add a shadow or outline', logo('tutafy-logo.svg', 44, 'filter:drop-shadow(4px 5px 3px rgba(0,0,0,.45))'))}
        <div class="dont"><div class="stage" style="background:${l.light.tile}">${logo('tutafy-icon.svg', 56)}</div><p><span class="x">✕</span> Put the full-colour icon on a surface of its own colour</p></div>
        <div class="dont"><div class="stage"><span style="display:inline-flex;align-items:center;gap:8px">${logo('tutafy-icon.svg', 40)}<span style="font:italic 700 28px Georgia,serif">Tutafy</span></span></div><p><span class="x">✕</span> Set the word in another font</p></div>
      </div>
    </div>
  </div>

  <h2>Colour</h2>
  <div class="colors">
    ${swatch('primary', 'Indigo', 'Logo tile, main buttons, links')}
    ${swatch('primaryHover', 'Indigo, hover', 'Pressed and hover state')}
    ${swatch('primarySoft', 'Indigo, soft', 'Selected rows, tags')}
    ${swatch('primaryLine', 'Indigo, line', 'Borders on soft indigo')}
    ${swatch('accent', 'Amber', 'The tassel; a small accent only')}
    ${swatch('primaryOnDark', 'Indigo on dark', 'Logo tile on a dark surface')}
    ${swatch('primaryTextOnDark', 'Indigo text on dark', 'Links and active items on dark')}
    ${swatch('primarySoftOnDark', 'Indigo soft on dark', 'Selected rows on dark')}
    ${swatch('accentOnDark', 'Amber on dark', 'The tassel on a dark surface')}
    ${swatch('ink', 'Ink', 'Headings and body text')}
    ${swatch('ink2', 'Ink 2', 'Secondary text')}
    ${swatch('ink3', 'Ink 3', 'Captions, placeholders')}
    ${swatch('canvas', 'Canvas', 'App background')}
    ${swatch('surface', 'Surface', 'Cards and panels')}
    ${swatch('line', 'Line', 'Borders and dividers')}
    ${swatch('canvasDark', 'Canvas, dark', 'Dark background')}
    ${swatch('surfaceDark', 'Surface, dark', 'Dark cards')}
    ${swatch('lineDark', 'Line, dark', 'Dark borders')}
    ${swatch('ok', 'Success', 'Paid, done')}
    ${swatch('warn', 'Warning', 'Needs attention')}
    ${swatch('danger', 'Danger', 'Errors, cancel')}
    ${swatch('inkOnDark', 'Ink on dark', 'Text on a dark surface')}
  </div>

  <h2>Type, corners and spacing</h2>
  <div class="grid g2">
    <div class="card">
      <h3>${BRAND_FONT.family}</h3>
      <p>One family for everything: ${BRAND_FONT.family} (regular 400 to extra bold 800). The word in the logo is Geist Bold drawn as outlines, so the logo never depends on the font loading.</p>
      ${type}
    </div>
    <div class="card">
      <h3>Corners and spacing</h3>
      <p>Corners: 6, 8, 12, 16 and full. Spacing on a 4 px grid: 4, 8, 12, 16, 24, 32, 48, 64.</p>
      <div class="shapes">${radius}</div>
      <div style="margin-top:20px">${space}</div>
    </div>
  </div>

  <h2>Voice</h2>
  <div class="voice">
    <blockquote class="yes"><b>Right</b>Share one link. Students see your real availability in their timezone and book. No emails, no double-bookings.</blockquote>
    <blockquote class="no"><b>Wrong</b>Unlock a seamless, next-level booking experience that empowers your tutoring journey.</blockquote>
    <blockquote class="yes"><b>Right</b>Never. Unlike marketplaces, ${BRAND_NAME} takes 0% of what your students pay you, on every plan.</blockquote>
    <blockquote class="no"><b>Wrong</b>Our revolutionary all-in-one solution transforms the way you teach!</blockquote>
  </div>
  <p style="color:var(--brand-ink-2);font-size:14px;margin-top:14px">Short and direct, like a colleague in the trade. Say the number, the price or the step. Honest about limits. Warm, not gushing: no exclamation marks, no emoji as icons. English only in the product.</p>

  <footer><span>${BRAND_NAME} · brand sheet · ${SHEET_DATE}</span><span>Logo chosen by the owner (D2). Trademark search not done yet.</span></footer>
</main>
</body>
</html>
`
}
