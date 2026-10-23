// The public Updates page (T-0683): /updates is built from the files in content/updates/, a new file is a new entry,
// a file with no date or no version stops the build, the page is in the sitemap, and every public page has the
// Updates link in its footer. The real loader, the real page (rendered to HTML) and the real sitemap run here; the
// "mutations" copy the real files, break one thing, and expect the check to go red.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { parseUpdate, loadUpdates, sortUpdates, imageSize, compareVersions, formatUpdateDate, formatUpdateDateShort, pickVersion, newestUpdateDate, BULLETS_MAX, type UpdateEntry } from '@/lib/updates'
import { PAGE_SEO, pageMetadata } from '@/lib/page-meta'
import { SITE_URL } from '@/lib/site-url'
import sitemap from '@/app/sitemap'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const REAL_DIR = path.join(ROOT, 'content', 'updates')

const GOOD = `---
version: 2.0.0
date: 2026-11-02
title: A new thing for tutors
---
- First plain sentence.
- Second plain sentence.
`

/** Runs `fn` with the working folder set to a scratch copy of the project's content and public/updates, then cleans up. */
async function inScratchProject<T>(fn: (root: string) => T | Promise<T>): Promise<T> {
  const root = mkdtempSync(path.join(tmpdir(), 'tutafy-updates-'))
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

/** What React writes into HTML for a piece of text. */
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
const throwsWith = (raw: string, name: string, pattern: RegExp) => assert.throws(() => parseUpdate(raw, name), pattern, `${name}: ${raw.slice(0, 60)}`)

// ---- the written entries ------------------------------------------------------------------------------

test('the real folder holds the six entries of the first week, newest first, each named after its version', () => {
  const entries = loadUpdates()
  assert.ok(entries.length >= 6)
  assert.deepEqual(entries.map(e => e.version), [...entries.map(e => e.version)].sort((a, b) => compareVersions(b, a)))
  for (const e of entries) assert.ok(existsSync(path.join(REAL_DIR, `${e.version}.md`)), e.version)
  const titles = entries.map(e => e.title.toLowerCase()).join(' | ')
  for (const word of ['lesson lengths', 'tutor and student', 'first student', 'card payments', 'phone', 'zoom']) {
    assert.ok(titles.includes(word), `no entry about "${word}": ${titles}`)
  }
  // the view-as-student entry names both buttons the tutor sees
  const switchEntry = entries.find(e => e.title.toLowerCase().includes('tutor and student'))!
  assert.match(switchEntry.bullets.join(' '), /View as student/)
  assert.match(switchEntry.bullets.join(' '), /Back to tutor/)
  // every date is a real day and never ahead of the newest (the loader enforces it; shown here for the five)
  for (const e of entries) assert.match(e.date, /^2026-\d\d-\d\d$/)
})

test('the pictures named by the entries are files in public/updates', () => {
  const withImage = loadUpdates().filter(e => e.image)
  assert.ok(withImage.length >= 2)
  for (const e of withImage) {
    assert.ok(existsSync(path.join(ROOT, 'public', e.image!.src)), e.image!.src)
    assert.ok(e.image!.alt.length > 10)
  }
})

test('the size of a picture is read from the file, so the page can reserve its space', () => {
  const sizes = Object.fromEntries(loadUpdates().filter(e => e.image).map(e => [e.image!.src, [e.image!.width, e.image!.height]]))
  assert.deepEqual(sizes['/updates/first-student-card.webp'], [1164, 430])
  assert.deepEqual(sizes['/updates/lesson-lengths.webp'], [709, 293])
  // a PNG header (400 x 300) and noise
  const png = Buffer.alloc(33)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0)
  png.writeUInt32BE(13, 8); png.write('IHDR', 12, 'latin1'); png.writeUInt32BE(400, 16); png.writeUInt32BE(300, 20)
  assert.deepEqual(imageSize(png), { width: 400, height: 300 })
  assert.equal(imageSize(Buffer.from('not a picture at all, just some words in a file')), null)
  assert.equal(imageSize(Buffer.alloc(0)), null)
})

