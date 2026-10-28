// T-0896: the public tutor pages ask the database for independent things at the same time, not one after the other, and the answers are the same.
// How it is shown: a pretend database whose reads only answer once every read that may run together has been STARTED. If the code still waited for
// one read before starting the next, the first read would wait for the others forever, give up after a moment, and the answer would be an error.
// What this file checks:
//   - loadFreeTimes (the free times of a profile) starts its three reads together, and a tutor with no weekly hours is still "none" when the other
//     two reads fail or the admin key is missing;
//   - loadDirectory starts the four reads of a group of tutors together and still throws when one of them fails;
//   - the profile page asks for the photo with high priority (it is the largest thing on a phone), and the directory card link has no aria-label
//     (its name is its own content), which is what the Lighthouse audit "label-content-name-mismatch" asks for.
// Nothing here touches a real database.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { loadFreeTimes, type ReadClient } from '@/lib/profile-data.ts'
import { loadDirectory, DirectoryReadError, type DirectoryClient } from '@/lib/directory-data.ts'
import { TutorCard } from '@/components/directory/TutorCard.tsx'
import type { DirectoryCard } from '@/lib/directory.ts'

const ROOT = path.resolve(import.meta.dirname, '..')
const NOW = new Date('2026-10-20T08:00:00.000Z')

/** A read that answers only when `needed` reads of its group have started; after 300 ms of waiting it answers with an error. */
function barrier(needed: number) {
  let started = 0
  const waiting: (() => void)[] = []
  return () => new Promise<boolean>(resolve => {
    started += 1
    if (started >= needed) { waiting.forEach(w => w()); resolve(true); return }
    waiting.push(() => resolve(true))
    setTimeout(() => resolve(false), 300)
  })
}

/** Any chain of filters, awaited (or ended with .range) at the end. */
function chain(answer: () => Promise<{ data: unknown; error: unknown }>, endsWith?: string): unknown {
  const q: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') { if (endsWith) return undefined; const p = answer(); return p.then.bind(p) }
      if (prop === endsWith) return () => answer()
      return () => q
    },
  })
  return q
}

const EVERYDAY = [0, 1, 2, 3, 4, 5, 6].map(d => ({ day_of_week: d, start_time: '09:00', end_time: '11:00' }))
const TUTOR = { id: 'T1', timezone: 'UTC', buffer_minutes: 0 }

test('loadFreeTimes starts the hours, the blocked days and the lessons together', async () => {
  const together = barrier(3)
  const read = (data: unknown) => () => together().then(ok => (ok ? { data, error: null } : { data: null, error: { message: 'a read waited for another' } }))
  const client = {
    from: (table: string) => ({
      select: () => chain(read(table === 'availability' ? EVERYDAY : []), undefined),
    }),
  } as unknown as ReadClient
  const out = await loadFreeTimes(client, () => client, TUTOR, 60, NOW)
  assert.equal(out.state, 'ok', 'the three reads were all in flight at once')
  assert.ok(out.slots.length > 0)
})

test('loadFreeTimes: no weekly hours is "none" even when the other two reads fail or the admin key is missing', async () => {
  const unhandled: unknown[] = []
  const onUnhandled = (e: unknown) => unhandled.push(e)
  process.on('unhandledRejection', onUnhandled)
  try {
    const noHours = { from: () => ({ select: () => chain(async () => ({ data: [], error: null }), undefined) }) } as unknown as ReadClient
    const failing = { from: () => ({ select: () => chain(async () => { throw new Error('boom') }, undefined) }) } as unknown as ReadClient
    assert.deepEqual(await loadFreeTimes(noHours, () => failing, TUTOR, 60, NOW), { slots: [], state: 'none' })
    assert.deepEqual(await loadFreeTimes(noHours, () => { throw new Error('no key') }, TUTOR, 60, NOW), { slots: [], state: 'none' })
    await new Promise(r => setTimeout(r, 20))
    assert.deepEqual(unhandled, [], 'a read that was never judged leaves no unhandled rejection')
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
})

const BIO = 'I teach English to adults and children, one to one, with a plan for every lesson and clear homework.'
function directoryDb(failTable?: string) {
  const together = barrier(4)
  const row = { id: 't1', slug: 'ana-torres', name: 'Ana Torres', bio: BIO, avatar_url: null, languages: ['English'], timezone: 'UTC', booking_url_active: true, average_rating: 0, review_count: 0, default_lesson_price: 20, currency: 'USD', trial_enabled: false, trial_price: null, buffer_minutes: 0 }
  const follow = (data: unknown, table: string) => () => together().then(ok => (ok && table !== failTable ? { data, error: null } : { data: null, error: { message: 'failed' } }))
  return {
    from: (table: string) => ({
      select: (cols: string) => {
        if (table === 'availability') return chain(async () => ({ data: EVERYDAY.map(h => ({ ...h, tutor_id: 't1' })), error: null }), 'range')
        if (table === 'tutors' && cols.startsWith('id, slug')) return chain(async () => ({ data: [row], error: null }), 'range')
        return chain(follow([], table), 'range')
      },
    }),
  } as unknown as DirectoryClient
}

test('loadDirectory starts the four reads of a group of tutors together', async () => {
  const out = await loadDirectory(directoryDb(), NOW)
  assert.equal(out.listed, 1, 'the tutor was read and counted')
})

test('loadDirectory still throws when one of the four reads fails', async () => {
  await assert.rejects(() => loadDirectory(directoryDb('lessons'), NOW), (e: unknown) => e instanceof DirectoryReadError)
})

test('the directory card link has no aria-label that could disagree with what it shows: its name is its own content', () => {
  const card = { slug: 'ana', name: 'Ana Torres', photo: null, languages: ['English'], headline: 'Hello', rating: null, reviews: 0, price: 20, currency: 'USD', trialPrice: 5, tz: 'UTC', levels: [], groups: [], complete: 1, slots: [Math.floor((NOW.getTime() + 86400000) / 60000)] } as unknown as DirectoryCard
  const html = renderToStaticMarkup(createElement(TutorCard, { card, zone: 'UTC', viewerZone: null, now: NOW }))
  const link = html.match(/<a [^>]*href="\/tutors\/ana"[^>]*>([\s\S]*?)<\/a>/)!
  assert.doesNotMatch(link[0], /aria-label/, 'a label on the link is what the audit "label-content-name-mismatch" failed on')
  assert.match(link[1], /<span class="sr-only">View Ana Torres(&#x27;|')s profile<\/span>/, 'the profile sentence is part of the content')
  assert.match(link[1], /<div aria-hidden="true" data-testid="card-monogram"/, 'the initials are decoration')
  assert.match(link[1], /data-testid="card-trial"[^>]*>.*30-min trial \$5/, 'the trial badge is visible and read')
})

test('the profile photo is asked for with high priority', () => {
  const page = readFileSync(path.join(ROOT, 'src', 'app', 'tutors', '[slug]', 'page.tsx'), 'utf8')
  assert.match(page, /<img src=\{photo\}[^>]*fetchPriority="high"[^>]*data-testid="profile-photo"/)
})
