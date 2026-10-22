// T-0630: a tutor's public profile (/tutors/<slug>) has its own title, description,
// canonical address and structured data, is in the sitemap ONLY when the tutor turned the
// public page on, and a hidden profile is noindex; a blog post shows its author and the
// real date it was last updated, with dateModified in its structured data.
// Page files are .tsx and cannot be loaded here, so what they publish is built in
// src/lib (run for real below) and the page files are read to prove they use it.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sitemap from '@/app/sitemap'
import { SITE_URL } from '@/lib/site-url'
import {
  PAGE_SEO, BLOG_SEO, TITLE_MAX, TITLE_MIN, DESCRIPTION_MAX, DESCRIPTION_MIN, tutorMetadata, tutorNotFoundMetadata,
} from '@/lib/page-meta'
import {
  tutorSeoText, tutorJsonLd, tutorProfileUrl, cleanText, isPublicSlug, TUTOR_TITLE_MAX, TUTOR_DESCRIPTION_MAX, type TutorSeoInput,
} from '@/lib/tutor-seo'
import { listPublicTutorSlugs, MAX_TUTOR_URLS, type TutorSlugClient } from '@/lib/tutor-sitemap'
import { jsonLdScript } from '@/lib/seo'
import { POSTS, postDates, type Post } from '@/lib/blog'
import { blogPostJsonLd, formatPostDate } from '@/lib/blog-seo'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8')

const EMAIL_IN_TEXT = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
// a telephone number: with a country code, or in the usual 3-3-4 or (3) 3-4 groups; dates such as 2026-07-07 are not
const PHONE_IN_TEXT = /\+\d[\d\s().-]{7,}\d|\(\d{3}\)\s?\d{3}[-\s]\d{4}|\b\d{3}[-\s]\d{3}[-\s]\d{4}\b/

// ---- sample tutors -------------------------------------------------------------------

const SAMPLES: TutorSeoInput[] = [
  { slug: 'sarah-test', name: 'Sarah Test', languages: ['English', 'Spanish'], bio: 'Friendly English and Spanish tutor with ten years of experience.', avatar_url: 'https://cdn.example.com/a/sarah.jpg', booking_url_active: true },
  { slug: 'diego-prueba', name: 'Diego Prueba', languages: ['Spanish'], bio: null, booking_url_active: true },
  { slug: 'mei-lin', name: 'Mei Lin', languages: ['Mandarin Chinese', 'English', 'Japanese'], booking_url_active: true },
  { slug: 'no-languages', name: 'Pat Doe', languages: [], booking_url_active: true },
  { slug: 'null-languages', name: 'Alex Roe', languages: null, booking_url_active: true },
  { slug: 'very-long-name', name: 'Maximiliana Alexandrina Von Hohenzollern-Sigmaringen-Wolfeschlegelstein', languages: ['Ancient Greek and Latin for scholars', 'English', 'German'], booking_url_active: true },
  { slug: 'hidden-tutor', name: 'Hidden Hana', languages: ['Korean'], booking_url_active: false },
]

// ---- (1) a title and a description of its own ----------------------------------------

test('the profile limits are the same as the other public pages', () => {
  assert.equal(TUTOR_TITLE_MAX, TITLE_MAX)
  assert.equal(TUTOR_DESCRIPTION_MAX, DESCRIPTION_MAX)
})