test('MUTATION: a picture file that is not a picture stops the build', async () => {
  await inScratchProject(root => {
    writeFileSync(path.join(root, 'public', 'updates', 'first-student-card.webp'), 'this is not an image')
    assert.throws(() => loadUpdates(), /first-student-card\.webp is not a readable \.webp or \.png file/)
  })
})

// ---- the real page ------------------------------------------------------------------------------------

test('/updates renders every entry from the files: version, day, title, summary, picture and bullets, newest first', async () => {
  const { default: UpdatesPage } = await import('@/app/updates/page.tsx')
  const html = renderToStaticMarkup(UpdatesPage())
  const entries = loadUpdates()
  // the list on the left, newest first, each row linking to its own address
  const listAt = entries.map(e => html.indexOf(`href="#v${e.version}"`))
  assert.ok(listAt.every((at, i) => at > 0 && (i === 0 || at > listAt[i - 1])), `list order: ${listAt}`)
  for (const e of entries) {
    assert.ok(html.includes(`>v${e.version}</span>`), e.version)
    assert.ok(html.includes(`dateTime="${e.date}"`), e.date)
    assert.ok(html.includes(formatUpdateDate(e.date)), e.date)
    assert.ok(html.includes(formatUpdateDateShort(e.date)), e.date)
    assert.ok(html.includes(esc(e.title)), e.title)
    if (e.summary) assert.ok(html.includes(esc(e.summary)), e.summary)
    for (const b of e.bullets) assert.ok(html.includes(esc(b)), b)
    if (e.image) {
      assert.ok(html.includes(`src="${e.image.src}"`), e.image.src)
      assert.ok(html.includes(`width="${e.image.width}" height="${e.image.height}"`), 'the picture reserves its space')
    }
  }
  assert.ok(entries.some(e => e.summary), 'the entries carry a one-sentence summary')
  // the page frame of the chosen design
  assert.match(html, />Changelog</)
  assert.match(html, /<h1[^>]*>Updates<\/h1>/)
  assert.match(html, /What changed in every version of Tutafy/)
  assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1)
  assert.equal((html.match(/<main[ >]/g) ?? []).length, 1)
  assert.match(html, /<footer class="border-t border-gray-100 py-8 px-6">/, "the site's own footer")
  assert.match(html, /<div class="min-h-screen bg-white">/, 'a white page like the rest of the site')
  assert.match(html, /bg-indigo-500/)
  // the page code names no version and no date: those come from the files
  const pageSrc = read('src/app/updates/page.tsx') + read('src/components/updates/UpdatesBrowser.tsx')
  assert.doesNotMatch(pageSrc, /\b\d+\.\d+\.\d+\b|\b2026-\d\d-\d\d\b/)
})

test('only the chosen version is open: the newest by default, any other from the address, the rest stay in the page hidden', async () => {
  const { UpdatesView } = await import('@/components/updates/UpdatesBrowser.tsx')
  const entries = loadUpdates()
  const openOf = (selected: string) => {
    const html = renderToStaticMarkup(UpdatesView({ entries, selected }))
    const articles = [...html.matchAll(/<article( hidden="")?>([\s\S]*?)<\/article>/g)]
    assert.equal(articles.length, entries.length, 'every version is in the page')
    return articles.map((m, i) => ({ version: entries[i].version, open: !m[1] }))
  }
  for (const e of entries) {
    const open = openOf(e.version).filter(a => a.open).map(a => a.version)
    assert.deepEqual(open, [e.version])
  }
  // "Latest" is on the newest version only: once in the list and once in its own article
  const html = renderToStaticMarkup(UpdatesView({ entries, selected: entries[3].version }))
  assert.equal((html.match(/>Latest</g) ?? []).length, 2)
  assert.ok(html.indexOf('>Latest<') < html.indexOf(`href="#v${entries[1].version}"`), 'the badge is on the first row')
  // the current row of the list is marked
  assert.equal((html.match(/aria-current="true"/g) ?? []).length, 1)
  assert.match(html, new RegExp(`aria-current="true"[^>]*><span[^>]*><span[^>]*>v${entries[3].version.replace(/\./g, '\\.')}<`))
  // older and newer buttons
  const oldest = renderToStaticMarkup(UpdatesView({ entries, selected: entries[entries.length - 1].version }))
  assert.match(oldest, />Newer</)
  const newest = renderToStaticMarkup(UpdatesView({ entries, selected: entries[0].version }))
  assert.match(newest, />Older</)
})

