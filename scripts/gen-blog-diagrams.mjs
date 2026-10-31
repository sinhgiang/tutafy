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
        text(92, y + 30, r, { size: 21, weight: 600 }) +
        (own ? check(470, y + 22) : text(488, y + 29, '+ tool', { size: 18, fill: AMBER, weight: 700, anchor: 'end' }))
    }).join('')
    const right = rows.map((r, i) => {
      const y = 176 + i * 54
      return box(590, y, 440, 44, { fill: PALE, stroke: '#c7d2fe', r: 10 }) + text(612, y + 30, r, { size: 21, weight: 600 }) + check(990, y + 22, INDIGO)
    }).join('')
    return text(70, 156, 'A general scheduler', { size: 20, weight: 800, fill: MUTED }) + left +
      text(590, 156, 'A tool built for tutors', { size: 20, weight: 800, fill: INDIGO }) + right +
      text(550, 590, 'Dashed = usually a separate tool you connect yourself (Zoom, a spreadsheet, WhatsApp).', { size: 18, fill: MUTED, anchor: 'middle' })
  })(),
)

D['calendly-which-to-pick'] = frame(
  'Which kind of tool fits how you teach',
  'Start from what you need beyond picking a time.',
  (() => {
    const start = box(380, 120, 340, 64, { fill: INDIGO, stroke: INDIGO }) + text(550, 150, 'What do you need beyond', { size: 20, weight: 700, fill: '#ffffff', anchor: 'middle' }) + text(550, 174, 'choosing a time?', { size: 20, weight: 700, fill: '#ffffff', anchor: 'middle' })
    const cols = [
      { x: 40, h: 'Nothing else', b: ['A free scheduler or', 'Google Calendar', 'appointment schedules'], c: '#ecfdf5', s: '#6ee7b7' },
      { x: 305, h: 'Payment at booking', b: ['A paid scheduler plan', 'with Stripe or PayPal,', 'or a tutor tool'], c: '#fffbeb', s: '#fcd34d' },
      { x: 570, h: 'Lesson workflow', b: ['Video, homework,', 'parents, packages:', 'a tutor-specific tool', 'such as Tutafy'], c: PALE, s: '#c7d2fe' },
      { x: 835, h: 'Several tutors', b: ['A team tool such as', 'TutorCruncher,', 'Teachworks or', 'Tutafy Academy'], c: '#fdf2f8', s: '#f9a8d4' },
    ]
    const parts = cols.map(c => {
      const cx = c.x + 112
      return arrow(550, 184, cx, 262) +
        box(c.x, 266, 225, 56, { fill: '#ffffff', stroke: INDIGO, r: 12 }) + text(cx, 302, c.h, { size: 20, weight: 800, fill: INDIGO, anchor: 'middle' }) +
        arrow(cx, 322, cx, 366) +
        box(c.x, 370, 225, 150, { fill: c.c, stroke: c.s, r: 12 }) + lines(cx, 404, c.b, { size: 19, weight: 600, anchor: 'middle' })
    }).join('')
    return start + parts + text(550, 566, 'Match the tool to the work you would otherwise do by hand each week.', { size: 20, fill: MUTED, anchor: 'middle' })
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
        text(x + (cw - 14) / 2, 166, c.h, { size: 20, weight: 800, anchor: 'middle' }) + text(x + (cw - 14) / 2, 196, c.note, { size: 17, fill: MUTED, anchor: 'middle' })
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
    return s + text(550, 566, 'Europe went back on 25 Oct, New York on 1 Nov: one week with a 4-hour gap.', { size: 19, fill: MUTED, anchor: 'middle' }) +
      text(550, 592, 'Ho Chi Minh City never changes, so its gap to London moves twice a year.', { size: 19, fill: MUTED, anchor: 'middle' })
  })(),
)

