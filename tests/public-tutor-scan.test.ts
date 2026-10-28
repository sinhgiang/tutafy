// T-0774: the code may not read the `tutors` table or the blocked days (`availability_exceptions`) from a browser or with a visitor's key.
//
// supabase/migrations/025_tutors_not_public.sql takes the visitor's right to read those two tables away. Every page and API open to a
// visitor must therefore read them on the server, with the admin client. This test scans ALL of `src` (tests/support/tutor-read-scan.ts) and
// is deny-by-default: a read is fine when it is made with the admin client; any other read must be listed below, with a reason, and with
// the number of reads, so a new one - a new page that reads `tutors` with the visitor's key, a browser component that asks for it - turns the test
// red and is named. The behaviour itself (the real pages over a database that refuses a visitor) is proven in tests/public-tutor-reads.test.ts.
//
// What the scan does NOT see: a table name held in a variable, a `tutors(...)` join inside a select string, a client passed through an object
// field under another name, and a parameter named `admin` that a caller fills with something else. Those are the limits of reading source.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { argIsAdmin, callsOf, findReads, findRestReads, isOwnRow, usesVisitorKey } from './support/tutor-read-scan.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join('/')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? sourceFiles(p) : /\.(ts|tsx)$/.test(e.name) ? [p] : []
  })
}
const load = (): Map<string, string> => new Map(sourceFiles(path.join(ROOT, 'src')).map(f => [rel(f), readFileSync(f, 'utf8').split('\r\n').join('\n')]))

// ---- what is allowed, and why --------------------------------------------------------------------------------------------------------

