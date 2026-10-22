// Settings saves in four parts (main columns, currency, "Made with Tutafy", lesson lengths). The last two have columns that may not
// exist yet (migrations 018 and 021). The Reviewer found (T-0717) that a failed "Made with Tutafy" write returned early, so the
// lengths were never written while the saved copy already held them: the tutor was told "other settings are saved", reloaded the
// page and the new lengths were gone. These tests run the REAL function (src/lib/settings-save.ts) over a small stand-in of the
// tutors table that, like Postgres, refuses a column it does not have, and compare what the function says is saved with what the
// table really holds. The old order is kept below as `oldSave` to show the same check goes red on it.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { saveTutorSettings, BRANDING_NOT_AVAILABLE, type SettingsForm, type SettingsDb } from '@/lib/settings-save.ts'
import { LENGTHS_NEED_UPDATE, lengthSaveErrorMessage, durationColumnsToSave } from '@/lib/lesson-durations.ts'

const ME = '11111111-1111-4111-8111-111111111111'

const FORM: SettingsForm = {
  name: 'Tutor A', bio: '', timezone: 'UTC', cancellation_hours: 24, booking_url_active: true, buffer_minutes: 15,
  paypal_link: '', paddle_checkout_link: '', default_lesson_price: '40', contract_template: '', trial_enabled: false, trial_price: '',
  currency: 'USD', lesson_durations: [30, 45, 60, 90], default_lesson_duration: 60, hide_branding: false,
}
const loadedFrom = (f: SettingsForm) => JSON.stringify(f)

type Failure = { missing?: string[]; refuse?: (values: Record<string, unknown>) => { code?: string; message: string } | null; failMain?: boolean }

// The tutors table of one tutor. An update that names a column the table does not have is refused whole (42703), as Postgres does.
function tutorsTable(start: SettingsForm, failure: Failure = {}) {
  const row: Record<string, unknown> = { ...start }
  const calls: string[][] = []
  const where: string[] = []
  const db: SettingsDb = {
    from: () => ({
      update: (values) => ({
        eq: async (column, value) => {
          calls.push(Object.keys(values))
          where.push(`${column}=${value}`)
          const gone = Object.keys(values).find(k => failure.missing?.includes(k))
          if (gone) return { error: { code: '42703', message: `column "${gone}" of relation "tutors" does not exist` } }
          if (failure.failMain && 'name' in values) return { error: { code: '42501', message: 'permission denied' } }
          const refused = failure.refuse?.(values)
          if (refused) return { error: refused }
          if (value === ME) Object.assign(row, values)
          return { error: null }
        },
      }),
    }),
  }
  return { db, row, calls, where }
}

// What the page shows after a reload: the columns it reads back, and nothing else.
const reloaded = (row: Record<string, unknown>) => ({ lesson_durations: row.lesson_durations, default_lesson_duration: row.default_lesson_duration, hide_branding: row.hide_branding === true })
const saidSaved = (snapshot: string) => { const s = JSON.parse(snapshot); return { lesson_durations: s.lesson_durations, default_lesson_duration: s.default_lesson_duration, hide_branding: s.hide_branding === true } }

// The rule the Reviewer asked for: the saved copy never holds a value the table does not hold.
function assertSavedCopyIsTrue(snapshot: string, row: Record<string, unknown>) {
  assert.deepEqual(saidSaved(snapshot), reloaded(row), 'the saved copy equals what a reload would show')
}

const CHANGED: SettingsForm = { ...FORM, lesson_durations: [30, 60, 75], default_lesson_duration: 75, hide_branding: true }

test('the column hide_branding does not exist yet AND the lengths changed in the same save: the lengths are written, the saved copy holds them, the message is the plain one', async () => {
  const t = tutorsTable(FORM, { missing: ['hide_branding'] })
  const r = await saveTutorSettings(t.db, ME, CHANGED, loadedFrom(FORM), '')
  assert.equal(r.ok, false)
  assert.equal(r.ok === false && r.stage, 'optional')
  assert.equal(r.ok === false && r.message, BRANDING_NOT_AVAILABLE)
  assert.deepEqual(t.row.lesson_durations, [30, 60, 75], 'the new lengths reached the table')
  assert.equal(t.row.default_lesson_duration, 75)
  assert.notEqual(t.row.hide_branding, true, 'the switch did not')
  assertSavedCopyIsTrue(r.snapshot, t.row)
  assert.equal(saidSaved(r.snapshot).hide_branding, false, 'the bar stays for the switch only: the copy still says it is off')
  // a second Save, with nothing else touched, tries only the switch again and cannot lose the lengths
  const again = await saveTutorSettings(t.db, ME, CHANGED, r.snapshot, '')
  assert.equal(again.ok, false)
  assert.deepEqual(t.row.lesson_durations, [30, 60, 75])
})

