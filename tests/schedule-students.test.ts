// T-1061: the Student box of Schedule Lesson. Two things are kept: (1) while an admin views a tutor, the box lists that tutor's students and
// never another tutor's (the page's read goes through the same view client rules as every dashboard read), and (2) a box with nothing to pick
// says why and where to go, instead of staying blank. The database is pretended; nothing is written anywhere.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { createViewClient } from '@/lib/supabase/view-client.ts'
import type { ViewFetch } from '@/lib/view-rest.ts'
import { emptyStudentNotice, loadStudentChoices } from '@/lib/schedule-students.ts'
import { StudentChoiceNotice } from '@/components/lessons/StudentChoiceNotice.tsx'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const KEY = 'service-key-for-tests'

type Student = { id: string; name: string; status: string; tutor_id: string }
const STUDENTS: Student[] = [
  { id: 'a1', name: 'Ada', status: 'active', tutor_id: A },
  { id: 'a2', name: 'Alan', status: 'paused', tutor_id: A },
  { id: 'b1', name: 'Bea', status: 'active', tutor_id: B },
  { id: 'b2', name: 'Ben', status: 'active', tutor_id: B },
]

/** A database that holds `rows` and honours EVERY `column=eq.value` filter of the request, like PostgREST (all filters must hold). */
function pretendDb(rows: Student[], opts: { fail?: boolean } = {}) {
  const seen: string[] = []
  const fetchImpl: ViewFetch = async (url) => {
    seen.push(url)
    if (opts.fail) return new Response(JSON.stringify({ message: 'boom' }), { status: 500, headers: { 'content-type': 'application/json' } })
    const u = new URL(url)
    let out = rows
    for (const [k, v] of u.searchParams) if (v.startsWith('eq.')) out = out.filter(r => String((r as Record<string, unknown>)[k]) === v.slice(3))
    return new Response(JSON.stringify(out), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  return { seen, fetchImpl }
}
const viewing = (tutor: string, db: ReturnType<typeof pretendDb>) =>
  createViewClient({ id: tutor, email: 'tutor@example.com' }, { url: 'https://db.example.invalid', serviceKey: KEY, fetchImpl: db.fetchImpl })

test('viewing tutor A, the box lists A\'s active students and none of B\'s', async () => {
  const db = pretendDb(STUDENTS)
  const c = await loadStudentChoices(viewing(A, db), A)
  assert.deepEqual(c, { kind: 'ready', students: [{ id: 'a1', name: 'Ada' }] })
  assert.ok(db.seen.every(u => u.includes(`tutor_id=eq.${A}`)), 'the read was narrowed to the viewed tutor')
})

test('viewing tutor B gives B\'s students; the two never mix', async () => {
  const db = pretendDb(STUDENTS)
  const c = await loadStudentChoices(viewing(B, db), B)
  assert.deepEqual(c, { kind: 'ready', students: [{ id: 'b1', name: 'Bea' }, { id: 'b2', name: 'Ben' }] })
})

test('even if the page asked for another tutor\'s id, a view of A returns nothing of B\'s', async () => {
  const db = pretendDb(STUDENTS)
  const c = await loadStudentChoices(viewing(A, db), B)
  assert.deepEqual(c, { kind: 'none' }, 'both filters must hold (tutor = A and tutor = B), so no row comes back')
})

test('a tutor with no students gets "none"; with only paused students gets "none-active" with the count', async () => {
  assert.deepEqual(await loadStudentChoices(viewing(A, pretendDb([])), A), { kind: 'none' })
  const paused = STUDENTS.filter(s => s.tutor_id === A).map(s => ({ ...s, status: s.id === 'a1' ? 'inactive' : 'paused' }))
  assert.deepEqual(await loadStudentChoices(viewing(A, pretendDb(paused)), A), { kind: 'none-active', total: 2 })
})

test('a failed read or no signed-in user is an error, never "no students"', async () => {
  assert.deepEqual(await loadStudentChoices(viewing(A, pretendDb(STUDENTS, { fail: true })), A), { kind: 'error' })
  assert.deepEqual(await loadStudentChoices(viewing(A, pretendDb(STUDENTS)), undefined), { kind: 'error' })
  assert.deepEqual(await loadStudentChoices(viewing(A, pretendDb(STUDENTS)), null), { kind: 'error' })
})

test('the notice: nothing when there are students; a sentence and a link when there are none', () => {
  assert.equal(emptyStudentNotice({ kind: 'ready', students: [{ id: 'a1', name: 'Ada' }] }), null)
  assert.equal(renderToStaticMarkup(createElement(StudentChoiceNotice, { choices: { kind: 'ready', students: [] } })), '')

  const none = renderToStaticMarkup(createElement(StudentChoiceNotice, { choices: { kind: 'none' } }))
  assert.match(none, /No students yet/)
  assert.match(none, /href="\/students\/new"[^>]*>Add a student</)

  const paused = renderToStaticMarkup(createElement(StudentChoiceNotice, { choices: { kind: 'none-active', total: 3 } }))
  assert.match(paused, /No active students/)
  assert.match(paused, /All 3 of your students/)
  assert.match(paused, /href="\/students"/)

  const err = renderToStaticMarkup(createElement(StudentChoiceNotice, { choices: { kind: 'error' } }))
  assert.match(err, /role="alert"/)
  assert.match(err, /could not load your students/)
  assert.doesNotMatch(err, /No students yet/, 'a failed read is not shown as an empty list')
})
