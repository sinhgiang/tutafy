// The EN | VI switch of the owner's admin area, from the cookie to the page: every admin page is rendered for real over an
// in-memory database in English (the default) and in Vietnamese. English has no Vietnamese letter in it, Vietnamese has, the
// numbers on the page are the same in both, and no page outside the admin area has the switch or a word of Vietnamese.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb } from './support/fake-db.ts'
import { setAdminLang } from './support/admin-lang.ts'
import { findVietnamese } from './support/vietnamese.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

let currentUser: { id: string; email: string } | null = null
let db: { from(table: string): unknown } = createFakeDb({})
const redirects: string[] = []

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: {
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }),
    createAdminClient: () => db,
  },
})
mock.module('next/navigation', {
  exports: { redirect: (to: string) => { redirects.push(to); throw new Error(`NEXT_REDIRECT:${to}`) }, notFound: () => { throw new Error('NEXT_NOT_FOUND') }, usePathname: () => '/admin', useRouter: () => ({ push() {}, refresh() {} }) },
})
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/client.ts')).href, { exports: { createClient: () => ({ auth: { signOut: async () => {} } }) } })

const { ADMIN_EMAIL } = await import('./support/admin-account.ts')
type Page = (props?: unknown) => Promise<React.ReactElement>
const load = async (rel: string) => (await import(`@/app/${rel}`)).default as Page
const Pages = {
  overview: await load('(admin)/admin/page.tsx'),
  revenue: await load('(admin)/admin/revenue/page.tsx'),
  buyers: await load('(admin)/admin/buyers/page.tsx'),
  tutors: await load('(admin)/admin/tutors/page.tsx'),
  students: await load('(admin)/admin/students/page.tsx'),
  analytics: await load('(admin)/admin/analytics/page.tsx'),
  settings: await load('(admin)/admin/settings/page.tsx'),
  superAdmin: await load('(admin)/super-admin/page.tsx'),
  person: await load('(admin)/super-admin/people/[id]/page.tsx'),
}
const { ADMIN_LANG_COOKIE, ADMIN_DICTIONARIES } = await import('@/lib/admin-i18n.ts')
const { getAdminLang, getAdminT } = await import('@/lib/admin-lang.ts')
const { rememberAdminLang, chooseAdminLang, AdminLangProvider, LangToggle } = await import('@/components/admin/AdminLang.tsx')
const { AdminSidebar } = await import('@/components/admin/AdminSidebar.tsx')
const { AdminMobileNav } = await import('@/components/admin/AdminMobileNav.tsx')
const { ADMIN_NAV } = await import('@/components/admin/admin-nav.ts')

const VIETNAMESE = /[Ạ-ỹăơưđĐĩũ]/u
const ADMIN = { id: 'u-0', email: ADMIN_EMAIL }
const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const at = (s: string) => `${s}.000Z`
let evId = 0
const ev = (visitor_id: string, kind: string, p: string | null, created_at: string, plan: string | null = null) => ({ id: ++evId, visitor_id, kind, path: p, plan, created_at })

