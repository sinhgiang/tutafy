// T-0844: the Availability grid you press and drag on, and the Settings page split into sections. The pure rules (what a drag, a press
// or an edge drag means, and the overlap rule for a changed slot), the real components drawn to HTML, the page's writes (the tutor id is in
// every statement), and the database's own row level security for each statement the page makes, on a Postgres built from every migration
// with a second tutor trying them on the first tutor's slots. Pointer drags in a real browser were checked by hand (see the status file).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, newDb } from './support/local-db.ts'
import {
  DAYS, DRAG_THRESHOLD_PX, GRID_HOUR_PX, SNAP_MIN, checkEditedSlot, dragToSlot, firstFreeSlot, minutesToTime, pressToSlot, resizeTo, timeChoices, yToMinutes, type Slot,
} from '@/lib/availability-grid'
import { WeekGrid } from '@/components/availability/WeekGrid'
import { SlotDialog } from '@/components/availability/SlotDialog'
import { SectionHead } from '@/components/settings/sections/SectionHead'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

const R = { from: 6, to: 22 }
const slot = (id: string, day: number, a: string, b: string): Slot => ({ id, day_of_week: day, start_time: a, end_time: b })
const y = (hour: number) => (hour - R.from) * GRID_HOUR_PX // pixels down a day column for an hour

// ---- what a drag, a press and an edge drag mean --------------------------------------------------------------------------------------

test('minutes and pixels: a half hour is 20 pixels and "24:00" is the end of the day', () => {
  assert.equal(minutesToTime(570), '09:30')
  assert.equal(minutesToTime(1440), '24:00')
  assert.equal(minutesToTime(-5), '00:00')
  assert.equal(minutesToTime(5000), '24:00')
  assert.equal(yToMinutes(0, 6), 360)
  assert.equal(yToMinutes(y(9.5), 6), 570)
  assert.equal(SNAP_MIN, 30)
  assert.ok(DRAG_THRESHOLD_PX >= 4)
})

test('a drag draws from the half hour under its upper end to the half hour under its lower end, up or down alike', () => {
  assert.deepEqual(dragToSlot(2, y(10) + 4, y(12) - 1, R), { day_of_week: 2, start_time: '10:00', end_time: '12:00' })
  assert.deepEqual(dragToSlot(2, y(12) - 1, y(10) + 4, R), { day_of_week: 2, start_time: '10:00', end_time: '12:00' }, 'dragged upwards')
  assert.deepEqual(dragToSlot(1, y(9.5) + 3, y(9.5) + 9, R), { day_of_week: 1, start_time: '09:30', end_time: '10:00' }, 'a short drag is one half hour, never less')
  assert.deepEqual(dragToSlot(3, y(6) - 50, y(7), R), { day_of_week: 3, start_time: '06:00', end_time: '07:00' }, 'above the grid is its first hour')
  assert.deepEqual(dragToSlot(3, y(21), y(22) + 90, R), { day_of_week: 3, start_time: '21:00', end_time: '22:00' }, 'below the grid ends at its last hour')
  assert.deepEqual(dragToSlot(3, y(22) + 100, y(22) + 140, R), { day_of_week: 3, start_time: '21:30', end_time: '22:00' }, 'all below the grid still leaves a half hour')
  assert.equal(dragToSlot(9, 0, 100, R), null)
  assert.equal(dragToSlot(-1, 0, 100, R), null)
})

test('a press proposes an hour from the half hour pressed, cut short by the next slot or the end of the grid, and nothing on a slot', () => {
  const have = [slot('a', 1, '09:00', '12:00'), slot('b', 1, '14:00', '15:00'), slot('c', 2, '08:00', '09:00')]
  assert.deepEqual(pressToSlot(have, 1, y(12) + 14, R), { day_of_week: 1, start_time: '12:00', end_time: '13:00' }, 'floor to the half hour (12:20 is 12:00)')
  assert.deepEqual(pressToSlot(have, 1, y(13.5) + 2, R), { day_of_week: 1, start_time: '13:30', end_time: '14:00' }, 'cut short where the 14:00 slot starts')
  assert.equal(pressToSlot(have, 1, y(10), R), null, 'on a slot')
  assert.equal(pressToSlot(have, 1, y(9), R), null, 'a slot starts exactly there')
  assert.deepEqual(pressToSlot(have, 1, y(12), R), { day_of_week: 1, start_time: '12:00', end_time: '13:00' }, 'a slot that ends there leaves it free')
  assert.deepEqual(pressToSlot(have, 3, y(21.5) + 1, R), { day_of_week: 3, start_time: '21:30', end_time: '22:00' }, 'cut short by the end of the grid')
  assert.equal(pressToSlot(have, 3, y(22) + 5, R), null, 'below the grid')
  assert.equal(pressToSlot(have, 8, 10, R), null)
  assert.deepEqual(pressToSlot(have, 2, y(8) - 40, R), { day_of_week: 2, start_time: '07:00', end_time: '08:00' }, 'cut short by the 08:00 slot')
})

