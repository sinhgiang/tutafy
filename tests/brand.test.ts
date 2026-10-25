// T-0969: Tutafy has one brand source, src/lib/brand.ts, and one logo (D2, chosen by the owner on 25 Oct 2026). These checks keep it that way:
//  1. every generated file on disk (CSS variables, the tutor app's colour blocks, the logo SVGs and PNGs, the favicon, the app icons, the
//     one-page sheet, the tables in docs/brand/BRAND.md) is what `npm run brand:build` builds from brand.ts today. Change a colour in
//     brand.ts and forget to build, or edit a generated file by hand, and this fails. The detection itself is tested too (a changed colour
//     is caught by the same functions);
//  2. the React logo draws the same shapes as the files, never smaller than the sizes BRAND.md allows;
//  3. the places that must carry the new logo carry it (manifest, browser colour, share picture, service worker) and the old marks
//     (the lucide cap, the lightning bolt in a tile) are not back anywhere;
//  4. hex literals of the brand colours outside the brand source cannot grow (e-mail templates and a few charts still carry some).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  BRAND_COLORS, BRAND_FONT, BRAND_NAME, ICON_SHAPES, LOGO_COLORS, LOGO_MIN, brandVar,
} from '@/lib/brand'
import { LOGO_HEIGHT, LOGO_WIDTH, WORDMARK_PATH } from '@/lib/brand-wordmark'
import { logoSvg } from '@/lib/brand-svg'
import { BrandLogo } from '@/components/brand/BrandLogo.tsx'
import { BrandMark } from '@/components/brand/BrandMark.tsx'
import { SiteLogo } from '@/components/SiteLogo.tsx'
import manifest from '@/app/manifest'
import { buildBrandFiles, patchBrandDoc, patchDashCss, tokensCss } from './support/brand-files.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const exists = (rel: string) => fs.existsSync(path.join(ROOT, rel))

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
}
const SRC_FILES = walk(path.join(ROOT, 'src'))
  .map(f => path.relative(ROOT, f).replace(/\\/g, '/'))
  .filter(f => /\.(ts|tsx|css)$/.test(f))

// ---- 1. what is on disk is what brand.ts builds ----------------------------------------------------------------------------
async function pixels(buf: Buffer) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, w: info.width, h: info.height }
}

// Two pictures of the same drawing, rendered on two machines, differ by a hair at the edges: compare the mean difference per channel.
async function samePicture(a: Buffer, b: Buffer): Promise<{ ok: boolean; why: string }> {
  const [x, y] = await Promise.all([pixels(a), pixels(b)])
  if (x.w !== y.w || x.h !== y.h) return { ok: false, why: `size ${x.w}x${x.h} against ${y.w}x${y.h}` }
  let sum = 0
  for (let i = 0; i < x.data.length; i++) sum += Math.abs(x.data[i] - y.data[i])
  const mean = sum / x.data.length
  return { ok: mean < 1.5, why: `mean difference ${mean.toFixed(2)} per channel` }
}

function icoPictures(buf: Buffer): Buffer[] {
  const n = buf.readUInt16LE(4)
  return Array.from({ length: n }, (_, i) => {
    const size = buf.readUInt32LE(6 + 16 * i + 8)
    const off = buf.readUInt32LE(6 + 16 * i + 12)
    return buf.subarray(off, off + size)
  })
}