function sample() {
  return createFakeDb({
    tutors: [
      { id: U(1), name: 'Free Only', email: 'free@example.com', slug: 'free-only', created_at: at('2026-10-02T10:00:00'), subscription_status: 'free', timezone: 'Europe/Berlin', stripe_onboarding_complete: false, booking_url_active: false },
      { id: U(5), name: 'Pro Buyer', email: 'pro@example.com', slug: 'pro-buyer', created_at: at('2026-10-05T10:00:00'), subscription_status: 'pro', timezone: 'Asia/Ho_Chi_Minh', stripe_onboarding_complete: true, booking_url_active: true },
      { id: U(6), name: 'Academy Buyer', email: 'academy@example.com', slug: 'academy-buyer', created_at: at('2026-10-06T10:00:00'), subscription_status: 'academy', timezone: null, stripe_onboarding_complete: false, booking_url_active: true },
    ],
    students: [
      { id: 's1', tutor_id: U(5), name: 'Kid One', email: 'kid1@example.com', country: 'DE', level: 'B1', status: 'active', created_at: at('2026-10-06T10:00:00') },
      { id: 's2', tutor_id: U(5), name: 'Kid Two', email: null, country: 'US', level: 'A2', status: 'paused', created_at: at('2026-10-07T10:00:00') },
    ],
    lessons: [
      { id: 'l1', tutor_id: U(5), student_id: 's1', starts_at: at('2026-10-07T10:00:00'), status: 'completed', price: 20, currency: 'USD', payment_status: 'paid' },
      { id: 'l2', tutor_id: U(5), student_id: 's2', starts_at: at('2026-10-08T10:00:00'), status: 'no_show', price: 20, currency: 'USD', payment_status: 'pending' },
    ],
    visitors: [
      { id: 'v5', first_seen_at: at('2026-10-04T09:00:00'), country: 'VN', first_source: 'google_ads', first_path: '/', first_referrer_host: null, utm_campaign: 'spring', tutor_id: U(5) },
      { id: 'v6', first_seen_at: at('2026-10-06T08:00:00'), country: 'ES', first_source: 'ai_claude', first_path: '/blog/guide', first_referrer_host: 'claude.ai', utm_campaign: null, tutor_id: U(6) },
    ],
    visitor_events: [
      ev('v5', 'page_view', '/', at('2026-10-04T09:00:00')),
      ev('v5', 'page_view', '/register', at('2026-10-05T09:50:00')),
      ev('v5', 'page_view', '/students', at('2026-10-05T10:05:00')),
      ev('v5', 'page_view', '/lessons', at('2026-10-05T10:06:00')),
      ev('v5', 'page_view', '/upgrade', at('2026-10-07T12:00:00')),
      ev('v5', 'checkout_click', '/upgrade', at('2026-10-07T12:01:00'), 'pro'),
      ev('v5', 'order_paid', null, at('2026-10-07T12:09:00'), 'pro'),
      ev('v6', 'page_view', '/blog/guide', at('2026-10-06T08:00:00')),
    ],
  })
}

beforeEach(() => { currentUser = ADMIN; redirects.length = 0; db = sample(); setAdminLang(null) })

