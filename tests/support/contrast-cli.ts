// `npm run contrast`: prints the contrast ratio of every text and background pair of the tutor app shell, light and dark
// (T-0820). Exit code 1 when a pair is under 4.5 to 1. The colours are read from src/styles/dashboard-shell.css.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MIN_RATIO, measureAll } from '../../src/lib/dashboard-contrast.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const css = readFileSync(path.join(ROOT, 'src/styles/dashboard-shell.css'), 'utf8')
const rows = measureAll(css)
for (const r of rows) {
  const ok = r.ratio >= MIN_RATIO
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.theme.padEnd(5)}  ${r.ratio.toFixed(2).padStart(5)}:1  ${r.text} on ${r.background}  (${r.note})`)
}
const low = rows.filter(r => r.ratio < MIN_RATIO)
console.log(`\n${rows.length} pairs, lowest ${Math.min(...rows.map(r => r.ratio)).toFixed(2)}:1, minimum ${MIN_RATIO}:1, ${low.length} below`)
process.exit(low.length ? 1 : 0)
