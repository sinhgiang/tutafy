// T-0842: the tutor app is legible in light and dark, on every page, including the pages not rebuilt yet.
// The browser audit that found the problems (text under 12px, pale grey text, a bell badge that fails in dark,
// icon-only links with no name) is described in the status file. This file keeps the causes from coming back:
//   - the shell stylesheet floors every pale grey and every size under 12px that a legacy page can still say;
//   - no page of the tutor app (or a component it draws) says a size under 12px the floor does not cover;
//   - the colours the floor maps to reach 4.5 to 1 on the surfaces the legacy pages put text on, in both themes;
//   - an icon-only back link has an accessible name.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { MIN_RATIO, contrast, readTokens } from '@/lib/dashboard-contrast'
import { dashboardPageFiles } from './support/page-frame-scan.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const css = read('src/styles/dashboard-shell.css')

/** Tailwind greys a legacy page uses for text, all of them pale on white. */
const PALE = ['text-gray-200', 'text-gray-300', 'text-gray-400', 'text-gray-500', 'text-slate-400', 'text-slate-500']
/** Sizes a legacy page may still write; the floor makes each of them 12px. */
const FLOORED = ['9px', '10px', '11px']
/** Legacy colours that were under 4.5 to 1 on their tint, and the shell token each one now reads. */
const TINTS: Record<string, string> = {
  'text-amber-500': '--d-warn', 'text-amber-600': '--d-warn', 'text-orange-600': '--d-warn',
  'text-emerald-500': '--d-ok', 'text-emerald-600': '--d-ok', 'text-green-500': '--d-ok', 'text-green-600': '--d-ok',
  'text-indigo-400': '--d-brand', 'text-indigo-500': '--d-brand', 'text-red-400': '--d-err', 'text-red-500': '--d-err',
  'text-blue-400': '--d-brand', 'text-blue-500': '--d-brand', 'text-blue-600': '--d-brand',
}
/** Solid buttons that carry white text: the fill the floor gives them (white on each is over 4.5 to 1). */
const SOLID: Record<string, string> = { 'bg-indigo-500': '#4F46E5', 'bg-emerald-500': '#047857' }

/** The declarations of every rule that names `selector` (exactly) in its selector list. */
function declarationsFor(sheet: string, selector: string): string[] {
  const out: string[] = []
  for (const m of sheet.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (m[1].split(',').map(s => s.trim()).includes(selector)) out.push(m[2])
  }
  return out
}

/** What the floor in the shell stylesheet is missing. */
export function floorGaps(sheet: string): string[] {
  const gaps: string[] = []
  for (const c of PALE) if (!declarationsFor(sheet, `.dash .${c}`).some(d => /color:\s*var\(--d-ink-3\)/.test(d))) gaps.push(`${c} is not mapped to --d-ink-3`)
  for (const s of FLOORED) if (!declarationsFor(sheet, `.dash .text-\\[${s}\\]`).some(d => /font-size:\s*12px/.test(d))) gaps.push(`text-[${s}] is not floored to 12px`)
  for (const [c, token] of Object.entries(TINTS)) if (!declarationsFor(sheet, `.dash .${c}`).some(d => d.includes(`color: var(${token})`))) gaps.push(`${c} is not mapped to ${token}`)
  for (const [c, fill] of Object.entries(SOLID)) if (!declarationsFor(sheet, `.dash .${c}`).some(d => d.includes(`background-color: ${fill}`))) gaps.push(`${c} does not get the darker fill ${fill}`)
  if (!declarationsFor(sheet, '.dash[data-theme="dark"] .dash-icon-btn .dash-dot').some(d => /color:\s*#[0-9A-Fa-f]{6}/.test(d))) gaps.push('the bell badge has no dark text colour')
  return gaps
}

/** Sizes in a page's source that are under 12px and not covered by the floor. */
export function smallSizes(src: string): string[] {
  const out: string[] = []
  for (const m of src.matchAll(/text-\[([0-9.]+)(px|rem|em)\]/g)) {
    const n = Number(m[1])
    const px = m[2] === 'px' ? n : n * 16
    if (px < 12 && !FLOORED.includes(`${m[1]}px`)) out.push(m[0])
  }
  for (const m of src.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)\b(?!\s*\*)/g)) if (Number(m[1]) < 12) out.push(m[0])
  return out
}