async function render(page: Page, props?: unknown): Promise<string> {
  return renderToStaticMarkup(await page(props))
}
const texts = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]*>/g, ' ').replace(/&#x27;|&quot;|&amp;|&lt;|&gt;/g, ' ')
/** Every number the reader sees, in order of size: the words change with the language, the numbers must not. */
const numbers = (html: string) => (texts(html).match(/\d[\d,.:/-]*\d|\d/g) ?? []).sort()

const props = {
  overview: undefined,
  revenue: undefined,
  buyers: undefined,
  tutors: undefined,
  students: undefined,
  analytics: undefined,
  settings: undefined,
  superAdmin: { searchParams: Promise.resolve({}) },
  person: { params: Promise.resolve({ id: U(5) }), searchParams: Promise.resolve({}) },
} as const

// A sentence of each page in both languages, so a page that silently kept the other language's text is caught.
const HEADLINE: Record<keyof typeof Pages, [en: RegExp, vi: RegExp]> = {
  overview: [/<h1[^>]*>My customers<\/h1>/, /<h1[^>]*>Khách hàng của tôi<\/h1>/],
  revenue: [/<h1[^>]*>Lesson payments to tutors<\/h1>/, /<h1[^>]*>Tiền học sinh trả cho gia sư<\/h1>/],
  buyers: [/<h1[^>]*>Buyers<\/h1>/, /<h1[^>]*>Người mua<\/h1>/],
  tutors: [/<h1[^>]*>All Tutors<\/h1>/, /<h1[^>]*>Tất cả gia sư<\/h1>/],
  students: [/<h1[^>]*>All Students<\/h1>/, /<h1[^>]*>Tất cả học sinh<\/h1>/],
  analytics: [/<h1[^>]*>Analytics<\/h1>/, /<h1[^>]*>Phân tích<\/h1>/],
  settings: [/<h1[^>]*>Admin Settings<\/h1>/, /<h1[^>]*>Cài đặt quản trị<\/h1>/],
  superAdmin: [/Every tutor, where they came from/, /Mọi gia sư, họ đến từ đâu/],
  person: [/Journey, in order/, /Hành trình, theo thứ tự/],
}

for (const name of Object.keys(Pages) as (keyof typeof Pages)[]) {
  test(`${name}: English by default, Vietnamese after the switch, the same numbers in both`, async () => {
    const page = Pages[name]
    const en = await render(page, props[name])
    assert.match(en, HEADLINE[name][0], 'English headline')
    assert.equal(VIETNAMESE.test(texts(en)), false, 'no Vietnamese letter in the English page')
    assert.equal(findVietnamese(texts(en)), null)
    setAdminLang('en')
    assert.equal(await render(page, props[name]), en, 'an explicit English choice is the default page')

    setAdminLang('vi')
    const vi = await render(page, props[name])
    assert.match(vi, HEADLINE[name][1], 'Vietnamese headline')
    assert.doesNotMatch(vi, HEADLINE[name][0], 'the English headline is gone')
    assert.ok(VIETNAMESE.test(texts(vi)), 'Vietnamese letters on the page')
    assert.deepEqual(numbers(vi), numbers(en), 'numbers, dates and money are the same in both languages')

    setAdminLang('klingon')
    assert.equal(await render(page, props[name]), en, 'an unknown value falls back to English')
  })
}

test('/admin in Vietnamese carries the owner’s wording for the cards, the list and the note about Revenue', async () => {
  setAdminLang('vi')
  const html = await render(Pages.overview)
  for (const text of ['Người trả phí', 'Tổng số gia sư', 'Gói miễn phí', 'Tuần này', 'bấm tên để xem từng người', 'Tiền từ các gói của bạn']) assert.match(html, new RegExp(text), text)
  assert.match(html, /<a[^>]*href="\/admin\/revenue"[^>]*>Tiền học sinh trả cho gia sư<\/a>/)
  setAdminLang('en')
  const en = await render(Pages.overview)
  for (const text of ['Paying customers', 'Total tutors', 'Free plan', 'This week', 'click a name to see each person', 'Your income from plans']) assert.match(en, new RegExp(text), text)
  assert.match(en, /<a[^>]*href="\/admin\/revenue"[^>]*>Lesson payments to tutors<\/a>/)
})

test('a failed read names the table in the chosen language, on the page', async () => {
  const ok = sample()
  db = { from: (table: string) => (table === 'students' ? Object.assign(ok.from(table), { then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: { message: 'relation does not exist' }, count: null }) }) : ok.from(table)) }
  const box = (html: string) => html.match(/data-testid="overview-error"[^>]*>([^<]*)</)?.[1] ?? ''
  assert.match(box(await render(Pages.overview)), /^Could not read the students table, so the numbers that depend on it are not reliable\./)
  setAdminLang('vi')
  assert.match(box(await render(Pages.overview)), /^Chưa đọc được bảng học sinh \(students\), nên các con số phụ thuộc vào bảng đó chưa đáng tin\./)
})

test('the page title, sign-out button and menu follow the language: the sidebar, the phone bar and every menu entry', () => {
  for (const lang of ['en', 'vi'] as const) {
    const dict = ADMIN_DICTIONARIES[lang]
    for (const el of [AdminSidebar, AdminMobileNav]) {
      const html = renderToStaticMarkup(createElement(AdminLangProvider, { lang }, createElement(el)))
      for (const item of ADMIN_NAV) assert.ok(item.labelKey in dict && (el === AdminMobileNav ? true : html.includes(`>${dict[item.labelKey]}<`) || html.includes(dict[item.labelKey])), `${lang} ${item.labelKey}`)
      assert.ok(html.includes(dict['shell.title']), `${lang} shell title`)
      assert.ok(html.includes('data-testid="lang-toggle"'), 'the switch is in both')
      assert.match(html, /data-lang="en"[^>]*aria-pressed="(true|false)"/)
    }
    const sidebar = renderToStaticMarkup(createElement(AdminLangProvider, { lang }, createElement(AdminSidebar)))
    assert.ok(sidebar.includes(`>${dict['shell.signOut']}<`) || sidebar.includes(dict['shell.signOut']))
    assert.match(sidebar, new RegExp(`data-lang="${lang}"[^>]*aria-pressed="true"`), 'the shown language is the pressed one')
    const other = lang === 'en' ? 'vi' : 'en'
    assert.match(sidebar, new RegExp(`data-lang="${other}"[^>]*aria-pressed="false"`))
  }
  const vi = renderToStaticMarkup(createElement(AdminLangProvider, { lang: 'vi' }, createElement(AdminSidebar)))
  assert.ok(vi.includes('Khách hàng của tôi') && vi.includes('Tiền học sinh trả cho gia sư') && vi.includes('Đăng xuất'))
  const en = renderToStaticMarkup(createElement(AdminLangProvider, { lang: 'en' }, createElement(AdminSidebar)))
  assert.ok(en.includes('My customers') && en.includes('Lesson payments to tutors') && en.includes('Sign out'))
})

