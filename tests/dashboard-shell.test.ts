// T-0820 (G1): the tutor app shell, from the design the owner approved at W-2589 (docs/dashboard-redesign/).
// A unit test cannot open a browser, so the measured results (equal left and right gaps at 1920, 1440, 1024 and 390,
// no sideways scroll, the sidebar staying in view, Ctrl K opening the bar) are in the status file with the
// pictures. This file keeps what makes those results hold, and runs the pure rules for real:
//   - one frame, and no page that sets its own width (the cause of the content pinned to the left);
//   - a sidebar that is sticky, an icon rail from 768 to 1279px, a bottom bar under 768px;
//   - the top bar names every page of the menu (the old one said "Tutafy" for eight of them);
//   - the command bar reaches every page and three actions, and Ctrl or Cmd K opens it;
//   - loading and error states; one notice bar; the dark theme and its contrast.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { NAV } from '@/components/layout/nav-items'
import { EXTRA_TITLES, isDashboardPath, pageTitleOf } from '@/lib/page-titles'
import { bookingLink, commandItems, filterCommands, isCommandShortcut } from '@/lib/command-items'
import { nextNotice, type NoticeState } from '@/lib/notice-bar'
import { THEME_INIT_SCRIPT, THEME_KEY, parsePref, resolveTheme, toggledPref } from '@/lib/dashboard-theme'
import { MIN_RATIO, PAIRS, contrast, measureAll, readTokens } from '@/lib/dashboard-contrast'
import { dashboardPageFiles, firstReturnedElements, ownWidthRoots } from './support/page-frame-scan.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const css = read('src/styles/dashboard-shell.css')
const NAV_ITEMS = NAV.flatMap(g => g.items)

// ---- one frame, and no page sets its own width -------------------------------------------------------------------

test('the menu has 17 pages (the done-when list is about all of them)', () => {
  assert.equal(NAV_ITEMS.length, 17)
})

test('the layout puts every page in the one PageFrame inside the one <main>', () => {
  const layout = read('src/app/(dashboard)/layout.tsx')
  assert.match(layout, /<main id="main" className="dash-content">\s*<PageFrame>\{children\}<\/PageFrame>\s*<\/main>/)
  assert.equal((layout.match(/<main\b/g) ?? []).length, 1)
  // the frame is centred and has a ceiling: max-width with auto side margins
  const frame = /\.dash-frame \{([^}]*)\}/.exec(css)![1]
  assert.match(frame, /max-width:\s*1440px/)
  assert.match(frame, /margin:\s*0 auto/)
  assert.doesNotMatch(css.slice(css.indexOf('.dash-frame {')), /\.dash-frame \{[^}]*margin-left:\s*0/, 'the frame must never be pinned to the left')
  // the narrow columns are centred too
  assert.match(/\.dash-column \{([^}]*)\}/.exec(css)![1], /margin-left:\s*auto;\s*margin-right:\s*auto/)
  assert.match(css, /\.dash-column-form \{ max-width: 720px; \}/)
})

test('no page of the tutor app sets its own width on its root (it uses the frame or a PageColumn)', () => {
  const files = dashboardPageFiles(ROOT)
  assert.ok(files.length > 40, `only ${files.length} files were scanned: the import walk is broken`)
  for (const must of ['src/app/(dashboard)/earnings/page.tsx', 'src/app/(dashboard)/settings/page.tsx', 'src/components/dashboard/DashboardHome.tsx', 'src/app/(dashboard)/coupons/CouponsClient.tsx', 'src/app/(dashboard)/students/new/StudentForm.tsx']) {
    assert.ok(files.includes(must), `${must} is not scanned`)
  }
  const offenders = files.flatMap(f => ownWidthRoots(read(f)).map(o => `${f}: ${o}`))
  assert.deepEqual(offenders, [], 'a page sets max-w on its root: drop it, or wrap the page in <PageColumn>')
})

