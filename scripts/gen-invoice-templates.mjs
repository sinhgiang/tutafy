// Writes the three free tutoring invoice templates of the article /blog/free-tutoring-invoice-template (T-1167):
//   public/downloads/tutoring-invoice-template.docx   Word (also opens in Google Docs: upload it to Google Drive and open it with Google Docs)
//   public/downloads/tutoring-invoice-template.pdf    PDF, to print or to fill in with any PDF editor
//   public/downloads/tutoring-invoice-template.odt    OpenDocument (LibreOffice, Pages, Google Docs, Word)
// Run: node scripts/gen-invoice-templates.mjs
// No library is used: a .docx and an .odt are zip files of XML, written here with node:zlib, and the PDF is written by hand with the standard Helvetica
// fonts. The bytes are fixed (no clock, no random id), so tests/invoice-templates.test.ts can rebuild each file and compare it with the one in public/.
// Every text is a placeholder in [square brackets] or a label; there is no real name, address, account or tax number in any file.
import { deflateRawSync, crc32 } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

export const TEMPLATE = {
  title: 'INVOICE',
  meta: [['Invoice no.', '[INV-2026-001]'], ['Invoice date', '[date]'], ['Due date', '[date]']],
  from: ['From', '[Your name or business name]', '[Address, or city and country]', '[Email address]', '[Business or tax ID, only if your country requires one]'],
  to: ['Bill to', '[Student or parent name]', '[Email address]', '[For a child: the parent or guardian who pays]'],
  columns: ['Date and time (time zone)', 'Description', 'Duration', 'Rate', 'Amount'],
  rows: [
    ['[Tue 3 Nov 2026, 16:00 London time]', '[English conversation lesson]', '[60 min]', '[$40.00]', '[$40.00]'],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
  ],
  totals: [
    ['Subtotal', '[$0.00]'],
    ['Late cancellation or no-show fee (see terms)', '[$0.00]'],
    ['Package credit or discount', '[-$0.00]'],
    ['Tax (only if you charge it)', '[$0.00]'],
    ['Total due', '[$0.00]'],
  ],
  paymentTitle: 'How to pay',
  payment: [
    'Please pay by [due date] using one of these:',
    'PayPal: [your PayPal link]',
    'Card: [your card payment link]',
    'Bank transfer: [account name, account number or IBAN, bank code]',
    'Use [invoice number] as the payment reference.',
  ],
  termsTitle: 'Terms',
  terms: [
    'Lessons are scheduled in [your time zone, for example Europe/London].',
    'A lesson moved or cancelled less than [24 hours] before it starts is charged [100%] of the lesson price. A missed lesson is charged in full.',
    'Packages only: prepaid lessons are valid for [number] weeks from the invoice date.',
  ],
  footer: 'Free template from tutafy.com. Edit it as you like. This is not tax or legal advice.',
}
const T = TEMPLATE

// ---------------------------------------------------------------------------------------------------------------------------------
// A minimal zip writer (fixed date, so the output never changes between runs).
// ---------------------------------------------------------------------------------------------------------------------------------
function zip(entries) {
  const DOS_DATE = ((2026 - 1980) << 9) | (10 << 5) | 31, DOS_TIME = 0
  const parts = [], central = []
  let offset = 0
  for (const { name, data, store } of entries) {
    const nameBuf = Buffer.from(name, 'utf8')
    const method = store ? 0 : 8
    const body = store ? data : deflateRawSync(data, { level: 9 })
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(method, 8)
    local.writeUInt16LE(DOS_TIME, 10); local.writeUInt16LE(DOS_DATE, 12); local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(body.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28)
    parts.push(local, nameBuf, body)
    const c = Buffer.alloc(46)
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(method, 10)
    c.writeUInt16LE(DOS_TIME, 12); c.writeUInt16LE(DOS_DATE, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(body.length, 20)
    c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nameBuf.length, 28); c.writeUInt32LE(offset, 42)
    central.push(c, nameBuf)
    offset += local.length + nameBuf.length + body.length
  }
  const cd = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...parts, cd, end])
}