test('every generated brand file on disk is what brand.ts builds today (npm run brand:build)', async () => {
  const built = await buildBrandFiles()
  const names = Object.keys(built)
  assert.ok(names.length > 35, 'the builder returns the whole set')
  for (const rel of names) {
    assert.ok(exists(rel), `${rel} is missing: run npm run brand:build`)
    const want0 = built[rel]
    const want = typeof want0 === 'string' ? want0.replace(/\r\n/g, '\n') : want0
    const have = fs.readFileSync(path.join(ROOT, rel))
    if (typeof want === 'string') {
      assert.equal(have.toString('utf8').replace(/\r\n/g, '\n'), want, `${rel} differs from what src/lib/brand.ts builds: run npm run brand:build (and do not edit generated files by hand)`)
    } else if (rel.endsWith('.ico')) {
      const [w, h] = [icoPictures(want), icoPictures(have)]
      assert.equal(h.length, w.length, `${rel}: number of sizes`)
      for (let i = 0; i < w.length; i++) {
        const r = await samePicture(w[i], h[i])
        assert.ok(r.ok, `${rel} picture ${i}: ${r.why}. Run npm run brand:build`)
      }
    } else {
      const r = await samePicture(want, have)
      assert.ok(r.ok, `${rel} is not the picture brand.ts builds (${r.why}). Run npm run brand:build`)
    }
  }
})

test('the check really sees a colour that was changed in one place only', () => {
  // The same functions the test above relies on, fed a stylesheet and a document in which one colour was edited by hand.
  const css = read('src/styles/dashboard-shell.css')
  assert.equal(patchDashCss(css), css, 'the shell file is already what brand.ts says')
  const editedCss = css.replace('--d-brand: #4F46E5', '--d-brand: #123456')
  assert.notEqual(editedCss, css)
  assert.notEqual(patchDashCss(editedCss), editedCss, 'a hand-edited brand colour in the shell is rewritten, so the equality test above fails')
  const darkEdited = css.replace('--d-brand: #818CF8', '--d-brand: #3F4A9E')
  assert.notEqual(patchDashCss(darkEdited), darkEdited, 'same for the dark theme')

  const md = read('docs/brand/BRAND.md')
  assert.equal(patchBrandDoc(md), md)
  const editedMd = md.replace(`\`${BRAND_COLORS.primary}\` | \`--brand-primary\``, '`#123456` | `--brand-primary`')
  assert.notEqual(editedMd, md, 'the document has the primary colour in its table')
  assert.notEqual(patchBrandDoc(editedMd), editedMd, 'a colour changed in the document only is rewritten from brand.ts')

  const tokens = tokensCss()
  assert.ok(tokens.includes(`--brand-primary: ${BRAND_COLORS.primary};`))
  assert.notEqual(tokens.replace(BRAND_COLORS.primary, '#123456'), tokens)
})