test('"add a slot on Monday" from the keyboard: the first free hour from 09:00, else the first free half hour', () => {
  assert.deepEqual(firstFreeSlot([], 1, R), { day_of_week: 1, start_time: '09:00', end_time: '10:00' })
  assert.deepEqual(firstFreeSlot([slot('a', 1, '09:00', '12:00')], 1, R), { day_of_week: 1, start_time: '12:00', end_time: '13:00' })
  assert.deepEqual(firstFreeSlot([slot('a', 1, '06:00', '21:30')], 1, R), { day_of_week: 1, start_time: '21:30', end_time: '22:00' })
  assert.equal(firstFreeSlot([slot('a', 1, '06:00', '22:00')], 1, R), null, 'a full day has no room')
  assert.deepEqual(firstFreeSlot([slot('a', 1, '09:00', '22:00')], 1, R), { day_of_week: 1, start_time: '06:00', end_time: '07:00' }, 'before 09:00 when the rest of the day is taken')
  assert.deepEqual(firstFreeSlot([slot('a', 1, '06:30', '22:00')], 1, R), { day_of_week: 1, start_time: '06:00', end_time: '06:30' }, 'a half hour when no hour fits')
})

test('changing a slot: its own old place is not an overlap, another slot is, and the same rules as a new slot apply', () => {
  const have = [slot('a', 1, '09:00', '12:00'), slot('b', 1, '13:00', '15:00')]
  assert.equal(checkEditedSlot(have, 'a', { day_of_week: 1, start_time: '09:00', end_time: '12:30' }), null, 'longer over its own time')
  assert.equal(checkEditedSlot(have, 'a', { day_of_week: 1, start_time: '10:00', end_time: '11:00' }), null, 'shorter')
  assert.match(checkEditedSlot(have, 'a', { day_of_week: 1, start_time: '09:00', end_time: '13:30' })!, /overlaps a slot you already have on Monday/)
  assert.equal(checkEditedSlot(have, 'a', { day_of_week: 2, start_time: '13:00', end_time: '15:00' }), null, 'moved to another day with room')
  assert.match(checkEditedSlot(have, 'a', { day_of_week: 1, start_time: '12:00', end_time: '12:00' })!, /End time must be after/)
  assert.match(checkEditedSlot(have, 'a', { day_of_week: 12, start_time: '10:00', end_time: '11:00' })!, /Choose a day/)
})

test('an edge dragged: the end or the start moves to the half hour under the pointer, never closer than a half hour to the other edge', () => {
  const s = slot('a', 1, '09:00', '12:00')
  assert.deepEqual(resizeTo(s, 'end', y(14) + 3, R), { day_of_week: 1, start_time: '09:00', end_time: '14:00' })
  assert.deepEqual(resizeTo(s, 'end', y(9), R), { day_of_week: 1, start_time: '09:00', end_time: '09:30' }, 'cannot pass the start')
  assert.deepEqual(resizeTo(s, 'start', y(7.5) + 2, R), { day_of_week: 1, start_time: '07:30', end_time: '12:00' })
  assert.deepEqual(resizeTo(s, 'start', y(15), R), { day_of_week: 1, start_time: '11:30', end_time: '12:00' }, 'cannot pass the end')
  assert.deepEqual(resizeTo(s, 'end', y(30), R), { day_of_week: 1, start_time: '09:00', end_time: '22:00' }, 'stops at the end of the grid')
  assert.deepEqual(resizeTo(slot('b', 1, '09:00', '23:00'), 'end', y(10), R), { day_of_week: 1, start_time: '09:00', end_time: '10:00' }, 'a slot already past the grid can be shortened')
})