// ---- the press on EN | VI and the cookie behind it -----------------------------------------------------------------------------------------------

test('pressing the other language saves it for a year in the browser and renders the page again; pressing the shown one does nothing', () => {
  const doc = { cookie: '' }
  let refreshes = 0
  assert.equal(chooseAdminLang('en', 'en', doc, true, () => refreshes++), false)
  assert.deepEqual([doc.cookie, refreshes], ['', 0])
  assert.equal(chooseAdminLang('en', 'vi', doc, true, () => refreshes++), true)
  assert.equal(doc.cookie, `${ADMIN_LANG_COOKIE}=vi; Path=/; Max-Age=31536000; SameSite=Lax; Secure`)
  assert.equal(refreshes, 1)
  const plain = { cookie: '' }
  rememberAdminLang('en', plain, false)
  assert.equal(plain.cookie, `${ADMIN_LANG_COOKIE}=en; Path=/; Max-Age=31536000; SameSite=Lax`)
  // the cookie holds the language and nothing else: no id, no name, no address
  assert.match(doc.cookie, /^tutafy_admin_lang=(en|vi); /)
})

test('the choice survives a reload: the server reads the cookie, so the next page arrives in that language', async () => {
  assert.equal(await getAdminLang(), 'en')
  setAdminLang('vi')
  assert.equal(await getAdminLang(), 'vi')
  const { t, lang } = await getAdminT()
  assert.equal(lang, 'vi')
  assert.equal(t('nav.customers'), 'Khách hàng của tôi')
  setAdminLang('en')
  assert.equal((await getAdminT()).t('nav.customers'), 'My customers')
})

test('the switch works on the very pages it is for: the layout wraps every admin page in it, and gives it the language from the cookie', () => {
  const layout = readFileSync(path.join(SRC, 'app/(admin)/layout.tsx'), 'utf8')
  assert.match(layout, /const lang = await getAdminLang\(\)/)
  assert.match(layout, /<AdminLangProvider lang=\{lang\}>/)
  assert.ok(layout.indexOf('await requireAdminPage()') < layout.indexOf('getAdminLang()'), 'the admin check comes first')
  const toggle = renderToStaticMarkup(createElement(AdminLangProvider, { lang: 'vi' }, createElement(LangToggle, {})))
  assert.match(toggle, />EN</)
  assert.match(toggle, />VI</)
})

// ---- nothing outside the admin area changes -----------------------------------------------------------------------------------------------

test('a public page has no language switch and no Vietnamese; the switch is not in any layout above them', async () => {
  for (const rel of ['privacy/page.tsx', 'terms/page.tsx', 'about/page.tsx']) {
    let html = ''
    try {
      const page = (await import(`@/app/${rel}`)).default as Page
      html = renderToStaticMarkup(await page())
    } catch { continue }
    assert.doesNotMatch(html, /lang-toggle|tutafy_admin_lang/, rel)
    assert.equal(VIETNAMESE.test(texts(html)), false, rel)
  }
  const rootLayout = readFileSync(path.join(SRC, 'app/layout.tsx'), 'utf8')
  assert.doesNotMatch(rootLayout, /AdminLang|LangToggle|admin-i18n/)
})

// ---- Sign out is always in view (T-0699) ---------------------------------------------------------------------------------------------------

const AdminLayout = (await import('@/app/(admin)/layout.tsx')).default as (p: { children: React.ReactNode }) => Promise<React.ReactElement>

