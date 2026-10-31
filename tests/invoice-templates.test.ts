// T-1167: the three free invoice templates in public/downloads (Word, OpenDocument, PDF) are built by scripts/gen-invoice-templates.mjs.
// These tests check, without Word or LibreOffice, that every file is the one the script builds today (so the files and the script cannot drift apart),
// that each is a valid container (zip entries with correct CRC32, first stored `mimetype` for .odt, a PDF whose xref offsets point at the objects),
// that the XML inside is well formed, that every field an invoice needs is in the text, and that nothing real (an address, a link, a number) is in it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { inflateRawSync, crc32 } from 'node:zlib'
import { FILES, TEMPLATE } from '../scripts/gen-invoice-templates.mjs'
import { getPost } from '@/lib/blog'

const dir = 'public/downloads/'
const onDisk = (name: string) => readFileSync(dir + name)

type Entry = { name: string; method: number; data: Buffer; crcOk: boolean }
function readZip(buf: Buffer): Entry[] {
  let end = buf.length - 22
  while (end >= 0 && buf.readUInt32LE(end) !== 0x06054b50) end--
  assert.ok(end >= 0, 'zip: end of central directory found')
  const count = buf.readUInt16LE(end + 10)
  let p = buf.readUInt32LE(end + 16)
  const out: Entry[] = []
  for (let i = 0; i < count; i++) {
    assert.equal(buf.readUInt32LE(p), 0x02014b50, 'zip: central entry signature')
    const method = buf.readUInt16LE(p + 10), crc = buf.readUInt32LE(p + 16), csize = buf.readUInt32LE(p + 20)
    const nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42)
    const name = buf.subarray(p + 46, p + 46 + nlen).toString('utf8')
    assert.equal(buf.readUInt32LE(off), 0x04034b50, `zip: local header of ${name}`)
    const lstart = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28)
    const raw = buf.subarray(lstart, lstart + csize)
    const data = method === 8 ? inflateRawSync(raw) : Buffer.from(raw)
    out.push({ name, method, data, crcOk: crc32(data) === crc })
    p += 46 + nlen + xlen + clen
  }
  return out
}

/** Tag-by-tag check that every opened element is closed in order: enough to catch an unescaped character or a missing end tag. */
function assertWellFormed(source: string, label: string) {
  const stack: string[] = []
  for (const m of source.matchAll(/<(\/?)([A-Za-z_][\w:.-]*)[^>]*?(\/?)>/g)) {
    if (m[3] === '/') continue
    if (m[1] === '/') assert.equal(stack.pop(), m[2], `${label}: </${m[2]}> closes the element that was opened last`)
    else stack.push(m[2])
  }
  assert.deepEqual(stack, [], `${label}: every element is closed`)
  assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;|#)/.test(source), `${label}: no bare ampersand`)
}

const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
const textOfXml = (x: string) => decode(x.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ')

// What an invoice for private lessons needs, in the words of the template.
const MUST_HAVE = [
  'INVOICE', 'Invoice no.', 'Invoice date', 'Due date', 'From', 'Bill to'.toUpperCase(), 'Student or parent name', 'Date and time (time zone)', 'Description',
  'Duration', 'Rate', 'Amount', 'Subtotal', 'Late cancellation or no-show fee', 'Package credit or discount', 'Tax (only if you charge it)', 'Total due',
  'How to pay', 'PayPal:', 'Card:', 'Bank transfer:', 'payment reference', 'Terms', 'time zone', 'cancelled less than', 'Packages only', 'not tax or legal advice',
]

for (const [name, build] of Object.entries(FILES)) {
  test(`${name}: the file in public/downloads is exactly what the script builds`, () => {
    assert.ok(onDisk(name).equals(build()), `${name} is out of date: run node scripts/gen-invoice-templates.mjs`)
  })
}

test('tutoring-invoice-template.docx: a valid Word package with every invoice field', () => {
  const entries = readZip(onDisk('tutoring-invoice-template.docx'))
  const byName = Object.fromEntries(entries.map(e => [e.name, e]))
  for (const n of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'word/_rels/document.xml.rels']) assert.ok(byName[n], `has ${n}`)
  assert.ok(entries.every(e => e.crcOk), 'every entry has the right CRC32')
  for (const e of entries) assertWellFormed(e.data.toString('utf8'), e.name)
  const doc = byName['word/document.xml'].data.toString('utf8')
  assert.ok(/<w:sectPr>.*<w:pgSz w:w="12240" w:h="15840"\/>/s.test(doc), 'US Letter page')
  for (const tc of doc.split('<w:tc>').slice(1)) assert.ok(tc.includes('<w:p>'), 'every table cell holds a paragraph (Word refuses a cell without one)')
  const text = textOfXml(doc)
  for (const s of MUST_HAVE) assert.ok(text.toLowerCase().includes(s.toLowerCase()), `docx has "${s}"`)
})