test('every profile has a title and a description in length, built from the name and languages, none repeated', () => {
  const seen = new Map<string, string>()
  const others = new Set([
    ...Object.values(PAGE_SEO).flatMap(p => [p.title.toLowerCase(), p.description.toLowerCase()]),
    ...Object.values(BLOG_SEO).flatMap(p => [p.title.toLowerCase(), p.description.toLowerCase()]),
  ])
  for (const t of SAMPLES) {
    const { title, description } = tutorSeoText(t)
    assert.ok(title.length >= TITLE_MIN && title.length <= TITLE_MAX, `${t.slug}: title is ${title.length} characters: ${title}`)
    assert.ok(description.length >= DESCRIPTION_MIN && description.length <= DESCRIPTION_MAX, `${t.slug}: description is ${description.length} characters`)
    assert.ok(title.endsWith('| Tutafy'), title)
    for (const text of [title, description]) {
      assert.ok(!seen.has(text.toLowerCase()), `${t.slug} repeats ${seen.get(text.toLowerCase())}`)
      seen.set(text.toLowerCase(), t.slug)
      assert.ok(!others.has(text.toLowerCase()), `${t.slug} repeats a page or a post`)
    }
  }
  const sarah = tutorSeoText(SAMPLES[0])
  assert.match(sarah.title, /Sarah Test/)
  assert.match(sarah.title, /English & Spanish/)
  assert.match(sarah.description, /Sarah Test/)
  assert.match(sarah.description, /English & Spanish/)
  assert.match(tutorSeoText(SAMPLES[2]).description, /Mandarin Chinese, English & Japanese/)
  assert.match(tutorSeoText(SAMPLES[3]).title, /Online Tutor/, 'no language: still a title')
})

test('a very long name or language list is cut to fit, never past the limit', () => {
  const long = tutorSeoText(SAMPLES[5])
  assert.ok(long.title.length <= TITLE_MAX && long.description.length <= DESCRIPTION_MAX)
  for (const n of [0, 1, 5, 60, 80, 200, 1000]) {
    const t = tutorSeoText({ name: 'N'.repeat(n), languages: Array.from({ length: 12 }, (_, i) => `Language number ${i}`) })
    assert.ok(t.title.length >= TITLE_MIN && t.title.length <= TITLE_MAX, `name of ${n}: title ${t.title.length}`)
    assert.ok(t.description.length >= DESCRIPTION_MIN && t.description.length <= DESCRIPTION_MAX, `name of ${n}: description ${t.description.length}`)
  }
  assert.match(tutorSeoText({ name: '', languages: ['French'] }).title, /Tutafy tutor/, 'an empty name gets a neutral one')
})

test('no email address and no phone number reaches a title, a description or the structured data, whatever the tutor wrote', () => {
  const dirty: TutorSeoInput = {
    slug: 'dirty', booking_url_active: true,
    name: 'Ana Silva ana.silva@example.com +34 600 123 456',
    languages: ['Spanish', 'write me at ana@example.com', '+44 20 7946 0958'],
    bio: 'Call me on (555) 123-4567 or 555 123 4567 or +1 555 123 4567, mail ana.silva@example.com, or message me. I teach since 2015.',
    avatar_url: 'https://user:secret@cdn.example.com/a.jpg',
  }
  const seo = tutorSeoText(dirty)
  const all = JSON.stringify([seo, tutorJsonLd(dirty), tutorMetadata(dirty)])
  assert.doesNotMatch(all, EMAIL_IN_TEXT)
  assert.doesNotMatch(all, PHONE_IN_TEXT)
  assert.ok(!all.includes('secret@'), 'an address with a password is not used as the photo')
  assert.match(seo.title, /Ana Silva/)
  // the bio keeps its ordinary words
  const person = (tutorJsonLd(dirty)[0].mainEntity as Record<string, unknown>)
  assert.match(String(person.description), /message me\. I teach since 2015\./)
})

test('cleanText: control characters, emails, phone numbers and runs of spaces go; other text stays', () => {
  assert.equal(cleanText('  a\u0000b c   d  ', 50), 'a b c d')
  assert.equal(cleanText('mail me@example.com now', 50), 'mail now')
  assert.equal(cleanText('call +1 (555) 123-4567 today', 50), 'call today')
  assert.equal(cleanText('Born in 2015, 3 kids', 50), 'Born in 2015, 3 kids')
  assert.equal(cleanText('x'.repeat(100), 20).length, 20)
  assert.equal(cleanText(undefined, 10), '')
  assert.equal(cleanText(42 as unknown as string, 10), '')
})

