import { ICON_SHAPES as S, ICON_SIZE, LOGO_COLORS, type LogoTheme } from '@/lib/brand'

// The Tutafy icon (logo D2, T-0969) and the one place the React side draws its shapes: BrandLogo uses IconShapes too. The shapes and
// colours are from src/lib/brand.ts, the same numbers src/lib/brand-svg.ts writes into public/brand/*.svg; tests/brand.test.ts renders
// both and fails if they differ. theme "auto" follows the app's theme through the --brand-logo-* variables (src/styles/brand-tokens.css).
export type BrandTheme = LogoTheme | 'auto'

export function brandInk(theme: BrandTheme): { tile: string; cap: string; tassel: string; word: string } {
  if (theme === 'auto') return { tile: 'var(--brand-logo-tile)', cap: LOGO_COLORS.light.cap, tassel: 'var(--brand-logo-tassel)', word: 'var(--brand-logo-word)' }
  return LOGO_COLORS[theme]
}

// A colour that is a CSS variable has to go in style: some browsers do not read var() in a presentation attribute.
const paint = (c: string, prop: 'fill' | 'stroke') => (c.startsWith('var(') ? { style: { [prop]: c } } : { [prop]: c })

export function IconShapes({ theme }: { theme: BrandTheme }) {
  const c = brandInk(theme)
  return (
    <>
      <rect x={S.tile.x} y={S.tile.y} width={S.tile.size} height={S.tile.size} rx={S.tile.radius} {...paint(c.tile, 'fill')} />
      <path d={S.capTop} fill={c.cap} />
      <path d={S.capBottom} fill={c.cap} fillOpacity={S.capBottomOpacity} />
      <path d={S.tassel.line} fill="none" strokeWidth={S.tassel.width} strokeLinecap="round" {...paint(c.tassel, 'stroke')} />
      <circle cx={S.tassel.dot.cx} cy={S.tassel.dot.cy} r={S.tassel.dot.r} {...paint(c.tassel, 'fill')} />
    </>
  )
}

/** The icon alone: the indigo tile, the cap, the amber tassel. `size` is the width and height in px. Decorative unless `title` is given. */
export function BrandMark({ size = 32, theme = 'light', title, className }: { size?: number; theme?: BrandTheme; title?: string; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`}
      width={size}
      height={size}
      className={className}
      data-brand="icon"
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true, focusable: false })}
    >
      <IconShapes theme={theme} />
    </svg>
  )
}
