// Draws the Tutafy logo as SVG text (T-0969). One builder for every use: the files in public/brand/, the inline logo of the invoice,
// the browser icon and the picture the share image is made of. The shapes and colours come from src/lib/brand.ts; the word is the
// outline in src/lib/brand-wordmark.ts. The React components (src/components/brand/) draw the same shapes as JSX; tests/brand.test.ts
// renders both and fails if they differ.
import { ICON_SHAPES, ICON_SIZE, LOGO_COLORS, MASKABLE_SCALE, type LogoTheme } from '@/lib/brand'
import { LOGO_HEIGHT, LOGO_WIDTH, WORDMARK_PATH } from '@/lib/brand-wordmark'

export type IconInk = LogoTheme | 'mono-black' | 'mono-white'

const S = ICON_SHAPES

function num(n: number): string {
  return String(n)
}

/** The shapes of the full-colour icon (tile, cap, tassel), without an <svg> around them. */
export function iconShapes(theme: LogoTheme): string {
  const c = LOGO_COLORS[theme]
  return [
    `<rect x="${S.tile.x}" y="${S.tile.y}" width="${S.tile.size}" height="${S.tile.size}" rx="${S.tile.radius}" fill="${c.tile}"/>`,
    `<path d="${S.capTop}" fill="${c.cap}"/>`,
    `<path d="${S.capBottom}" fill="${c.cap}" fill-opacity="${num(S.capBottomOpacity)}"/>`,
    `<path d="${S.tassel.line}" fill="none" stroke="${c.tassel}" stroke-width="${num(S.tassel.width)}" stroke-linecap="round"/>`,
    `<circle cx="${S.tassel.dot.cx}" cy="${S.tassel.dot.cy}" r="${num(S.tassel.dot.r)}" fill="${c.tassel}"/>`,
  ].join('\n  ')
}

/** One colour: the tile is solid and the cap and tassel are cut out of it, so it prints in black or white on anything. */
export function monoIconShapes(color: string, maskId: string): string {
  return [
    `<defs><mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${ICON_SIZE}" height="${ICON_SIZE}">`,
    `    <rect width="${ICON_SIZE}" height="${ICON_SIZE}" fill="#fff"/>`,
    `    <path d="${S.capTop}" fill="#000"/>`,
    `    <path d="${S.capBottom}" fill="#000"/>`,
    `    <path d="${S.tassel.line}" fill="none" stroke="#000" stroke-width="${num(S.tassel.width)}" stroke-linecap="round"/>`,
    `    <circle cx="${S.tassel.dot.cx}" cy="${S.tassel.dot.cy}" r="${num(S.tassel.dot.r)}" fill="#000"/>`,
    `  </mask></defs>`,
    `<rect x="${S.tile.x}" y="${S.tile.y}" width="${S.tile.size}" height="${S.tile.size}" rx="${S.tile.radius}" fill="${color}" mask="url(#${maskId})"/>`,
  ].join('\n  ')
}

function wrap(width: number, height: number, body: string, note: string, size?: number): string {
  const w = size ? Math.round((size * width) / height) : width
  const h = size ?? height
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${w}" height="${h}">\n  <!-- ${note} -->\n  ${body}\n</svg>\n`
}

export function iconSvg(ink: IconInk, size?: number): string {
  if (ink === 'mono-black') return wrap(ICON_SIZE, ICON_SIZE, monoIconShapes('#000000', 'k'), 'Tutafy icon, one colour (black).', size)
  if (ink === 'mono-white') return wrap(ICON_SIZE, ICON_SIZE, monoIconShapes('#FFFFFF', 'k'), 'Tutafy icon, one colour (white).', size)
  return wrap(ICON_SIZE, ICON_SIZE, iconShapes(ink), `Tutafy icon for a ${ink} surface.`, size)
}

/** A full square of the brand colour with the logo inside it at `scale`: the app icon that the phone cuts into a circle or a rounded square itself. */
export function fullBleedIconSvg(scale: number, size?: number): string {
  const c = LOGO_COLORS.light
  const o = (1 - scale) * (ICON_SIZE / 2)
  const body = [
    `<rect width="${ICON_SIZE}" height="${ICON_SIZE}" fill="${c.tile}"/>`,
    `<g transform="translate(${num(+o.toFixed(3))} ${num(+o.toFixed(3))}) scale(${num(scale)})">`,
    `  <path d="${S.capTop}" fill="${c.cap}"/>`,
    `  <path d="${S.capBottom}" fill="${c.cap}" fill-opacity="${num(S.capBottomOpacity)}"/>`,
    `  <path d="${S.tassel.line}" fill="none" stroke="${c.tassel}" stroke-width="${num(S.tassel.width)}" stroke-linecap="round"/>`,
    `  <circle cx="${S.tassel.dot.cx}" cy="${S.tassel.dot.cy}" r="${num(S.tassel.dot.r)}" fill="${c.tassel}"/>`,
    `</g>`,
  ].join('\n  ')
  return wrap(ICON_SIZE, ICON_SIZE, body, `Tutafy app icon, full square (scale ${scale}). The phone rounds or crops it.`, size)
}