const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

// ---------------------------------------------------------------------------------------------------------------------------------
// Word (.docx)
// ---------------------------------------------------------------------------------------------------------------------------------
export function buildDocx() {
  const run = (text, { bold = false, size = 21, color = '1F2937' } = {}) =>
    `<w:r><w:rPr>${bold ? '<w:b/>' : ''}<w:color w:val="${color}"/><w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${xml(text)}</w:t></w:r>`
  const para = (text, { bold, size, color, align = 'left', after = 60 } = {}) =>
    `<w:p><w:pPr><w:spacing w:before="0" w:after="${after}"/><w:jc w:val="${align}"/></w:pPr>${text === '' ? '' : run(text, { bold, size, color })}</w:p>`
  const border = c => `<w:top w:val="single" w:sz="4" w:space="0" w:color="${c}"/><w:left w:val="single" w:sz="4" w:space="0" w:color="${c}"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="${c}"/><w:right w:val="single" w:sz="4" w:space="0" w:color="${c}"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="${c}"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="${c}"/>`
  const none = '<w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/>'
  const table = (widths, rows, { bordered = true, header = false, boldLast = false, alignRightFrom = -1 } = {}) =>
    `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblBorders>${bordered ? border('9CA3AF') : none}</w:tblBorders><w:tblLayout w:type="fixed"/>` +
    `<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>` +
    `<w:tblGrid>${widths.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>` +
    rows.map((r, ri) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${r.map((cell, ci) => {
      const head = header && ri === 0, last = boldLast && ri === rows.length - 1
      const lines = Array.isArray(cell) ? cell : [cell]
      return `<w:tc><w:tcPr><w:tcW w:w="${widths[ci]}" w:type="dxa"/>${head ? '<w:shd w:val="clear" w:color="auto" w:fill="EEF2FF"/>' : ''}</w:tcPr>` +
        lines.map((l, li) => para(l, { bold: head || last || (!bordered && li === 0), size: head ? 19 : 20, align: ci >= alignRightFrom && alignRightFrom >= 0 ? 'right' : 'left', after: 20, color: head || (!bordered && li === 0) ? '3730A3' : '1F2937' })).join('') + '</w:tc>'
    }).join('')}</w:tr>`).join('') + '</w:tbl>'
  const gap = after => para('', { after })

  const body = [
    para(T.title, { bold: true, size: 40, color: '3730A3', after: 100 }),
    ...T.meta.map(([k, v]) => `<w:p><w:pPr><w:spacing w:before="0" w:after="30"/></w:pPr>${run(k + ': ', { bold: true })}${run(v)}</w:p>`),
    gap(120),
    table([5040, 5040], [[
      [`${T.from[0].toUpperCase()}`, ...T.from.slice(1)],
      [`${T.to[0].toUpperCase()}`, ...T.to.slice(1)],
    ]], { bordered: false }),
    gap(160),
    table([2700, 3000, 1280, 1500, 1600], [T.columns, ...T.rows], { header: true, alignRightFrom: 3 }),
    gap(120),
    table([7480, 2600], T.totals, { boldLast: true, alignRightFrom: 1 }),
    gap(160),
    para(T.paymentTitle, { bold: true, size: 24, color: '3730A3' }),
    ...T.payment.map(l => para(l, { after: 30 })),
    gap(120),
    para(T.termsTitle, { bold: true, size: 24, color: '3730A3' }),
    ...T.terms.map(l => para(l, { after: 30 })),
    gap(160),
    para(T.footer, { size: 17, color: '6B7280' }),
  ].join('')

  const document = HEAD + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body +
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>'
  const styles = HEAD + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr>' +
    '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault>' +
    '<w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>'
  const contentTypes = HEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'
  const rels = HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
  const docRels = HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
  return zip([
    { name: '[Content_Types].xml', data: Buffer.from(contentTypes) },
    { name: '_rels/.rels', data: Buffer.from(rels) },
    { name: 'word/document.xml', data: Buffer.from(document) },
    { name: 'word/styles.xml', data: Buffer.from(styles) },
    { name: 'word/_rels/document.xml.rels', data: Buffer.from(docRels) },
  ])
}

// ---------------------------------------------------------------------------------------------------------------------------------
// OpenDocument (.odt)
// ---------------------------------------------------------------------------------------------------------------------------------
export function buildOdt() {
  const NS = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" ' +
    'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"'
  const p = (style, text) => `<text:p text:style-name="${style}">${xml(text)}</text:p>`
  const cell = (style, lines, pStyle) => `<table:table-cell table:style-name="${style}" office:value-type="string">${lines.map(l => p(pStyle, l)).join('')}</table:table-cell>`
  const tableXml = (name, style, widths, rows, { head = false, bordered = true, rightFrom = -1, boldLast = false } = {}) =>
    `<table:table table:name="${name}" table:style-name="${style}">${widths.map((w, i) => `<table:table-column table:style-name="${style}.C${i}"/>`).join('')}` +
    rows.map((r, ri) => `<table:table-row>${r.map((c, ci) => {
      const isHead = head && ri === 0, isLast = boldLast && ri === rows.length - 1
      const pStyle = isHead ? 'THead' : isLast ? 'TBold' : (rightFrom >= 0 && ci >= rightFrom ? 'TRight' : 'TText')
      return cell(isHead ? 'CellHead' : bordered ? 'CellBox' : 'CellNone', Array.isArray(c) ? c : [c], pStyle)
    }).join('')}</table:table-row>`).join('') + '</table:table>'
  const colStyles = (name, widths) => widths.map((w, i) => `<style:style style:name="${name}.C${i}" style:family="table-column"><style:table-column-properties style:column-width="${w}in"/></style:style>`).join('')
  const meta = T.meta.map(([k, v]) => `<text:p text:style-name="TText"><text:span text:style-name="InvBold">${xml(k)}: </text:span>${xml(v)}</text:p>`).join('')
  const fromTo = tableXml('Parties', 'TabParties', [3.5, 3.5], [[[T.from[0].toUpperCase(), ...T.from.slice(1)], [T.to[0].toUpperCase(), ...T.to.slice(1)]]], { bordered: false })
  const content = HEAD + `<office:document-content ${NS} office:version="1.2"><office:automatic-styles>` +
    '<style:style style:name="InvTitle" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.08in"/><style:text-properties fo:font-size="20pt" fo:font-weight="bold" fo:color="#3730a3"/></style:style>' +
    '<style:style style:name="InvHead" style:family="paragraph"><style:paragraph-properties fo:margin-top="0.1in" fo:margin-bottom="0.04in"/><style:text-properties fo:font-size="12pt" fo:font-weight="bold" fo:color="#3730a3"/></style:style>' +
    '<style:style style:name="TText" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.02in"/><style:text-properties fo:font-size="10pt" fo:color="#1f2937"/></style:style>' +
    '<style:style style:name="TRight" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.02in" fo:text-align="end"/><style:text-properties fo:font-size="10pt" fo:color="#1f2937"/></style:style>' +
    '<style:style style:name="TBold" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.02in" fo:text-align="end"/><style:text-properties fo:font-size="10pt" fo:font-weight="bold" fo:color="#1f2937"/></style:style>' +
    '<style:style style:name="THead" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.02in"/><style:text-properties fo:font-size="9.5pt" fo:font-weight="bold" fo:color="#3730a3"/></style:style>' +
    '<style:style style:name="InvSmall" style:family="paragraph"><style:paragraph-properties fo:margin-top="0.12in"/><style:text-properties fo:font-size="8.5pt" fo:color="#6b7280"/></style:style>' +
    '<style:style style:name="InvBold" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>' +
    '<style:style style:name="CellBox" style:family="table-cell"><style:table-cell-properties fo:padding="0.04in" fo:border="0.5pt solid #9ca3af"/></style:style>' +
    '<style:style style:name="CellHead" style:family="table-cell"><style:table-cell-properties fo:padding="0.04in" fo:border="0.5pt solid #9ca3af" fo:background-color="#eef2ff"/></style:style>' +
    '<style:style style:name="CellNone" style:family="table-cell"><style:table-cell-properties fo:padding="0.04in" fo:border="none"/></style:style>' +
    '<style:style style:name="TabParties" style:family="table"><style:table-properties style:width="7in" table:align="left"/></style:style>' + colStyles('TabParties', [3.5, 3.5]) +
    '<style:style style:name="TabItems" style:family="table"><style:table-properties style:width="7in" table:align="left"/></style:style>' + colStyles('TabItems', [1.9, 2.1, 0.9, 1.0, 1.1]) +
    '<style:style style:name="TabTotals" style:family="table"><style:table-properties style:width="7in" table:align="left"/></style:style>' + colStyles('TabTotals', [5.2, 1.8]) +
    '</office:automatic-styles><office:body><office:text>' +
    p('InvTitle', T.title) + meta + p('TText', '') + fromTo + p('TText', '') +
    tableXml('Items', 'TabItems', [1.9, 2.1, 0.9, 1.0, 1.1], [T.columns, ...T.rows], { head: true }) + p('TText', '') +
    tableXml('Totals', 'TabTotals', [5.2, 1.8], T.totals, { rightFrom: 1, boldLast: true }) +
    p('InvHead', T.paymentTitle) + T.payment.map(l => p('TText', l)).join('') +
    p('InvHead', T.termsTitle) + T.terms.map(l => p('TText', l)).join('') + p('InvSmall', T.footer) +
    '</office:text></office:body></office:document-content>'
  const styles = HEAD + `<office:document-styles ${NS} office:version="1.2"><office:styles><style:default-style style:family="paragraph"><style:text-properties style:font-name="Calibri" fo:font-size="10pt"/></style:default-style></office:styles>` +
    '<office:automatic-styles><style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="8.5in" fo:page-height="11in" fo:margin-top="0.75in" fo:margin-bottom="0.75in" fo:margin-left="0.75in" fo:margin-right="0.75in"/></style:page-layout></office:automatic-styles>' +
    '<office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pm1"/></office:master-styles></office:document-styles>'
  const manifest = HEAD + '<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">' +
    '<manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>' +
    '<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/></manifest:manifest>'
  return zip([
    { name: 'mimetype', data: Buffer.from('application/vnd.oasis.opendocument.text'), store: true },
    { name: 'content.xml', data: Buffer.from(content) },
    { name: 'styles.xml', data: Buffer.from(styles) },
    { name: 'META-INF/manifest.xml', data: Buffer.from(manifest) },
  ])
}

// ---------------------------------------------------------------------------------------------------------------------------------
// PDF (US Letter, standard Helvetica; the text is plain ASCII so no font is embedded)
// ---------------------------------------------------------------------------------------------------------------------------------
export function buildPdf() {
  const H = 792
  const ops = []
  const esc = s => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  const text = (x, top, size, s, { bold = false, gray = 0.12, blue = false } = {}) => {
    if (s === '') return
    ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${blue ? '0.215 0.18 0.64 rg' : `${gray} g`} ${x} ${(H - top).toFixed(1)} Td (${esc(s)}) Tj ET`)
  }
  const line = (x1, top1, x2, top2, w = 0.5) => ops.push(`0.61 G ${w} w ${x1} ${(H - top1).toFixed(1)} m ${x2} ${(H - top2).toFixed(1)} l S`)
  const box = (x, top, w, h, fill) => ops.push(`${fill} rg ${x} ${(H - top - h).toFixed(1)} ${w} ${h} re f`)
  const wrap = (s, width, size, bold = false) => {
    const per = size * (bold ? 0.56 : 0.5), max = Math.max(4, Math.floor(width / per))
    const out = []
    let cur = ''
    for (const w of s.split(' ')) {
      if ((cur + ' ' + w).trim().length > max) { if (cur) out.push(cur); cur = w } else cur = (cur + ' ' + w).trim()
    }
    if (cur) out.push(cur)
    return out.length ? out : ['']
  }
  const L = 54, R = 558
  let y = 66
  text(L, y, 26, T.title, { bold: true, blue: true }); y += 24
  for (const [k, v] of T.meta) { text(L, y, 10, k + ':', { bold: true }); text(L + 76, y, 10, v); y += 15 }
  y += 10
  for (const [x, block] of [[L, T.from], [L + 260, T.to]]) {
    let yy = y
    text(x, yy, 10, block[0].toUpperCase(), { bold: true, blue: true }); yy += 14
    for (const l of block.slice(1)) for (const part of wrap(l, 230, 10)) { text(x, yy, 10, part); yy += 13 }
    block.yEnd = yy
  }
  y = Math.max(T.from.yEnd, T.to.yEnd) + 14
  // line items
  const cols = [150, 150, 60, 70, 74]
  const xs = cols.reduce((a, w, i) => (a.push(i ? a[i - 1] + cols[i - 1] : L), a), [])
  const drawRow = (cells, { head = false } = {}) => {
    const wrapped = cells.map((c, i) => wrap(c, cols[i] - 10, head ? 9 : 9.5, head))
    const h = Math.max(...wrapped.map(w => w.length)) * 12 + 10
    if (head) box(L, y, R - L, h, '0.933 0.949 1')
    wrapped.forEach((ls, i) => ls.forEach((l, k) => text(xs[i] + 5, y + 14 + k * 12, head ? 9 : 9.5, l, { bold: head, blue: head })))
    line(L, y, R, y); line(L, y + h, R, y + h)
    xs.forEach(x => line(x, y, x, y + h)); line(R, y, R, y + h)
    y += h
  }
  drawRow(T.columns, { head: true })
  for (const r of T.rows) drawRow(r)
  y += 12
  // totals
  for (let i = 0; i < T.totals.length; i++) {
    const last = i === T.totals.length - 1
    const [k, v] = T.totals[i]
    line(300, y + 18, R, y + 18)
    text(306, y + 13, 10, k, { bold: last }); text(R - 6 - v.length * 5.2, y + 13, 10, v, { bold: last })
    y += 18
  }
  y += 22
  text(L, y, 12, T.paymentTitle, { bold: true, blue: true }); y += 16
  for (const l of T.payment) for (const part of wrap(l, 490, 10)) { text(L, y, 10, part); y += 13 }
  y += 12
  text(L, y, 12, T.termsTitle, { bold: true, blue: true }); y += 16
  for (const l of T.terms) for (const part of wrap(l, 490, 10)) { text(L, y, 10, part); y += 13 }
  y += 14
  text(L, y, 8.5, T.footer, { gray: 0.42 })

  const stream = ops.join('\n')
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ]
  let out = '%PDF-1.4\n'
  const offsets = []
  objs.forEach((o, i) => { offsets.push(Buffer.byteLength(out, 'latin1')); out += `${i + 1} 0 obj\n${o}\nendobj\n` })
  const xref = Buffer.byteLength(out, 'latin1')
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') +
    `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}

export const FILES = { 'tutoring-invoice-template.docx': buildDocx, 'tutoring-invoice-template.odt': buildOdt, 'tutoring-invoice-template.pdf': buildPdf }

if (process.argv[1]?.endsWith('gen-invoice-templates.mjs')) {
  mkdirSync('public/downloads', { recursive: true })
  for (const [name, build] of Object.entries(FILES)) {
    const buf = build()
    writeFileSync(`public/downloads/${name}`, buf)
    console.log(name, buf.length, 'bytes')
  }
}