test('the width scan sees the faults it exists for (mutation: the old roots of the pages)', () => {
  const OLD_ROOTS = [
    `return (\n    <div className="space-y-6 max-w-[900px]">\n      <p>x</p>\n    </div>\n  )`,
    `return <div className="max-w-[700px] space-y-5">x</div>`,
    `return (\n    <div className="max-w-[1100px]">x</div>\n  )`,
    `return (\n    <div className="p-6 max-w-2xl mx-auto space-y-6">x</div>\n  )`,
    `return (\n    <div className={\`max-w-[680px] flex \${open ? 'a' : 'b'}\`}>x</div>\n  )`,
    `return (\n    <div onClick={() => go()} className="max-w-5xl mx-auto py-10">x</div>\n  )`,
  ]
  for (const src of OLD_ROOTS) assert.equal(ownWidthRoots(src).length, 1, src)
  // a page in the shared column, or an inner element with its own limit, is fine
  assert.deepEqual(ownWidthRoots(`return (\n    <PageColumn size="form" className="space-y-5">\n      <p className="max-w-xs">x</p>\n    </PageColumn>\n  )`), [])
  assert.deepEqual(ownWidthRoots(`return (\n    <div className="space-y-6">\n      <div className="max-w-[900px]">x</div>\n    </div>\n  )`), [])
  assert.equal(firstReturnedElements(`if (x) return null\n  return (\n    <div className="a">x</div>\n  )`).length, 1)
})

test('the width scan goes red on a real page when its root gets a width back (mutation on the real source)', () => {
  const rel = 'src/app/(dashboard)/availability/page.tsx'
  const real = read(rel)
  assert.deepEqual(ownWidthRoots(real), [])
  const broken = real.replace(/<PageColumn size="form" className="([^"]*)">/, '<div className="$1 max-w-[900px]">')
  assert.notEqual(broken, real, 'the mutation did not change the page')
  assert.equal(ownWidthRoots(broken).length, 1)
})

// ---- sidebar, rail, bottom bar ------------------------------------------------------------------------------------

function rule(selector: string): string {
  const at = css.indexOf(`${selector} {`)
  assert.ok(at >= 0, `no rule ${selector}`)
  return css.slice(at, css.indexOf('}', at))
}

test('the sidebar is sticky and as tall as the screen, so it stays in view on a long page', () => {
  const side = rule('.dash-side')
  assert.match(side, /position:\s*sticky/)
  assert.match(side, /top:\s*0/)
  assert.match(side, /height:\s*100dvh/)
  assert.match(side, /align-self:\s*flex-start/)
  assert.doesNotMatch(read('src/components/layout/Sidebar.tsx'), /min-h-screen/, 'the old sidebar scrolled away with the page')
  // the page scrolls as a whole, so the main area has no inner scroll that would pin the sidebar's reference
  assert.doesNotMatch(read('src/app/(dashboard)/layout.tsx'), /overflow-y-auto/)
})