test('BRAND.md describes the logo, the files and the rules, and the sheet and its picture exist', () => {
  const md = read('docs/brand/BRAND.md')
  for (const must of ['Geist', 'Clear space', 'Smallest icon', 'Smallest horizontal logo', 'Do not', 'Where the logo is used', BRAND_NAME]) {
    assert.ok(md.includes(must), `BRAND.md should say "${must}"`)
  }
  for (const part of ['tile', 'tassel'] as const) assert.ok(md.includes(LOGO_COLORS.light[part]) && md.includes(LOGO_COLORS.dark[part]), `the ${part} colours of both themes are in the logo table`)
  assert.ok(md.includes(`${LOGO_MIN.iconPx} px`) && md.includes(`${LOGO_MIN.horizontalHeightPx} px high`), 'the smallest sizes in BRAND.md are the ones in brand.ts')
  // Every file in public/brand is named in the document (a size series is named by its stem, tutafy-icon-{16,32,...}.png)
  const stems = fs.readdirSync(path.join(ROOT, 'public/brand')).filter(f => /^tutafy-.*\.(svg|png)$/.test(f)).map(f => f.replace(/\.(svg|png)$/, '').replace(/-\d+$/, ''))
  assert.ok(stems.length >= 20)
  for (const s of new Set(stems)) assert.ok(md.includes(s), `public/brand has ${s}, BRAND.md does not name it`)
  assert.ok(exists('public/brand/brand-sheet.html'), 'the one-page sheet is there')
  assert.ok(exists('public/brand/fonts/Geist-Variable.woff2'), 'the sheet carries the font so it opens without a network')
  const sheet = read('public/brand/brand-sheet.html')
  assert.match(sheet, /name="robots" content="noindex/, 'the sheet is kept out of search results')
  for (const name of ['primary', 'accent', 'ink', 'canvasDark'] as const) assert.ok(sheet.includes(BRAND_COLORS[name]), 'the sheet shows ' + name)
  assert.ok(exists('public/brand/tutafy-brand-sheet.png'), 'the sheet is saved as a picture')
})

test('the brand sheet picture is a real picture of the sheet (a tall page, 1440 wide)', async () => {
  const meta = await sharp(path.join(ROOT, 'public/brand/tutafy-brand-sheet.png')).metadata()
  assert.equal(meta.width, 1440)
  assert.ok((meta.height ?? 0) > 1800, 'the whole page, not the first screen')
})

// ---- 2. the React logo is the file's logo ----------------------------------------------------------------------------------
function pathData(svg: string): string[] {
  return [...svg.matchAll(/ d="([^"]+)"/g)].map(m => m[1])
}

test('BrandLogo and BrandMark draw the shapes of the files, in the colours of the theme', () => {
  const lightFile = read('public/brand/tutafy-logo.svg')
  const lightMarkup = renderToStaticMarkup(BrandLogo({ height: 64, theme: 'light' }))
  for (const d of pathData(lightFile)) assert.ok(lightMarkup.includes(` d="${d}"`), `the component lacks the path ${d.slice(0, 30)} of tutafy-logo.svg`)
  assert.ok(lightMarkup.includes(` d="${WORDMARK_PATH}"`))
  assert.ok(lightMarkup.includes(`viewBox="0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}"`))
  assert.ok(lightMarkup.includes(`fill="${LOGO_COLORS.light.tile}"`) && lightMarkup.includes(`stroke="${LOGO_COLORS.light.tassel}"`))
  assert.ok(lightMarkup.includes(`fill="${LOGO_COLORS.light.word}"`))

  const darkMarkup = renderToStaticMarkup(BrandLogo({ height: 64, theme: 'dark' }))
  assert.ok(darkMarkup.includes(`fill="${LOGO_COLORS.dark.tile}"`) && darkMarkup.includes(`stroke="${LOGO_COLORS.dark.tassel}"`) && darkMarkup.includes(`fill="${LOGO_COLORS.dark.word}"`))
  assert.ok(!darkMarkup.includes(LOGO_COLORS.light.tile), 'the dark logo has no light-surface tile colour')

  const auto = renderToStaticMarkup(BrandLogo({ height: 32, theme: 'auto' }))
  assert.match(auto, /fill:var\(--brand-logo-tile\)/)
  assert.match(auto, /stroke:var\(--brand-logo-tassel\)/)
  assert.match(auto, /fill:var\(--brand-logo-word\)/)
  const tokens = tokensCss()
  for (const v of ['--brand-logo-tile', '--brand-logo-tassel', '--brand-logo-word']) assert.ok(tokens.includes(`${v}:`), `${v} is defined in the tokens`)

  const iconFile = read('public/brand/tutafy-icon.svg')
  const mark = renderToStaticMarkup(BrandMark({ size: 48 }))
  for (const d of pathData(iconFile)) assert.ok(mark.includes(` d="${d}"`))
  assert.match(mark, /width="48" height="48"/)
  assert.ok(mark.includes(`rx="${ICON_SHAPES.tile.radius}"`))
  assert.match(mark, /aria-hidden="true"/, 'decorative unless it has a title')
  assert.match(renderToStaticMarkup(BrandMark({ size: 48, title: 'Tutafy' })), /role="img" aria-label="Tutafy"/)
})

test('the logo is never drawn smaller than BRAND.md allows', () => {
  for (const size of ['lg', 'md', 'sm'] as const) {
    const h = Number(/ height="(\d+)"/.exec(renderToStaticMarkup(SiteLogo({ size })))?.[1])
    assert.ok(h >= LOGO_MIN.horizontalHeightPx, `SiteLogo ${size} is ${h}px high, the smallest is ${LOGO_MIN.horizontalHeightPx}`)
  }
  let seen = 0
  for (const f of SRC_FILES.filter(x => x.endsWith('.tsx'))) {
    const src = read(f)
    for (const m of src.matchAll(/<BrandLogo\b[^>]*\bheight=\{(\d+)\}/g)) { seen++; assert.ok(Number(m[1]) >= LOGO_MIN.horizontalHeightPx, `${f}: BrandLogo ${m[1]}px is under the smallest ${LOGO_MIN.horizontalHeightPx}px`) }
    for (const m of src.matchAll(/<BrandMark\b[^>]*\bsize=\{(\d+)\}/g)) { seen++; assert.ok(Number(m[1]) >= LOGO_MIN.iconPx, `${f}: BrandMark ${m[1]}px is under the smallest ${LOGO_MIN.iconPx}px`) }
  }
  assert.ok(seen >= 8, 'the scan finds the places that draw the logo (it is not an empty loop)')
})

// ---- 3. the new logo is where it must be, the old marks are gone -----------------------------------------------------------
test('the manifest, the browser colour, the icons and the service worker are the brand\'s', () => {
  const m = manifest()
  assert.equal(m.theme_color, BRAND_COLORS.primary)
  assert.equal(m.background_color, BRAND_COLORS.canvasDark)
  const icons = m.icons ?? []
  for (const purpose of ['any', 'maskable']) for (const sizes of ['192x192', '512x512']) {
    const hit = icons.find(i => i.purpose === purpose && i.sizes === sizes)
    assert.ok(hit, `the manifest has a ${purpose} icon of ${sizes}`)
    assert.ok(exists(`public${hit.src}`), `${hit.src} exists`)
  }
  const layout = read('src/app/layout.tsx')
  assert.match(layout, /themeColor: BRAND_COLORS\.primary/)
  assert.ok(!/apple-touch-icon/.test(layout), 'the home-screen icon is src/app/apple-icon.png, linked by Next.js, not a hand-written link to the old file')
  assert.ok(!/themeColor: '#/.test(layout))
  for (const f of ['src/app/icon.svg', 'src/app/favicon.ico', 'src/app/apple-icon.png', 'public/icon-192.png', 'public/icon-512.png']) assert.ok(exists(f), `${f} exists`)
  assert.match(read('src/app/icon.svg'), /prefers-color-scheme:dark/, 'the browser icon takes the dark colours in a dark tab bar')
  const sw = read('public/sw.js')
  assert.ok(!/CACHE = 'tutafy-v1'/.test(sw), 'the service worker cache was renamed so nothing with the old logo is served from it')
  const badge = /badge: '(\/[^']+)'/.exec(sw)?.[1]
  assert.ok(badge && exists(`public${badge}`) && badge !== '/icon-192.png', 'the push badge is the white shape, not the full-colour icon')
  const logoUrl = /logo: `\$\{SITE_URL\}(\/[^`]+)`/.exec(read('src/lib/seo.ts'))?.[1]
  assert.ok(logoUrl && exists(`public${logoUrl}`), 'the Organization logo in the structured data is a file that exists')
  const matcher = /matcher: \['([^']+)'\]/.exec(read('src/proxy.ts'))?.[1] ?? ''
  for (const skip of ['icon-', 'icon\\\\.svg', 'apple-icon', 'brand/']) assert.ok(matcher.includes(skip), `the proxy leaves ${skip} alone`)
})

test('the share picture is drawn with the brand logo and brand colours, with no colour typed in it', () => {
  const og = read('src/app/og/route.tsx')
  assert.match(og, /logoSvg\('dark'/)
  assert.match(og, /BRAND_COLORS\.canvasDark/)
  assert.ok(!/#[0-9a-fA-F]{6}\b/.test(og), 'no hex colour is typed in the share picture; it reads brand.ts')
  assert.ok(!/M21\.42 10\.922/.test(og), 'the old line-drawing cap is gone')
  assert.match(read('src/lib/page-meta.ts'), /url: '\/og'/, 'every page without its own picture uses the one route')
})

// The share picture of a blog post is its hero (public/blog/<slug>-hero.webp and .avif), drawn by scripts/gen-blog-images.mjs. Each carries the
// logo in its top left corner; the old ones carried a white tile with a triangle there. The check looks at the pixels: where the brand logo
// (one colour, white) has ink, the picture is white, and where it has none, it is not.
async function cornerAgreement(picture: Buffer): Promise<number> {
  const logo = await sharp(Buffer.from(logoSvg('mono-white', 48))).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const crop = await sharp(picture).extract({ left: 64, top: 58, width: logo.info.width, height: logo.info.height }).raw().toBuffer({ resolveWithObject: true })
  let same = 0
  const n = logo.info.width * logo.info.height
  for (let i = 0; i < n; i++) {
    const ink = logo.data[i * 4 + 3] > 128
    const o = i * crop.info.channels
    const white = crop.data[o] > 215 && crop.data[o + 1] > 215 && crop.data[o + 2] > 215
    if (ink === white) same++
  }
  return same / n
}

test('every blog hero, the share picture of a post, carries the brand logo in its corner and not an older mark', async () => {
  const heroes = fs.readdirSync(path.join(ROOT, 'public/blog')).filter(f => f.endsWith('-hero.webp')).sort()
  assert.ok(heroes.length >= 25, 'the scan finds the heroes (it is not an empty loop)')
  for (const f of heroes) {
    for (const ext of ['webp', 'avif']) {
      const file = path.join(ROOT, 'public/blog', f.replace(/webp$/, ext))
      assert.ok(fs.existsSync(file), `${f}: the .${ext} twin is missing`)
      const a = await cornerAgreement(fs.readFileSync(file))
      assert.ok(a > 0.93, `${f.replace(/webp$/, ext)}: the corner is not the brand logo (agreement ${a.toFixed(2)}). Run: node --import ./tests/register.mjs scripts/gen-blog-images.mjs`)
    }
  }
  // the same measure on the old corner (a white tile with a triangle, 40 px, at 64,64) must fail it, so the check can tell the two apart
  const old = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="#4f46e5"/><g transform="translate(64,64)"><rect width="40" height="40" rx="11" fill="#fff" opacity="0.95"/><path d="M12 26 L20 12 L28 26 Z" fill="#4f46e5"/><text x="54" y="28" font-family="Arial" font-size="24" font-weight="700" fill="#fff">Tutafy</text></g></svg>`
  assert.ok(await cornerAgreement(await sharp(Buffer.from(old)).png().toBuffer()) < 0.93, 'the old corner is told apart from the new one')
  const gen = read('scripts/gen-blog-images.mjs')
  assert.match(gen, /logoSvg\('mono-white'/)
  assert.ok(!gen.includes('M12 26 L20 12 L28 26 Z'), 'the old corner logo is gone from the generator')
  assert.ok(!gen.includes('M60 70 L100 130 L60 130 L100 190'), 'the old lightning bolt is gone from the generator')
})

