// The one place that says what Tutafy looks like (T-0969): colours, the font, the type scale, corners, spacing and the shapes of the logo.
// Everything that draws the brand reads from here: the CSS variables (src/styles/brand-tokens.css, written by `npm run brand:build`),
// the logo components, the share picture, the web app manifest, the browser colour, the logo files in public/brand/ and the one-page
// brand sheet. docs/brand/BRAND.md describes the same values in words; tests/brand.test.ts fails when any of them differ.
// The logo is the owner's choice D2 of 25 Oct 2026 (a mortarboard in an indigo app tile, an amber tassel).

export const BRAND_NAME = 'Tutafy'

/** Hex colours. Names are the CSS variable names without the `--brand-` prefix, so `primaryHover` is `--brand-primary-hover`. */
export const BRAND_COLORS = {
  // Brand
  primary: '#4F46E5',
  primaryHover: '#4338CA',
  primarySoft: '#EEF0FF',
  primaryLine: '#C7CCFA',
  accent: '#F59E0B',
  // The same brand on a dark surface (the logo tile is lighter so it keeps its contrast)
  primaryOnDark: '#6366F1',
  primaryTextOnDark: '#818CF8',
  primaryHoverOnDark: '#A5B4FC',
  primarySoftOnDark: '#232A52',
  primaryLineOnDark: '#3B4586',
  accentOnDark: '#FBBF24',
  // Ink and surfaces, light
  ink: '#111827',
  ink2: '#374151',
  ink3: '#5B6475',
  canvas: '#F6F7FB',
  surface: '#FFFFFF',
  surface2: '#F3F4F8',
  line: '#E5E7EF',
  lineStrong: '#D0D4E0',
  // Ink and surfaces, dark
  inkOnDark: '#F3F4F8',
  ink2OnDark: '#D1D5E0',
  ink3OnDark: '#A3ABBD',
  canvasDark: '#0E1117',
  surfaceDark: '#171B24',
  surface2Dark: '#1F2430',
  lineDark: '#2A3040',
  lineStrongDark: '#3A4256',
  // Status: the colour of the text and the soft background it sits on, light then dark
  ok: '#047857',
  okSoft: '#E8F7F0',
  warn: '#92400E',
  warnSoft: '#FEF3C7',
  danger: '#B42318',
  dangerSoft: '#FDECEA',
  okOnDark: '#34D399',
  okSoftOnDark: '#12261F',
  warnOnDark: '#FBBF24',
  warnSoftOnDark: '#2B2208',
  dangerOnDark: '#F87171',
  dangerSoftOnDark: '#2E1514',
  // White, the cap of the logo
  white: '#FFFFFF',
} as const

export type BrandColorName = keyof typeof BRAND_COLORS

/** What each colour is for, one line. Shown in docs/brand/BRAND.md (the table there is written from this). */
export const BRAND_COLOR_USE: Record<BrandColorName, string> = {
  primary: 'Logo tile, main buttons, links, focus ring',
  primaryHover: 'Hover and pressed state of an indigo button or link',
  primarySoft: 'Selected row, tag, quiet highlight',
  primaryLine: 'Border on a soft indigo surface',
  accent: 'The tassel. A small accent only, never a button or a large area',
  primaryOnDark: 'Logo tile on a dark surface',
  primaryTextOnDark: 'Links, active items and the main button on a dark surface',
  primaryHoverOnDark: 'Hover state on a dark surface',
  primarySoftOnDark: 'Selected row on a dark surface',
  primaryLineOnDark: 'Border on a soft indigo dark surface',
  accentOnDark: 'The tassel on a dark surface',
  ink: 'Headings and body text',
  ink2: 'Secondary text',
  ink3: 'Captions, placeholders, quiet labels',
  canvas: 'App background',
  surface: 'Cards, panels, the page of a public site',
  surface2: 'A quiet panel inside a card, table header',
  line: 'Borders and dividers',
  lineStrong: 'A border that has to be seen (inputs, buttons)',
  inkOnDark: 'Headings and body text on a dark surface',
  ink2OnDark: 'Secondary text on a dark surface',
  ink3OnDark: 'Captions on a dark surface',
  canvasDark: 'Dark app background, the share picture, the app splash screen',
  surfaceDark: 'Dark cards and panels',
  surface2Dark: 'A quiet panel inside a dark card',
  lineDark: 'Dark borders and dividers',
  lineStrongDark: 'A dark border that has to be seen',
  ok: 'Paid, done, success (text)',
  okSoft: 'Background behind success text',
  warn: 'Needs attention (text)',
  warnSoft: 'Background behind warning text',
  danger: 'Error, cancel, delete (text)',
  dangerSoft: 'Background behind error text',
  okOnDark: 'Success text on a dark surface',
  okSoftOnDark: 'Background behind success text on dark',
  warnOnDark: 'Warning text on a dark surface',
  warnSoftOnDark: 'Background behind warning text on dark',
  dangerOnDark: 'Error text on a dark surface',
  dangerSoftOnDark: 'Background behind error text on dark',
  white: 'The cap of the logo, text on a main button',
}

/**
 * How the tutor app shell names the brand colours (the --d-* variables of src/styles/dashboard-shell.css). `npm run brand:build` writes
 * them between the "brand:begin" and "brand:end" marks of that file, so the shell cannot hold a colour the brand does not have. They stay
 * written as hex in the file because the contrast test (npm run contrast) reads the hex values from it.
 */