test('widths: hidden under 768px, a 64px icon rail from 768 to 1279px, 232px from 1280px', () => {
  assert.match(rule('.dash-side'), /display:\s*none/)
  assert.match(css, /@media \(min-width: 768px\) \{ \.dash-side \{ display: flex; \} \}/)
  assert.match(rule('.dash'), /--d-side:\s*64px/)
  assert.match(css, /@media \(min-width: 1280px\) \{ \.dash \{ --d-side: 232px; \} \}/)
  assert.match(css, /@media \(min-width: 1280px\) \{ \.dash-link-label \{ display: inline; \} \}/)
  assert.match(rule('.dash-link-label'), /display:\s*none/, 'the rail shows icons only')
  // every rail link keeps its name for a screen reader and a tooltip
  const side = read('src/components/layout/Sidebar.tsx')
  assert.match(side, /title=\{label\}/)
  assert.match(side, /aria-label=\{locked \?/)
})

test('the bottom bar is on phones only and the page leaves room for it', () => {
  assert.match(rule('.dash-tabbar'), /position:\s*fixed/)
  assert.match(css, /@media \(min-width: 768px\) \{ \.dash-tabbar \{ display: none; \} \}/)
  assert.match(css, /@media \(max-width: 767px\) \{ \.dash-content \{ padding-bottom: 72px; \} \}/)
  assert.match(read('src/components/layout/MobileNav.tsx'), /<nav aria-label="Main" data-mobile-nav className="dash-tabbar md:hidden">/)
})

test('the top bar is sticky', () => {
  const top = rule('.dash-top')
  assert.match(top, /position:\s*sticky/)
  assert.match(top, /top:\s*0/)
})

// ---- the top bar names every page -------------------------------------------------------------------------------

test('the top bar title is right for all 17 pages of the menu, not "Tutafy"', () => {
  for (const item of NAV_ITEMS) {
    assert.equal(pageTitleOf(item.href), item.label, item.href)
    assert.equal(pageTitleOf(`${item.href}/anything/else`), item.label, `${item.href}/...`)
  }
  assert.equal(new Set(NAV_ITEMS.map(i => pageTitleOf(i.href))).size, 17)
})

test('the eight pages that used to read "Tutafy" (Messages, Packages, Coupons, Subscriptions, Waitlist, Import, Refer & Earn, Upgrade) have a name', () => {
  for (const [href, name] of [['/messages', 'Messages'], ['/packages', 'Packages'], ['/coupons', 'Coupons'], ['/subscriptions', 'Subscriptions'], ['/waitlist', 'Waitlist'], ['/import', 'Import'], ['/referral', 'Refer & Earn'], ['/upgrade', 'Upgrade']]) {
    assert.equal(pageTitleOf(href), name, href)
  }
  assert.ok(Object.keys(EXTRA_TITLES).every(h => h.startsWith('/')))
})

test('detail and form pages take the name of their menu page; an address outside the app has none', () => {
  assert.equal(pageTitleOf('/students/00000000-0000-4000-8000-000000000001/edit'), 'Students')
  assert.equal(pageTitleOf('/lessons/new'), 'Lessons')
  assert.equal(pageTitleOf('/messages/broadcast'), 'Messages')
  assert.equal(pageTitleOf('/lessons?tab=past'), 'Lessons')
  for (const outside of ['/', '/login', '/book/some-tutor', '/tutors', '/admin', '/student/dashboard', '/privacy']) {
    assert.equal(pageTitleOf(outside), null, outside)
    assert.equal(isDashboardPath(outside), false, outside)
  }
})

test('the Header reads its title from the menu list, not from a list of its own', () => {
  const header = read('src/components/layout/Header.tsx')
  assert.match(header, /pageTitleOf\(pathname\)/)
  assert.doesNotMatch(header, /PAGE_LABELS/)
})

// ---- the command bar ---------------------------------------------------------------------------------------------

test('the command bar reaches every page of the menu by its name, and three actions', () => {
  const items = commandItems({ slug: 'sarah-demo' })
  for (const item of NAV_ITEMS) {
    const hit = filterCommands(items, item.label).find(i => i.kind === 'page' && i.href === item.href)
    assert.ok(hit, `typing "${item.label}" does not reach ${item.href}`)
  }
  assert.equal(items.filter(i => i.kind === 'page').length, 17)
  const actions = items.filter(i => i.kind === 'action')
  assert.ok(actions.length >= 3)
  assert.deepEqual(filterCommands(items, 'schedule').map(i => i.href), ['/lessons/new'])
  assert.deepEqual(filterCommands(items, 'add a student').map(i => i.href), ['/students/new'])
  assert.ok(filterCommands(items, 'dark').some(i => i.id === 'action:toggle-theme'))
  assert.ok(filterCommands(items, 'booking link').some(i => i.id === 'action:copy-booking-link'))
})

test('the booking link action needs a booking page; a tutor without one does not see it', () => {
  assert.ok(!commandItems({ slug: null }).some(i => i.id === 'action:copy-booking-link'))
  assert.ok(!commandItems().some(i => i.id === 'action:copy-booking-link'))
  assert.equal(bookingLink('https://tutafy.com/', 'sarah-demo'), 'https://tutafy.com/book/sarah-demo')
})

test('filtering: every word must match, the label comes before the extra words, nothing matching gives an empty list', () => {
  const items = commandItems({ slug: 'x' })
  assert.equal(filterCommands(items, '').length, items.length)
  assert.equal(filterCommands(items, 'zzzz nothing').length, 0)
  assert.equal(filterCommands(items, 'LESSONS')[0].label.toLowerCase().includes('lesson'), true)
  assert.ok(filterCommands(items, 'stu').every(i => /stu/.test(`${i.label} ${i.words}`.toLowerCase())))
  assert.equal(filterCommands(items, 'earn')[0].href, '/earnings', 'a label that starts with the word comes first')
})

test('Ctrl K and Cmd K open the bar; K alone, Ctrl+Shift+K and Alt+K do not', () => {
  const key = (o: Partial<{ key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }>) => ({ key: 'k', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...o })
  assert.equal(isCommandShortcut(key({ ctrlKey: true })), true)
  assert.equal(isCommandShortcut(key({ metaKey: true })), true)
  assert.equal(isCommandShortcut(key({ ctrlKey: true, key: 'K' })), true)
  assert.equal(isCommandShortcut(key({})), false)
  assert.equal(isCommandShortcut(key({ ctrlKey: true, shiftKey: true })), false)
  assert.equal(isCommandShortcut(key({ ctrlKey: true, altKey: true })), false)
  assert.equal(isCommandShortcut(key({ ctrlKey: true, key: 'j' })), false)
  assert.equal(isCommandShortcut(key({ metaKey: true, key: 'Enter' })), false)
})

test('the command bar component listens for the shortcut, has a button in the top bar, and is mounted once in the layout', () => {
  const bar = read('src/components/layout/CommandPalette.tsx')
  assert.match(bar, /isCommandShortcut\(e\)/)
  assert.match(bar, /window\.addEventListener\('keydown', onKey\)/)
  assert.match(bar, /e\.key === 'Escape'/)
  assert.match(bar, /role="dialog" aria-modal="true"/)
  assert.match(read('src/components/layout/Header.tsx'), /data-testid="open-command"/)
  assert.match(read('src/components/layout/Header.tsx'), /window\.dispatchEvent\(new Event\(OPEN_COMMAND_EVENT\)\)/)
  assert.equal((read('src/app/(dashboard)/layout.tsx').match(/<CommandPalette\b/g) ?? []).length, 1)
})

// ---- loading and error --------------------------------------------------------------------------------------------

test('the page group has loading.tsx and error.tsx in the pattern of states.html', () => {
  const loading = read('src/app/(dashboard)/loading.tsx')
  assert.match(loading, /role="status"/)
  assert.match(loading, /dash-sk/)
  assert.match(loading, /Loading the page/)
  const error = read('src/app/(dashboard)/error.tsx')
  assert.match(error, /^'use client'/, 'an error boundary must be a client component')
  assert.match(error, /reset: \(\) => void/)
  assert.match(error, /onClick=\{reset\}/)
  assert.match(error, /role="alert"/)
  assert.match(error, /We could not load this page/)
  assert.match(error, /Nothing was changed/)
  assert.doesNotMatch(error, /error\.message|error\.stack/, 'the error text can name a table or a key: show the reference only')
  assert.ok(existsSync(path.join(ROOT, 'docs/dashboard-redesign/states.html')))
})

// ---- the one notice bar -------------------------------------------------------------------------------------------

const S = (o: Partial<NoticeState>): NoticeState => ({ consent: 'accepted', permission: 'granted', pushDismissed: false, ready: true, ...o })

test('the notice bar shows one notice at a time: the cookie notice first, then the notification prompt', () => {
  assert.equal(nextNotice(S({ consent: null, permission: 'default' })), 'cookie', 'both are due: only the cookie notice')
  assert.equal(nextNotice(S({ consent: 'accepted', permission: 'default' })), 'push')
  assert.equal(nextNotice(S({ consent: 'declined', permission: 'default' })), 'push', 'declining cookies still allows the prompt')
  assert.equal(nextNotice(S({ consent: 'accepted', permission: 'denied' })), 'push-blocked')
  assert.equal(nextNotice(S({})), null, 'nothing is due')
  assert.equal(nextNotice(S({ permission: 'unsupported' })), null)
  assert.equal(nextNotice(S({ permission: 'default', pushDismissed: true })), null, 'Later hides the prompt for this session')
  assert.equal(nextNotice(S({ permission: 'denied', pushDismissed: true })), null)
  assert.equal(nextNotice(S({ consent: null, ready: false })), null, 'nothing is drawn before the browser has been read')
  assert.equal(nextNotice(S({ consent: null, pushDismissed: true })), 'cookie', 'Later never hides the cookie notice')
})

test('the notice bar is part of the page flow (not fixed), so it cannot cover a table or the phone menu', () => {
  const bar = read('src/components/layout/NoticeBar.tsx')
  assert.doesNotMatch(bar, /\bfixed\b|\babsolute\b/)
  assert.doesNotMatch(css.slice(css.indexOf('.dash-notice {'), css.indexOf('/* ---------- buttons shared')), /position:\s*(fixed|absolute|sticky)/)
  assert.match(bar, /nextNotice\(state\)/)
  assert.equal((read('src/app/(dashboard)/layout.tsx').match(/<NoticeBar\b/g) ?? []).length, 1)
  // the old floating prompt is gone from the header, and the floating cookie card keeps away from the tutor app
  assert.doesNotMatch(read('src/components/layout/Header.tsx'), /fixed bottom-24|Enable notifications|requestPermission/)
  const cookie = read('src/components/CookieConsent.tsx')
  assert.match(cookie, /isDashboardPath\(usePathname\(\)\)/)
  assert.match(cookie, /if \(!show \|\| inTutorApp\) return null/)
})

test('the cookie notice in the bar saves the choice the same way as the public one', () => {
  const bar = read('src/components/layout/NoticeBar.tsx')
  assert.match(bar, /saveConsent\(choice\)/)
  const cookie = read('src/components/CookieConsent.tsx')
  assert.match(cookie, /export function saveConsent\(choice: 'accepted' \| 'declined'\) \{\s*localStorage\.setItem\(KEY, choice\)\s*window\.dispatchEvent\(new CustomEvent\(CONSENT_EVENT/)
})

test('which addresses belong to the tutor app (where the floating cookie card stays away)', () => {
  for (const item of NAV_ITEMS) assert.equal(isDashboardPath(item.href), true, item.href)
  assert.equal(isDashboardPath('/upgrade'), true)
  for (const publicPath of ['/', '/tutors', '/book/x', '/login', '/register', '/blog', '/privacy', '/student/login']) assert.equal(isDashboardPath(publicPath), false, publicPath)
})

// ---- the dark theme -----------------------------------------------------------------------------------------------

test('theme rules: a saved choice wins, otherwise the system decides; anything unknown means "system"', () => {
  assert.equal(parsePref('dark'), 'dark')
  assert.equal(parsePref('light'), 'light')
  for (const raw of [null, undefined, '', 'system', 'blue', 'DARK']) assert.equal(parsePref(raw as string | null), 'system')
  assert.equal(resolveTheme('system', true), 'dark')
  assert.equal(resolveTheme('system', false), 'light')
  assert.equal(resolveTheme('light', true), 'light')
  assert.equal(resolveTheme('dark', false), 'dark')
  assert.equal(toggledPref('dark'), 'light')
  assert.equal(toggledPref('light'), 'dark')
})

/** Runs the inline script the layout sends, with a made-up page, and returns the theme it set. */
function runInitScript(saved: string | null, systemDark: boolean, storageBroken = false): string | null {
  let set: string | null = null
  const parent = { setAttribute: (k: string, v: string) => { if (k === 'data-theme') set = v } }
  const localStorage = { getItem: (k: string) => { if (storageBroken) throw new Error('blocked'); return k === THEME_KEY ? saved : null } }
  const window = { matchMedia: () => ({ matches: systemDark }) }
  new Function('document', 'localStorage', 'window', THEME_INIT_SCRIPT)({ currentScript: { parentElement: parent } }, localStorage, window)
  return set
}

test('the inline script that runs before the first paint agrees with resolveTheme in every case', () => {
  for (const saved of [null, 'light', 'dark', 'system', 'junk']) {
    for (const systemDark of [false, true]) {
      assert.equal(runInitScript(saved, systemDark), resolveTheme(parsePref(saved), systemDark), `saved ${saved}, system dark ${systemDark}`)
    }
  }
  assert.equal(runInitScript(null, true, true), 'dark', 'a browser that blocks storage still follows the system')
  assert.match(read('src/app/(dashboard)/layout.tsx'), /<script dangerouslySetInnerHTML=\{\{ __html: THEME_INIT_SCRIPT \}\} \/>/)
})

test('the theme button, the html class and the cleanup when the tutor leaves the app', () => {
  assert.match(read('src/components/layout/Header.tsx'), /data-testid="theme-toggle"/)
  const client = read('src/components/layout/theme-client.ts')
  assert.match(client, /classList\.toggle\('dark', theme === 'dark'\)/)
  assert.match(client, /classList\.remove\('dark'\)/)
  const sync = read('src/components/layout/ThemeSync.tsx')
  assert.match(sync, /return \(\) => \{[^}]*releaseTheme\(\)/, 'the class is removed on the way out, or a public page would be drawn dark')
})

test('contrast: every text and background pair of the shell reaches 4.5 to 1, light and dark', () => {
  const rows = measureAll(css)
  assert.equal(rows.length, PAIRS.length * 2)
  const low = rows.filter(r => r.ratio < MIN_RATIO).map(r => `${r.theme} ${r.text} on ${r.background}: ${r.ratio}`)
  assert.deepEqual(low, [])
  // the numbers are really computed: the known extremes
  assert.ok(contrast('#000000', '#FFFFFF') > 20.9 && contrast('#000000', '#FFFFFF') < 21.1)
  assert.ok(contrast('#767676', '#FFFFFF') > 4.5 && contrast('#777777', '#FFFFFF') < 4.5, '#767676 is the lightest grey that passes on white')
})

test('contrast: a token made too pale makes the check fail (mutation on the real CSS)', () => {
  const dark = readTokens(css, '.dash[data-theme="dark"] {')
  assert.equal(dark['--d-ink-3'], '#A3ABBD')
  for (const [from, to] of [['--d-ink-3: #5B6475', '--d-ink-3: #9AA0AE'], ['--d-ink-3: #A3ABBD', '--d-ink-3: #4A5163'], ['--d-brand: #818CF8', '--d-brand: #3F4A9E']]) {
    const mutated = css.replace(from, to)
    assert.notEqual(mutated, css, from)
    assert.ok(measureAll(mutated).some(r => r.ratio < MIN_RATIO), `${from} -> ${to} was not caught`)
  }
})

test('the shell uses only tokens that exist in both themes, and the dark block is complete', () => {
  const light = readTokens(css, '.dash {')
  const dark = readTokens(css, '.dash[data-theme="dark"] {')
  for (const name of Object.keys(light)) assert.ok(dark[name], `${name} has no dark value`)
  const used = new Set([...css.matchAll(/var\((--d-[a-z0-9-]+)\)/g)].map(m => m[1]))
  for (const name of used) assert.ok(light[name] || /^--d-(focus|shadow-1|shadow-3|side|top)$/.test(name), `${name} is used but not defined`)
})

test('the layout imports the shell stylesheet and the legacy dark mapping stays inside the dark scope', () => {
  assert.match(read('src/app/(dashboard)/layout.tsx'), /import '@\/styles\/dashboard-shell\.css'/)
  const legacy = css.slice(css.indexOf('/* ---------- legacy colours in the dark theme'), css.indexOf('/* ---------- overview pages'))
  const selectors = legacy.split('\n').filter(l => /^\.dash/.test(l)).flatMap(l => l.split('{')[0].split(',')).map(s => s.trim()).filter(Boolean)
  assert.ok(selectors.length > 60)
  assert.ok(selectors.every(s => s.trim().startsWith('.dash[data-theme="dark"]')), 'a legacy rule outside the dark scope would change the light theme')
})
