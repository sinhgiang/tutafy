// T-0629: Tutafy on phones. The measured results (no sideways scroll, 44px targets, text of
// 14px, wide tables in their own frame, menus that open and close) come from running the
// pages in a browser at 390, 440 and 768 wide (scripts/mobile-audit.mjs with
// scripts/mock-supabase.mjs; see docs/feature-map.md). A unit test cannot open a browser,
// so this file keeps what makes those results hold, by reading the source, and fails when
// someone undoes one of them:
//   - the touch layer in globals.css covers every small text size the pages use;
//   - nothing is given a fixed width that does not fit a phone;
//   - every table sits in a frame that scrolls sideways;
//   - the phone menus exist, reach every page, and the desktop sidebars stay for desktop;
//   - the pieces changed for phones keep their desktop (md and up) classes.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { NAV } from '@/components/layout/nav-items'
import { ADMIN_NAV } from '@/components/admin/admin-nav'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${name}`
    if (statSync(path.join(ROOT, rel)).isDirectory()) sourceFiles(rel, out)
    else if (/\.tsx$/.test(name)) out.push(rel)
  }
  return out
}
const FILES = [...sourceFiles('src/app'), ...sourceFiles('src/components')]

// ---- the touch layer in globals.css -----------------------------------------------------------

const css = read('src/app/globals.css')
const marker = css.indexOf('Touch layer (T-0629)')
const layerStart = css.indexOf('@media', marker)

/** The text of the one media block that holds the touch layer. */
function layerBlock(): string {
  let depth = 0
  let end = -1
  for (let i = css.indexOf('{', layerStart); i < css.length; i++) {
    if (css[i] === '{') depth++
    if (css[i] === '}') { depth--; if (depth === 0) { end = i; break } }
  }
  return css.slice(layerStart, end + 1)
}

test('the touch layer is one media block at 1023px and below, after all the base styles, and nothing follows it', () => {
  assert.ok(marker > 0 && layerStart > marker, 'the layer is missing')
  const block = layerBlock()
  assert.match(block, /^@media \(max-width: 1023px\) \{/)
  assert.equal(css.slice(layerStart + block.length).trim(), '', 'a rule outside the media block would change the desktop')
  assert.ok(css.lastIndexOf('@layer') < layerStart, 'it must come after @layer base so it is not itself layered')
  assert.ok(!/@layer/.test(block), 'a layered rule would lose to the Tailwind utilities')
})

test('every text size under 14px that a page uses is raised to 14px by the layer', () => {
  const used = new Set<string>()
  for (const f of FILES) {
    const src = read(f)
    for (const m of src.matchAll(/\btext-\[(\d+(?:\.\d+)?)px\]/g)) if (Number(m[1]) < 14) used.add(`text-[${m[1]}px]`)
    for (const m of src.matchAll(/\btext-\[(\d*\.?\d+)rem\]/g)) if (Number(m[1]) * 16 < 14) used.add(`text-[${m[1]}rem]`)
    if (/\btext-xs\b/.test(src)) used.add('text-xs')
  }
  assert.ok(used.size >= 8, `expected many small sizes, found ${[...used]}`)
  const block = layerBlock()
  const selector = block.slice(0, block.indexOf('{', block.indexOf(':is(')))
  const escaped = (cls: string) => '.' + cls.replace(/[[\].]/g, c => `\\${c}`)
  for (const cls of used) assert.ok(selector.includes(escaped(cls)), `${cls} is used but not raised to 14px in globals.css`)
  assert.match(block, /font-size: 14px;/)
  // decorative pieces marked aria-hidden keep their drawn size
  assert.ok(selector.includes('[aria-hidden="true"] *'))
})

test('the layer gives buttons, fields and stand-alone links 44px, and fields 16px', () => {
  const block = layerBlock()
  assert.match(block, /button:not\(\[aria-hidden="true"\] \*\),[\s\S]*?summary,\s*select \{\s*min-height: 44px;/)
  assert.match(block, /input:not\(\[type="checkbox"\], \[type="radio"\], \[type="hidden"\], \[type="file"\]\),\s*select \{\s*min-height: 44px;\s*font-size: 16px;/)
  assert.match(block, /textarea \{\s*font-size: 16px;/)
  assert.match(block, /textarea \{\s*min-height: 44px;/)
  assert.match(block, /min-width: 44px;/)
  for (const part of ['a:is(.flex, .inline-flex, .block, .inline-block)', 'td a', 'footer a', 'nav a', 'a:has(> svg:only-child)']) {
    assert.ok(block.includes(part), `link rule for ${part} is missing`)
  }
})

// ---- nothing fixed that a phone cannot hold ------------------------------------------------------

test('no fixed width over 360px without a breakpoint, no unprefixed fixed-pixel grid columns', () => {
  const problems: string[] = []
  for (const f of FILES) {
    const src = read(f)
    for (const m of src.matchAll(/(^|[\s"'`{])((?:min-)?w)-\[(\d+)px\]/g)) {
      if (Number(m[3]) > 360) problems.push(`${f}: ${m[2]}-[${m[3]}px]`)
    }
    for (const m of src.matchAll(/(^|[\s"'`{])grid-cols-\[[^\]]*\d+px[^\]]*\]/g)) problems.push(`${f}: ${m[0].trim()} (put md: in front)`)
    for (const m of src.matchAll(/style=\{\{[^}]*\bwidth:\s*(\d+)\b/g)) if (Number(m[1]) > 360) problems.push(`${f}: inline width ${m[1]}`)
  }
  assert.deepEqual(problems, [])
})

test('the payments page stacks its stat cards and its two columns on a phone (it used to cut them off)', () => {
  const src = read('src/app/(dashboard)/payments/page.tsx')
  assert.match(src, /grid grid-cols-2 lg:grid-cols-4 gap-4/)
  // the bar chart is as tall as its bars on a phone; a fixed height with the bigger phone text made the bars cover the title
  assert.match(src, /flex items-end gap-2 lg:h-28/)
  assert.match(src, /grid grid-cols-1 lg:grid-cols-\[minmax\(0,1fr\)_300px\] gap-5/)
  const student = read('src/app/(dashboard)/students/[id]/page.tsx')
  assert.match(student, /grid grid-cols-1 md:grid-cols-3 gap-4/)
  assert.match(student, /md:col-span-1/)
  assert.match(student, /md:col-span-2/)
})

test('every table is in a frame that scrolls sideways, so a wide table never pushes or cuts the page', () => {
  const problems: string[] = []
  for (const f of FILES) {
    if (f.startsWith('src/components/ui/')) continue // the shared Table already wraps itself in overflow-x-auto
    const lines = read(f).split('\n')
    lines.forEach((line, i) => {
      if (!/<table\b/.test(line)) return
      const above = lines.slice(Math.max(0, i - 3), i).join('\n')
      if (!/overflow-x-auto/.test(above)) problems.push(`${f}:${i + 1}`)
    })
  }
  assert.deepEqual(problems, [])
  assert.match(read('src/components/ui/table.tsx'), /relative w-full overflow-x-auto/)
})

// ---- menus --------------------------------------------------------------------------------------

test('phone menu of the tutor app: a More sheet lists every page of the desktop sidebar', () => {
  const nav = read('src/components/layout/MobileNav.tsx')
  const side = read('src/components/layout/Sidebar.tsx')
  assert.match(nav, /import \{ NAV \} from '\.\/nav-items'/)
  assert.match(side, /import \{ NAV \} from '\.\/nav-items'/)
  assert.doesNotMatch(side, /const NAV\b/, 'the sidebar must not keep its own copy of the menu')
  // the sheet renders the shared list, so every page of the sidebar is in it
  assert.match(nav, /NAV\.map\(\(\{ group, items \}\)/)
  const hrefs = NAV.flatMap(g => g.items.map(i => i.href))
  for (const h of ['/dashboard', '/students', '/lessons', '/calendar', '/messages', '/payments', '/settings', '/upgrade'.replace('/upgrade', '/referral')]) assert.ok(hrefs.includes(h), h)
  // opens and closes: button with aria-expanded, close button, backdrop, Escape, closes on a link and on a page change
  assert.match(nav, /aria-expanded=\{open\}/)
  assert.match(nav, /aria-label="Close menu"/)
  assert.match(nav, /e\.key === 'Escape'/)
  assert.match(nav, /const open = openAt === pathname/) // open only for the page it was opened on, so a page change closes it
  assert.match(read('src/components/admin/AdminMobileNav.tsx'), /const open = openAt === pathname/)
  assert.match(nav, /onClick=\{\(\) => setOpen\(false\)\}/)
  assert.match(nav, /md:hidden/)
  // the layout hands the plan and the unread count to it
  assert.match(read('src/app/(dashboard)/layout.tsx'), /<MobileNav plan=\{plan\} unreadMessages=\{unreadMessages \?\? 0\} \/>/)
})

test('phone menu of the admin area: a top bar and drawer on phones, the sidebar from md up', () => {
  const layout = read('src/app/(admin)/layout.tsx')
  assert.match(layout, /<AdminMobileNav \/>/)
  assert.match(layout, /<AdminSidebar \/>/)
  assert.match(layout, /flex flex-col md:flex-row min-h-screen/)
  assert.match(layout, /min-w-0/)
  assert.match(layout, /p-4 md:p-8/)
  const side = read('src/components/admin/AdminSidebar.tsx')
  assert.match(side, /className="hidden md:flex w-60/)
  assert.match(side, /import \{ ADMIN_NAV \} from '\.\/admin-nav'/)
  const mobile = read('src/components/admin/AdminMobileNav.tsx')
  assert.match(mobile, /import \{ ADMIN_NAV \} from '\.\/admin-nav'/)
  assert.match(mobile, /md:hidden/)
  assert.match(mobile, /aria-expanded=\{open\}/)
  assert.match(mobile, /e\.key === 'Escape'/)
  assert.match(mobile, /aria-label="Close menu"/)
  assert.match(mobile, /handleSignOut/)
  assert.ok(ADMIN_NAV.length >= 8 && ADMIN_NAV.every(i => i.href.startsWith('/admin') || i.href === '/super-admin'))
})

test('the notification box does not sit over the phone menu, and its list fits a phone', () => {
  const header = read('src/components/layout/Header.tsx')
  assert.match(header, /fixed bottom-24 md:bottom-4 right-4 z-50 w-\[340px\] max-w-\[calc\(100vw-2rem\)\]/)
  assert.match(header, /fixed left-2 right-2 top-\[64px\] md:absolute md:left-auto md:right-0 md:top-10 md:w-\[340px\]/)
})

test('rows that held buttons beside text now wrap on a phone instead of running off the page', () => {
  assert.match(read('src/components/dashboard/DashboardHome.tsx'), /flex flex-wrap items-center gap-x-3 gap-y-2 px-5 pt-4 pb-3/)
  assert.match(read('src/app/portal/[token]/page.tsx'), /flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4/)
  assert.match(read('src/app/(dashboard)/students/[id]/page.tsx'), /ml-auto flex flex-wrap gap-2/)
  const revenue = read('src/app/(admin)/admin/revenue/page.tsx')
  // between a phone and a laptop (768-1023px) the sidebar leaves only ~550px: these wide rows keep their stacked form until lg
  assert.match(read('src/components/dashboard/DashboardHome.tsx'), /flex flex-col lg:flex-row lg:items-center gap-3 mb-6/)
  assert.match(read('src/components/dashboard/DashboardHome.tsx'), /lg:ml-auto w-full lg:w-auto/)
  assert.match(read('src/app/(dashboard)/upgrade/page.tsx'), /grid grid-cols-1 lg:grid-cols-3 gap-5 mb-12/)
  // the student portal's badge shelf: five badges in a row on a phone ran their names into each other
  assert.match(read('src/components/GamificationCard.tsx'), /grid grid-cols-3 sm:grid-cols-5/)
  // the admin overview, analytics, super-admin and buyers cards: two or one column on a phone, the old count from lg (sm for buyers) up
  const adminHome = read('src/app/(admin)/admin/page.tsx')
  assert.match(adminHome, /grid grid-cols-2 lg:grid-cols-4 gap-5/)
  assert.match(adminHome, /grid grid-cols-1 lg:grid-cols-2 gap-6/)
  assert.match(read('src/app/(admin)/admin/analytics/page.tsx'), /grid grid-cols-1 lg:grid-cols-2 gap-6/)
  assert.match(read('src/app/(admin)/super-admin/page.tsx'), /grid grid-cols-2 lg:grid-cols-4 gap-5" data-testid="plan-counts"/)
  assert.match(read('src/app/(admin)/admin/buyers/page.tsx'), /grid grid-cols-1 sm:grid-cols-3 gap-5/)
  assert.match(revenue, /grid grid-cols-1 sm:grid-cols-3 gap-5/)
  assert.match(revenue, /grid grid-cols-1 md:grid-cols-2 gap-6/)
})

test('the home page picture of the dashboard is decorative (aria-hidden), so it keeps its drawn text size', () => {
  const home = read('src/app/page.tsx')
  assert.match(home, /aria-hidden="true"/)
})

test('the on-screen keyboard cannot hide the send button: the page resizes, the bottom menu steps aside, the chat sits above the menu', () => {
  assert.match(read('src/app/layout.tsx'), /interactiveWidget: 'resizes-content'/)
  assert.match(layoutCss(), /body:has\(input:focus, textarea:focus, select:focus\) \[data-mobile-nav\] \{\s*display: none;/)
  assert.match(read('src/components/layout/MobileNav.tsx'), /<nav aria-label="Main" data-mobile-nav /)
  // the chat is as tall as the visible screen minus the header and the menu (dvh follows the browser bar), on a phone
  assert.match(read('src/app/(dashboard)/messages/[studentId]/page.tsx'), /h-\[calc\(100dvh-216px\)\] sm:h-\[calc\(100dvh-164px\)\] md:h-\[calc\(100vh-120px\)\]/)
  assert.match(read('src/app/portal/[token]/messages/page.tsx'), /h-\[calc\(100dvh-100px\)\] md:h-\[calc\(100vh-100px\)\]/)
  // fields are 16px on a phone (the browser does not zoom in on focus); the 14px rule leaves them alone so it cannot win
  const block = layerBlock()
  assert.match(block, /:not\(input, textarea, select, \[aria-hidden="true"\], \[aria-hidden="true"\] \*\) \{\s*font-size: 14px;/)
})

function layoutCss(): string { return layerBlock() }

test('hidden links stay hidden: the layer never turns a display:none link back on', () => {
  const block = layerBlock()
  // every rule of the layer that sets display on a link must leave out classes with "hidden" in them (hidden, sm:hidden, md:hidden)
  const rules = block.split('}').filter(r => /display:\s*inline-flex/.test(r) && /\ba\b/.test(r))
  assert.ok(rules.length >= 2, 'the link rules that set display are missing')
  for (const r of rules) {
    // each selector of the rule, not just one of them, must carry the guard
    const selectors = r.slice(0, r.indexOf('{')).replace(/\/\*[\s\S]*?\*\//g, '').split(/\),\s*\n/).map(x => x.trim()).filter(Boolean)
    for (const sel of selectors) assert.match(sel, /\[class\*="hidden"\]/, `a link selector that sets display without the "hidden" guard: ${sel.slice(0, 90)}`)
  }
  // the short-label rule is for a.flex only: a long call-to-action link (a.inline-flex) keeps wrapping, or it would run off a phone
  assert.match(block, /a\.flex:not\([\s\S]*?\),\s*td a \{\s*white-space: nowrap;/)
  assert.ok(!/a:is\(\.flex, \.inline-flex\)[^{]*\{\s*white-space: nowrap/.test(block))
})

// ---- safety of what this ticket added ----------------------------------------------------------

test('the admin pages are still guarded on the server before anything renders; the phone drawer is only a menu', () => {
  const layout = read('src/app/(admin)/layout.tsx')
  assert.ok(layout.indexOf('await requireAdminPage()') > 0 && layout.indexOf('await requireAdminPage()') < layout.indexOf('<AdminMobileNav />'), 'the check must run before the layout returns')
  const mobile = read('src/components/admin/AdminMobileNav.tsx')
  assert.doesNotMatch(mobile, /isAdminEmail|ADMIN_EMAIL|service_role|createAdminClient/, 'the drawer decides nothing about who may see what')
  // the menu list holds addresses only
  assert.ok(ADMIN_NAV.every(i => /^\/(admin|super-admin)/.test(i.href)))
})

test('the new development tools hold no real address, key or secret (example.com and made-up values only)', () => {
  const files = ['scripts/mock-supabase.mjs', 'scripts/mobile-audit.mjs', 'scripts/mobile-sheet.html']
  for (const f of files) {
    const src = read(f)
    for (const m of src.matchAll(/[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g)) {
      assert.equal(m[1], 'example.com', `${f}: a real-looking address ${m[0]}`)
    }
    assert.doesNotMatch(src, /sk_(live|test)_|whsec_|sb_secret_|service_role\s*[:=]\s*['"]ey|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, `${f}: looks like a key`)
    assert.doesNotMatch(src, /\b\d{3,4}[ .-]\d{3}[ .-]\d{3,4}\b/, `${f}: looks like a phone number`)
  }
  // the fake service only listens on this machine, and writes files only when told where
  const mock = read('scripts/mock-supabase.mjs')
  assert.match(mock, /listen\(PORT, '127\.0\.0\.1'/)
  assert.match(mock, /process\.env\.MOCK_SAVE_DIR/)
  assert.ok(mock.includes('!/^[\\w.-]+$/.test(name)'), 'a saved file name must be a plain name')
  // the admin account is read from src/lib/admin.ts, never typed into the tool
  assert.ok(mock.includes("/ADMIN_EMAIL = '([^']+)'/.exec(readFileSync(path.join(HERE, '../src/lib/admin.ts')"))
})
