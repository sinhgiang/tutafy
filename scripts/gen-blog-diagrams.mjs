// Draws the inline diagrams of the three articles of T-1141 (SVG -> AVIF + WebP, 1100x619, the size the blog's `image` block expects).
// Run: node scripts/gen-blog-diagrams.mjs
// Every diagram is drawn here from plain shapes and text; nothing is a photo and no number in them is a result of ours: the clock
// times are worked out from the UTC offsets named in the article, the prices are labelled "example".
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const OUT = 'public/blog/inline'
mkdirSync(OUT, { recursive: true })

const W = 1100, H = 619
const FONT = 'Segoe UI, Arial, sans-serif'
const INK = '#1f2937', MUTED = '#4b5563', LINE = '#d1d5db', INDIGO = '#4f46e5', PALE = '#eef2ff', GREEN = '#047857', AMBER = '#b45309'

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const text = (x, y, s, { size = 20, weight = 400, fill = INK, anchor = 'start' } = {}) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`
const lines = (x, y, arr, opt = {}) => arr.map((s, i) => text(x, y + i * ((opt.size ?? 20) + 8), s, opt)).join('')
const box = (x, y, w, h, { fill = '#ffffff', stroke = LINE, r = 14, dash = false, sw = 2 } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ' stroke-dasharray="7 6"' : ''}/>`
const check = (x, y, color = GREEN) => `<path d="M${x} ${y} l7 8 l13 -16" stroke="${color}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
const arrow = (x1, y1, x2, y2, color = INDIGO) => {
  const a = Math.atan2(y2 - y1, x2 - x1), hx = x2 - 12 * Math.cos(a), hy = y2 - 12 * Math.sin(a)
  return `<line x1="${x1}" y1="${y1}" x2="${hx}" y2="${hy}" stroke="${color}" stroke-width="3.5" stroke-linecap="round"/>` +
    `<path d="M${x2} ${y2} L${x2 - 14 * Math.cos(a - 0.45)} ${y2 - 14 * Math.sin(a - 0.45)} L${x2 - 14 * Math.cos(a + 0.45)} ${y2 - 14 * Math.sin(a + 0.45)} Z" fill="${color}"/>`
}
const frame = (title, sub, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <rect x="0" y="0" width="${W}" height="8" fill="${INDIGO}"/>
  ${text(48, 60, title, { size: 30, weight: 800 })}
  ${sub ? text(48, 92, sub, { size: 18, fill: MUTED }) : ''}
  ${body}
</svg>`

const D = {}

// ---- Article 1: a scheduler books the time, a tutor needs more ---------------------------------------------------------------------
D['calendly-scheduler-scope'] = frame(
  'What a scheduler covers, and what you add yourself',
  'A general scheduler books the time. The rest usually lives in another tool, another login, another link.',
  (() => {
    const rows = ['Pick a time', 'Calendar sync', 'Video room', 'Payment tied to the lesson', 'Lesson package balance', 'Homework and notes', 'Parent view']
    const left = rows.map((r, i) => {
      const y = 176 + i * 54
      const own = i < 2
      return box(70, y, 440, 44, { fill: own ? '#ecfdf5' : '#ffffff', stroke: own ? '#6ee7b7' : LINE, dash: !own, r: 10 }) +
        text(92, y + 29, r, { size: 19, weight: 600 }) +
        (own ? check(470, y + 22) : text(488, y + 29, '+ tool', { size: 15, fill: AMBER, weight: 700, anchor: 'end' }))
    }).join('')
    const right = rows.map((r, i) => {
      const y = 176 + i * 54
      return box(590, y, 440, 44, { fill: PALE, stroke: '#c7d2fe', r: 10 }) + text(612, y + 29, r, { size: 19, weight: 600 }) + check(990, y + 22, INDIGO)
    }).join('')
    return text(70, 156, 'A general scheduler', { size: 20, weight: 800, fill: MUTED }) + left +
      text(590, 156, 'A tool built for tutors', { size: 20, weight: 800, fill: INDIGO }) + right +
      text(550, 590, 'Dashed = usually a separate tool you connect yourself (for example Zoom, a spreadsheet, WhatsApp).', { size: 15, fill: MUTED, anchor: 'middle' })
  })(),
)