/** Reads with the signed-in user's own session client. Each file: how many reads, how many of them are not narrowed to the user's own row in the query itself, and why that is safe. */
const OWN_SESSION: Record<string, { reads: number; unscoped?: number; reason: string }> = {
  'src/app/api/tutors/avatar/route.ts': { reads: 4, reason: 'T-0766 (pull request #67): a signed-in tutor reads and changes their own photo address (.eq id, user.id); the route answers 401 without a session' },
  'src/app/api/tutors/languages/route.ts': { reads: 2, reason: 'T-1032: a signed-in tutor reads and saves the list of languages of their own row (.eq id, user.id, with their own session so row level security keeps it to their row); the route answers 401 without a session and 403 for another site' },
  'src/app/api/tutors/intro-video/route.ts': { reads: 2, reason: 'T-0915: a signed-in tutor saves or removes the link of their own intro video (.eq id, user.id, with their own session so row level security keeps it to their row); the route answers 401 without a session and 403 for another site' },
  'src/app/api/ai/lesson-summary/route.ts': { reads: 1, reason: 'a signed-in tutor reads their own name; the route answers 401 without a session' },
  'src/app/api/custom-domain/route.ts': { reads: 3, reason: 'a signed-in tutor reads and writes their own domain; the route answers 401 without a session' },
  'src/app/api/invoices/send/route.ts': { reads: 1, reason: 'a signed-in tutor reads their own name and address for an invoice they send' },
  'src/app/api/lessons/[id]/no-show/route.ts': { reads: 1, reason: 'a signed-in tutor reads their own name' },
  'src/app/api/messages/broadcast/route.ts': { reads: 1, reason: 'a signed-in tutor reads their own name' },
  'src/app/api/referral/route.ts': { reads: 1, reason: 'a signed-in tutor reads their own referral code' },
  'src/app/api/stripe/connect/onboard/route.ts': { reads: 2, reason: 'a signed-in tutor reads their own Stripe account id' },
  'src/app/api/subscriptions/plans/route.ts': { reads: 1, reason: 'T-0841: a Pro tutor (requireApiPlan) reads the slug of their own row (.eq id, the session) to build the Copy link of a plan; the route answers 401 without a session' },
  'src/app/api/subscriptions/upgrade/route.ts': { reads: 1, reason: 'a signed-in tutor reads their own plan' },
  'src/app/onboarding/page.tsx': { reads: 2, reason: 'browser: the signed-in tutor reads and saves their own first profile' },
  'src/app/settings/stripe/return/page.tsx': { reads: 1, reason: 'a signed-in tutor comes back from Stripe and reads their own account id' },
  'src/proxy.ts': { reads: 1, reason: 'the signed-in account asks whether it is a tutor, with its own session (never the public key); proven in tests/proxy-tutor-reads.test.ts' },
  'src/lib/api-guard.ts': { reads: 1, reason: 'the plan of the signed-in caller of a paid API' },
  'src/lib/guard.tsx': { reads: 1, reason: 'the plan of the signed-in user, for the page guard' },
}
/** Pages behind the sign-in (the proxy and the layout of this group send a visitor to /login). Every read is the user's own row, except the listed number. */
const OWN_SESSION_PREFIXES: Record<string, { unscoped: Record<string, number>; reason: string }> = {
  'src/app/(dashboard)/': {
    unscoped: { 'src/app/(dashboard)/availability/page.tsx': 2 },
    reason: 'the tutor\'s own pages; availability/page.tsx saves and removes a blocked day, which the policy "Tutors manage exceptions" (tutor_id = auth.uid()) keeps to the tutor\'s own rows',
  },
}
/** Helpers that take the client from the caller. Each: the reads, and the exported functions the callers must give the admin client when the caller is open to a visitor. */
const TAKES_A_CLIENT: Record<string, { reads: number; helpers: string[]; reason: string }> = {
  'src/lib/admin-revenue.ts': { reads: 1, helpers: ['loadAdminRevenue'], reason: 'the owner\'s admin pages only' },
  'src/lib/branding.ts': { reads: 2, helpers: ['loadShowMadeWith'], reason: 'turns the plan and a switch into a yes/no; public pages call it with the admin client' },
  'src/lib/directory-data.ts': { reads: 5, helpers: ['loadDirectory'], reason: 'src/lib/directory-cache.ts calls it with the admin client' },
  'src/lib/established-data.ts': { reads: 1, helpers: ['loadIntroVideos', 'loadEstablished'], reason: 'T-0915: the profile and the directory hand in the admin client; it reads the intro video link of the tutors it is given and turns it into a checked video, and asks the server-only function for the badge facts (a date and two numbers)' },
  'src/lib/directory-setup.ts': { reads: 1, helpers: ['loadDirectorySetup'], reason: 'T-1043: the signed-in tutor\'s own dashboard card; it reads the bio and languages of the one tutor id the session gives it, and only the dashboard page calls it' },
  'src/lib/first-student.ts': { reads: 2, helpers: ['loadFirstStudent'], reason: 'the signed-in tutor\'s own dashboard card' },
  'src/lib/lesson-durations.ts': { reads: 1, helpers: ['loadChosenDurations'], reason: 'the lengths a tutor takes; public pages call it with the admin client' },
  'src/lib/listing-status.ts': { reads: 2, helpers: ['loadListingCard'], reason: 'the signed-in tutor\'s own dashboard card' },
  'src/lib/profile-completion.ts': { reads: 1, helpers: ['loadProfileCompletion'], reason: 'the signed-in tutor\'s own dashboard card' },
  'src/lib/tutor-announcement-run.ts': { reads: 1, helpers: ['loadAnnouncementRecipients', 'loadAnnouncementStatus', 'sendTestMail', 'startAnnouncement', 'stopAnnouncement'], reason: 'T-1064: the tutor email page of the platform admin; only the three admin routes and the admin page call it, each after the admin check, and each hands in the admin client' },
  'src/lib/settings-save.ts': { reads: 6, helpers: ['saveTutorSettings'], reason: 'writes the signed-in tutor own row (userId); called only by the Settings page with that tutor session client' },
  'src/lib/review-invites.ts': { reads: 1, helpers: ['runReviewInvites'], reason: 'the daily invitation run; its only caller is the cron route, which hands in the admin client' },
  'src/lib/reviews-data.ts': { reads: 2, helpers: ['loadProfileReviews', 'loadReviewPageState', 'countLessonsHeld'], reason: 'the reviews flow; the profile and the review page hand in the admin client, and the routes that write it check who asks first' },
  'src/lib/role-switch.ts': { reads: 1, helpers: ['canBackToTutor'], reason: 'asks whether the signed-in account is a tutor; the student page gives it the admin client' },
  'src/lib/tutor-currency.ts': { reads: 1, helpers: ['loadTutorCurrency'], reason: 'the currency of a tutor, for the tutor\'s own pages and the owner\'s admin pages' },
  'src/lib/tutor-sitemap.ts': { reads: 1, helpers: ['listBookableTutors', 'listIndexableTutorSlugs'], reason: 'the sitemap gives it a client built with the server\'s key' },
  'src/lib/welcome-send.ts': { reads: 1, helpers: [], reason: 'the welcome-mail job: its callers are the scheduled job and the sign-up route, which hand in the admin client; no page calls it' },
}
/** Reads by a plain REST request (fetch), which the scan of client calls does not see. Each: how many, and which key they use. */
const REST_READS: Record<string, { reads: number; reason: string }> = {
  'src/proxy.ts': { reads: 1, reason: 'the custom domain of a tutor, asked with the server key (SUPABASE_SERVICE_ROLE_KEY), the slug only, for a page that is on; proven in tests/proxy-tutor-reads.test.ts' },
}
/** Files whose code runs in the browser and still touch these tables: only the signed-in tutor's own pages. */
const BROWSER_OK = ['src/app/(dashboard)/availability/page.tsx', 'src/app/(dashboard)/settings/page.tsx', 'src/app/onboarding/page.tsx']
/** Browser code that reaches the tutors table through a helper (and the id it passes): the signed-in tutor's own lengths for the lesson forms. */
const BROWSER_HELPER_OK: Record<string, string> = {
  'src/app/(dashboard)/settings/page.tsx': 'saveTutorSettings(supabase, user.id, ...): the signed-in tutor saves their own row',
  'src/app/(dashboard)/lessons/new/page.tsx': 'loadChosenDurations(supabase, user.id): the signed-in tutor own row',
  'src/app/(dashboard)/lessons/[id]/edit/page.tsx': 'loadChosenDurations(supabase, data.tutor_id): the tutor id of a lesson the signed-in tutor could open (the lessons policy is each tutor own)',
}
/** Open to a visitor (or to a student with a link): these read only with the admin client, and call the helpers above only with it. */
const PUBLIC_SURFACE = [
  'src/app/book/', 'src/app/embed/', 'src/app/tutors/', 'src/app/student/', 'src/app/portal/', 'src/app/sitemap.ts',
  'src/app/api/tutors/public/', 'src/app/api/portal/', 'src/app/api/bookings/', 'src/app/api/reviews/', 'src/app/api/waitlist/', 'src/app/api/coupons/',
  'src/app/api/subscriptions/checkout/', 'src/app/api/stripe/checkout/', 'src/app/api/ai/homework-check/', 'src/app/api/track/', 'src/app/api/student/',
  'src/app/unsubscribe/', 'src/app/api/unsubscribe/', 'src/lib/public-tutor.ts', 'src/lib/profile-data.ts', 'src/lib/directory-cache.ts',
]
const isPublic = (file: string) => PUBLIC_SURFACE.some(p => file.startsWith(p))

