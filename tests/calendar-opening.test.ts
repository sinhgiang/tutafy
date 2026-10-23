// T-0842: the week grid opens at the first lesson, not at 6 AM. The grid starts at 6 AM, so the first screen of a week was
// ten hours of empty rows. `openingMinute` says how far down to scroll; the Calendar scrolls there when the week opens.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { GRID_FROM_HOUR, GRID_TO_HOUR, openingMinute, weekDays } from '@/lib/calendar'

// Sunday 18 Oct 2026 to Saturday 24 Oct; "now" is Friday 23 Oct, 10:30 local time.
const days = weekDays(new Date(2026, 9, 21, 12))
const now = new Date(2026, 9, 23, 10, 30)
const lesson = (day: number, hour: number, minute = 0, status = 'scheduled') => ({ starts_at: new Date(2026, 9, day, hour, minute).toISOString(), status })
const MAX = (GRID_TO_HOUR - GRID_FROM_HOUR - 8) * 60

test('opens one hour before the earliest lesson of the week', () => {
  assert.equal(openingMinute([lesson(21, 16), lesson(19, 14, 30), lesson(24, 18)], days, now), (13 * 60 + 30) - GRID_FROM_HOUR * 60)
})

test('a cancelled lesson, and a lesson of another week, do not pull the grid', () => {
  const other = lesson(29, 7) // the next week
  assert.equal(openingMinute([lesson(20, 7, 0, 'cancelled'), other, lesson(21, 15)], days, now), 14 * 60 - GRID_FROM_HOUR * 60)
})

test('with no lesson it opens an hour before now in the current week, and at 8 AM in any other week', () => {
  assert.equal(openingMinute([], days, now), 9 * 60 - GRID_FROM_HOUR * 60)
  assert.equal(openingMinute([], weekDays(new Date(2026, 10, 4, 12)), now), 8 * 60 - GRID_FROM_HOUR * 60)
})

test('never above the top of the grid and never past the last eight hours', () => {
  assert.equal(openingMinute([lesson(21, 6, 30)], days, now), 0)
  assert.equal(openingMinute([lesson(21, 21)], days, now), MAX)
  assert.equal(openingMinute([], days, new Date(2026, 9, 23, 23, 0)), MAX)
})

test('the Calendar really scrolls there: the effect reads openingMinute and runs only on a week view with the grid on screen', () => {
  const src = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src/app/(dashboard)/calendar/CalendarView.tsx'), 'utf8').replace(/\r\n/g, '\n')
  const effect = /useEffect\(\(\) => \{([\s\S]*?)\n  \}, \[view, anchor\]\)/.exec(src)
  assert.ok(effect, 'the opening effect is gone')
  assert.match(effect![1], /openingMinute\(/)
  assert.match(effect![1], /body\.scrollTop = /)
  assert.match(effect![1], /view !== 'week'/)
  assert.match(effect![1], /offsetParent === null/) // the phone's day list has no grid
  assert.match(src, /ref=\{gridRef\} className="cal-week/)
  // the hours scroll inside the grid (the day names stay above them) and both parts reserve the same scrollbar width
  const css = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src/styles/dashboard-shell.css'), 'utf8').replace(/\r\n/g, '\n')
  assert.match(css, /\.cal-week-body \{[^}]*overflow-y: auto;[^}]*scrollbar-gutter: stable;[^}]*max-height:/)
  assert.match(css, /\.cal-week-head \{[^}]*overflow-y: hidden;[^}]*scrollbar-gutter: stable;/)
})