// ---- (2) canonical, noindex ----------------------------------------------------------

test('the canonical and the og address of a profile are its address on the main (www) site', () => {
  for (const t of SAMPLES) {
    const m = tutorMetadata(t)
    const url = `${SITE_URL}/tutors/${t.slug}`
    assert.equal(String(m.alternates?.canonical), url)
    assert.equal((m.openGraph as { url?: string }).url, url)
    assert.equal(tutorProfileUrl(t.slug), url)
    assert.ok(url.startsWith('https://www.tutafy.com/'))
    assert.equal((m.title as { absolute: string }).absolute, tutorSeoText(t).title)
    assert.equal(m.description, tutorSeoText(t).description)
  }
})

test('a profile is indexed only when the tutor turned the public page on; every other state is noindex', () => {
  for (const active of [true] as const) assert.equal(tutorMetadata({ ...SAMPLES[0], booking_url_active: active }).robots, undefined)
  for (const off of [false, null, undefined]) {
    assert.deepEqual(tutorMetadata({ ...SAMPLES[0], booking_url_active: off }).robots, { index: false, follow: false }, String(off))
  }
  assert.deepEqual(tutorMetadata(SAMPLES[6]).robots, { index: false, follow: false })
  assert.deepEqual(tutorNotFoundMetadata().robots, { index: false, follow: false })
})

// ---- (3) structured data -------------------------------------------------------------

test('the structured data is a ProfilePage whose main entity is a Person, valid and with nothing private', () => {
  for (const t of SAMPLES) {
    const [profile, crumbs] = tutorJsonLd(t)
    const url = `${SITE_URL}/tutors/${t.slug}`
    assert.equal(profile['@context'], 'https://schema.org')
    assert.equal(profile['@type'], 'ProfilePage')
    assert.equal(profile.url, url)
    const person = profile.mainEntity as Record<string, unknown>
    assert.equal(person['@type'], 'Person')
    assert.equal(person.url, url)
    assert.ok(typeof person.name === 'string' && (person.name as string).length > 0)
    const keys = Object.keys(person)
    for (const forbidden of ['email', 'telephone', 'faxNumber', 'address', 'birthDate', 'aggregateRating', 'review']) assert.ok(!keys.includes(forbidden), `${t.slug}: ${forbidden}`)
    if (t.languages?.length) assert.ok(Array.isArray(person.knowsLanguage) && (person.knowsLanguage as string[]).length >= 1)
    if (t.bio) assert.ok(typeof person.description === 'string')
    // the breadcrumb ends on this profile
    const items = crumbs.itemListElement as { position: number; item: string }[]
    assert.deepEqual(items.map(i => i.position), [1, 2, 3])
    assert.equal(items[2].item, url)
    // it is real JSON, and the script text never closes its own tag
    for (const block of [profile, crumbs]) {
      const text = jsonLdScript(block)
      assert.deepEqual(JSON.parse(text), JSON.parse(JSON.stringify(block)))
      assert.ok(!/<\/script/i.test(text))
    }
  }
  assert.equal((tutorJsonLd(SAMPLES[0])[0].mainEntity as Record<string, unknown>).image, 'https://cdn.example.com/a/sarah.jpg')
  assert.equal((tutorJsonLd({ ...SAMPLES[0], avatar_url: 'http://insecure.example.com/a.jpg' })[0].mainEntity as Record<string, unknown>).image, undefined)
  const inject = tutorJsonLd({ slug: 'x', name: '</script><script>alert(1)</script>', bio: '<img src=x onerror=alert(1)>', booking_url_active: true })
  assert.ok(!/<\/script/i.test(jsonLdScript(inject[0])))
})