test('when the column exists, one save with the switch and the lengths changed writes both, and the saved copy is the form', async () => {
  const t = tutorsTable(FORM)
  const r = await saveTutorSettings(t.db, ME, CHANGED, loadedFrom(FORM), '')
  assert.equal(r.ok, true)
  assert.deepEqual(reloaded(t.row), { lesson_durations: [30, 60, 75], default_lesson_duration: 75, hide_branding: true })
  assertSavedCopyIsTrue(r.snapshot, t.row)
  assert.equal(r.snapshot, JSON.stringify(CHANGED), 'everything written: the copy is the form')
})

test('the old order (switch first, early return) goes red on the same check', async () => {
  // the sequence as it was in the first version of T-0717, kept here only to prove the check above can fail
  async function oldSave(db: SettingsDb, form: SettingsForm, snapshot: string): Promise<{ snapshot: string }> {
    const { lesson_durations, default_lesson_duration, hide_branding } = form
    const before = JSON.parse(snapshot)
    if (hide_branding !== (before.hide_branding === true)) {
      const { error } = await db.from('tutors').update({ hide_branding }).eq('id', ME)
      if (error) return { snapshot: JSON.stringify({ ...form, hide_branding: before.hide_branding === true }) }
    }
    const columns = durationColumnsToSave({ durations: before.lesson_durations, defaultDuration: before.default_lesson_duration }, { durations: lesson_durations, defaultDuration: default_lesson_duration })
    if (columns) await db.from('tutors').update(columns).eq('id', ME)
    return { snapshot: JSON.stringify(form) }
  }
  const t = tutorsTable(FORM, { missing: ['hide_branding'] })
  const old = await oldSave(t.db, CHANGED, loadedFrom(FORM))
  assert.throws(() => assertSavedCopyIsTrue(old.snapshot, t.row), 'the copy held lengths the table never got')
})

test('the lengths are refused by the database check (custom length, migration 018 not rerun) AND the switch fails: both named, the main columns still saved', async () => {
  const t = tutorsTable(FORM, {
    missing: ['hide_branding'],
    refuse: v => ('lesson_durations' in v ? { code: '23514', message: 'new row for relation "tutors" violates check constraint "tutors_lesson_durations_valid"' } : null),
  })
  const r = await saveTutorSettings(t.db, ME, { ...CHANGED, name: 'New name' }, loadedFrom(FORM), '')
  assert.equal(r.ok, false)
  const message = r.ok === false ? r.message : ''
  assert.ok(message.startsWith(LENGTHS_NEED_UPDATE), 'the plain sentence about the lengths')
  assert.match(message, /"Made with Tutafy" option is not available yet\.$/, 'and the switch is named, not hidden behind "other settings are saved"')
  assert.equal(t.row.name, 'New name', 'the main columns were written')
  assert.deepEqual(reloaded(t.row), { lesson_durations: [30, 45, 60, 90], default_lesson_duration: 60, hide_branding: false })
  assertSavedCopyIsTrue(r.snapshot, t.row)
})

test('only the lengths fail (a network-type error): the switch is still written and kept, the lengths are not claimed', async () => {
  const t = tutorsTable(FORM, { refuse: v => ('lesson_durations' in v ? { message: 'fetch failed' } : null) })
  const r = await saveTutorSettings(t.db, ME, CHANGED, loadedFrom(FORM), '')
  assert.equal(r.ok, false)
  assert.equal(r.ok === false && r.message, lengthSaveErrorMessage({ message: 'fetch failed' }, { durations: [30, 60, 75], defaultDuration: 75 }))
  assert.equal(t.row.hide_branding, true, 'the switch was written although the lengths were not')
  assertSavedCopyIsTrue(r.snapshot, t.row)
})

test('the main update fails: nothing after it is tried and the saved copy is the one it was given', async () => {
  const t = tutorsTable(FORM, { failMain: true })
  const before = loadedFrom(FORM)
  const r = await saveTutorSettings(t.db, ME, { ...CHANGED, name: 'Other' }, before, '')
  assert.equal(r.ok, false)
  assert.equal(r.ok === false && r.stage, 'main')
  assert.equal(r.snapshot, before)
  assert.equal(t.calls.length, 1, 'only the main update was tried')
})

test('only what changed is written: no switch write when the switch is as saved, no length write when the lengths are as saved', async () => {
  const t = tutorsTable(FORM)
  const r = await saveTutorSettings(t.db, ME, { ...FORM, name: 'Renamed' }, loadedFrom(FORM), '')
  assert.equal(r.ok, true)
  assert.deepEqual(t.calls.map(c => c.includes('hide_branding') || c.includes('lesson_durations')), [false, false], 'main update and currency only')
  assert.ok(t.where.every(w => w === `id=${ME}`), 'every write names the signed-in tutor’s own row')
})