test('a page that writes its own openGraph names a share picture (a page that sets openGraph drops the site default)', () => {
  const own = SRC_FILES.filter(f => f.startsWith('src/app/') && f.endsWith('.tsx') && /\bopenGraph:/.test(read(f)))
  assert.ok(own.includes('src/app/switch/page.tsx'), 'the scan finds /switch, which does this')
  for (const f of own) assert.match(read(f), /images:\s*\[SOCIAL_IMAGE\]/, `${f} writes openGraph without the share picture`)
})

// Where a lightning bolt or a graduation cap icon may still appear: as an icon in a sentence or a button, never as the logo.
const ZAP_ALLOWED = new Set([
  'src/app/(admin)/admin/migrate/page.tsx', 'src/app/(dashboard)/settings/page.tsx', 'src/app/(dashboard)/students/new/page.tsx',
  'src/app/(dashboard)/upgrade/page.tsx', 'src/app/book/[slug]/BookingForm.tsx', 'src/app/tutors/[slug]/page.tsx',
  'src/components/directory/DirectoryView.tsx', 'src/components/directory/TutorCard.tsx', 'src/components/layout/MobileNav.tsx', 'src/components/plan/LockedFeature.tsx', 'src/components/settings/sections/PlanSection.tsx',
])
const CAP_ALLOWED = new Set([
  'src/app/(admin)/admin/buyers/page.tsx', 'src/app/(admin)/admin/page.tsx', 'src/app/(admin)/admin/tutors/page.tsx', 'src/app/page.tsx',
  'src/components/admin/admin-nav.ts', 'src/components/blog/BlogList.tsx', 'src/components/directory/DirectoryView.tsx', 'src/components/profile/ReviewsSection.tsx',
])