export function maskableIconSvg(size?: number): string {
  return fullBleedIconSvg(MASKABLE_SCALE, size)
}

/** The white cap on nothing: what a phone draws in the status bar for a push notification (it only looks at the shape). */
export function badgeSvg(size?: number): string {
  const body = [
    `<path d="${S.capTop}" fill="#fff"/>`,
    `<path d="${S.capBottom}" fill="#fff"/>`,
    `<path d="${S.tassel.line}" fill="none" stroke="#fff" stroke-width="${num(S.tassel.width)}" stroke-linecap="round"/>`,
    `<circle cx="${S.tassel.dot.cx}" cy="${S.tassel.dot.cy}" r="${num(S.tassel.dot.r)}" fill="#fff"/>`,
  ].join('\n  ')
  return wrap(ICON_SIZE, ICON_SIZE, body, 'Tutafy notification badge: the shape only, white on transparent.', size)
}

/** The icon of the browser tab. In a dark tab bar it takes the dark colours (an SVG icon can read prefers-color-scheme). */
export function adaptiveFaviconSvg(): string {
  const l = LOGO_COLORS.light
  const d = LOGO_COLORS.dark
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}" width="${ICON_SIZE}" height="${ICON_SIZE}">
  <!-- Tutafy browser icon. Light colours by default, the dark-surface colours when the tab bar is dark. -->
  <style>.t{fill:${l.tile}}.a{fill:${l.tassel};stroke:${l.tassel}}@media (prefers-color-scheme:dark){.t{fill:${d.tile}}.a{fill:${d.tassel};stroke:${d.tassel}}}</style>
  <rect class="t" x="${S.tile.x}" y="${S.tile.y}" width="${S.tile.size}" height="${S.tile.size}" rx="${S.tile.radius}"/>
  <path d="${S.capTop}" fill="${l.cap}"/>
  <path d="${S.capBottom}" fill="${l.cap}" fill-opacity="${num(S.capBottomOpacity)}"/>
  <path class="a" d="${S.tassel.line}" fill="none" stroke-width="${num(S.tassel.width)}" stroke-linecap="round"/>
  <circle class="a" cx="${S.tassel.dot.cx}" cy="${S.tassel.dot.cy}" r="${num(S.tassel.dot.r)}" stroke="none"/>
</svg>
`
}

/** The horizontal logo: icon and the word Tutafy drawn as outlines. */
export function logoSvg(ink: IconInk, size?: number): string {
  const word = (fill: string) => `<path d="${WORDMARK_PATH}" fill="${fill}"/>`
  let body: string
  let note: string
  if (ink === 'mono-black' || ink === 'mono-white') {
    const color = ink === 'mono-black' ? '#000000' : '#FFFFFF'
    body = `${monoIconShapes(color, 'k')}\n  ${word(color)}`
    note = `Tutafy logo, horizontal, one colour (${ink === 'mono-black' ? 'black' : 'white'}).`
  } else {
    body = `${iconShapes(ink)}\n  ${word(LOGO_COLORS[ink].word)}`
    note = `Tutafy logo, horizontal, for a ${ink} surface. The word is outlines of Geist Bold.`
  }
  return wrap(LOGO_WIDTH, LOGO_HEIGHT, body, note, size)
}

/** The inline version for HTML pages and mail-like markup: no comment, no xmlns needed in HTML, a name for assistive technology. */
export function inlineLogoSvg(theme: LogoTheme, heightPx: number): string {
  const word = `<path d="${WORDMARK_PATH}" fill="${LOGO_COLORS[theme].word}"/>`
  const w = Math.round((heightPx * LOGO_WIDTH) / LOGO_HEIGHT)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}" width="${w}" height="${heightPx}" role="img" aria-label="Tutafy">${iconShapes(theme).replace(/\n\s*/g, '')}${word}</svg>`
}
