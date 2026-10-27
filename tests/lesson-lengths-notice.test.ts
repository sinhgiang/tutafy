// While the owner has NOT yet run migration 018 again on the real database, that database still has the first version's checks
// (30, 45, 60 and 90 only). This file shows what a tutor then sees and what the code does: the Settings page says one plain sentence
// instead of the database's own words, the rest of Settings is saved, nothing is half-written, and the pages and the booking
// route keep working. The "real database" is the first version of 018 on a throwaway in-memory Postgres (PGlite).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, newDb } from './support/local-db.ts'
import { LENGTHS_NEED_UPDATE, isLengthCheckRefusal, lengthSaveErrorMessage, durationColumnsToSave, resolveDurationConfig, addCustomDuration } from '@/lib/lesson-durations.ts'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const AS_APPLIED = readFileSync(path.join(HERE, 'support', '018-as-applied.sql'), 'utf8')
const A = '11111111-1111-4111-8111-111111111111'

async function realDatabaseToday(): Promise<PGlite> {
  const db = await newDb()
  await applyMigrationsBefore(db, '018_lesson_durations.sql')
  await db.exec(`
    insert into auth.users (id, email) values ('${A}', 'a@example.com');
    insert into public.tutors (id, email, name, slug, booking_url_active) values ('${A}', 'a@example.com', 'Tutor A', 'tutor-a', true);
  `)
  await db.exec(AS_APPLIED)
  return db
}
const row = async (db: PGlite) => (await db.query<{ lesson_durations: number[] | null; default_lesson_duration: number | null; name: string }>(
  `select lesson_durations, default_lesson_duration, name from public.tutors where id = '${A}'`)).rows[0]

test('the sentence is one plain line: custom lengths are not available yet, try again later, the rest is saved', () => {
  assert.equal(LENGTHS_NEED_UPDATE, 'Custom lengths are not available yet, try again later. Your other settings are saved.')
})

test('with the first version of 018 on the database, saving a length of the tutor’s own is refused, and Settings says the plain sentence', async () => {
  const db = await realDatabaseToday()
  // what Settings does: change the lengths, write the columns the clean-up gives
  const typed = addCustomDuration(resolveDurationConfig(null, null), '75')
  assert.equal(typed.error, null)
  const columns = durationColumnsToSave(resolveDurationConfig(null, null), typed.config)!
  let refusal: unknown
  try { await db.exec(`update public.tutors set lesson_durations = array[${columns.lesson_durations.join(', ')}], default_lesson_duration = ${columns.default_lesson_duration} where id = '${A}'`) } catch (e) { refusal = e }
  assert.ok(refusal, 'the database refused')
  assert.equal(isLengthCheckRefusal(refusal), true)
  const said = lengthSaveErrorMessage(refusal, { durations: columns.lesson_durations, defaultDuration: columns.default_lesson_duration })
  assert.equal(said, LENGTHS_NEED_UPDATE)
  assert.doesNotMatch(said, /violates|constraint|tutors_lesson|row for relation/, 'the database’s own words never reach the tutor')
  // nothing was half-written
  assert.deepEqual(await row(db), { lesson_durations: null, default_lesson_duration: null, name: 'Tutor A' })
})

test('the same save with only the four ordinary lengths still works on that database, so ordinary use is not broken', async () => {
  const db = await realDatabaseToday()
  await db.exec(`update public.tutors set lesson_durations = array[30, 60, 90], default_lesson_duration = 60 where id = '${A}'`)
  assert.deepEqual((await row(db)).lesson_durations, [30, 60, 90])
})

test('any other refusal keeps the database’s message with the note that the rest is saved; a Supabase-shaped error is read too', () => {
  const custom = { durations: [75], defaultDuration: 75 }
  assert.equal(lengthSaveErrorMessage({ code: '23514', message: 'new row for relation "tutors" violates check constraint "tutors_default_lesson_duration_valid"' }, custom), LENGTHS_NEED_UPDATE)
  assert.equal(lengthSaveErrorMessage({ code: '23514', message: 'violates check constraint "tutors_lesson_durations_valid"' }, custom), LENGTHS_NEED_UPDATE)
  assert.equal(lengthSaveErrorMessage({ message: 'network down' }, custom), 'Your other settings are saved, but your lesson lengths were not: network down')
  assert.match(lengthSaveErrorMessage({ code: '23514', message: 'violates check constraint "some_other_check"' }, custom), /^Your other settings are saved, but your lesson lengths were not:/)
  // ordinary lengths and a refusal: not this sentence, because running 018 again would not help
  assert.match(lengthSaveErrorMessage({ code: '23514', message: 'violates check constraint "tutors_lesson_durations_valid"' }, { durations: [30, 60], defaultDuration: 60 }), /^Your other settings are saved, but your lesson lengths were not:/)
  assert.equal(lengthSaveErrorMessage(null, custom), 'Your other settings are saved, but your lesson lengths were not: unknown error')
  assert.equal(isLengthCheckRefusal(null), false)
})

test('Settings uses the sentence, saves the rest first, keeps the save bar for the lengths, and does not break the page', () => {
  // the writes moved to src/lib/settings-save.ts (T-0717 follow-up); the page calls them and keeps the bar when a part failed
  const settings = readFileSync(path.join(HERE, '..', 'src', 'app', '(dashboard)', 'settings', 'page.tsx'), 'utf8').replace(/\r\n/g, '\n')
  const save = readFileSync(path.join(HERE, '..', 'src', 'lib', 'settings-save.ts'), 'utf8').replace(/\r\n/g, '\n')
  assert.match(save, /lengthMessage = lengthSaveErrorMessage\(lengthError, \{ durations: lesson_durations, defaultDuration: default_lesson_duration \}\)/)
  assert.doesNotMatch(save, /lesson lengths were not: ' \+ lengthError\.message/, 'no bare database message')
  // the main update is written before the lengths; a lengths error keeps the OLD lengths in the saved copy (the bar stays)
  assert.ok(save.indexOf(".update({\n    ...rest,") > 0 && save.indexOf(".update({\n    ...rest,") < save.indexOf('if (lengthError) {'))
  assert.match(save, /if \(lengthError\) \{\n      saved\.lesson_durations = before\?\.lesson_durations \?\? form\.lesson_durations/)
  const handle = settings.slice(settings.indexOf('async function handleSave()'))
  assert.ok(handle.indexOf('setSavedSnapshot(result.snapshot)') > 0 && handle.indexOf('setSavedSnapshot(result.snapshot)') < handle.indexOf("toast.success('Settings saved!')"))
  // the pages read the two columns apart from the rest and treat a failed read as "chose nothing"
  assert.match(readFileSync(path.join(HERE, '..', 'src', 'lib', 'lesson-durations.ts'), 'utf8'), /if \(error \|\| !data\) return \{ lesson_durations: null, default_lesson_duration: null \}/)
})
