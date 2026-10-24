// T-0898: the two limits of the review routes hold whatever the caller makes up (src/lib/rate-limit-memory.ts, checked by tests/support/rate-limit-check.ts).
// Each route counts ALL its calls together (per server instance), so a made-up address, link, lesson id or body field cannot get round it. In a file of
// its own because the check calls each route 301 and 121 times in this process.
import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createFakeDb } from './support/fake-db.ts'
import { assertRateLimitHolds } from './support/rate-limit-check.ts'

const SRC = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'src')
const db = createFakeDb({ students: [], lessons: [], reviews: [], tutors: [] })
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: { createAdminClient: () => db, createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: null } }) } }) },
})
process.env.REVIEWS_FLOW = 'on'
const flowRoute = await import('@/app/api/reviews/flow/route.ts')
const stopRoute = await import('@/app/api/reviews/flow/stop/route.ts')

test('/api/reviews/flow: at most 300 calls in 10 minutes for the whole server instance, whatever link, lesson or review the caller makes up', async () => {
  const r = await assertRateLimitHolds({
    routeFile: 'app/api/reviews/flow/route.ts',
    limiter: 'limiter',
    fixed: [
      { kind: 'body', name: 'rating', reason: 'the limit counts a call before the body is read; the rating only has to be a valid one for the call to go on to the database' },
      { kind: 'body', name: 'tags', reason: 'an empty list is the one valid value that needs no choice; the limit is counted before it is read' },
    ],
    call: v => flowRoute.POST(v.request({ url: 'http://localhost/api/reviews/flow', method: 'POST', body: { portal_token: v.uuid(), lesson_id: v.uuid(), rating: 5, tags: [], comment: v.text() } })),
  })
  assert.equal(r.limit, 300)
})

test('/api/reviews/flow/stop: at most 120 calls in 10 minutes for the whole server instance, whatever link or lesson the caller makes up', async () => {
  const r = await assertRateLimitHolds({
    routeFile: 'app/api/reviews/flow/stop/route.ts',
    limiter: 'limiter',
    call: v => stopRoute.POST(v.request({ url: 'http://localhost/api/reviews/flow/stop', method: 'POST', body: { portal_token: v.uuid(), lesson_id: v.uuid() } })),
  })
  assert.equal(r.limit, 120)
})