test('slugs: only plain ones are put in an address or a sitemap', () => {
  for (const ok of ['sarah-test', 'a', 'mei-lin-2', '0abc']) assert.ok(isPublicSlug(ok), ok)
  for (const bad of ['', '-x', 'A-b', 'a b', 'a/b', '../etc', 'a?x=1', 'ñandú', null, undefined, 42, 'x'.repeat(101)]) assert.ok(!isPublicSlug(bad), String(bad))
})

// ---- (4) the sitemap -----------------------------------------------------------------

test('listPublicTutorSlugs asks for the slug column of the tutors who turned the public page on, and nothing else', async () => {
  const calls: string[] = []
  const client = {
    from(table: string) {
      calls.push(`from ${table}`)
      return {
        select(cols: string) {
          calls.push(`select ${cols}`)
          return {
            eq(col: string, value: unknown) {
              calls.push(`eq ${col}=${value}`)
              return {
                order(by: string) {
                  calls.push(`order ${by}`)
                  return {
                    limit: async (n: number) => {
                      calls.push(`limit ${n}`)
                      return { data: [{ slug: 'sarah-test' }, { slug: 'sarah-test' }, { slug: 'Bad Slug' }, { slug: '../x' }, { slug: 'diego-prueba' }, { slug: null }], error: null }
                    },
                  }
                },
              }
            },
          }
        },
      }
    },
  } as unknown as TutorSlugClient
  assert.deepEqual(await listPublicTutorSlugs(client), ['sarah-test', 'diego-prueba'], 'duplicates and odd slugs are dropped')
  assert.deepEqual(calls, ['from tutors', 'select slug', 'eq booking_url_active=true', 'order slug', `limit ${MAX_TUTOR_URLS}`])
})

test('a database that is missing, fails or answers with an error gives an empty list, never a broken sitemap', async () => {
  assert.deepEqual(await listPublicTutorSlugs(null), [])
  const failing = { from: () => { throw new Error('down') } } as unknown as TutorSlugClient
  assert.deepEqual(await listPublicTutorSlugs(failing), [])
  const errored = { from: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: null, error: { message: 'x' } }) }) }) }) }) } as unknown as TutorSlugClient
  assert.deepEqual(await listPublicTutorSlugs(errored), [])
})

/** A stand-in for Supabase's REST service that, like the database policy, only returns tutors where booking_url_active is true when the request says so. */
function fakeDatabase(rows: { slug: string; email: string; booking_url_active: boolean }[]) {
  const requests: string[] = []
  const server = http.createServer((req, res) => {
    requests.push(req.url ?? '')
    const url = new URL(req.url ?? '/', 'http://localhost')
    let out = rows
    if (url.searchParams.get('booking_url_active') === 'eq.true') out = out.filter(r => r.booking_url_active)
    const columns = (url.searchParams.get('select') ?? '*').split(',')
    const picked = out.map(r => (columns[0] === '*' ? r : Object.fromEntries(columns.map(c => [c, (r as Record<string, unknown>)[c]]))))
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(picked))
  })
  return new Promise<{ url: string; requests: string[]; close: () => Promise<void> }>(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number }
      resolve({ url: `http://127.0.0.1:${port}`, requests, close: () => new Promise(r => server.close(() => r())) })
    })
  })
}