/** 150 made-up versions, newest first (a page that has to stay two columns when the list is long). */
function manyEntries(count = 150): UpdateEntry[] {
  return Array.from({ length: count }, (_, i) => {
    const n = count - i
    return { version: `1.${n}.0`, date: '2026-10-21', title: `Change number ${n}`, summary: `Sample sentence ${n}.`, bullets: ['One.', 'Two.', 'Three.'] }
  })
}

test('with 150 versions the page is still two columns: the list is a box with its own scroll, one version is open, the newest by default', async () => {
  const { UpdatesBrowser, UpdatesView } = await import('@/components/updates/UpdatesBrowser.tsx')
  const entries = manyEntries()
  // no address (the server, or a visit to /updates): the newest is open and carries the Latest badge
  const html = renderToStaticMarkup(createElement(UpdatesBrowser, { entries }))
  const articles = [...html.matchAll(/<article( hidden="")?>/g)]
  assert.equal(articles.length, 150, 'every version is in the page')
  assert.equal(articles.filter(a => !a[1]).length, 1, 'but only one is open')
  assert.ok(!articles[0][1], 'and it is the first, the newest')
  assert.match(html, /<article>[\s\S]*?>v1\.150\.0<\/span><span[^>]*>Latest<\/span>/, 'the newest open version has the Latest badge')
  assert.equal((html.match(/>Latest</g) ?? []).length, 2, 'Latest is shown on the newest only')
  // the list: a box of fixed height that scrolls by itself (and stays in view on a desktop), never a page-long stack
  const nav = /<nav aria-label="Versions" class="([^"]*)"/.exec(html)![1].split(/\s+/)
  for (const c of ['max-h-[300px]', 'overflow-y-auto', 'lg:sticky', 'lg:top-[65px]', 'lg:max-h-[calc(100vh-65px)]']) assert.ok(nav.includes(c), `the list lacks ${c}`)
  assert.equal((html.match(/href="#v1\.\d+\.0"/g) ?? []).length, 150 + 149 + 149, 'one row per version, plus an Older and a Newer link in each open-or-hidden article but the ends')
  // the two columns start at 1024px
  assert.match(html, /lg:grid-cols-\[280px_minmax\(0,1fr\)\]/)
  // any chosen version is the only open one, however far down the list it is
  for (const pick of ['1.75.0', '1.1.0']) {
    const open = [...renderToStaticMarkup(UpdatesView({ entries, selected: pick })).matchAll(/<article( hidden="")?>([\s\S]*?)<\/article>/g)].filter(m => !m[1])
    assert.equal(open.length, 1)
    assert.ok(open[0][2].includes(`>v${pick}</span>`))
    assert.ok(!open[0][2].includes('Latest'), 'an older version is not Latest')
  }
})

// ---- the brand: the layout is the owner's pick, the look is Tutafy's -------------------------------------

test("the Updates page looks like the rest of Tutafy: Tutafy's own colours, type, corners and header, no black page", () => {
  const files = ['src/app/updates/page.tsx', 'src/components/updates/UpdatesBrowser.tsx', 'src/components/updates/ImageLightbox.tsx']
  for (const f of files) {
    const src = read(f).replace(/^\s*\/\/.*$/gm, '')
    assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/, `${f} writes a colour of its own (a hex value); use the site's palette`)
    assert.doesNotMatch(src, /\b(?:bg|text|border)-(?:black|zinc|neutral|slate|stone)\b/, `${f} uses a colour the rest of the site does not`)
    assert.doesNotMatch(src, /font-mono|Geist_Mono|ui-monospace/, `${f} sets its own typeface`)
    assert.doesNotMatch(src, /\bdark:/, `${f} has a dark variant`)
  }
  // the header is the blog index's: same bar, same logo block, same Start free button
  const page = read('src/app/updates/page.tsx')
  const blog = read('src/app/blog/page.tsx')
  for (const piece of [
    'className="border-b border-gray-100 px-6 py-4 sticky top-0 bg-white/90 backdrop-blur z-40"',
    '<SiteLogo />', // the shared logo (T-0818): same block and word as before, now one link to the home page
    'className="text-[13px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors px-4 py-2 rounded-lg">Start free</Link>',
    '<p className="text-[12px] font-bold text-indigo-600 uppercase tracking-widest mb-3">',
    'text-[17px] text-gray-500',
  ]) {
    assert.ok(page.includes(piece), `the Updates page does not have: ${piece}`)
    assert.ok(blog.includes(piece), `the blog index no longer has (so this check is out of date): ${piece}`)
  }
  // the cards and pictures use the site's corners, borders and indigo accent
  const browser = read('src/components/updates/UpdatesBrowser.tsx') + read('src/components/updates/ImageLightbox.tsx') // the picture frame moved into the lightbox (T-0834)
  for (const piece of ['rounded-2xl border border-gray-100', 'bg-indigo-50', 'text-indigo-600', 'border-indigo-500', 'text-gray-900', 'text-gray-500']) assert.ok(browser.includes(piece), piece)
})

