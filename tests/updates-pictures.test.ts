// T-0834: every Updates entry has a picture that exists and opens large; a missing picture stops the build; a pull request that
// changes what a user sees without adding an entry gets a warning. The real loader and the real page run here; the mutations copy
// the real files, break one thing and expect the check to go red.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'

import { loadUpdates, newestUpdateDate } from '@/lib/updates'
import { addsEntry, entryWarning, parseNameStatus, visibleChanges } from './support/updates-entry.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const REAL_DIR = path.join(ROOT, 'content', 'updates')
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')

const NO_PICTURE = `---
version: 9.9.9
date: 2026-12-31
title: A new thing for tutors
---
- First plain sentence.
`

async function inScratchProject<T>(fn: (root: string) => T | Promise<T>): Promise<T> {
  const root = mkdtempSync(path.join(tmpdir(), 'tutafy-updates-pictures-'))
  const here = process.cwd()
  try {
    cpSync(REAL_DIR, path.join(root, 'content', 'updates'), { recursive: true })
    cpSync(path.join(ROOT, 'public', 'updates'), path.join(root, 'public', 'updates'), { recursive: true })
    process.chdir(root)
    return await fn(root)
  } finally {
    process.chdir(here)
    rmSync(root, { recursive: true, force: true })
  }
}

// ---- every entry has a picture that opens large ---------------------------------------------------------

test('every real entry has a picture that exists and a description, and the visible changes of 2026-10-23 each have an entry', () => {
  const entries = loadUpdates()
  for (const e of entries) {
    assert.ok(e.image, `${e.version} has no picture`)
    assert.ok(existsSync(path.join(ROOT, 'public', e.image!.src)), `${e.version}: ${e.image!.src} is not in public/`)
    assert.ok(e.image!.alt.length >= 20, `${e.version}: the description of the picture is too short`)
    assert.ok(e.image!.width! > 100 && e.image!.height! > 100, `${e.version}: the picture is not a real picture`)
  }
  const onTheDay = entries.filter(e => e.date === '2026-10-23').map(e => e.title.toLowerCase()).join(' | ')
  for (const word of ['booking page', 'logo', 'directory', 'dashboard frame', 'earnings', 'student or lesson', 'calendar', 'settings', 'packages', 'account menu']) {
    assert.ok(onTheDay.includes(word), `no entry for "${word}" on 2026-10-23: ${onTheDay}`)
  }
})

test('MUTATION: an entry without a picture stops the build and the page, naming the file', async () => {
  const { default: UpdatesPage } = await import('@/app/updates/page.tsx')
  await inScratchProject(root => {
    const file = path.join(root, 'content', 'updates', '1.3.0.md')
    const text = readFileSync(file, 'utf8')
    assert.match(text, /^image: /m)
    writeFileSync(file, text.replace(/^image(Alt)?: .*\r?\n/gm, ''))
    assert.throws(() => loadUpdates(), /1\.3\.0\.md: the entry has no picture/)
    assert.throws(() => renderToStaticMarkup(UpdatesPage()), /1\.3\.0\.md: the entry has no picture/)
  })
  await inScratchProject(root => {
    writeFileSync(path.join(root, 'content', 'updates', '9.9.9.md'), NO_PICTURE)
    assert.throws(() => loadUpdates(), /9\.9\.9\.md: the entry has no picture/)
    // the sitemap only needs the dates, so it still reads them
    assert.equal(newestUpdateDate(), '2026-12-31')
  })
})