test('the real sitemap lists a profile only for a tutor who turned the public page on, with the www address and no other field', async () => {
  const db = await fakeDatabase([
    { slug: 'sarah-test', email: 'sarah@example.com', booking_url_active: true },
    { slug: 'hidden-hana', email: 'hana@example.com', booking_url_active: false },
    { slug: 'diego-prueba', email: 'diego@example.com', booking_url_active: true },
  ])
  const before = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }
  process.env.NEXT_PUBLIC_SUPABASE_URL = db.url
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-anon-key-for-test'
  try {
    const entries = await sitemap()
    const urls = entries.map(e => e.url)
    assert.ok(urls.includes(`${SITE_URL}/tutors/sarah-test`))
    assert.ok(urls.includes(`${SITE_URL}/tutors/diego-prueba`))
    assert.ok(!urls.some(u => u.includes('hidden-hana')), 'a profile that is switched off is in the sitemap')
    assert.equal(urls.filter(u => u.startsWith(`${SITE_URL}/tutors/`)).length, 2)
    assert.equal(new Set(urls).size, urls.length)
    assert.doesNotMatch(JSON.stringify(entries), EMAIL_IN_TEXT)
    // exactly one request, for the slug column only, filtered on the flag
    assert.equal(db.requests.length, 1, db.requests.join('\n'))
    const q = new URL(db.requests[0], 'http://localhost').searchParams
    assert.equal(q.get('select'), 'slug')
    assert.equal(q.get('booking_url_active'), 'eq.true')
    // the static pages and the posts are still there
    assert.ok(urls.includes(`${SITE_URL}/tutors`))
    assert.equal(urls.filter(u => u.startsWith(`${SITE_URL}/blog/`)).length, POSTS.length)
    // a profile carries no date: nothing records when it last changed
    assert.ok(entries.filter(e => e.url.startsWith(`${SITE_URL}/tutors/`)).every(e => e.lastModified === undefined))
  } finally {
    if (before.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = before.url
    if (before.key === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = before.key
    await db.close()
  }
})

test('with no database configured, or one that is down, the sitemap still lists the static pages and every post', async () => {
  const before = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }
  try {
    for (const [url, key] of [['', ''], ['http://127.0.0.1:9', 'k'], ['your_supabase_url', 'k']]) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = url
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = key
      const urls = (await sitemap()).map(e => e.url)
      assert.equal(urls.filter(u => u.startsWith(`${SITE_URL}/tutors/`)).length, 0, url)
      assert.equal(urls.filter(u => u.startsWith(`${SITE_URL}/blog/`)).length, POSTS.length, url)
      assert.ok(urls.includes(SITE_URL))
    }
  } finally {
    if (before.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = before.url
    if (before.key === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = before.key
  }
})

test('the profile page file uses the shared metadata and structured data, reads no email or phone, and marks up only a public profile', () => {
  const src = read('src/app/tutors/[slug]/page.tsx').replace(/^\s*\/\/.*$/gm, '')
  assert.match(src, /export async function generateMetadata/)
  assert.match(src, /tutorMetadata\(tutor\)/)
  assert.match(src, /tutorNotFoundMetadata\(\)/)
  assert.doesNotMatch(src, /\bcanonical\b|\balternates\b|title:\s*['"`]/, 'the page writes no title or canonical of its own')
  assert.match(src, /tutor\.booking_url_active && tutorJsonLd\(\{ \.\.\.tutor, reviews: shown \}\)/) // T-0765: the Person also carries the real public reviews
  assert.match(src, /jsonLdScript\(data\)/)
  const select = /\.select\('([^']+)'\)/.exec(src)![1]
  assert.doesNotMatch(select, /email|phone|tel/i, 'the profile query must not read contact details')
  assert.doesNotMatch(read('src/lib/tutor-sitemap.ts').replace(/^\s*\/\/.*$/gm, ''), /email|phone/i)
})

// ---- the blog: author and the real update date -----------------------------------------

test('every post has a valid update date that is never before its publish date nor in the future', () => {
  const today = new Date().toISOString().slice(0, 10)
  for (const p of POSTS) {
    assert.match(p.date, /^\d{4}-\d{2}-\d{2}$/, p.slug)
    if (p.updated !== undefined) {
      assert.match(p.updated, /^\d{4}-\d{2}-\d{2}$/, p.slug)
      assert.ok(p.updated >= p.date, `${p.slug}: updated is before it was published`)
      assert.ok(p.updated <= today, `${p.slug}: updated is in the future`)
    }
    const d = postDates(p)
    assert.ok(d.modified >= d.published, p.slug)
  }
  assert.deepEqual(postDates({ date: '2026-07-07' }), { published: '2026-07-07', modified: '2026-07-07' }, 'never edited: last updated the day it was published')
  assert.deepEqual(postDates({ date: '2026-07-07', updated: '2026-09-01' }), { published: '2026-07-07', modified: '2026-09-01' })
  assert.deepEqual(postDates({ date: '2026-07-07', updated: '2026-06-01' }), { published: '2026-07-07', modified: '2026-07-07' }, 'a date before publishing is ignored')
})

test('the structured data of every post names the author and holds datePublished and dateModified, and no email or phone', () => {
  for (const p of POSTS) {
    const [posting, crumbs] = blogPostJsonLd(p)
    assert.equal(posting['@type'], 'BlogPosting')
    assert.equal(posting.datePublished, p.date)
    assert.equal(posting.dateModified, postDates(p).modified)
    assert.ok(String(posting.dateModified) >= String(posting.datePublished))
    const author = posting.author as Record<string, unknown>
    assert.equal(author['@type'], 'Person')
    assert.equal(author.name, p.author)
    assert.ok(p.author.trim().length > 0)
    assert.equal(posting.mainEntityOfPage, `${SITE_URL}/blog/${p.slug}`)
    assert.equal(crumbs['@type'], 'BreadcrumbList')
    const text = JSON.stringify(blogPostJsonLd(p))
    assert.doesNotMatch(text, EMAIL_IN_TEXT, p.slug)
    assert.doesNotMatch(text, PHONE_IN_TEXT, p.slug)
    JSON.parse(jsonLdScript(posting))
  }
  // a post that was edited later says so
  const edited: Post = { ...POSTS[0], updated: '2026-09-15' }
  assert.equal(blogPostJsonLd(edited)[0].dateModified, '2026-09-15')
  assert.equal(blogPostJsonLd(edited)[0].datePublished, POSTS[0].date)
})

test('the post page shows the author and the date it was last updated, and the sitemap uses the same date', async () => {
  const src = read('src/app/blog/[slug]/page.tsx')
  assert.match(src, /By \{post\.author\}/)
  assert.match(src, /<time dateTime=\{dates\.modified\}>Updated \{formatPostDate\(dates\.modified\)\}<\/time>/)
  assert.match(src, /dates\.modified !== dates\.published &&/, 'a post that was edited also says when it was published')
  assert.match(src, /blogPostJsonLd\(post\)/)
  assert.match(src, /jsonLdScript\(s\)/)
  assert.equal(formatPostDate('2026-07-07'), 'July 7, 2026')
  const entries = await sitemap()
  for (const p of POSTS) {
    const e = entries.find(x => x.url === `${SITE_URL}/blog/${p.slug}`)!
    assert.equal(new Date(e.lastModified as Date).getTime(), new Date(postDates(p).modified + 'T00:00:00').getTime(), p.slug)
  }
  // a post that was edited after publishing: its edit date is the sitemap date, and the blog index follows the newest edit
  const first = POSTS[0]
  try {
    first.updated = '2026-12-24'
    const after = await sitemap()
    assert.equal(new Date(after.find(x => x.url === `${SITE_URL}/blog/${first.slug}`)!.lastModified as Date).getTime(), new Date('2026-12-24T00:00:00').getTime())
    assert.equal(new Date(after.find(x => x.url === `${SITE_URL}/blog`)!.lastModified as Date).getTime(), new Date('2026-12-24T00:00:00').getTime())
  } finally {
    delete first.updated
  }
})

test('self-check: the email and phone checks catch what they are meant to catch', () => {
  assert.match('write to ana@example.com', EMAIL_IN_TEXT)
  assert.match('call +34 600 123 456', PHONE_IN_TEXT)
  assert.match('call (555) 123-4567', PHONE_IN_TEXT)
  assert.match('call 555-123-4567', PHONE_IN_TEXT)
  assert.doesNotMatch('published 2026-07-07, 18-33% cut', PHONE_IN_TEXT)
})