test('the address picks the version: #v1.3.0 and #1.3.0 pick 1.3.0, nothing or nonsense picks the newest', () => {
  const entries = loadUpdates()
  const newest = entries[0].version
  assert.equal(pickVersion('#v1.3.0', entries), '1.3.0')
  assert.equal(pickVersion('#1.3.0', entries), '1.3.0')
  assert.equal(pickVersion('#V1.3.0', entries), '1.3.0')
  assert.equal(pickVersion('#v1.0.0', entries), '1.0.0')
  for (const bad of ['', '#', '#v9.9.9', '#nonsense', '#v1.3', '#v1.3.0%20', '#%E0%A4%A', '#v1.3.0/../x', '#__proto__']) {
    assert.equal(pickVersion(bad, entries), newest, JSON.stringify(bad))
  }
  assert.equal(pickVersion('#v1.3.0', []), '')
})

test('MUTATION: a new file in content/updates shows up on the real page with no change to the page code', async () => {
  await inScratchProject(async root => {
    const { default: UpdatesPage } = await import('@/app/updates/page.tsx')
    const before = renderToStaticMarkup(UpdatesPage())
    assert.ok(!before.includes('v9.9.9'))
    writeFileSync(path.join(root, 'content', 'updates', '9.9.9.md'), GOOD.replace('2.0.0', '9.9.9').replace('2026-11-02', '2026-12-31').replace('A new thing for tutors', 'Brand new headline\nimage: /updates/lesson-lengths.webp\nimageAlt: A picture for the new entry'))
    const after = renderToStaticMarkup(UpdatesPage())
    assert.ok(after.includes('>v9.9.9<') && after.includes('Brand new headline') && after.includes('December 31, 2026'))
    assert.ok(after.indexOf('href="#v9.9.9"') < after.indexOf('href="#v1.5.0"'), 'the new version is on top of the list')
    assert.ok(/<article>[^]*?>v9\.9\.9</.test(after), 'and it is the open one (the newest is shown first)')
    assert.ok(after.includes('>v1.0.0<'), 'the old entries are still there')
  })
})

test('MUTATION: a real file with its date or version line removed makes the page (and the build) fail', async () => {
  const { default: UpdatesPage } = await import('@/app/updates/page.tsx')
  for (const field of ['date', 'version', 'title']) {
    await inScratchProject(root => {
      const file = path.join(root, 'content', 'updates', '1.3.0.md')
      const text = readFileSync(file, 'utf8')
      assert.match(text, new RegExp(`^${field}: `, 'm'))
      writeFileSync(file, text.replace(new RegExp(`^${field}: .*\\r?\\n`, 'm'), ''))
      assert.throws(() => renderToStaticMarkup(UpdatesPage()), new RegExp(`1\\.3\\.0\\.md: the ${field} is missing`), field)
      assert.throws(() => loadUpdates(), new RegExp(`the ${field} is missing`), field)
    })
  }
})

