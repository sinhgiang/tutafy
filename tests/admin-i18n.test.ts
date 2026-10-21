// The owner's admin pages speak English (default) or Vietnamese, switched with one EN | VI button. All the words are in ONE table,
// src/lib/admin-i18n.ts. This file keeps that table honest: every key in both languages, the same {placeholders} in both, no
// untranslated copy, no key nobody uses; the English text equals the English the pages printed before the switch existed; and
// the table file is the ONE place in src that may hold Vietnamese (no other page, email, API answer or component may).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { findVietnamese } from './support/vietnamese.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

const i18n = await import('@/lib/admin-i18n.ts')
const { ADMIN_DICTIONARIES, makeT, fill, normalizeAdminLang, readErrorText, pageLabelText, stageText, sourceText, JOURNEY_APP_SECTIONS } = i18n
const { readErrorMessage } = await import('@/lib/read-errors.ts')
const { pageLabel, STAGE_LABEL } = await import('@/lib/timeline.ts')
const { SOURCE_LABEL } = await import('@/lib/visitor-source.ts')
const { APP_SECTIONS } = await import('@/lib/track-path.ts')
const { NOT_READABLE } = await import('@/lib/polar-income.ts')

type Dict = Record<string, string>
type Dicts = { en: Dict; vi: Dict }

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',')

/** Everything wrong with a pair of dictionaries: a key in one language only, an empty text, different {placeholders}. */
function problems(d: Dicts): string[] {
  const out: string[] = []
  const en = new Set(Object.keys(d.en))
  const vi = new Set(Object.keys(d.vi))
  for (const k of en) if (!vi.has(k)) out.push(`missing in VI: ${k}`)
  for (const k of vi) if (!en.has(k)) out.push(`missing in EN: ${k}`)
  for (const k of en) {
    if (!vi.has(k)) continue
    if (!d.en[k].trim()) out.push(`empty EN: ${k}`)
    if (!d.vi[k].trim()) out.push(`empty VI: ${k}`)
    if (placeholders(d.en[k]) !== placeholders(d.vi[k])) out.push(`placeholders differ: ${k}`)
  }
  return out
}

// ---- the table ---------------------------------------------------------------------------------------------------------------

test('every key has both an English and a Vietnamese text, with the same {placeholders}', () => {
  assert.deepEqual(problems(ADMIN_DICTIONARIES), [])
  assert.ok(Object.keys(ADMIN_DICTIONARIES.en).length > 250, 'the table holds the words of the whole admin area')
})

test('MUTATION: a Vietnamese key without an English one (or the other way round), an empty text or a changed placeholder turns the check red', () => {
  const copy = (): Dicts => ({ en: { ...ADMIN_DICTIONARIES.en }, vi: { ...ADMIN_DICTIONARIES.vi } })
  const a = copy(); a.vi['overview.onlyVietnamese'] = 'chỉ có bản tiếng Việt'
  assert.deepEqual(problems(a), ['missing in EN: overview.onlyVietnamese'])
  const b = copy(); b.en['overview.onlyEnglish'] = 'English only'
  assert.deepEqual(problems(b), ['missing in VI: overview.onlyEnglish'])
  const c = copy(); delete c.vi['nav.customers']
  assert.deepEqual(problems(c), ['missing in VI: nav.customers'])
  const d = copy(); delete d.en['nav.customers']
  assert.deepEqual(problems(d), ['missing in EN: nav.customers'])
  const e = copy(); e.vi['overview.movedUpHint'] = '{paying} người đang trả phí'
  assert.deepEqual(problems(e), ['placeholders differ: overview.movedUpHint'])
  const f = copy(); f.vi['nav.tutors'] = '   '
  assert.deepEqual(problems(f), ['empty VI: nav.tutors'])
})

// Words that read the same in both languages on purpose (a product or technical name), each with its reason.
const SAME_ON_PURPOSE: Record<string, string> = {
  'shell.title': 'product name', 'nav.superAdmin': 'name of the page', 'sa.title': 'name of the page', 'tutors.colSlug': 'technical word (the slug of the booking address)',
  'settings.stripe': 'product name', 'source.google_search': 'brand', 'source.google_ads': 'brand', 'source.ai_chatgpt': 'brand', 'source.ai_gemini': 'brand',
  'source.ai_claude': 'brand', 'source.ai_perplexity': 'brand', 'source.ai_copilot': 'brand',
}

