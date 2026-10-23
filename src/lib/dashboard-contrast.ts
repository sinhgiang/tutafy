// Contrast of the tutor app's colour tokens (T-0820). The tokens are written once, in src/styles/dashboard-shell.css;
// this file reads them from there, so the numbers always come from the colours the app really uses.
// WCAG 2.x: a ratio of at least 4.5 to 1 for normal text.
export type Pair = { text: string; background: string; note: string }

/** Every text colour on every background it is drawn on in the shell. A new pair used in the shell is added here. */
export const PAIRS: Pair[] = [
  ...(['--d-bg', '--d-surface', '--d-surface-2'] as const).flatMap(bg => (['--d-ink', '--d-ink-2', '--d-ink-3'] as const).map(t => ({ text: t, background: bg, note: 'body and secondary text' }))),
  { text: '--d-brand', background: '--d-surface', note: 'links and current page on a card' },
  { text: '--d-brand', background: '--d-surface-2', note: 'links on the sidebar hover' },
  { text: '--d-brand', background: '--d-brand-soft', note: 'current page in the sidebar, notice bar link' },
  { text: '--d-ink-2', background: '--d-brand-soft', note: 'notice bar text' },
  { text: '--d-ink', background: '--d-brand-soft', note: 'notice bar heading' },
  { text: '--d-brand-ink', background: '--d-brand', note: 'primary button' },
  { text: '--d-brand-ink', background: '--d-brand-hover', note: 'primary button, hovered' },
  { text: '--d-ok', background: '--d-ok-soft', note: 'success tag' },
  { text: '--d-ok', background: '--d-surface', note: 'success text on a card' },
  { text: '--d-warn', background: '--d-warn-soft', note: 'warning tag' },
  { text: '--d-warn', background: '--d-surface', note: 'warning text on a card' },
  { text: '--d-err', background: '--d-err-soft', note: 'error tag' },
  { text: '--d-err', background: '--d-surface', note: 'error text on a card' },
]

export const THEMES = [
  { name: 'light', selector: '.dash {' },
  { name: 'dark', selector: '.dash[data-theme="dark"] {' },
] as const

/** The --d-* colours of one block of the CSS file. */
export function readTokens(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(selector)
  if (start < 0) throw new Error(`no block ${selector}`)
  const end = css.indexOf('}', start)
  const tokens: Record<string, string> = {}
  for (const m of css.slice(start, end).matchAll(/(--d-[a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\b/g)) tokens[m[1]] = m[2].toUpperCase()
  return tokens
}

function channel(v: number): number {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export type Measured = { theme: string; text: string; background: string; note: string; ratio: number }

/** The ratio of every pair in both themes. The dark block only overrides some tokens, so it starts from the light ones. */
export function measureAll(css: string): Measured[] {
  const light = readTokens(css, THEMES[0].selector)
  const dark = { ...light, ...readTokens(css, THEMES[1].selector) }
  const out: Measured[] = []
  for (const [theme, tokens] of [['light', light], ['dark', dark]] as const) {
    for (const p of PAIRS) {
      const t = tokens[p.text], b = tokens[p.background]
      if (!t || !b) throw new Error(`token missing in ${theme}: ${t ? p.background : p.text}`)
      out.push({ theme, text: p.text, background: p.background, note: p.note, ratio: Math.round(contrast(t, b) * 100) / 100 })
    }
  }
  return out
}

export const MIN_RATIO = 4.5