test('MUTATION: a picture that is not in public/, or a version written twice, stops the build', async () => {
  await inScratchProject(root => {
    const file = path.join(root, 'content', 'updates', '1.4.0.md')
    writeFileSync(file, readFileSync(file, 'utf8').replace('first-student-card.webp', 'gone.webp'))
    assert.throws(() => loadUpdates(), /image \/updates\/gone\.webp is not in public\//)
  })
  const a = parseUpdate(GOOD, '2.0.0.md')
  assert.throws(() => sortUpdates([a, { ...a }]), /version 2\.0\.0 is written twice/)
})

// ---- the rules of one file (every rule has a broken sample that must be refused) -------------------------

test('a good file is read, with CRLF line ends and a byte order mark too', () => {
  const e = parseUpdate(GOOD, '2.0.0.md')
  assert.deepEqual(e, { version: '2.0.0', date: '2026-11-02', title: 'A new thing for tutors', bullets: ['First plain sentence.', 'Second plain sentence.'] })
  assert.deepEqual(parseUpdate('﻿' + GOOD.replace(/\n/g, '\r\n'), '2.0.0.md'), e)
  const withImage = parseUpdate(GOOD.replace('title: A new thing for tutors', 'title: A new thing for tutors\nimage: /updates/x.webp\nimageAlt: A picture of the new thing'), '2.0.0.md')
  assert.deepEqual(withImage.image, { src: '/updates/x.webp', alt: 'A picture of the new thing' })
})

test('a missing or wrong version or date is refused, naming the file', () => {
  throwsWith(GOOD.replace('version: 2.0.0\n', ''), '2.0.0.md', /2\.0\.0\.md: the version is missing/)
  throwsWith(GOOD.replace('date: 2026-11-02\n', ''), '2.0.0.md', /the date is missing/)
  throwsWith(GOOD.replace('version: 2.0.0', 'version: 2.0'), '2.0.0.md', /the version "2\.0" must look like 1\.4\.0/)
  throwsWith(GOOD.replace('version: 2.0.0', 'version: v2.0.0'), 'v2.0.0.md', /must look like/)
  throwsWith(GOOD.replace('version: 2.0.0', 'version: 2.0.0-beta'), '2.0.0-beta.md', /must look like/)
  throwsWith(GOOD, '2.1.0.md', /must be named 2\.0\.0\.md/)
  for (const bad of ['02/11/2026', '2026-13-01', '2026-02-30', '2026-1-2', 'soon', '2026-11-02T10:00']) {
    throwsWith(GOOD.replace('2026-11-02', bad), '2.0.0.md', /the date .* must be a real day written YYYY-MM-DD/)
  }
  throwsWith(GOOD.replace('title: A new thing for tutors\n', ''), '2.0.0.md', /the title is missing/)
  throwsWith(GOOD.replace('A new thing for tutors', 'x'.repeat(81)), '2.0.0.md', /the title must be 3 to 80/)
})

test('the header and the bullets keep to the format', () => {
  throwsWith('- just bullets\n', '2.0.0.md', /must start with a header/)
  throwsWith(GOOD.replace('title:', 'headline:'), '2.0.0.md', /unknown header "headline"/)
  throwsWith(GOOD.replace('date: 2026-11-02', 'date 2026-11-02'), '2.0.0.md', /cannot read the header line/)
  throwsWith(GOOD.replace(/- First.*\n- Second.*\n/, ''), '2.0.0.md', /at least one bullet/)
  throwsWith(GOOD + 'A paragraph that is not a bullet.\n', '2.0.0.md', /must be a bullet starting with "- "/)
  throwsWith(GOOD + '-no space\n', '2.0.0.md', /must be a bullet/)
  throwsWith(GOOD + '- ' + 'y'.repeat(221) + '\n', '2.0.0.md', /a bullet is 221 characters/)
  throwsWith(GOOD + '- extra\n'.repeat(BULLETS_MAX), '2.0.0.md', new RegExp(`at most ${BULLETS_MAX} bullets`))
})

test('the summary is optional, one sentence, and held to the same privacy rules', () => {
  const withSummary = (s: string) => GOOD.replace('title: A new thing for tutors', `title: A new thing for tutors\nsummary: ${s}`)
  assert.equal(parseUpdate(withSummary('One sentence about it.'), '2.0.0.md').summary, 'One sentence about it.')
  assert.equal(parseUpdate(GOOD, '2.0.0.md').summary, undefined)
  throwsWith(withSummary(''), '2.0.0.md', /the summary must be 3 to 200 characters, it is 0/)
  throwsWith(withSummary('s'.repeat(201)), '2.0.0.md', /the summary must be 3 to 200 characters, it is 201/)
  throwsWith(withSummary('Write to ten@example.com.'), '2.0.0.md', /summary contains an email address/)
  throwsWith(withSummary('Call 0900 000 000.'), '2.0.0.md', /summary contains a phone number/)
  throwsWith(withSummary('Done in T-0681.'), '2.0.0.md', /summary names an internal ticket/)
})

test('private or internal text is refused: an email address, a phone number, a ticket name', () => {
  throwsWith(GOOD + '- Write to ten@example.com for help.\n', '2.0.0.md', /bullet contains an email address/)
  throwsWith(GOOD.replace('A new thing for tutors', 'Ask ten@example.com'), '2.0.0.md', /title contains an email address/)
  throwsWith(GOOD + '- Call 0900 000 000 now.\n', '2.0.0.md', /bullet contains a phone number/)
  throwsWith(GOOD + '- Call +84 900 000 000 now.\n', '2.0.0.md', /phone number/)
  throwsWith(GOOD + '- Fixed in T-0681 last week.\n', '2.0.0.md', /names an internal ticket/)
  throwsWith(GOOD + '- Waiting item W-2064 done.\n', '2.0.0.md', /names an internal ticket/)
  // ordinary text with numbers is fine: lesson lengths, a written day, a price
  assert.doesNotThrow(() => parseUpdate(GOOD + '- Pick 30, 45, 60 or 90 minutes; free since 2026-10-21 for $12 a month.\n', '2.0.0.md'))
})

test('a picture needs a path under /updates/ and a description', () => {
  const withImage = (line: string) => GOOD.replace('title: A new thing for tutors', `title: A new thing for tutors\n${line}`)
  throwsWith(withImage('image: /updates/x.webp'), '2.0.0.md', /needs imageAlt/)
  throwsWith(withImage('imageAlt: Described but no picture'), '2.0.0.md', /imageAlt is written but there is no image/)
  for (const bad of ['/x.webp', '/updates/../secret.webp', 'https://example.com/x.webp', '/updates/x.svg', '/updates/x.jpg', 'x.webp']) {
    throwsWith(withImage(`image: ${bad}\nimageAlt: A described picture`), '2.0.0.md', /the image .* must be \/updates\//)
  }
})

test('versions compare as numbers, and a newer version never carries an older date', () => {
  assert.ok(compareVersions('1.10.0', '1.9.0') > 0)
  assert.ok(compareVersions('2.0.0', '1.99.99') > 0)
  assert.equal(compareVersions('1.2.3', '1.2.3'), 0)
  const e = (version: string, date: string): UpdateEntry => ({ version, date, title: 'T title', bullets: ['b'] })
  assert.deepEqual(sortUpdates([e('1.9.0', '2026-10-01'), e('1.10.0', '2026-10-05'), e('1.2.0', '2026-09-01')]).map(x => x.version), ['1.10.0', '1.9.0', '1.2.0'])
  assert.throws(() => sortUpdates([e('1.1.0', '2026-10-01'), e('1.2.0', '2026-09-30')]), /1\.2\.0 is newer than 1\.1\.0 but dated 2026-09-30/)
  assert.doesNotThrow(() => sortUpdates([e('1.1.0', '2026-10-01'), e('1.2.0', '2026-10-01')])) // the same day is fine
  assert.equal(formatUpdateDate('2026-10-21'), 'October 21, 2026')
  assert.equal(formatUpdateDate('2026-01-05'), 'January 5, 2026')
})

test('a file that is not an entry in the folder is refused, other files are left alone', async () => {
  await inScratchProject(root => {
    const dir = path.join(root, 'content', 'updates')
    writeFileSync(path.join(dir, 'notes.md'), GOOD)
    assert.throws(() => loadUpdates(), /notes\.md: the file must be named 2\.0\.0\.md/)
    rmSync(path.join(dir, 'notes.md'))
    writeFileSync(path.join(dir, 'README.txt'), 'not an entry')
    assert.doesNotThrow(() => loadUpdates())
  })
})

// ---- search engines -------------------------------------------------------------------------------------

test('/updates is in the sitemap, dated by the newest entry, and has its own title and canonical', async () => {
  const entry = (await sitemap()).find(e => e.url === `${SITE_URL}/updates`)
  assert.ok(entry, '/updates is not in the sitemap')
  const newest = loadUpdates()[0].date
  assert.equal(newestUpdateDate(), newest)
  assert.equal(new Date(entry!.lastModified as Date).toISOString().slice(0, 10), newest)
  const m = pageMetadata('updates')
  assert.equal(String(m.alternates?.canonical), `${SITE_URL}/updates`)
  assert.equal(PAGE_SEO.updates.path, '/updates')
  assert.equal(m.robots, undefined, '/updates must stay indexable')
})

test('MUTATION: a newer entry moves the sitemap date, and an unreadable folder leaves it out instead of breaking the sitemap', async () => {
  await inScratchProject(async root => {
    writeFileSync(path.join(root, 'content', 'updates', '9.9.8.md'), GOOD.replace('2.0.0', '9.9.8').replace('2026-11-02', '2026-11-30')) // a version above every real one, so a later real entry never makes this test go stale
    const entry = (await sitemap()).find(e => e.url === `${SITE_URL}/updates`)!
    assert.equal(new Date(entry.lastModified as Date).toISOString().slice(0, 10), '2026-11-30')
    // a deployed function has no public/ folder: the sitemap date must not depend on the pictures
    rmSync(path.join(root, 'public'), { recursive: true })
    const noPictures = (await sitemap()).find(e => e.url === `${SITE_URL}/updates`)!
    assert.equal(new Date(noPictures.lastModified as Date).toISOString().slice(0, 10), '2026-11-30')
    rmSync(path.join(root, 'content'), { recursive: true })
    const gone = (await sitemap()).find(e => e.url === `${SITE_URL}/updates`)!
    assert.equal(gone.lastModified, undefined)
  })
})

test('the deployed functions get the folder: next.config.ts includes content/updates for the page and the sitemap', () => {
  const cfg = read('next.config.ts')
  assert.match(cfg, /outputFileTracingIncludes/)
  assert.match(cfg, /'\/updates': \['\.\/content\/updates\/\*\*\/\*'\]/)
  assert.match(cfg, /'\/sitemap\.xml': \['\.\/content\/updates\/\*\*\/\*'\]/)
})

// ---- the footer -----------------------------------------------------------------------------------------

/** Pages of the site that anyone can open. Each must show the Updates link in its footer. */
const PUBLIC_PAGES = [
  'src/app/page.tsx', 'src/app/switch/page.tsx', 'src/app/about/page.tsx', 'src/app/contact/page.tsx',
  'src/app/customers/page.tsx', 'src/app/privacy/page.tsx', 'src/app/terms/page.tsx', 'src/app/updates/page.tsx',
  'src/app/blog/page.tsx', 'src/app/blog/[slug]/page.tsx', 'src/app/tutors/(directory)/page.tsx', 'src/app/tutors/[slug]/page.tsx',
  'src/app/learn/[language]/page.tsx', 'src/app/unsubscribe/page.tsx',
]

/** Pages that are public but are not a place to browse, so they have no site footer: the reason is written. */
const NO_FOOTER: Record<string, string> = {
  'src/app/(auth)/login/page.tsx': 'sign-in form, a screen of its own',
  'src/app/(auth)/register/page.tsx': 'sign-up form, a screen of its own',
  'src/app/student/login/page.tsx': 'student sign-in form, a screen of its own',
  'src/app/book/[slug]/page.tsx': "a tutor's booking page, shown to that tutor's students",
  'src/app/book/[slug]/[member]/page.tsx': "a team member's booking page",
  'src/app/embed/[slug]/page.tsx': "the booking widget inside a tutor's own website",
  'src/app/offline/page.tsx': 'the page the installed app shows with no connection',
  'src/app/onboarding/page.tsx': 'the steps right after sign-up, behind a login',
  'src/app/student/dashboard/page.tsx': "a student's own area, behind a signed link",
  'src/app/settings/stripe/return/page.tsx': 'where Stripe sends a signed-in tutor back to',
}
const PRIVATE_AREAS = ['src/app/(admin)/', 'src/app/(dashboard)/', 'src/app/portal/']

/** True when the page's source shows the footer with the Updates link: the shared footer, or a footer of its own that links to it. */
function hasUpdatesFooter(src: string): boolean {
  return /<SiteFooter(\s[^>]*)?\/>/.test(src) || (/<footer[\s>]/.test(src) && /href="\/updates"/.test(src))
}

function allPageFiles(dir = path.join(ROOT, 'src', 'app')): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const p = path.join(dir, d.name)
    if (d.isDirectory()) return allPageFiles(p)
    return d.name === 'page.tsx' ? [path.relative(ROOT, p).replace(/\\/g, '/')] : []
  })
}

