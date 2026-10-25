// Writes the "where the logo is used" table into compare.html (between the INVENTORY markers) and into where-logo-is-used.md,
// both from inventory.json, so the two never differ. No dependencies. Run from this folder:  node build-pages.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const groups = JSON.parse(readFileSync(path.join(here, 'inventory.json'), 'utf8'))

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>')

let html = '<table class="inv"><thead><tr><th>Where</th><th>What shows today</th><th>Where it is in the code or account</th><th>What the new one needs</th></tr></thead><tbody>\n'
let md = '# Everywhere Tutafy uses its logo today\n\nChecked in the code on 2026-10-25 (ticket T-0959). The rows under "Outside the repository" are accounts of the owner that the code cannot show.\nThis file and the table in `compare.html` are both written from `inventory.json` by `build-pages.mjs`.\n'
let n = 0
for (const g of groups) {
  html += `<tr class="grp"><td colspan="4">${esc(g.group)}</td></tr>\n`
  md += `\n## ${g.group}\n\n| # | Where | What shows today | Where it is in the code or account | What the new one needs |\n|---|---|---|---|---|\n`
  for (const r of g.rows) {
    n += 1
    html += `<tr><td data-l="Where">${esc(r.place)}</td><td data-l="What shows today">${inline(r.shows)}</td><td data-l="Where it is">${inline(r.where)}</td><td data-l="What the new one needs">${inline(r.need)}</td></tr>\n`
    md += `| ${n} | ${r.place} | ${r.shows} | ${r.where} | ${r.need} |\n`
  }
}
html += '</tbody></table>\n'

const file = path.join(here, 'compare.html')
const page = readFileSync(file, 'utf8')
const next = page.replace(/<!--INVENTORY-->[\s\S]*<!--\/INVENTORY-->/, `<!--INVENTORY-->\n${html}<!--/INVENTORY-->`)
writeFileSync(file, next)
writeFileSync(path.join(here, 'where-logo-is-used.md'), md)
console.log(`${n} rows`)