// ---- the check, on any set of files ----------------------------------------------------------------------------------------------------

function problemsIn(files: Map<string, string>): string[] {
  const out: string[] = []
  const sessionCount = new Map<string, { reads: number; unscoped: number }>()
  const paramCount = new Map<string, number>()
  for (const [file, source] of files) {
    if (file.startsWith('src/lib/database')) continue
    for (const r of findReads(source)) {
      const where = `${file}:${r.line} (${r.table} read with "${r.receiver}")`
      if (r.kind === 'admin') continue
      if (isPublic(file)) { out.push(`${where}: a page or API open to a visitor reads with a client that is not the admin client`); continue }
      if (r.kind === 'param') { paramCount.set(file, (paramCount.get(file) ?? 0) + 1); continue }
      const c = sessionCount.get(file) ?? { reads: 0, unscoped: 0 }
      c.reads++
      if (!isOwnRow(r.statement)) c.unscoped++
      sessionCount.set(file, c)
    }
    // server code of the public surface does not take the visitor's key from the environment or import the browser client (a component that runs in the browser may: it reads none of these tables, and the check above would name it if it did)
    if (isPublic(file) && !/^\s*['"]use client['"]/.test(source) && usesVisitorKey(source)) out.push(`${file}: a public file uses the visitor's key or the browser client`)
  }
  for (const [file, c] of sessionCount) {
    const listed = OWN_SESSION[file]
    const prefix = Object.keys(OWN_SESSION_PREFIXES).find(p => file.startsWith(p))
    if (listed) {
      if (c.reads !== listed.reads) out.push(`${file}: reads ${c.reads} time(s) with the session client, the list says ${listed.reads}`)
      if (c.unscoped !== (listed.unscoped ?? 0)) out.push(`${file}: ${c.unscoped} read(s) are not narrowed to the user's own row, the list says ${listed.unscoped ?? 0}`)
    } else if (prefix) {
      const allowed = OWN_SESSION_PREFIXES[prefix].unscoped[file] ?? 0
      if (c.unscoped !== allowed) out.push(`${file}: ${c.unscoped} read(s) are not narrowed to the user's own row, the list says ${allowed}`)
    } else {
      out.push(`${file}: reads these tables ${c.reads} time(s) with a session or browser client and is not on the list (OWN_SESSION): who can open it?`)
    }
  }
  for (const [file, n] of paramCount) {
    const listed = TAKES_A_CLIENT[file]
    if (!listed) out.push(`${file}: reads these tables with a client its caller hands in and is not on the list (TAKES_A_CLIENT)`)
    else if (listed.reads !== n) out.push(`${file}: ${n} read(s) with the caller's client, the list says ${listed.reads}`)
  }
  // reads made by a plain request: the same deny-by-default, and the key must be the server's
  for (const [file, source] of files) {
    const rest = findRestReads(source)
    const listed = REST_READS[file]
    if (rest.length === 0 && !listed) continue
    if (!listed) { out.push(`${file}:${rest[0].line}: a REST read of ${rest[0].table} is not on the list (REST_READS)`); continue }
    if (rest.length !== listed.reads) out.push(`${file}: ${rest.length} REST read(s) of these tables, the list says ${listed.reads}`)
    for (const r of rest) if (!/serverKey|SERVICE_ROLE/.test(r.statement) || /supabaseKey|ANON/.test(r.statement)) out.push(`${file}:${r.line}: a REST read of ${r.table} must use the server key and not the public key`)
  }
  // a listed file that no longer reads, or a helper no longer exported: the list must stay true
  for (const file of Object.keys(OWN_SESSION)) if (files.has(file) && !sessionCount.has(file)) out.push(`${file}: listed in OWN_SESSION but no longer reads`)
  for (const [file, l] of Object.entries(TAKES_A_CLIENT)) {
    if (files.has(file) && !paramCount.has(file)) out.push(`${file}: listed in TAKES_A_CLIENT but no longer reads`)
    for (const h of l.helpers) if (files.has(file) && !new RegExp(String.raw`export (async )?function ${h}\b`).test(files.get(file)!)) out.push(`${file}: ${h} is listed but not exported`)
  }
  // a public file calls a helper that takes a client: it must hand in the admin client
  const helpers = Object.values(TAKES_A_CLIENT).flatMap(l => l.helpers)
  for (const [file, source] of files) {
    if (!isPublic(file)) continue
    for (const h of helpers) for (const c of callsOf(source, h)) if (!argIsAdmin(c.firstArg, source, c.before)) out.push(`${file}:${c.line}: ${h}(${c.firstArg}) - a public file must hand in the admin client`)
  }
  // code that runs in the browser
  for (const [file, source] of files) {
    if (!/^\s*['"]use client['"]/.test(source)) continue
    if (findReads(source).length > 0 && !BROWSER_OK.includes(file)) out.push(`${file}: browser code reads these tables and is not on the list (BROWSER_OK)`)
    if (helpers.some(h => callsOf(source, h).length > 0) && !(file in BROWSER_HELPER_OK)) out.push(`${file}: browser code reaches these tables through a helper and is not on the list (BROWSER_HELPER_OK)`)
  }
  return out
}

// ---- the real code ---------------------------------------------------------------------------------------------------------------------

test('every read of tutors or the blocked days is made with the admin client, or is listed with its reason (deny by default)', () => {
  assert.deepEqual(problemsIn(load()), [])
})

test('the scan is not empty: it finds the reads the public pages make, with the admin client', () => {
  const files = load()
  const adminReadsOf = (file: string) => findReads(files.get(file)!).filter(r => r.kind === 'admin').map(r => r.table)
  assert.deepEqual(adminReadsOf('src/lib/public-tutor.ts'), ['tutors', 'availability_exceptions'])
  assert.deepEqual(adminReadsOf('src/lib/profile-data.ts'), ['availability_exceptions'])
  assert.ok(adminReadsOf('src/app/student/dashboard/page.tsx').includes('tutors'))
  assert.ok(adminReadsOf('src/app/api/bookings/route.ts').includes('tutors'))
  for (const page of ['src/app/book/[slug]/page.tsx', 'src/app/book/[slug]/[member]/page.tsx', 'src/app/embed/[slug]/page.tsx', 'src/app/tutors/[slug]/page.tsx']) {
    const source = files.get(page)!
    assert.ok(/loadPublicTutor\(\s*(createAdminClient\(\)|admin)\s*,/.test(source), `${page} reads the tutor through loadPublicTutor with the admin client`)
    assert.deepEqual(findReads(source), [], `${page} makes no read of its own`)
  }
  const calls = [...files].filter(([f]) => isPublic(f)).flatMap(([f, s]) => ['loadChosenDurations', 'loadShowMadeWith'].flatMap(h => callsOf(s, h).map(c => `${f}: ${h}(${c.firstArg})`)))
  assert.ok(calls.length >= 8, `the two helpers are called from the booking pages, the embed and the profile (found ${calls.length})`)
})

test('the pages open to a visitor are on the public surface list, and the signed-in pages are behind a sign-in', () => {
  const files = load()
  for (const page of ['src/app/book/[slug]/page.tsx', 'src/app/embed/[slug]/page.tsx', 'src/app/tutors/[slug]/page.tsx', 'src/app/student/dashboard/page.tsx', 'src/app/sitemap.ts', 'src/app/api/tutors/public/route.ts']) {
    assert.ok(files.has(page) && isPublic(page), page)
  }
  const layout = files.get('src/app/(dashboard)/layout.tsx')!
  assert.match(layout, /auth\.getUser\(\)/)
  assert.match(layout, /if \(!user\) redirect\('\/login'\)/, 'the layout of the dashboard group sends a visitor to /login before anything is read')
})

// ---- the scan itself: it catches what it claims to --------------------------------------------------------------------------------------

const fake = (entries: Record<string, string>) => new Map(Object.entries(entries))

test('self-check: a new public page that reads tutors with the visitor\'s client is named; so is one that reads the blocked days; quotes and line breaks do not hide it', () => {
  const bad = problemsIn(fake({
    'src/app/book/[slug]/extra.tsx': `import { createClient } from '@/lib/supabase/server'\nexport default async function P() {\n  const supabase = await createClient()\n  const { data } = await supabase\n    .from("tutors")\n    .select('*')\n}`,
    'src/app/embed/[slug]/more.tsx': `const s = await createClient()\nawait s.from('availability_exceptions').select('date')`,
  }))
  assert.equal(bad.length, 2, bad.join('\n'))
  assert.match(bad[0], /extra\.tsx:5/)
  assert.match(bad[1], /more\.tsx:2/)
})

test('self-check: a new page elsewhere that reads with a session client must be listed; a browser component too; a helper that takes a client too', () => {
  const bad = problemsIn(fake({
    'src/app/new-area/page.tsx': `const supabase = await createClient()\nawait supabase.from('tutors').select('name').eq('id', user.id)`,
    'src/app/new-area/Widget.tsx': `'use client'\nconst supabase = createBrowserClient()\nawait supabase.from('tutors').select('name').eq('id', user.id)`,
    'src/lib/new-helper.ts': `export async function f(db) { return db.from('tutors').select('slug') }`,
  }))
  assert.equal(bad.filter(b => b.startsWith('src/app/new-area/page.tsx')).length, 1)
  assert.equal(bad.filter(b => b.startsWith('src/app/new-area/Widget.tsx')).length, 2, 'not on OWN_SESSION, and browser code not on BROWSER_OK')
  assert.equal(bad.filter(b => b.startsWith('src/lib/new-helper.ts')).length, 1)
})

test('self-check: the admin client under another name, a client built with the service key, and a comment do not raise a false alarm', () => {
  assert.deepEqual(problemsIn(fake({
    'src/app/book/[slug]/ok.tsx': `const supabase = createAdminClient()\nawait supabase.from('tutors').select('slug')\n// await visitor.from('tutors').select('*')\n/* old: supabase.from('tutors') */`,
    'src/app/embed/[slug]/ok.tsx': `const db = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY)\nawait db.from('tutors').select('slug')`,
    'src/app/portal/[token]/ok.tsx': `async function f(supabase: ReturnType<typeof createAdminClient>) { await supabase.from('tutors').select('slug') }`,
    'src/app/sitemap.ts': `await createAdminClient().from('tutors').select('slug')`,
  })), [])
})

test('self-check: the nearest line that made the client decides (the same name, an admin client in one function and a session client in the next)', () => {
  const two = `async function a() {\n  const supabase = createAdminClient()\n  await supabase.from('tutors').select('id')\n}\nasync function b() {\n  const supabase = await createClient()\n  await supabase.from('tutors').select('id')\n}`
  assert.deepEqual(findReads(two).map(r => r.kind), ['admin', 'session'])
  // an admin client made on the NEXT line does not make the session client above it an admin client
  const next = `const supabase = await createClient()\nconst admin = createAdminClient()\nawait supabase.from('tutors').select('id')`
  assert.deepEqual(findReads(next).map(r => r.kind), ['session'])
  // but an expression that runs over two lines is read whole
  const wrapped = `const supabase = createClient(\n  URL, process.env.SUPABASE_SERVICE_ROLE_KEY)\nawait supabase.from('tutors').select('id')`
  assert.deepEqual(findReads(wrapped).map(r => r.kind), ['admin'])
})

test('self-check: a public file that calls a helper with the visitor\'s client is named; with the admin client it is not', () => {
  const bad = problemsIn(fake({
    'src/app/book/[slug]/page.tsx': `const supabase = await createClient()\nconst admin = createAdminClient()\nawait loadChosenDurations(supabase, id)\nawait loadShowMadeWith(admin, id)`,
    'src/lib/lesson-durations.ts': `export async function loadChosenDurations(db, id) { return client.from('tutors').select('lesson_durations') }\nconst client = db`,
    'src/lib/branding.ts': `export async function loadShowMadeWith(db, id) { const client = db; await client.from('tutors').select('a'); await client.from('tutors').select('b') }`,
  }))
  assert.ok(bad.some(b => b.includes('loadChosenDurations(supabase)') && b.includes('hand in the admin client')), bad.join('\n'))
  assert.equal(bad.filter(b => b.includes('loadShowMadeWith(admin')).length, 0)
})

test('self-check: a public file that uses the visitor\'s key or the browser client is named; the same words in a comment are not', () => {
  assert.equal(usesVisitorKey(`const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`), true)
  assert.equal(usesVisitorKey(`import { createClient } from '@/lib/supabase/client'`), true)
  assert.equal(usesVisitorKey(`// not the NEXT_PUBLIC_SUPABASE_ANON_KEY any more`), false)
  const bad = problemsIn(fake({ 'src/app/sitemap.ts': `const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` }))
  assert.equal(bad.length, 1)
  assert.equal(argIsAdmin('supabase', `const supabase = await createClient()`), false)
  assert.equal(argIsAdmin('createAdminClient()', ''), true)
})

test('self-check: a list that has gone stale is named: a file that no longer reads, a count that changed', () => {
  const real = load()
  const without = new Map(real)
  without.set('src/app/api/referral/route.ts', real.get('src/app/api/referral/route.ts')!.replace(/\.from\('tutors'\)/g, ".from('profiles')"))
  assert.ok(problemsIn(without).some(p => p.startsWith('src/app/api/referral/route.ts') && p.includes('no longer reads')))
  const more = new Map(real)
  more.set('src/lib/branding.ts', real.get('src/lib/branding.ts')! + `\nexport async function extra(client: unknown) { return (client as Q).from('tutors').select('slug') }`)
  assert.ok(problemsIn(more).some(p => p.startsWith('src/lib/branding.ts') && p.includes('the list says 2')))
})

test('self-check: a plain REST read of tutors (fetch of /rest/v1/tutors) is found: unlisted ones are named, and one made with the public key is named even in the listed file', () => {
  const viaPublic = "const r = await fetch(`${supabaseUrl}/rest/v1/tutors?id=eq.${id}&select=id`, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } })"
  const bad = problemsIn(fake({ 'src/app/new-area/route.ts': viaPublic, 'src/proxy.ts': viaPublic }))
  assert.ok(bad.some(p => p.startsWith('src/app/new-area/route.ts:1') && p.includes('not on the list (REST_READS)')), bad.join('\n'))
  assert.ok(bad.some(p => p.startsWith('src/proxy.ts:1') && p.includes('must use the server key')), bad.join('\n'))
  const viaServer = "const r = await fetch(`${supabaseUrl}/rest/v1/tutors?slug=eq.x&select=slug`, { headers: { apikey: serverKey, Authorization: `Bearer ${serverKey}` } })"
  // (the fixture file has only this read, so the list entry for the session read of the same file is reported as stale: that is not what is checked here)
  assert.deepEqual(problemsIn(fake({ 'src/proxy.ts': viaServer })).filter(p => !p.includes('no longer reads')), [])
  assert.equal(findRestReads('// fetch(`/rest/v1/tutors`)').length, 0, 'a comment')
})