test('the time lists: every half hour, 24:00 only as an end, and a time a slot already has that is not on the half hour', () => {
  const starts = timeChoices()
  assert.equal(starts.length, 48)
  assert.deepEqual([starts[0], starts[1], starts[47]], ['00:00', '00:30', '23:30'])
  assert.ok(!starts.includes('24:00'))
  assert.ok(timeChoices([], true).includes('24:00'))
  assert.deepEqual(timeChoices(['09:15']).slice(18, 21), ['09:00', '09:15', '09:30'], 'an odd saved time stays selectable, in order')
  assert.ok(!timeChoices(['xx:yy']).includes('xx:yy'))
})

// ---- the components, drawn ---------------------------------------------------------------------------------------------------------------------

const noop = () => {}
const grid = (slots: Slot[], busy = false) => renderToStaticMarkup(createElement(WeekGrid, { slots, busy, onDraw: noop, onOpen: noop, onResize: noop, onRemove: noop, onProblem: noop }))

test('the grid: a button for every day name and every slot, a way to remove each slot, seven live columns', () => {
  const html = grid([slot('a', 1, '09:00:00', '12:00:00'), slot('b', 3, '14:00', '15:30')])
  for (const d of DAYS) assert.match(html, new RegExp(`aria-label="Add a slot on ${d}"`), d)
  assert.match(html, /aria-label="Change Monday 09:00 to 12:00"/)
  assert.match(html, /aria-label="Remove Monday 09:00 to 12:00"/) // shown on hover or focus; the form has a Remove button for touch
  assert.match(html, /aria-label="Change Wednesday 14:00 to 15:30"/)
  assert.equal((html.match(/class="av-col is-live"/g) ?? []).length, 7)
  assert.equal((html.match(/data-testid="av-slot"/g) ?? []).length, 2)
  assert.equal((html.match(/av-grip-start/g) ?? []).length, 2)
  assert.equal((html.match(/av-grip-end/g) ?? []).length, 2)
  assert.match(html, /09:00–12:00/, 'the block shows its times compactly')
  assert.equal((grid([]).match(/data-testid="av-slot"/g) ?? []).length, 0, 'an empty week still draws the grid to press on')
  assert.equal((grid([], true).match(/aria-label="Add a slot on Sunday"[^>]*disabled|disabled=""[^>]*aria-label="Add a slot on Sunday"/g) ?? []).length, 1, 'day buttons wait while a save is running')
})

