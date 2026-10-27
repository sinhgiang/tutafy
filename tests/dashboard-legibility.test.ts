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
import { dashboardPageFiles, tsxFiles } from './support/page-frame-scan.ts'

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

// ---- T-0842, second pass: the same audit with placeholders counted as the pale text they are, and with "has a name" meaning
// a label or aria-label, not a placeholder. These keep the form fixes from coming back.

/** The opening tag of every input, textarea and select in a source: from "<input" to the ">" that is not inside braces or quotes. */
export function controlTags(src: string): { tag: string; before: string }[] {
  const out: { tag: string; before: string }[] = []
  for (const m of src.matchAll(/<(input|textarea|select)\b/g)) {
    let i = m.index! + m[0].length
    let depth = 0
    let quote: string | null = null
    const start = m.index!
    for (; i < src.length; i++) {
      const c = src[i]
      if (quote) { if (c === quote) quote = null; continue }
      if (depth > 0) { if (c === '{') depth++; else if (c === '}') depth--; else if (c === '"' || c === "'" || c === '`') quote = c; continue }
      if (c === '{') { depth = 1; continue }
      if (c === '"' || c === "'") { quote = c; continue }
      if (c === '>') break
    }
    out.push({ tag: src.slice(start, i + 1), before: src.slice(Math.max(0, start - 400), start) })
  }
  return out
}

/** Controls a screen reader would read as "edit text, blank": no label, no aria-label, and not inside a label. A placeholder is not a name. */
export function unnamedControls(src: string): string[] {
  const hasFor = /htmlFor=/.test(src)
  return controlTags(src)
    .filter(({ tag, before }) => {
      if (/type="hidden"/.test(tag) || /\{\.\.\./.test(tag)) return false
      if (/className="hidden"/.test(tag) || /aria-hidden="true"/.test(tag)) return false // a file input a button opens; the button has the name
      if (/aria-label(?:ledby)?=/.test(tag)) return false
      if (/\bid=/.test(tag) && hasFor) return false
      const open = before.lastIndexOf('<label')
      if (open >= 0 && before.indexOf('</label>', open) < 0) return false // wrapped in a label
      return true
    })
    .map(({ tag }) => tag.replace(/\s+/g, ' ').slice(0, 80))
}

const formFiles = [...new Set([...files, ...tsxFiles(ROOT, 'src/components/settings')])]

test('every input, textarea and select of the tutor app has a name that is not its placeholder', () => {
  assert.ok(formFiles.length > 40, `only ${formFiles.length} files scanned`)
  const found = formFiles.flatMap(f => unnamedControls(read(f)).map(t => `${f}: ${t}`))
  assert.deepEqual(found, [])
  // the scan really reads: a field with only a placeholder is caught, a labelled or named one is not
  assert.equal(unnamedControls('<input value={a} onChange={e => set(e.target.value)} placeholder="Name" className="x" />').length, 1)
  assert.equal(unnamedControls('<textarea\n  value={a}\n  placeholder="Notes"\n/>').length, 1)
  assert.equal(unnamedControls('<input aria-label="Name" value={a} />').length, 0)
  assert.equal(unnamedControls('<label htmlFor="n">Name</label><input id="n" value={a} />').length, 0)
  assert.equal(unnamedControls('<label className="x">Name <input value={a} /></label>').length, 0)
  assert.equal(unnamedControls('<label>Name</label><input value={a} />').length, 1)
  assert.equal(unnamedControls('<input id="n" value={a} />').length, 1) // an id with no label for it names nothing
  assert.equal(unnamedControls('<input ref={r} type="file" className="hidden" onChange={f} />').length, 0)
  assert.equal(unnamedControls('<input ref={r} type="file" className="sr-only" tabIndex={-1} aria-hidden="true" />').length, 0)
  // and on a real page: taking the name off the price field is caught
  const lessonForm = read('src/app/(dashboard)/lessons/new/page.tsx')
  const unnamed = lessonForm.replace('aria-label="Price (USD)" ', '')
  assert.notEqual(unnamed, lessonForm)
  assert.equal(unnamedControls(unnamed).length, unnamedControls(lessonForm).length + 1)
})

test('a placeholder and the shadcn muted text read the shell\'s third ink, so neither is pale in either theme', () => {
  assert.ok(declarationsFor(css, '.dash ::placeholder').some(d => /color:\s*var\(--d-ink-3\)/.test(d) && /opacity:\s*1/.test(d)), 'placeholder rule missing')
  assert.ok(declarationsFor(css, '.dash').some(d => /--muted-foreground:\s*var\(--d-ink-3\)/.test(d)), '--muted-foreground is not the third ink')
  for (const [from, to] of [['.dash ::placeholder {', '.dash ::placeholderx {'], ['--muted-foreground: var(--d-ink-3);', '']]) {
    const mutated = css.replace(from, to)
    assert.notEqual(mutated, css, from)
    assert.ok(!declarationsFor(mutated, '.dash ::placeholder').length || !declarationsFor(mutated, '.dash').some(d => /--muted-foreground/.test(d)), `${from} -> ${to} was not caught`)
  }
  // no page puts a lighter placeholder back with a class the floor does not reach
  const found = files.flatMap(f => [...read(f).matchAll(/placeholder:text-(?:gray|slate)-(?:100|200)/g)].map(m => `${f}: ${m[0]}`))
  assert.deepEqual(found, [])
})
