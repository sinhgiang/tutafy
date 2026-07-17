// Fetch free, commercially-licensed photos from Openverse (Creative Commons)
// and convert them to lightweight AVIF + WebP for inline use in blog posts.
//
// Usage:
//   1. Write a batch file scripts/_inline-batch.json:
//        [ { "name": "free-software-dashboard", "query": ["laptop dashboard", "computer desk"] }, ... ]
//      `query` may be a string or an array of fallbacks tried in order.
//   2. node scripts/fetch-inline-images.mjs
//
// Output: public/blog/inline/<name>.avif + .webp (1100x619, cover-cropped),
// plus a printed credit line per image and public/blog/inline/credits.json.
//
// Licensing: we request only commercially-usable licenses (cc0, pdm, by, by-sa)
// and record attribution. cc0/pdm need no credit; by/by-sa get a credit caption.

import sharp from 'sharp'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'

const OUT_DIR = 'public/blog/inline'
mkdirSync(OUT_DIR, { recursive: true })

const UA = 'Tutafy-blog/1.0 (admin@sinhgiang.com)'
const OK_LICENSES = ['cc0', 'pdm', 'by', 'by-sa'] // commercially usable
const NO_ATTRIBUTION = new Set(['cc0', 'pdm'])
const W = 1100, H = 619 // 16:9-ish, fixed → no layout shift

const batchPath = process.argv[2] || 'scripts/_inline-batch.json'
if (!existsSync(batchPath)) {
  console.error(`Batch file not found: ${batchPath}`)
  process.exit(1)
}
const batch = JSON.parse(readFileSync(batchPath, 'utf8'))

async function searchOpenverse(query) {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}` +
    `&license=${OK_LICENSES.join(',')}&page_size=12&mature=false`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) return []
  const j = await res.json().catch(() => ({}))
  return (j.results ?? [])
    // prefer no-attribution first, then bigger images
    .sort((a, b) => {
      const na = NO_ATTRIBUTION.has(a.license) ? 0 : 1
      const nb = NO_ATTRIBUTION.has(b.license) ? 0 : 1
      if (na !== nb) return na - nb
      return (b.width ?? 0) - (a.width ?? 0)
    })
}

async function tryDownload(item) {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 20000)
    const img = await fetch(item.url, { headers: { 'User-Agent': UA }, signal: ctrl.signal })
    clearTimeout(t)
    if (!img.ok) return null
    const ct = img.headers.get('content-type') || ''
    if (!/image\/(jpe?g|png|webp)/.test(ct)) return null
    const buf = Buffer.from(await img.arrayBuffer())
    if (buf.length < 8000) return null // skip tiny/broken
    return buf
  } catch { return null }
}

const credits = {}
const results = []

for (const entry of batch) {
  const name = entry.name
  const queries = Array.isArray(entry.query) ? entry.query : [entry.query]
  let done = false

  for (const q of queries) {
    if (done) break
    const items = await searchOpenverse(q)
    for (const item of items) {
      const buf = await tryDownload(item)
      if (!buf) continue
      try {
        await sharp(buf).resize(W, H, { fit: 'cover', position: sharp.strategy.attention }).avif({ quality: 55 }).toFile(`${OUT_DIR}/${name}.avif`)
        await sharp(buf).resize(W, H, { fit: 'cover', position: sharp.strategy.attention }).webp({ quality: 74 }).toFile(`${OUT_DIR}/${name}.webp`)
      } catch { continue }

      const needsCredit = !NO_ATTRIBUTION.has(item.license)
      const credit = needsCredit
        ? `Photo: ${item.creator || 'Unknown'} (CC ${String(item.license).toUpperCase()}) via Openverse`
        : null
      credits[name] = {
        query: q, license: item.license, creator: item.creator ?? null,
        source: item.foreign_landing_url ?? item.url, credit,
      }
      results.push({ name, license: item.license, credit: credit || '(no attribution required)', query: q })
      done = true
      break
    }
  }
  if (!done) results.push({ name, license: '—', credit: 'FAILED — no usable image found', query: queries.join(' | ') })
}

writeFileSync(`${OUT_DIR}/credits.json`, JSON.stringify(credits, null, 2))
console.log('\n=== inline images ===')
for (const r of results) console.log(`${r.name}  [${r.license}]  ${r.credit}`)
console.log(`\nWrote ${Object.keys(credits).length}/${batch.length} images to ${OUT_DIR}`)
