// T-0959: the logo ideas in docs/brand/logo/ are design material, not shipped, but the owner chooses from them and a later ticket
// works from the "where the logo is used" table. These checks keep the files whole and the table true: every idea has its five SVG
// files, the files are plain pictures (no script, no text that needs a font, no outside address), the comparison page and the
// markdown table are the ones written from inventory.json, and every path the table names still exists in the repository.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR = path.join(ROOT, 'docs', 'brand', 'logo')
const read = (f: string) => readFileSync(path.join(DIR, f), 'utf8').replace(/\r\n/g, '\n')
const IDS = ['page', 'bubble', 'slots', 'facet', 'dot']
const KINDS = ['horizontal-on-light', 'horizontal-on-dark', 'icon-on-light', 'icon-on-dark', 'favicon']

test('every idea has its five SVG files and the comparison page lists the same five ideas', () => {
  const svgs = readdirSync(DIR).filter(f => f.endsWith('.svg')).sort()
  assert.deepEqual(svgs, IDS.flatMap(id => KINDS.map(k => `${id}-${k}.svg`)).sort())
  const html = read('compare.html')
  const listed = [...html.matchAll(/\{ id: '([a-z]+)', name:/g)].map(m => m[1])
  assert.deepEqual(listed, IDS)
  for (const k of KINDS) assert.ok(html.includes(`'-${k}.svg`) || html.includes(`-${k}.svg`), `the page shows the ${k} file`)
})

test('the SVG files are plain pictures: sized as promised, no script, no live text, no outside address', () => {
  for (const id of IDS) {
    for (const k of KINDS) {
      const f = `${id}-${k}.svg`
      const s = read(f)
      assert.match(s, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" /, f)
      assert.ok(!/<script|<text|<image|<foreignObject|<style|href=|url\(|@import|on[a-z]+=/i.test(s), `${f}: only shapes and outlines`)
      assert.ok(!/https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(s), `${f}: no outside address`)
      const size = s.match(/width="(\d+)" height="(\d+)" viewBox="0 0 (\d+) (\d+)"/)
      assert.ok(size, `${f}: a size and a matching viewBox`)
      const [w, h] = [Number(size![1]), Number(size![2])]
      assert.equal(`${size![3]}x${size![4]}`, `${w}x${h}`, f)
      if (k.startsWith('icon')) assert.deepEqual([w, h], [64, 64], f)
      if (k === 'favicon') assert.deepEqual([w, h], [32, 32], f)
      if (k.startsWith('horizontal')) assert.equal(h, 56, f)
      if (k.startsWith('horizontal')) assert.ok(/<path transform="translate\([\d.]+ [\d.]+\)" d="M/.test(s), `${f}: the word is an outline`)
    }
  }
})

interface Row { place: string; shows: string; where: string; need: string }
const groups: { group: string; rows: Row[] }[] = JSON.parse(read('inventory.json'))

test('the table in compare.html and where-logo-is-used.md are the ones written from inventory.json (run build-pages.mjs after editing it)', () => {
  const rows = groups.flatMap(g => g.rows)
  assert.ok(rows.length >= 20, 'the table is not trimmed')
  const html = read('compare.html')
  const md = read('where-logo-is-used.md')
  for (const r of rows) {
    const esc = r.place.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    assert.ok(html.includes(`<td data-l="Where">${esc}</td>`), `compare.html lacks the row "${r.place}"`)
    assert.ok(md.includes(`| ${r.place} | ${r.shows} | ${r.where} | ${r.need} |`), `where-logo-is-used.md lacks the row "${r.place}"`)
  }
  assert.equal((html.match(/<td data-l="Where">/g) ?? []).length, rows.length, 'no extra row in compare.html')
})

test('every file the table names still exists (a moved or removed file makes the list wrong)', () => {
  const missing: string[] = []
  for (const g of groups) {
    for (const r of g.rows) {
      for (const m of r.where.matchAll(/`((?:src|public|docs)\/[^`]+)`/g)) {
        const p = m[1].replace(/:\d+(?:[-,]\d+)*$/, '')
        if (/[*]/.test(p)) {
          const dir = p.slice(0, p.lastIndexOf('/'))
          if (!existsSync(path.join(ROOT, dir))) missing.push(m[1])
        } else if (!existsSync(path.join(ROOT, p))) missing.push(m[1])
      }
    }
  }
  assert.deepEqual(missing, [])
})

test('the places the table says carry the logo really do (one line of evidence for each kind of mark)', () => {
  const src = (f: string) => readFileSync(path.join(ROOT, f), 'utf8')
  assert.match(src('src/components/SiteLogo.tsx'), /GraduationCap/, 'the public logo is still the lucide cap')
  assert.match(src('src/components/layout/Sidebar.tsx'), /Zap/, 'the app sidebar still shows the bolt')
  assert.match(src('src/app/onboarding/page.tsx'), /<Zap\b/, 'onboarding still shows the bolt')
  assert.match(src('src/app/og/route.tsx'), /Tutafy/, 'the share picture is still drawn by the route')
  assert.ok(existsSync(path.join(ROOT, 'src/app/favicon.ico')) && existsSync(path.join(ROOT, 'public/icon-192.png')) && existsSync(path.join(ROOT, 'public/icon-512.png')))
})