D['calendly-which-to-pick'] = frame(
  'Which kind of tool fits how you teach',
  'Start from what you need beyond picking a time.',
  (() => {
    const start = box(380, 120, 340, 64, { fill: INDIGO, stroke: INDIGO }) + text(550, 150, 'What do you need beyond', { size: 18, weight: 700, fill: '#ffffff', anchor: 'middle' }) + text(550, 172, 'choosing a time?', { size: 18, weight: 700, fill: '#ffffff', anchor: 'middle' })
    const cols = [
      { x: 40, h: 'Nothing else', b: ['A free scheduler or', 'Google Calendar', 'appointment schedules'], c: '#ecfdf5', s: '#6ee7b7' },
      { x: 305, h: 'Payment at booking', b: ['A paid scheduler plan', 'with Stripe or PayPal,', 'or a tutor tool'], c: '#fffbeb', s: '#fcd34d' },
      { x: 570, h: 'The whole lesson workflow', b: ['Video, homework, parents', 'and packages: a tool', 'for tutors (Tutafy, TutorBird)'], c: PALE, s: '#c7d2fe' },
      { x: 835, h: 'Several tutors, payroll', b: ['A team tool such as', 'TutorCruncher, Teachworks', 'or Tutafy Academy'], c: '#fdf2f8', s: '#f9a8d4' },
    ]
    const parts = cols.map(c => {
      const cx = c.x + 112
      return arrow(550, 184, cx, 262) +
        box(c.x, 266, 225, 56, { fill: '#ffffff', stroke: INDIGO, r: 12 }) + text(cx, 301, c.h, { size: 17, weight: 800, fill: INDIGO, anchor: 'middle' }) +
        arrow(cx, 322, cx, 366) +
        box(c.x, 370, 225, 130, { fill: c.c, stroke: c.s, r: 12 }) + lines(cx, 408, c.b, { size: 17, weight: 600, anchor: 'middle' })
    }).join('')
    return start + parts + text(550, 560, 'Match the tool to the work you would otherwise do by hand each week.', { size: 17, fill: MUTED, anchor: 'middle' })
  })(),
)

// ---- Article 2: time zones ------------------------------------------------------------------------------------------------------------
// One lesson fixed at 18:00 in London. London is UTC+1 (BST) until 25 Oct 2026 and UTC+0 after; New York is UTC-4 (EDT) until 1 Nov 2026 and UTC-5 after;
// Ho Chi Minh City is UTC+7 all year. 18:00 BST = 17:00 UTC; 18:00 GMT = 18:00 UTC.
D['time-zones-one-lesson-three-weeks'] = frame(
  'One lesson, fixed at 18:00 in London, three weeks in a row',
  'The tutor never moves it. The student\'s clock does, because the two sides change their clocks on different days (2026).',
  (() => {
    const cols = [{ h: 'Week of 19 Oct', note: 'London on BST (UTC+1)', v: ['18:00', '13:00', '00:00 (next day)'] }, { h: 'Week of 26 Oct', note: 'London on GMT (UTC+0)', v: ['18:00', '14:00', '01:00 (next day)'] }, { h: 'Week of 2 Nov', note: 'New York on EST (UTC-5)', v: ['18:00', '13:00', '01:00 (next day)'] }]
    const rowsN = ['London', 'New York', 'Ho Chi Minh City']
    const x0 = 70, cw = 270, labelW = 190
    let s = ''
    cols.forEach((c, i) => {
      const x = x0 + labelW + i * cw
      s += box(x, 130, cw - 14, 92, { fill: i === 1 ? '#fffbeb' : PALE, stroke: i === 1 ? '#fcd34d' : '#c7d2fe', r: 12 }) +
        text(x + (cw - 14) / 2, 166, c.h, { size: 20, weight: 800, anchor: 'middle' }) + text(x + (cw - 14) / 2, 196, c.note, { size: 15, fill: MUTED, anchor: 'middle' })
    })
    rowsN.forEach((r, ri) => {
      const y = 246 + ri * 96
      s += text(x0, y + 50, r, { size: 21, weight: 800 })
      cols.forEach((c, i) => {
        const x = x0 + labelW + i * cw
        s += box(x, y, cw - 14, 80, { fill: '#ffffff', stroke: ri === 0 ? '#c7d2fe' : LINE, r: 12 }) +
          text(x + (cw - 14) / 2, y + 50, c.v[ri], { size: ri === 2 ? 24 : 30, weight: 800, fill: ri === 0 ? INDIGO : INK, anchor: 'middle' })
      })
    })
    return s + text(550, 566, 'New York is still on summer time until 1 Nov 2026, Europe went back on 25 Oct, so the gap between them is one hour for a week.', { size: 16, fill: MUTED, anchor: 'middle' }) +
      text(550, 592, 'Ho Chi Minh City has no clock change, so its gap to London moves by an hour twice a year.', { size: 16, fill: MUTED, anchor: 'middle' })
  })(),
)