test('Vietnamese is a translation, not a copy of the English (except the names listed with a reason)', () => {
  for (const k of Object.keys(ADMIN_DICTIONARIES.en)) {
    const same = ADMIN_DICTIONARIES.en[k] === ADMIN_DICTIONARIES.vi[k]
    assert.equal(same, k in SAME_ON_PURPOSE, same ? `${k} is not translated` : `${k} is listed as the same on purpose but differs`)
  }
})

test('every key is used by an admin file (the families read through the table helpers are listed here)', () => {
  // Read through the helpers of the table file itself (readErrorText, pageLabelText, stageText, sourceText, statusText) or by the menu list; the next test checks their English against the old code.
  const FAMILIES = ['revenue.polar.', 'stage.', 'source.', 'status.', 'table.', 'page.', 'nav.', 'readError.']
  const used = new Set<string>()
  const files: string[] = []
  const walk = (dir: string) => { for (const f of readdirSync(dir)) { const p = path.join(dir, f); statSync(p).isDirectory() ? walk(p) : files.push(p) } }
  walk(SRC)
  for (const f of files) {
    if (f.endsWith(`${path.sep}admin-i18n.ts`) || !/\.(ts|tsx)$/.test(f)) continue
    for (const m of readFileSync(f, 'utf8').matchAll(/['"`]([a-z]+(?:\.[A-Za-z_0-9]+)+)['"`]/g)) used.add(m[1])
  }
  const unused = Object.keys(ADMIN_DICTIONARIES.en).filter(k => !used.has(k) && !FAMILIES.some(p => k.startsWith(p)))
  assert.deepEqual(unused, [])
})

// ---- the English is the English that was there before -------------------------------------------------------------------------

test('the English helpers say exactly what the old English code said (read errors, page names, stages, sources, Polar reasons)', () => {
  const en = makeT('en')
  for (const tables of [[], ['tutors'], ['students', 'lessons'], ['visitors'], ['visitors', 'visitor_events'], ['tutors', 'visitors'], ['tutors', 'tutors'], ['weird_table']]) {
    assert.equal(readErrorText(en, tables), readErrorMessage(tables), JSON.stringify(tables))
  }
  for (const p of ['/', '/blog', '/upgrade', '/register', '/login', '/customers', '/about', '/updates', '/contact', '/privacy', '/terms', '/tutors', '/onboarding', '/dashboard', '/blog/best-tools', '/students', '/ai', '/weird', null, undefined, '']) {
    assert.equal(pageLabelText(en, p), pageLabel(p), String(p))
  }
  for (const s of ['registered', 'checkout', 'upgraded'] as const) assert.equal(stageText(en, s), STAGE_LABEL[s])
  for (const [k, label] of Object.entries(SOURCE_LABEL)) assert.equal(sourceText(en, k), label, k)
  assert.equal(sourceText(en, 'not_a_source'), 'not_a_source')
  for (const [reason, text] of Object.entries(NOT_READABLE)) assert.equal(en(`revenue.polar.${reason}` as never), text.charAt(0).toUpperCase() + text.slice(1), reason)
  assert.deepEqual([...JOURNEY_APP_SECTIONS], [...APP_SECTIONS], 'the section list of the table equals the list the journey records')
})

test('Vietnamese helpers speak Vietnamese for the same facts and keep names, numbers and paths as they are', () => {
  const vi = makeT('vi')
  assert.match(readErrorText(vi, ['tutors']), /^Chưa đọc được bảng gia sư \(tutors\), nên các con số phụ thuộc vào bảng đó chưa đáng tin\./)
  assert.match(readErrorText(vi, ['visitors', 'visitor_events']), /migration 015/)
  assert.match(readErrorText(vi, ['students', 'lessons']), /bảng học sinh \(students\) và bảng buổi học \(lessons\)/)
  assert.equal(pageLabelText(vi, '/upgrade'), 'Trang bảng giá và nâng gói')
  assert.equal(pageLabelText(vi, '/blog/best-tools'), 'Bài blog: best tools')
  assert.equal(pageLabelText(vi, '/students'), 'Trong ứng dụng: students')
  assert.equal(pageLabelText(vi, '/weird'), '/weird')
  assert.equal(sourceText(vi, 'ai_chatgpt'), 'ChatGPT')
  assert.equal(vi('overview.movedUpHint', { paying: 3, tutors: '10' }), '3 trong 10 gia sư đang trả phí')
})

test('fill and makeT: placeholders are replaced, a missing value stays visible, an unknown language falls back to English', () => {
  assert.equal(fill('{a} of {b}', { a: 1, b: 'x' }), '1 of x')
  assert.equal(fill('{a} of {b}', { a: 1 }), '1 of {b}')
  assert.equal(fill('no placeholders'), 'no placeholders')
  assert.equal(normalizeAdminLang('vi'), 'vi')
  for (const odd of ['en', 'VI', 'fr', '', undefined, null, 5]) assert.equal(normalizeAdminLang(odd), 'en', String(odd))
  assert.equal((makeT('xx' as never))('nav.tutors'), 'Tutors')
})

// ---- Vietnamese lives in the table file and nowhere else in src ---------------------------------------------------------------------

/** The only file in src that may hold Vietnamese: the translation table the owner's EN | VI switch reads. */
const TABLE_FILE = 'lib/admin-i18n.ts'

function sourceFiles(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = path.join(dir, f)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(ts|tsx|js|jsx|mjs|cjs|css|json|md|mdx|html|txt|svg)$/.test(f)) out.push(p)
    }
  }
  walk(SRC)
  return out
}

