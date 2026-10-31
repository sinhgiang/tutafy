// Fetch named photos from Wikimedia Commons, read their licence from the file page's own metadata, and write the
// lightweight AVIF + WebP pair the blog uses, plus an entry in public/blog/inline/credits.json (T-1155).
//
// Usage: node scripts/fetch-commons-photos.mjs scripts/_commons-batch.json
//   [ { "name": "real-rate-coins", "file": "Stacks of Coins.jpg", "crop": { "top": 0.2, "height": 0.375 } }, ... ]
// `crop` is optional: the full width is kept and `top`/`height` are fractions of the image height (use it for portrait
// photos); without it the photo is cover-cropped to 1100x619 around the most detailed area.
//
// Only photos whose licence on Commons is CC0, public domain, CC BY or CC BY-SA are written. Each image is re-encoded
// under 200 KB. The credit line names the author and the licence; the page links to the Commons file page.

import sharp from 'sharp'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'

const OUT_DIR = 'public/blog/inline'
const CREDITS = `${OUT_DIR}/credits.json`
const W = 1100, H = 619
const MAX_BYTES = 200 * 1024
const UA = { 'User-Agent': 'Tutafy-blog/1.0 (https://www.tutafy.com)' }
const OK = /^(CC0|Public domain|PD|CC BY(-SA)? \d)/i

mkdirSync(OUT_DIR, { recursive: true })
const batch = JSON.parse(readFileSync(process.argv[2] || 'scripts/_commons-batch.json', 'utf8'))
const credits = existsSync(CREDITS) ? JSON.parse(readFileSync(CREDITS, 'utf8')) : {}
const strip = s => String(s ?? '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

for (const { name, file, crop } of batch) {
  const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=2400&titles=' +
    encodeURIComponent('File:' + file)
  const j = await (await fetch(api, { headers: UA })).json()
  const ii = Object.values(j.query.pages)[0].imageinfo?.[0]
  if (!ii) { console.log(`${name}: NOT FOUND ${file}`); continue }
  const m = ii.extmetadata ?? {}
  const licence = strip(m.LicenseShortName?.value)
  if (!OK.test(licence)) { console.log(`${name}: licence not allowed (${licence})`); continue }

  const src = Buffer.from(await (await fetch(ii.thumburl, { headers: UA })).arrayBuffer())
  const meta = await sharp(src).metadata()
  let pipe = sharp(src)
  if (crop) {
    const top = Math.round(meta.height * crop.top)
    const height = Math.min(meta.height - top, Math.round(meta.width * H / W))
    pipe = pipe.extract({ left: 0, top, width: meta.width, height }).resize(W, H, { fit: 'cover' })
  } else {
    pipe = pipe.resize(W, H, { fit: 'cover', position: sharp.strategy.attention })
  }
  const base = await pipe.toBuffer()

  const sizes = {}
  for (const [ext, make, qs] of [['webp', q => sharp(base).webp({ quality: q }), [78, 70, 62, 54]], ['avif', q => sharp(base).avif({ quality: q }), [58, 50, 42, 34]]]) {
    for (const q of qs) {
      const out = await make(q).toBuffer()
      if (out.length <= MAX_BYTES || q === qs.at(-1)) { writeFileSync(`${OUT_DIR}/${name}.${ext}`, out); sizes[ext] = out.length; break }
    }
  }

  const author = strip(m.Artist?.value)
  credits[name] = {
    file, licence, creator: author, source: ii.descriptionurl, licenceUrl: strip(m.LicenseUrl?.value) || null,
    original: `${ii.width}x${ii.height}`, checked: '2026-10-31', bytes: sizes,
  }
  console.log(`${name}\t${licence}\t${author.slice(0, 40)}\t${sizes.webp}/${sizes.avif} bytes\t${ii.descriptionurl}`)
}
writeFileSync(CREDITS, JSON.stringify(credits, null, 2))