test('the grid code: a mouse drag, a press that opens the form, edge handles, and touch left to scrolling', () => {
  const src = read('src/components/availability/WeekGrid.tsx')
  assert.match(src, /e\.pointerType === 'touch'/, 'a finger drag scrolls the grid; a tap is a press')
  assert.match(src, /setPointerCapture/)
  assert.match(src, /dragToSlot\(/)
  assert.match(src, /pressToSlot\(/)
  assert.match(src, /resizeTo\(/)
  assert.match(src, /checkNewSlot\(slots, slot\)/, 'a drawn slot is checked for overlap before it is added')
  assert.match(src, /checkEditedSlot\(slots, slot\.id, next\)/, 'a resized slot too')
  assert.match(src, /justDragged/, 'the click that ends a drag is not taken for a press')
  assert.match(read('src/styles/dashboard-shell.css'), /\.av-col\.is-live \{[^}]*touch-action: pan-x pan-y/, 'the column does not capture touch scrolling')
})

test('the slot form: a native dialog (Esc, Tab kept inside) with day, from and to, and Remove only for a slot that exists', () => {
  const props = { slots: [slot('a', 1, '09:00', '12:00')], busy: false, onSave: noop, onRemove: noop, onClose: noop }
  const add = renderToStaticMarkup(createElement(SlotDialog, { ...props, form: { mode: 'new', slot: { day_of_week: 2, start_time: '10:00', end_time: '11:00' } } }))
  assert.match(add, /<dialog[^>]*aria-labelledby="slot-dialog-title"/)
  assert.match(add, />Add a weekly slot</)
  assert.match(add, /Add slot/)
  assert.doesNotMatch(add, /Remove/)
  assert.match(add, /<option value="2" selected="">Tuesday<\/option>/)
  const edit = renderToStaticMarkup(createElement(SlotDialog, { ...props, form: { mode: 'edit', slot: slot('a', 1, '09:00:00', '12:00:00') } }))
  assert.match(edit, />Change this slot</)
  assert.match(edit, /Save changes/)
  assert.match(edit, /Remove/)
  assert.match(edit, /<option selected="">09:00<\/option>|<option value="09:00" selected="">09:00<\/option>/)
  assert.match(read('src/components/availability/SlotDialog.tsx'), /showModal\(\)/)
  assert.match(read('src/components/availability/SlotDialog.tsx'), /checkEditedSlot\(slots, id, next\)/)
})

// ---- the page's writes ----------------------------------------------------------------------------------------------------------------------

test('the Availability page: every write carries the signed-in tutor, every way of adding goes through one overlap check, and a refused change is said in words', () => {
  const src = read('src/app/(dashboard)/availability/page.tsx')
  assert.match(src, /insert\(\{ tutor_id: user\.id, \.\.\.add \}\)/)
  assert.match(src, /\.update\(next\)\.eq\('id', id\)\.eq\('tutor_id', user\.id\)\.select\(\)/, 'a change names the tutor in the same statement')
  assert.match(src, /\.delete\(\)\.eq\('id', id\)\.eq\('tutor_id', user\.id\)\.select\('id'\)/, 'a removal too')
  assert.match(src, /const problem = checkNewSlot\(slots, add\)/)
  assert.match(src, /const problem = checkEditedSlot\(slots, id, next\)/)
  assert.match(src, /We could not change that slot/)
  assert.match(src, /We could not remove that slot/)
  assert.match(src, /<WeekGrid/)
  assert.match(src, /<SlotDialog/)
  assert.match(src, /onDraw=\{add => \{ void createSlot\(add\) \}\}/, 'a drawn slot is added by the same function as the form')
})

// ---- the database's own locks for each statement the page makes ---------------------------------------------------------------------------

const A = '95000000-0000-4000-8000-00000000000a'
const B = '95000000-0000-4000-8000-00000000000b'
async function as<T>(pg: PGlite, userId: string, fn: () => Promise<T>): Promise<T> {
  await pg.exec('set role authenticated')
  await pg.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId])
  try { return await fn() } finally { await pg.exec('reset role'); await pg.query(`select set_config('request.jwt.claim.sub', '', false)`) }
}
const denied = async (fn: () => Promise<unknown>) => { try { await fn(); return false } catch (e) { return /row-level security|permission denied/i.test((e as Error).message) } }

test('RLS: the exact statements of the grid (add, change times, change day, remove) work on a tutor\'s own slot and find or allow nothing on another tutor\'s', async () => {
  const pg = await newDb()
  await applyMigrationsBefore(pg, 'zzz_after_everything.sql')
  for (const [id, slug] of [[A, 'tutor-a'], [B, 'tutor-b']]) {
    await pg.query(`insert into auth.users (id, email) values ($1, $2)`, [id, `${slug}@example.com`])
    await pg.query(`insert into public.tutors (id, name, email, slug) values ($1, $2, $3, $4)`, [id, `Tutor ${slug}`, `${slug}@example.com`, slug])
  }
  const a = await pg.query<{ id: string }>(`insert into public.availability (tutor_id, day_of_week, start_time, end_time) values ($1, 1, '09:00', '12:00') returning id`, [A])
  const aId = a.rows[0].id
  const snapshot = async () => (await pg.query<{ tutor_id: string; day_of_week: number; start_time: string; end_time: string }>(`select tutor_id, day_of_week, start_time::text, end_time::text from public.availability order by id`)).rows

  // tutor B, with the page's own statements (id and tutor_id in the same statement), on A's slot: nothing matches
  const change = await as(pg, B, () => pg.query(`update public.availability set day_of_week = 2, start_time = '10:00', end_time = '23:00' where id = $1 and tutor_id = $2 returning id`, [aId, B]))
  assert.equal(change.rows.length, 0, 'change times or day of A\'s slot as B (the page would say "could not change")')
  const remove = await as(pg, B, () => pg.query(`delete from public.availability where id = $1 and tutor_id = $2 returning id`, [aId, B]))
  assert.equal(remove.rows.length, 0, 'remove A\'s slot as B')
  // and without the tutor_id the page adds, the database alone still finds nothing (the second lock)
  assert.equal(await as(pg, B, () => pg.query(`update public.availability set end_time = '23:00' where id = $1`, [aId])).then(r => r.affectedRows), 0, 'update by id only')
  assert.equal(await as(pg, B, () => pg.query(`delete from public.availability where id = $1`, [aId])).then(r => r.affectedRows), 0, 'delete by id only')
  // a slot cannot be handed to another tutor, nor drawn for one
  assert.equal(await as(pg, A, () => denied(() => pg.query(`update public.availability set tutor_id = $2 where id = $1`, [aId, B]))), true, 'A cannot give a slot to B')
  assert.equal(await as(pg, B, () => denied(() => pg.query(`insert into public.availability (tutor_id, day_of_week, start_time, end_time) values ($1, 4, '08:00', '09:00')`, [A]))), true, 'B cannot draw a slot for A')
  assert.deepEqual(await snapshot(), [{ tutor_id: A, day_of_week: 1, start_time: '09:00:00', end_time: '12:00:00' }], 'A\'s slot is exactly as it was')

  // the same statements on the tutor\'s own slot work (so the refusals are the policy, not a broken test)
  const own = await as(pg, A, () => pg.query(`update public.availability set day_of_week = 2, start_time = '10:00', end_time = '13:30' where id = $1 and tutor_id = $2 returning id`, [aId, A]))
  assert.equal(own.rows.length, 1)
  assert.equal(await as(pg, A, () => pg.query(`insert into public.availability (tutor_id, day_of_week, start_time, end_time) values ($1, 4, '08:00', '24:00') returning id`, [A])).then(r => r.rows.length), 1, 'a slot to the end of the day (24:00) is accepted')
  assert.equal(await as(pg, A, () => pg.query(`delete from public.availability where id = $1 and tutor_id = $2 returning id`, [aId, A])).then(r => r.rows.length), 1)
  assert.deepEqual((await snapshot()).map(r => [r.day_of_week, r.end_time]), [[4, '24:00:00']])
})

// ---- Settings, split into sections --------------------------------------------------------------------------------------------------------

test('Settings: six sections, each its own file with a head, loaded the first time it is opened; the values stay in the page', () => {
  const page = read('src/app/(dashboard)/settings/page.tsx')
  const ids = ['Profile', 'Booking', 'Payments', 'Extras', 'Integrations', 'Plan']
  for (const n of ids) {
    assert.match(page, new RegExp(`const ${n}Section = dynamic\\(\\(\\) => import\\('@/components/settings/sections/${n}Section'\\)`), n)
    assert.match(page, new RegExp(`<${n}Section ctx=\\{ctx\\} />`), n)
    const file = read(`src/components/settings/sections/${n}Section.tsx`)
    assert.match(file, /<SectionHead title=/, `${n} starts with its head`)
    assert.match(file, /ctx: SettingsCtx/)
    assert.doesNotMatch(file, /useState\(/, `${n} keeps no state of its own: what is typed lives in the page`)
  }
  assert.ok(page.split('\n').length < 330, 'the page is no longer 800 lines')
  assert.match(page, /useState\(\{\s*name: ''/, 'one form for all sections')
  assert.match(page, /data-testid="unsaved-bar"/, 'the unsaved-changes bar is still there')
  assert.match(page, /beforeunload/)
  assert.match(page, /<BookingPreview form=\{form\}/, 'the live preview still reads the same form')
  assert.match(page, /window\.history\.replaceState\(null, '', `\$\{window\.location\.pathname\}\?tab=\$\{id\}`\)/, 'the open section is in the address')
  assert.deepEqual(readdirSync(path.join(ROOT, 'src/components/settings/sections')).filter(f => /Section\.tsx$/.test(f)).sort(), ids.map(n => `${n}Section.tsx`).sort())
})

test('a section head is a real heading with one sentence under it', () => {
  const html = renderToStaticMarkup(createElement(SectionHead, { title: 'Payments', text: 'How students pay you for lessons.' }))
  assert.match(html, /<h2>Payments<\/h2><p>How students pay you for lessons\.<\/p>/)
  assert.match(html, /data-testid="settings-section-head"/)
})

test('the Settings page and its sections still say the same things as before the split (the whole old page is covered by the older tests too)', () => {
  const all = ['Profile', 'Booking', 'Payments', 'Extras', 'Integrations', 'Plan'].map(n => read(`src/components/settings/sections/${n}Section.tsx`)).join('\n')
  for (const text of ['Full name', 'Lengths you take', 'Card payment link', 'Made with Tutafy', 'Google Calendar', 'Trial', 'Contract', 'Upgrade to Pro']) {
    assert.ok(all.includes(text), `"${text}" is in a section`)
  }
})