D['time-zones-anchor-steps'] = frame(
  'Five steps that keep a recurring lesson from drifting',
  'Decide whose clock the lesson lives on, then show each person their own time.',
  (() => {
    const steps = [
      ['1', 'Pick the anchor', 'The least flexible', 'clock owns the lesson'],
      ['2', 'Fix the slot', 'in that zone, not as', 'a number of hours apart'],
      ['3', 'Show both times', 'every confirmation says', 'tutor and student time'],
      ['4', 'Name the dates', 'when a clock changes', 'tell students early'],
      ['5', 'Re-check twice', 'a year, in March', 'and in autumn'],
    ]
    return steps.map((st, i) => {
      const x = 40 + i * 205
      return box(x, 190, 185, 260, { fill: i % 2 ? '#ffffff' : PALE, stroke: i % 2 ? LINE : '#c7d2fe', r: 16 }) +
        `<circle cx="${x + 92}" cy="236" r="26" fill="${INDIGO}"/>` + text(x + 92, 246, st[0], { size: 26, weight: 800, fill: '#ffffff', anchor: 'middle' }) +
        text(x + 92, 306, st[1], { size: 20, weight: 800, anchor: 'middle' }) + lines(x + 92, 344, [st[2], st[3]], { size: 16, fill: MUTED, anchor: 'middle' }) +
        (i < 4 ? arrow(x + 188, 320, x + 203, 320) : '')
    }).join('') + text(550, 520, 'The anchor is the one place the lesson time is stored. Everything else is a translation of it.', { size: 18, fill: MUTED, anchor: 'middle' })
  })(),
)

// ---- Article 3: lesson packages -------------------------------------------------------------------------------------------------------
D['packages-price-per-lesson'] = frame(
  'The same lesson, three ways to buy it (example prices)',
  'A made-up tutor who charges $40 per lesson and gives 5% off a pack of 5 and 10% off a pack of 10.',
  (() => {
    const bars = [
      { l: 'Single lesson', total: '$40', per: 40, c: '#c7d2fe', note: '1 lesson, paid at booking' },
      { l: 'Pack of 5', total: '$190', per: 38, c: '#818cf8', note: '5 lessons, 5% off' },
      { l: 'Pack of 10', total: '$360', per: 36, c: INDIGO, note: '10 lessons, 10% off' },
    ]
    const base = 470, scale = 6.4
    return bars.map((b, i) => {
      const x = 130 + i * 300, h = b.per * scale
      return box(x, base - h, 200, h, { fill: b.c, stroke: b.c, r: 10 }) +
        text(x + 100, base - h - 40, `$${b.per} per lesson`, { size: 24, weight: 800, anchor: 'middle' }) +
        text(x + 100, base - h - 14, `paid up front: ${b.total}`, { size: 17, fill: MUTED, anchor: 'middle' }) +
        text(x + 100, base + 34, b.l, { size: 20, weight: 800, anchor: 'middle' }) + text(x + 100, base + 60, b.note, { size: 15, fill: MUTED, anchor: 'middle' })
    }).join('') + `<line x1="70" y1="${base}" x2="1030" y2="${base}" stroke="${LINE}" stroke-width="2"/>` +
      text(550, 604, 'Example numbers to show the arithmetic, not a recommendation. Work out your own discount from your own rate.', { size: 15, fill: MUTED, anchor: 'middle' })
  })(),
)

D['packages-lifecycle'] = frame(
  'The life of one lesson package',
  'What has to be decided and tracked from the day it is bought to the day it runs out.',
  (() => {
    const st = [
      ['Student buys', 'A pack of lessons', 'paid up front'],
      ['Lessons booked', 'one at a time,', 'each with a date'],
      ['Balance drops', 'someone keeps', 'the number left'],
      ['Reminder', 'two lessons left:', 'offer the next pack'],
      ['Expiry or renewal', 'used up, or the', 'time limit passes'],
    ]
    return st.map((s, i) => {
      const x = 36 + i * 206
      return box(x, 200, 188, 190, { fill: i === 2 ? '#fffbeb' : PALE, stroke: i === 2 ? '#fcd34d' : '#c7d2fe', r: 16 }) +
        text(x + 94, 244, s[0], { size: 19, weight: 800, anchor: 'middle' }) + lines(x + 94, 288, [s[1], s[2]], { size: 17, fill: MUTED, anchor: 'middle' }) +
        (i < 4 ? arrow(x + 190, 295, x + 204, 295) : '')
    }).join('') +
      `<path d="M ${36 + 4 * 206 + 94} 394 C ${36 + 4 * 206 + 94} 470, 130 470, 130 394" stroke="${INDIGO}" stroke-width="3.5" fill="none" stroke-dasharray="8 7"/>` +
      `<path d="M130 394 l-9 14 l18 0 Z" fill="${INDIGO}"/>` +
      text(550, 516, 'A renewal starts the loop again', { size: 18, weight: 700, fill: INDIGO, anchor: 'middle' }) +
      text(550, 580, 'The amber step is the one people skip: a balance nobody counts is an argument waiting to happen.', { size: 16, fill: MUTED, anchor: 'middle' })
  })(),
)

for (const [name, svg] of Object.entries(D)) {
  const buf = Buffer.from(svg)
  await sharp(buf, { density: 144 }).resize(W, H).avif({ quality: 60 }).toFile(`${OUT}/${name}.avif`)
  await sharp(buf, { density: 144 }).resize(W, H).webp({ quality: 82 }).toFile(`${OUT}/${name}.webp`)
}
console.log('diagrams:', Object.keys(D).join(', '))