test('SCAN: no Vietnamese anywhere in src (UI text, comments, emails, API answers, blog) except the admin translation table', () => {
  const files = sourceFiles()
  assert.ok(files.length > 200, `scanned ${files.length} files`)
  const hits: string[] = []
  for (const f of files) {
    const rel = path.relative(SRC, f).split(path.sep).join('/')
    if (rel === TABLE_FILE) continue
    readFileSync(f, 'utf8').split(/\r?\n/).forEach((line, i) => {
      const found = findVietnamese(line)
      if (found) hits.push(`src/${rel}:${i + 1} "${found}"`)
    })
  }
  assert.deepEqual(hits, [], 'Vietnamese outside src/lib/admin-i18n.ts: put it in the table (admin pages only), or write it in English')
})

test('the scan sees Vietnamese (marked or typed without marks) and leaves other languages alone', () => {
  for (const bad of ['Khách hàng của tôi', 'Tiền học sinh trả', 'chưa đọc được', 'Tuần này', 'Hà Nội', 'khach hang', 'hoc sinh moi', 'gia su', 'Đăng ký', 'tiểu học', 'Người trả phí', 'Việt Nam']) {
    assert.ok(findVietnamese(bad), bad)
  }
  for (const fine of ['São Paulo', 'a café in Paris', 'naïve résumé', 'déjà vu', 'El niño', 'Müller', 'Zoë', 'Students by Level', 'Tutor growth', 'a plain English sentence — with a long dash', 'København']) {
    assert.equal(findVietnamese(fine), null, fine)
  }
  // the table file really holds Vietnamese, so the exemption is not an empty one
  assert.ok(findVietnamese(readFileSync(path.join(SRC, TABLE_FILE), 'utf8')))
})

test('MUTATION: a Vietnamese string added to any other file is found by the same scan', () => {
  const sample = ["export const label = 'Khách hàng của tôi'", '<p>Chưa có ai trả phí</p>', '// học sinh', "title: 'Tieng Viet'"]
  for (const line of sample) assert.ok(findVietnamese(line), line)
})

test('only the admin area knows about the language switch: no other file in src imports the table, the reader or the toggle', () => {
  const ALLOWED = [/^app\/\(admin\)\//, /^components\/admin\//, /^lib\/admin-i18n\.ts$/, /^lib\/admin-lang\.ts$/]
  const offenders: string[] = []
  for (const f of sourceFiles().filter(f => /\.(ts|tsx)$/.test(f))) {
    const rel = path.relative(SRC, f).split(path.sep).join('/')
    if (ALLOWED.some(a => a.test(rel))) continue
    if (/admin-i18n|admin-lang|AdminLang|LangToggle|tutafy_admin_lang/.test(readFileSync(f, 'utf8'))) offenders.push(rel)
  }
  assert.deepEqual(offenders, [])
})