D['time-zones-anchor-steps'] = frame(
  'Five steps that keep a recurring lesson from drifting',
  'Decide whose clock the lesson lives on, then show each person their own time.',
  (() => {
    const steps = [
      ['1', 'Pick the anchor', 'The least flexible', 'clock owns it'],
      ['2', 'Fix the slot', 'Store it by city,', 'not "hours apart"'],
      ['3', 'Show both', 'Tutor and student', 'time, every time'],
      ['4', 'Name the dates', 'Tell students', 'the change early'],
      ['5', 'Re-check', 'Twice a year:', 'March and autumn'],
    ]
    return steps.map((st, i) => {
      const x = 40 + i * 205
      return box(x, 190, 185, 260, { fill: i % 2 ? '#ffffff' : PALE, stroke: i % 2 ? LINE : '#c7d2fe', r: 16 }) +
        `<circle cx="${x + 92}" cy="236" r="26" fill="${INDIGO}"/>` + text(x + 92, 246, st[0], { size: 26, weight: 800, fill: '#ffffff', anchor: 'middle' }) +
        text(x + 92, 308, st[1], { size: 23, weight: 800, anchor: 'middle' }) + lines(x + 92, 348, [st[2], st[3]], { size: 20, fill: MUTED, anchor: 'middle' }) +
        (i < 4 ? arrow(x + 188, 320, x + 203, 320) : '')
    }).join('') + text(550, 520, 'The anchor is where the lesson time is stored. Everything else is a translation.', { size: 21, fill: MUTED, anchor: 'middle' })
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
        text(x + 100, base - h - 14, `paid up front: ${b.total}`, { size: 19, fill: MUTED, anchor: 'middle' }) +
        text(x + 100, base + 34, b.l, { size: 20, weight: 800, anchor: 'middle' }) + text(x + 100, base + 60, b.note, { size: 18, fill: MUTED, anchor: 'middle' })
    }).join('') + `<line x1="70" y1="${base}" x2="1030" y2="${base}" stroke="${LINE}" stroke-width="2"/>` +
      text(550, 604, 'Example numbers to show the arithmetic, not a recommendation.', { size: 19, fill: MUTED, anchor: 'middle' })
  })(),
)

D['packages-lifecycle'] = frame(
  'The life of one lesson package',
  'What has to be decided and tracked from the day it is bought to the day it runs out.',
  (() => {
    const st = [
      ['Student buys', 'A pack of lessons', 'paid up front'],
      ['Lessons booked', 'One at a time,', 'each with a date'],
      ['Balance drops', 'Someone keeps', 'the number left'],
      ['Reminder', 'At two left,', 'offer the next'],
      ['Expiry or renewal', 'Used up, or the', 'time limit ends'],
    ]
    return st.map((s, i) => {
      const x = 36 + i * 206
      return box(x, 200, 188, 190, { fill: i === 2 ? '#fffbeb' : PALE, stroke: i === 2 ? '#fcd34d' : '#c7d2fe', r: 16 }) +
        text(x + 94, 246, s[0], { size: 20, weight: 800, anchor: 'middle' }) + lines(x + 94, 292, [s[1], s[2]], { size: 19, fill: MUTED, anchor: 'middle' }) +
        (i < 4 ? arrow(x + 190, 295, x + 204, 295) : '')
    }).join('') +
      `<path d="M ${36 + 4 * 206 + 94} 394 C ${36 + 4 * 206 + 94} 470, 130 470, 130 394" stroke="${INDIGO}" stroke-width="3.5" fill="none" stroke-dasharray="8 7"/>` +
      `<path d="M130 394 l-9 14 l18 0 Z" fill="${INDIGO}"/>` +
      text(550, 516, 'A renewal starts the loop again', { size: 21, weight: 700, fill: INDIGO, anchor: 'middle' }) +
      text(550, 580, 'The amber step is the one people skip: nobody counts, then everybody argues.', { size: 19, fill: MUTED, anchor: 'middle' })
  })(),
)