test('tutoring-invoice-template.odt: a valid OpenDocument package with every invoice field', () => {
  const entries = readZip(onDisk('tutoring-invoice-template.odt'))
  assert.equal(entries[0].name, 'mimetype', 'mimetype is the first entry')
  assert.equal(entries[0].method, 0, 'mimetype is stored, not compressed')
  assert.equal(entries[0].data.toString(), 'application/vnd.oasis.opendocument.text')
  assert.ok(entries.every(e => e.crcOk), 'every entry has the right CRC32')
  for (const e of entries.slice(1)) assertWellFormed(e.data.toString('utf8'), e.name)
  const content = entries.find(e => e.name === 'content.xml')!.data.toString('utf8')
  const text = textOfXml(content)
  for (const s of MUST_HAVE) assert.ok(text.toLowerCase().includes(s.toLowerCase()), `odt has "${s}"`)
  assert.ok(entries.find(e => e.name === 'META-INF/manifest.xml'), 'has the manifest')
})

test('tutoring-invoice-template.pdf: a valid one-page PDF whose cross-reference table is right, with every invoice field', () => {
  const buf = onDisk('tutoring-invoice-template.pdf')
  const s = buf.toString('latin1')
  assert.ok(s.startsWith('%PDF-1.4\n') && s.trimEnd().endsWith('%%EOF'), 'header and trailer')
  const startxref = Number(/startxref\n(\d+)\n/.exec(s)![1])
  assert.ok(s.slice(startxref).startsWith('xref\n'), 'startxref points at the xref table')
  const rows = [...s.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map(m => Number(m[1]))
  assert.equal(rows.length, 6, 'six objects')
  rows.forEach((off, i) => assert.ok(s.slice(off).startsWith(`${i + 1} 0 obj\n`), `object ${i + 1} is at its offset`))
  assert.equal((s.match(/\/Type \/Page /g) ?? []).length, 1, 'one page')
  const length = Number(/\/Length (\d+) >>/.exec(s)![1])
  const body = s.slice(s.indexOf('stream\n') + 7, s.indexOf('\nendstream'))
  assert.equal(Buffer.byteLength(body, 'latin1'), length, 'stream length matches')
  const shown = [...body.matchAll(/\((.*)\) Tj/g)].map(m => m[1].replace(/\\([()\\])/g, '$1')).join(' ')
  // The PDF wraps long lines, so compare on the words with the line breaks removed.
  const flat = shown.replace(/\s+/g, ' ')
  for (const w of MUST_HAVE) for (const word of w.split(/\s+/)) assert.ok(flat.toLowerCase().includes(word.toLowerCase().replace(/[()]/g, '')), `pdf has "${word}" (from "${w}")`)
})

test('the templates contain placeholders and labels only: no address, link, account number or phone number', () => {
  const all = [...Object.values(TEMPLATE.meta), TEMPLATE.from, TEMPLATE.to, TEMPLATE.columns, ...TEMPLATE.rows, ...TEMPLATE.totals, TEMPLATE.payment, TEMPLATE.terms].flat(3).join(' | ')
  assert.ok(!/@/.test(all), 'no email address')
  assert.ok(!/https?:\/\//i.test(all), 'no link')
  assert.ok(!/\d{4,}/.test(all.replace(/20\d\d/g, '')), 'no long number')
  assert.ok(TEMPLATE.footer.includes('tutafy.com'), 'the footer names the site')
  // every real value is a [placeholder]: the only text outside brackets is a label
  assert.ok(/\[Your name or business name\]/.test(all) && /\[your PayPal link\]/.test(all))
})

test('the article offers each of the three files, and every link points at a file that exists', () => {
  const post = getPost('free-tutoring-invoice-template')
  assert.ok(post, 'the article is registered')
  const hrefs = post.content.flatMap(b => (b.type === 'links' ? b.items.map(i => i.href) : [])).filter(h => h.startsWith('/downloads/'))
  assert.deepEqual([...hrefs].sort(), Object.keys(FILES).map(n => '/downloads/' + n).sort(), 'one link for each of the three files')
  for (const h of hrefs) assert.ok(readFileSync('public' + h).length > 1000, `${h} exists and is not empty`)
})