test('MUTATION: a picture file that is gone stops the build', async () => {
  await inScratchProject(root => {
    rmSync(path.join(root, 'public', 'updates', 'phone-dashboard.webp'))
    assert.throws(() => loadUpdates(), /1\.0\.0\.md: the image \/updates\/phone-dashboard\.webp is not in public\//)
  })
})

test('every file in public/updates is used by an entry, so no picture is left behind', () => {
  const used = new Set(loadUpdates().map(e => path.basename(e.image!.src)))
  for (const f of readdirSync(path.join(ROOT, 'public', 'updates'))) assert.ok(used.has(f), `${f} is in public/updates but no entry uses it`)
})

test('the picture on /updates opens large: a button, a dialog with a close button, the description in both sizes', async () => {
  const { default: UpdatesPage } = await import('@/app/updates/page.tsx')
  const html = renderToStaticMarkup(UpdatesPage())
  const entries = loadUpdates()
  assert.equal((html.match(/data-testid="updates-lightbox"/g) ?? []).length, entries.length, 'one large view per entry')
  assert.equal((html.match(/aria-label="Close picture"/g) ?? []).length, entries.length)
  for (const e of entries) {
    assert.ok(html.includes(`aria-label="Enlarge picture: ${esc(e.image!.alt)}"`), `${e.version}: the button names the picture`)
    assert.equal(html.split(`alt="${esc(e.image!.alt)}"`).length - 1, 2, `${e.version}: the description is on the small and the large picture`)
  }
  assert.doesNotMatch(html, /target="_blank"/, 'the picture is not a link to a bare image any more')
  const src = read('src/components/updates/ImageLightbox.tsx')
  assert.match(src, /showModal\(\)/, 'a native dialog: Esc closes it, Tab stays inside it, focus returns to the button')
  assert.match(src, /<button\s+type="button"\s+onClick=\{\(\) => dialog\.current\?\.showModal\(\)\}/, 'the small picture is a real button, so Tab and Enter work')
  assert.match(src, /\.close\(\)/)
  assert.match(src, /e\.target === e\.currentTarget/, 'a press on the dark area closes it')
})

// ---- the pull request check for a missing entry ---------------------------------------------------------

test('a pull request that changes a page or component without a new Updates file gets a warning; with the file, none', () => {
  const page = { status: 'M', path: 'src/app/(dashboard)/earnings/page.tsx' }
  const entry = { status: 'A', path: 'content/updates/1.15.0.md' }
  assert.match(entryWarning([page])!, /content\/updates\//)
  assert.match(entryWarning([page])!, /earnings\/page\.tsx/)
  assert.equal(entryWarning([page, entry]), null)
  assert.notEqual(entryWarning([page, { status: 'M', path: 'content/updates/1.3.0.md' }]), null, 'editing an old entry is not a new entry')
  assert.equal(addsEntry([{ status: 'M', path: 'content/updates/1.3.0.md' }]), false)
  assert.equal(addsEntry([entry]), true)
  assert.equal(addsEntry([{ status: 'A', path: 'content/updates/notes.md' }]), false)
})

test('the warning is only for what a user sees: not a route, a library, a test, an admin page, a deleted file', () => {
  const quiet = [
    'src/app/api/earnings/export/route.ts', 'src/lib/earnings.ts', 'tests/earnings.test.ts', 'docs/feature-map.md',
    'src/app/(admin)/admin/page.tsx', 'src/app/(admin)/super-admin/page.tsx', 'src/app/updates/page.tsx', 'src/components/updates/UpdatesBrowser.tsx', 'package.json',
  ]
  for (const p of quiet) assert.equal(entryWarning([{ status: 'M', path: p }]), null, p)
  assert.equal(entryWarning([{ status: 'D', path: 'src/components/Old.tsx' }]), null)
  for (const p of ['src/components/layout/Header.tsx', 'src/app/book/[slug]/page.tsx', 'src/styles/dashboard-shell.css', 'src/app/globals.css']) {
    assert.deepEqual(visibleChanges([{ status: 'M', path: p }]), [p], p)
  }
  assert.match(entryWarning(Array.from({ length: 8 }, (_, i) => ({ status: 'M', path: `src/components/C${i}.tsx` })))!, /and 3 more/)
})

test('git name-status output is read, renames by their new name', () => {
  assert.deepEqual(parseNameStatus('M\tsrc/a.tsx\nA\tcontent/updates/1.15.0.md\nR100\tsrc/old.tsx\tsrc/new.tsx\n\n'), [
    { status: 'M', path: 'src/a.tsx' }, { status: 'A', path: 'content/updates/1.15.0.md' }, { status: 'R', path: 'src/new.tsx' },
  ])
})

test('the check runs on every pull request, only warns, and the rule is written in docs/feature-map.md', () => {
  const workflow = read('.github/workflows/pull-request.yml')
  assert.match(workflow, /run: npm run updates-entry/)
  assert.match(workflow, /fetch-depth: 0/, 'the comparison needs the history')
  assert.match(workflow, /BASE_REF: \$\{\{ github\.base_ref \}\}/)
  assert.match(JSON.parse(read('package.json')).scripts['updates-entry'], /updates-entry-cli\.ts/)
  assert.match(read('tests/support/updates-entry-cli.ts'), /::warning/)
  assert.doesNotMatch(read('tests/support/updates-entry-cli.ts'), /process\.exit\(1\)/, 'a warning never fails the pull request')
  const map = read('docs/feature-map.md')
  assert.match(map, /EVERY entry has a picture/)
  assert.match(map, /npm run updates-entry/)
})