// ---- T-1143, article 1: the real hourly rate of an example week (every figure is worked out in the article's table) ---------------------
D['real-rate-headline-vs-real'] = frame(
  'The same week, three hourly rates',
  'Example week: 15 paid lessons priced at $25, 8.75 unpaid hours, 23.75 hours worked in all.',
  (() => {
    const rows = [
      { y: 150, label: 'Price on the profile', v: 25, t: '$25.00', fill: '#c7d2fe', stroke: '#a5b4fc', note: 'what the lesson costs' },
      { y: 285, label: 'Real rate on a platform that keeps 25%', v: 11.84, t: '$11.84', fill: '#fcd34d', stroke: '#f59e0b', note: '$281.25 received over 23.75 hours' },
      { y: 420, label: 'Real rate on your own link (Pro plan)', v: 15.03, t: '$15.03', fill: '#6ee7b7', stroke: '#10b981', note: '$356.85 received over 23.75 hours' },
    ]
    const k = 28 // pixels per dollar
    return rows.map(r => text(70, r.y, r.label, { size: 22, weight: 800 }) +
      `<rect x="70" y="${r.y + 16}" width="${Math.round(r.v * k)}" height="62" rx="12" fill="${r.fill}" stroke="${r.stroke}" stroke-width="2"/>` +
      text(70 + Math.round(r.v * k) + 18, r.y + 58, r.t, { size: 30, weight: 800 }) +
      text(70, r.y + 106, r.note, { size: 18, fill: MUTED })).join('') +
      text(550, 596, 'Example figures to show the arithmetic. Use your own hours and your own commission.', { size: 18, fill: MUTED, anchor: 'middle' })
  })(),
)

D['real-rate-where-the-hours-go'] = frame(
  'Where the 23.75 hours of the example week go',
  'More than a third of the hours earn nothing, on a platform or off it.',
  (() => {
    const parts = [
      { h: 15, label: 'Paid lessons', fill: '#a5b4fc', stroke: '#6366f1' },
      { h: 2, label: 'Unpaid trial lessons', fill: '#fde68a', stroke: '#f59e0b' },
      { h: 3.75, label: 'Preparation', fill: '#fcd34d', stroke: '#d97706' },
      { h: 2, label: 'Messages and admin', fill: '#fdba74', stroke: '#ea580c' },
      { h: 1, label: 'Missed slot', fill: '#fca5a5', stroke: '#dc2626' },
    ]
    const k = 960 / 23.75
    let x = 70
    const bars = parts.map(p => { const w = p.h * k; const s = `<rect x="${x.toFixed(1)}" y="230" width="${w.toFixed(1)}" height="90" fill="${p.fill}" stroke="${p.stroke}" stroke-width="2"/>`; x += w; return s }).join('')
    const xUnpaid = 70 + 15 * k
    const bracket = `<path d="M${xUnpaid.toFixed(1)} 214 v-14 h${(8.75 * k).toFixed(1)} v14" stroke="#b45309" stroke-width="3" fill="none"/>` +
      text(xUnpaid + (8.75 * k) / 2, 186, 'Unpaid: 8.75 hours', { size: 22, weight: 800, fill: AMBER, anchor: 'middle' }) +
      `<path d="M70 214 v-14 h${(15 * k).toFixed(1)} v14" stroke="${INDIGO}" stroke-width="3" fill="none"/>` +
      text(70 + (15 * k) / 2, 186, 'Paid: 15 hours', { size: 22, weight: 800, fill: INDIGO, anchor: 'middle' })
    const legend = parts.map((p, i) => {
      const col = i % 3, row = Math.floor(i / 3)
      const lx = 70 + col * 330, ly = 392 + row * 62
      return `<rect x="${lx}" y="${ly}" width="26" height="26" rx="6" fill="${p.fill}" stroke="${p.stroke}" stroke-width="2"/>` +
        text(lx + 40, ly + 21, `${p.label}: ${p.h} h`, { size: 22, weight: 600 })
    }).join('')
    return bars + bracket + legend + text(550, 590, 'Example week. The hours are invented; the method is the point.', { size: 18, fill: MUTED, anchor: 'middle' })
  })(),
)

const only = process.argv.slice(2) // optional: draw only the diagrams named on the command line, so older files are not rewritten
for (const [name, svg] of Object.entries(D)) {
  if (only.length && !only.includes(name)) continue
  const buf = Buffer.from(svg)
  await sharp(buf, { density: 144 }).resize(W, H).avif({ quality: 60 }).toFile(`${OUT}/${name}.avif`)
  await sharp(buf, { density: 144 }).resize(W, H).webp({ quality: 82 }).toFile(`${OUT}/${name}.webp`)
}
console.log('diagrams:', Object.keys(D).join(', '))
