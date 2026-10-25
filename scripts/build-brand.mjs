// Writes every generated brand file from src/lib/brand.ts (T-0969):  npm run brand:build
//   - src/styles/brand-tokens.css      the CSS variables (--brand-*)
//   - public/brand/*.svg and *.png     the logo set (light, dark, one colour, horizontal, maskable, badge)
//   - public/icon-192.png, icon-512.png, src/app/icon.svg, favicon.ico, apple-icon.png   what browsers and phones look for by name
//   - public/brand/brand-sheet.html    the one-page brand sheet (the picture of it is made from this page)
// tests/brand.test.ts runs the same builders and fails when a committed file differs, so a colour changed in brand.ts but not built
// (or a file edited by hand) cannot reach main. Needs sharp, which Next.js already installs.
import fs from 'node:fs'
import path from 'node:path'
import { buildBrandFiles } from '../tests/support/brand-files.ts'

const ROOT = path.resolve(import.meta.dirname, '..')
const files = await buildBrandFiles()
let written = 0
for (const [rel, data] of Object.entries(files)) {
  const abs = path.join(ROOT, rel)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  const old = fs.existsSync(abs) ? fs.readFileSync(abs) : null
  const next = typeof data === 'string' ? Buffer.from(data) : data
  if (!old || !old.equals(next)) {
    fs.writeFileSync(abs, next)
    written++
  }
}
console.log(`brand: ${Object.keys(files).length} files, ${written} written`)