test('the shared footer shows Updates next to Privacy and Terms, and the link goes to /updates', async () => {
  const { SiteFooter, FOOTER_LINKS } = await import('@/components/SiteFooter.tsx')
  const html = renderToStaticMarkup(SiteFooter())
  const labels = [...html.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(m => [m[2], m[1]])
  assert.ok(labels.some(([label, href]) => label === 'Updates' && href === '/updates'), html)
  for (const l of ['About', 'Blog', 'Customers', 'Contact', 'Privacy', 'Terms']) assert.ok(labels.some(([label]) => label === l), l)
  assert.deepEqual(FOOTER_LINKS.map(l => l.label), ['Find tutors', 'About', 'Blog', 'Updates', 'Customers', 'Contact', 'Privacy', 'Terms'])
})

test('every public page has the Updates link in its footer', () => {
  for (const f of PUBLIC_PAGES) {
    assert.ok(existsSync(path.join(ROOT, f)), f)
    assert.ok(hasUpdatesFooter(read(f)), `${f} has no footer with an Updates link`)
  }
})

test('a page nobody listed cannot slip through: every page is public with a footer, private, or excused with a reason', () => {
  const unlisted = allPageFiles().filter(f => !PUBLIC_PAGES.includes(f) && !(f in NO_FOOTER) && !PRIVATE_AREAS.some(a => f.startsWith(a)))
  assert.deepEqual(unlisted, [], 'a new page: add it to PUBLIC_PAGES (and give it the footer) or to NO_FOOTER with a reason')
  for (const f of Object.keys(NO_FOOTER)) assert.ok(existsSync(path.join(ROOT, f)), `${f} in NO_FOOTER no longer exists`)
})

test('MUTATION: the footer check goes red when the footer, the link, or the shared component is missing', () => {
  const home = read('src/app/page.tsx')
  assert.ok(hasUpdatesFooter(home))
  assert.ok(!hasUpdatesFooter(home.replace(/<Link href="\/updates"[^\n]*\n/, '')), 'link removed')
  assert.ok(!hasUpdatesFooter(home.replace('<footer', '<div')), 'footer element removed')
  const about = read('src/app/about/page.tsx')
  assert.ok(hasUpdatesFooter(about))
  assert.ok(!hasUpdatesFooter(about.replace('<SiteFooter />', '')), 'shared footer removed')
  // and the shared footer itself without the Updates link
  const footer = read('src/components/SiteFooter.tsx')
  assert.match(footer, /\{ href: '\/updates', label: 'Updates' \}/)
})

// ---- the rule for the agents ---------------------------------------------------------------------------

test('docs/feature-map.md tells agents to add an Updates entry for every change a user can see', () => {
  const map = read('docs/feature-map.md')
  assert.match(map, /content\/updates\//)
  assert.match(map, /same pull request/i)
  assert.match(map, /English/)
  assert.match(map, /private/i)
  assert.match(map, /src\/lib\/updates\.ts/)
})

test('the entries a tutor reads hold no path, address or code words', () => {
  for (const e of loadUpdates()) {
    for (const text of [e.title, e.summary ?? '', ...e.bullets]) {
      assert.doesNotMatch(text, /https?:\/\/|\/api\/|migration|webhook|supabase|\.tsx?\b|`/i, `${e.version}: ${text}`)
    }
  }
})

test('there is one entry file per version and nothing else that looks like one', () => {
  const names = readdirSync(REAL_DIR)
  for (const n of names) assert.match(n, /^\d+\.\d+\.\d+\.md$/, n)
})