test('the old logos are not back: no lightning bolt or line-drawing cap as a mark, no hand-pasted cap drawing', () => {
  const code = SRC_FILES.filter(f => !f.endsWith('.css') && f !== 'src/lib/blog.ts')
  const zaps = code.filter(f => /\bZap\b/.test(read(f)))
  for (const f of zaps) assert.ok(ZAP_ALLOWED.has(f), `${f} draws a lightning bolt. It is the Pro symbol only; the logo is BrandMark/BrandLogo. If this is an icon in a button, add the file to ZAP_ALLOWED with the reason`)
  const caps = code.filter(f => /\bGraduationCap\b/.test(read(f)))
  for (const f of caps) assert.ok(CAP_ALLOWED.has(f), `${f} uses the lucide graduation cap. The logo is BrandMark/BrandLogo`)
  for (const f of ['src/components/SiteLogo.tsx', 'src/components/layout/Sidebar.tsx', 'src/app/onboarding/page.tsx', 'src/app/student/layout.tsx', 'src/app/(auth)/login/page.tsx', 'src/app/(auth)/register/page.tsx', 'src/app/portal/[token]/certificate/[lessonId]/page.tsx']) {
    const src = read(f)
    assert.ok(!/\bZap\b|\bGraduationCap\b/.test(src), `${f} must not draw the old mark`)
    assert.match(src, /Brand(Logo|Mark)|SiteLogo/, `${f} draws the logo through the brand components`)
  }
  for (const f of code) {
    const src = read(f)
    assert.ok(!src.includes('M21.42 10.922'), `${f} has the old lucide cap drawing`)
    assert.ok(!src.includes('M12 3L1 9l11 6'), `${f} has the old hand-pasted cap drawing`)
    // an indigo tile with a bolt or a cap inside is how the old logos were built
    // (a tile has a fixed width and height, w-8 h-8; a button that says Upgrade has w-full, so it does not match)
    assert.ok(!/className="[^"]*\bw-\d+ h-\d+\b[^"]*bg-indigo-[0-9]+[^"]*"[^>]*>\s*<(Zap|GraduationCap)\b|className="[^"]*bg-indigo-[0-9]+[^"]*\bw-\d+ h-\d+\b[^"]*"[^>]*>\s*<(Zap|GraduationCap)\b/.test(src), `${f}: an indigo tile with an icon in it looks like the old logo; use BrandMark`)
  }
  // The side rail has its icon and its horizontal logo, and no longer a background colour behind the bolt
  assert.ok(!/\.dash-logo \{[^}]*background/.test(read('src/styles/dashboard-shell.css')))
  assert.ok(!/dash-brand-name/.test(read('src/components/layout/Sidebar.tsx')))
})

