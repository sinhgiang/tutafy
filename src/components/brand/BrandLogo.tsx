import { LOGO_HEIGHT, LOGO_WIDTH, WORDMARK_PATH } from '@/lib/brand-wordmark'
import { IconShapes, brandInk, type BrandTheme } from '@/components/brand/BrandMark'

/**
 * The horizontal Tutafy logo: icon and the word, the word drawn as outlines of Geist Bold (so no font has to load). `height` is the
 * height of the whole logo in px (the tile is 94 % of it, 2 units of margin on each side like the file). It is a picture of the name,
 * so give it a `title` when it stands alone; inside a link that already has a name, leave it decorative.
 */
export function BrandLogo({ height = 32, theme = 'light', title, className }: { height?: number; theme?: BrandTheme; title?: string; className?: string }) {
  const c = brandInk(theme)
  const word = c.word.startsWith('var(') ? { style: { fill: c.word } } : { fill: c.word }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}`}
      width={Math.round((height * LOGO_WIDTH) / LOGO_HEIGHT)}
      height={height}
      className={className}
      data-brand="logo"
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true, focusable: false })}
    >
      <IconShapes theme={theme} />
      <path d={WORDMARK_PATH} {...word} />
    </svg>
  )
}