/** Icon-only back links (a 32px square link) with no aria-label. */
export function unnamedBackLinks(src: string): string[] {
  return [...src.matchAll(/<(?:Link|a)\b[^>]*w-8 h-8 flex[^>]*>/g)].map(m => m[0]).filter(tag => !/aria-label=/.test(tag))
}

const files = dashboardPageFiles(ROOT)

test('the shell stylesheet floors pale greys, tinted colours and sizes under 12px for legacy pages', () => {
  assert.deepEqual(floorGaps(css), [])
})

test('the floor is real: taking a rule out makes the check fail (mutation on the real CSS)', () => {
  for (const [from, to] of [
    ['.dash .text-gray-400,', '.dash .text-gray-4000,'],
    ['.dash .text-\\[11px\\] { font-size: 12px; }', '.dash .text-\\[11px\\] { font-size: 11px; }'],
    ['.dash .text-amber-600,', '.dash .text-amber-6000,'],
    ['.dash[data-theme="dark"] .dash-icon-btn .dash-dot { color: #1F0A09; }', ''],
  ]) {
    const mutated = css.replace(from, to)
    assert.notEqual(mutated, css, from)
    assert.ok(floorGaps(mutated).length > 0, `${from} -> ${to} was not caught`)
  }
})

test('no page of the tutor app, or component it draws, says a size under 12px the floor does not cover', () => {
  assert.ok(files.length > 40, `only ${files.length} files scanned`)
  const found = files.flatMap(f => smallSizes(read(f)).map(s => `${f}: ${s}`))
  assert.deepEqual(found, [])
  // the scan really reads: a made-up page is caught
  assert.deepEqual(smallSizes('<p className="text-[8px]">x</p>'), ['text-[8px]'])
  assert.deepEqual(smallSizes('<p className="text-[0.6rem]">x</p>'), ['text-[0.6rem]'])
  assert.deepEqual(smallSizes('<i style={{ fontSize: 9 }} />'), ['fontSize: 9'])
  assert.deepEqual(smallSizes('<p className="text-[11px] text-[12px]" style={{ fontSize: size * 0.36 }} />'), [])
})

test('every icon-only back link in the tutor app has an accessible name', () => {
  const found = files.flatMap(f => unnamedBackLinks(read(f)).map(t => `${f}: ${t.slice(0, 60)}`))
  assert.deepEqual(found, [])
  assert.equal(unnamedBackLinks('<Link href="/a" className="w-8 h-8 flex items-center">').length, 1)
  assert.equal(unnamedBackLinks('<Link href="/a" aria-label="Back" className="w-8 h-8 flex">').length, 0)
})

test('the colours the floor maps to reach 4.5 to 1 on the surfaces legacy pages put text on, in both themes', () => {
  const light = readTokens(css, '.dash {')
  const dark = readTokens(css, '.dash[data-theme="dark"] {')
  const rows: string[] = []
  // light: white, the legacy grey-50 and grey-100 cards, and the shell's own tints
  for (const bg of ['#FFFFFF', '#F9FAFB', '#F3F4F6', light['--d-surface-2'], light['--d-bg']]) {
    const r = contrast(light['--d-ink-3'], bg)
    if (r < MIN_RATIO) rows.push(`light ink-3 on ${bg}: ${r.toFixed(2)}`)
  }
  for (const [theme, t] of [['light', light], ['dark', dark]] as const) {
    for (const [fg, bg] of [['--d-ink-3', '--d-surface'], ['--d-ink-3', '--d-surface-2'], ['--d-ink-3', '--d-bg'], ['--d-warn', '--d-warn-soft'], ['--d-ok', '--d-ok-soft'], ['--d-err', '--d-err-soft'], ['--d-brand', '--d-brand-soft'], ['--d-brand', '--d-surface'], ['--d-err', '--d-surface']]) {
      const r = contrast(t[fg], t[bg])
      if (r < MIN_RATIO) rows.push(`${theme} ${fg} on ${bg}: ${r.toFixed(2)}`)
    }
  }
  for (const [c, fill] of Object.entries(SOLID)) if (contrast('#FFFFFF', fill) < MIN_RATIO) rows.push(`white on ${c} fill ${fill}`)
  // the bell badge: dark text on the dark theme's red
  const badge = /\.dash\[data-theme="dark"\] \.dash-icon-btn \.dash-dot \{ color: (#[0-9A-Fa-f]{6}); \}/.exec(css)![1]
  if (contrast(badge, dark['--d-err']) < MIN_RATIO) rows.push(`dark badge ${badge} on ${dark['--d-err']}`)
  assert.deepEqual(rows, [])
})