test('the public pages, sign-in, the invoice and the certificate draw the new logo', () => {
  assert.match(renderToStaticMarkup(SiteLogo({})), /data-brand="logo"/)
  assert.match(read('src/app/api/invoices/[lessonId]/route.ts'), /inlineLogoSvg\('light'/)
  assert.ok(!/<div class="logo">Tutafy<\/div>/.test(read('src/app/api/invoices/[lessonId]/route.ts')), 'the invoice shows the logo, not the word in indigo')
  assert.match(read('src/components/MadeWithTutafy.tsx'), /<BrandMark size=\{16\}/)
})

// ---- 4. type, Tailwind names, and the ratchet on typed colours -------------------------------------------------------------
test('the font is Geist everywhere and the Tailwind brand names point at variables that exist', () => {
  assert.equal(BRAND_FONT.family, 'Geist')
  assert.match(read('src/app/layout.tsx'), /import \{ Geist \} from 'next\/font\/google'/)
  assert.ok(BRAND_FONT.stack.startsWith('Geist,'))
  const css = read('src/app/globals.css')
  assert.match(css, /@import "\.\.\/styles\/brand-tokens\.css";/)
  const tokens = tokensCss()
  for (const m of css.matchAll(/--color-(?:brand|brand-hover|brand-soft|brand-line|tassel): var\((--brand-[a-z0-9-]+)\)/g)) assert.ok(tokens.includes(`${m[1]}:`), `${m[1]} used in globals.css is defined in the tokens`)
  assert.ok((css.match(/--color-(brand|tassel)/g) ?? []).length >= 5)
  for (const name of Object.keys(BRAND_COLORS)) assert.ok(tokens.includes(`${brandVar(name)}: ${BRAND_COLORS[name as keyof typeof BRAND_COLORS]};`), `${name} is a CSS variable`)
})

// The brand colours typed as hex outside the brand source. The e-mail templates and a few charts and dark pages still carry them as
// text (see "Known gap" in docs/brand/BRAND.md). This list can only get shorter: a new file, or more of them in a file, fails.
const TYPED_COLOR_BASELINE: Record<string, number> = {
  'src/app/api/ai/lesson-summary/route.ts': 1,
  'src/app/api/auth/register/route.ts': 2,
  'src/app/api/bookings/route.ts': 2,
  'src/app/api/cron/progress-reports/route.ts': 4,
  'src/app/api/cron/reminders/route.ts': 3,
  'src/app/api/invoices/send/route.ts': 2,
  'src/app/api/lessons/[id]/no-show/route.ts': 1,
  'src/app/api/lessons/[id]/send-notes/route.ts': 2,
  'src/app/api/messages/broadcast/route.ts': 1,
  'src/app/api/portal/[token]/messages/route.ts': 1,
  'src/app/api/portal/[token]/reschedule/route.ts': 1,
  'src/app/api/student/send-link/route.ts': 2,
  'src/app/auth/callback/route.ts': 2,
  'src/components/dashboard/DashboardHome.tsx': 4,
  'src/components/directory/TutorCard.tsx': 1,
  'src/components/find/FindTutorView.tsx': 1,
  'src/lib/review-invites.ts': 2,
  'src/lib/welcome-series.ts': 3,
  'src/styles/profile-dark.css': 5,
}
const TYPED_RE = /#(?:6366f1|4f46e5|4338ca|818cf8|f59e0b|fbbf24)\b/gi
const BRAND_SOURCES = new Set(['src/lib/brand.ts', 'src/styles/brand-tokens.css', 'src/styles/dashboard-shell.css', 'src/lib/blog.ts'])

test('brand colours typed as hex outside the brand source can only get fewer', () => {
  const found: Record<string, number> = {}
  for (const f of SRC_FILES) {
    if (BRAND_SOURCES.has(f)) continue
    const n = (read(f).match(TYPED_RE) ?? []).length
    if (n) found[f] = n
  }
  for (const [f, n] of Object.entries(found)) assert.ok((TYPED_COLOR_BASELINE[f] ?? 0) >= n, `${f} has ${n} typed brand colours (allowed ${TYPED_COLOR_BASELINE[f] ?? 0}). Use BRAND_COLORS from src/lib/brand.ts or a --brand-* variable`)
  assert.ok(Object.keys(found).length > 10, 'the scan finds the typed colours that are known (it is not an empty loop)')
})

test('the baseline of typed colours is honest: a file that no longer has them is removed from the list', () => {
  for (const [f, allowed] of Object.entries(TYPED_COLOR_BASELINE)) {
    const n = (read(f).match(TYPED_RE) ?? []).length
    assert.ok(n > 0 && n <= allowed, `${f} has ${n} typed brand colours, the baseline says ${allowed}: lower or remove it`)
  }
})