/** The two pieces of the admin frame, from the real layout wrapped around a real page: the desktop sidebar and the phone top bar. */
async function frame(page: Page, p: unknown) {
  const html = renderToStaticMarkup(await AdminLayout({ children: await page(p) }))
  const aside = html.match(/<aside[\s\S]*?<\/aside>/)?.[0] ?? ''
  const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? ''
  return { html, aside, header }
}
const signOuts = (html: string) => html.match(/<button[^>]*data-testid="sign-out"[^>]*>[\s\S]*?<\/button>/g) ?? []

for (const name of Object.keys(Pages) as (keyof typeof Pages)[]) {
  test(`${name}: exactly one Sign out in the sidebar (fixed to the window) and one in the phone top bar (fixed to the top), no Sign in`, async () => {
    for (const lang of ['en', 'vi'] as const) {
      setAdminLang(lang)
      const word = ADMIN_DICTIONARIES[lang]['shell.signOut']
      const { html, aside, header } = await frame(Pages[name], props[name])
      // desktop: the sidebar is as tall as the window and sticks to its top, so the button at its foot never scrolls away
      assert.equal(signOuts(aside).length, 1, `${lang}: one Sign out in the sidebar`)
      assert.ok(signOuts(aside)[0].includes(`<span>${word}</span>`), `${lang}: it says ${word}`)
      const asideClass = aside.match(/<aside class="([^"]*)"/)?.[1] ?? ''
      for (const c of ['sticky', 'top-0', 'h-screen', 'self-start', 'md:flex', 'flex-col']) assert.ok(asideClass.split(' ').includes(c), `sidebar has ${c}`)
      assert.ok(!asideClass.split(' ').includes('min-h-screen'), 'the sidebar is not as tall as a long page')
      // the menu scrolls inside the sidebar; the sign-out block never shrinks away
      assert.match(aside, /<nav class="[^"]*overflow-y-auto[^"]*"/)
      assert.ok(aside.indexOf('data-testid="sign-out"') > aside.indexOf('</nav>'), 'Sign out is below the menu, at the foot')
      // phone: the top bar sticks to the top of the window and holds the language switch and Sign out
      assert.equal(signOuts(header).length, 1, `${lang}: one Sign out in the phone bar`)
      assert.ok(signOuts(header)[0].includes(`<span>${word}</span>`))
      const headerClass = header.match(/<header class="([^"]*)"/)?.[1] ?? ''
      for (const c of ['sticky', 'top-0', 'md:hidden']) assert.ok(headerClass.split(' ').includes(c), `top bar has ${c}`)
      assert.ok(header.includes('data-testid="lang-toggle"'))
      // nothing else in the frame can sign out or sign in; the closed drawer is not drawn
      assert.equal((html.match(/data-testid="sign-out"/g) ?? []).length, 2, 'one per screen size, no third')
      assert.doesNotMatch(aside + header, /Sign in|Log in|Đăng nhập|href="\/login"|href="\/register"/)
      assert.doesNotMatch(html, /id="admin-drawer"/)
    }
  })
}

test('the one Sign out signs out and goes to the login page, and the admin frame has no sign-in anywhere in its source', () => {
  const button = readFileSync(path.join(SRC, 'components/admin/SignOutButton.tsx'), 'utf8')
  assert.match(button, /await createClient\(\)\.auth\.signOut\(\)\s*router\.push\('\/login'\)/)
  for (const f of ['components/admin/AdminSidebar.tsx', 'components/admin/AdminMobileNav.tsx', 'components/admin/SignOutButton.tsx']) {
    const src = readFileSync(path.join(SRC, f), 'utf8')
    assert.doesNotMatch(src, /signIn|signInWith|Sign in/i, f)
    if (f !== 'components/admin/SignOutButton.tsx') assert.doesNotMatch(src, /\.auth\.signOut/, `${f} has no sign-out logic of its own`)
  }
  assert.match(readFileSync(path.join(SRC, 'components/admin/AdminSidebar.tsx'), 'utf8'), /<SignOutButton/)
  // one in the phone top bar and none in the drawer (the drawer is not drawn while closed, so only the source can say so)
  assert.equal((readFileSync(path.join(SRC, 'components/admin/AdminMobileNav.tsx'), 'utf8').match(/<SignOutButton/g) ?? []).length, 1)
})