export const DASH_TOKENS: Record<'light' | 'dark', Record<string, BrandColorName>> = {
  light: {
    '--d-bg': 'canvas', '--d-surface': 'surface', '--d-surface-2': 'surface2', '--d-line': 'line', '--d-line-strong': 'lineStrong',
    '--d-ink': 'ink', '--d-ink-2': 'ink2', '--d-ink-3': 'ink3',
    '--d-brand': 'primary', '--d-brand-hover': 'primaryHover', '--d-brand-ink': 'white', '--d-brand-soft': 'primarySoft', '--d-brand-line': 'primaryLine',
    '--d-ok': 'ok', '--d-ok-soft': 'okSoft', '--d-warn': 'warn', '--d-warn-soft': 'warnSoft', '--d-err': 'danger', '--d-err-soft': 'dangerSoft',
  },
  dark: {
    '--d-bg': 'canvasDark', '--d-surface': 'surfaceDark', '--d-surface-2': 'surface2Dark', '--d-line': 'lineDark', '--d-line-strong': 'lineStrongDark',
    '--d-ink': 'inkOnDark', '--d-ink-2': 'ink2OnDark', '--d-ink-3': 'ink3OnDark',
    '--d-brand': 'primaryTextOnDark', '--d-brand-hover': 'primaryHoverOnDark', '--d-brand-ink': 'canvasDark', '--d-brand-soft': 'primarySoftOnDark', '--d-brand-line': 'primaryLineOnDark',
    '--d-ok': 'okOnDark', '--d-ok-soft': 'okSoftOnDark', '--d-warn': 'warnOnDark', '--d-warn-soft': 'warnSoftOnDark', '--d-err': 'dangerOnDark', '--d-err-soft': 'dangerSoftOnDark',
  },
}

/** The CSS custom property of a colour: `primaryHover` -> `--brand-primary-hover`. */
export function brandVar(name: string): string {
  return `--brand-${name.replace(/([A-Z0-9])/g, '-$1').toLowerCase()}`
}

export const BRAND_FONT = {
  family: 'Geist',
  /** What the browser falls back to for a moment, or if the font cannot load. */
  stack: "Geist, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  /** Loaded in src/app/layout.tsx with next/font/google; the logo's word is drawn as outlines from Geist Bold. */
  weights: { regular: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800 },
} as const

/** The type scale in px. `min` is the smallest text anywhere (the touch layer lifts phones to 14). */
export const BRAND_TYPE = {
  display: { size: 48, line: 52, weight: 800, tracking: '-0.03em' },
  h1: { size: 34, line: 40, weight: 800, tracking: '-0.025em' },
  h2: { size: 24, line: 30, weight: 700, tracking: '-0.02em' },
  h3: { size: 18, line: 26, weight: 700, tracking: '-0.01em' },
  body: { size: 16, line: 26, weight: 400, tracking: '0' },
  small: { size: 14, line: 20, weight: 500, tracking: '0' },
  caption: { size: 12, line: 16, weight: 600, tracking: '0.04em' },
} as const

export const BRAND_RADIUS = { sm: 6, md: 8, lg: 12, xl: 16, pill: 999 } as const
/** Spacing in px, on a 4 px grid. */
export const BRAND_SPACE = [4, 8, 12, 16, 24, 32, 48, 64] as const

// ---- The logo ---------------------------------------------------------------------------------------------------------------
// A 64 x 64 grid. These are the exact shapes of the owner's file (inbox/tutafy-logo-d2-source.svg), nothing redrawn.
export const ICON_SIZE = 64
export const ICON_SHAPES = {
  tile: { x: 2, y: 2, size: 60, radius: 16 },
  capTop: 'M32 13L54 25L32 37L10 25Z',
  capBottom: 'M19 31V39Q32 47 45 39V31L32 38Z',
  capBottomOpacity: 0.78,
  tassel: { line: 'M52 27V43', width: 3.5, dot: { cx: 52, cy: 46, r: 3.8 } },
} as const

/** The horizontal logo: icon, a gap of 16, the word. The word is x 80 and up; see src/lib/brand-wordmark.ts. */
export const LOGO_WORD_X = 80

export type LogoTheme = 'light' | 'dark'

/** Which colour each part of the full-colour logo has on a light or a dark surface. */
export const LOGO_COLORS: Record<LogoTheme, { tile: string; cap: string; tassel: string; word: string }> = {
  light: { tile: BRAND_COLORS.primary, cap: BRAND_COLORS.white, tassel: BRAND_COLORS.accent, word: BRAND_COLORS.ink },
  dark: { tile: BRAND_COLORS.primaryOnDark, cap: BRAND_COLORS.white, tassel: BRAND_COLORS.accentOnDark, word: BRAND_COLORS.white },
}

/** The smallest the logo may be drawn. The icon is checked at 16 px (the browser tab); the horizontal logo keeps the word readable. */
export const LOGO_MIN = { iconPx: 16, horizontalHeightPx: 24 } as const
/** Clear space around the logo, as a share of the icon's height: one quarter, the corner radius of the tile. */
export const LOGO_CLEAR_SPACE = 0.25
/** The maskable app icon keeps the logo inside the middle 80 % circle, so it is drawn at this share of the full square. */
export const MASKABLE_SCALE = 0.8
