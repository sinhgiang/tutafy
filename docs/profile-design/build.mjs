// Builds the static design samples in this folder (T-0761). Run from the repository root:  node docs/profile-design/build.mjs
// Nothing here touches the app, the database or the live /tutors/<slug> page. The tutors, reviews and numbers are made up.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as L from 'lucide-react'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = dirname(fileURLToPath(import.meta.url))

/* ------------------------------------------------------------------ helpers */
const ic = (name, size = 16, cls = '') => {
  const C = L[name]
  if (!C) throw new Error(`lucide icon missing: ${name}`)
  return renderToStaticMarkup(createElement(C, { width: size, height: size, 'aria-hidden': 'true', className: cls, strokeWidth: 2 }))
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const stars = (r, label) => `<span class="stars" role="img" aria-label="${esc(label ?? `Rated ${r} out of 5`)}">${[1, 2, 3, 4, 5].map(i => ic('Star', 16, i <= Math.round(r) ? '' : 'off')).join('')}</span>`
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const levelMeter = ([a, b]) => {
  const i = LEVELS.indexOf(a), j = LEVELS.indexOf(b)
  return `<div><span class="levels" role="img" aria-label="Levels ${a} to ${b}">${LEVELS.map((l, k) => `<i class="${k >= i && k <= j ? 'on' : ''}"></i>`).join('')}</span><div class="lvl-labels" aria-hidden="true">${LEVELS.map(l => `<span>${l}</span>`).join('')}</div></div>`
}
const lvText = ([a, b]) => (a === b ? a : `${a}–${b}`)
const initials = n => n.split(' ').map(x => x[0]).join('').slice(0, 2)
const TINTS = ['#DBEAFE:#1D4ED8', '#FCE7F3:#BE185D', '#DCFCE7:#15803D', '#FEF3C7:#B45309', '#EDE9FE:#6D28D9', '#CCFBF1:#0F766E']
const mini = (name, i = 0) => { const [bg, fg] = TINTS[i % TINTS.length].split(':'); return `<span class="mini monogram" style="background:${bg};color:${fg};display:grid;place-items:center;border-radius:50%;font-weight:700" aria-hidden="true">${esc(initials(name))}</span>` }

/* Flat, made-up portraits. The real page shows the tutor's own photo (4:5 crop); this only stands in for it. */
function portrait(p, id) {
  const hair = {
    long: `<path d="M120 235 C108 130 150 105 200 105 C250 105 292 130 280 235 C284 290 270 330 262 352 L138 352 C130 330 116 290 120 235Z" fill="${p.hair}"/>`,
    short: '',
    bun: `<circle cx="200" cy="108" r="34" fill="${p.hair}"/>`,
  }[p.hairStyle]
  const top = {
    long: `<path d="M130 215 C132 150 165 128 200 128 C238 128 270 150 270 215 C250 175 220 160 200 160 C175 160 148 178 130 215Z" fill="${p.hair}"/>`,
    short: `<path d="M128 220 C122 140 160 120 200 120 C242 120 278 140 272 220 C262 180 240 158 200 158 C165 158 138 180 128 220Z" fill="${p.hair}"/>`,
    bun: `<path d="M130 215 C134 152 166 132 200 132 C236 132 268 152 270 215 C252 180 224 164 200 164 C176 164 148 180 130 215Z" fill="${p.hair}"/>`,
  }[p.hairStyle]
  const g = `g${id}`
  return `<svg class="photo" viewBox="0 0 400 500" role="img" aria-label="Sample portrait (illustration, not a real photo)" preserveAspectRatio="xMidYMax slice">
  <defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.bg[0]}"/><stop offset="1" stop-color="${p.bg[1]}"/></linearGradient></defs>
  <rect width="400" height="500" fill="url(#${g})"/>
  <circle cx="330" cy="90" r="90" fill="#fff" opacity=".18"/><circle cx="60" cy="420" r="120" fill="#fff" opacity=".12"/>
  ${hair}
  <path d="M30 500 C30 405 105 352 200 352 C295 352 370 405 370 500Z" fill="${p.shirt}"/>
  <path d="M168 352 L200 410 L232 352Z" fill="${p.inner}"/>
  <rect x="172" y="290" width="56" height="72" rx="22" fill="${p.skin}"/><rect x="172" y="320" width="56" height="30" fill="#000" opacity=".08"/>
  <ellipse cx="200" cy="235" rx="68" ry="82" fill="${p.skin}"/>
  <ellipse cx="132" cy="240" rx="11" ry="20" fill="${p.skin}"/><ellipse cx="268" cy="240" rx="11" ry="20" fill="${p.skin}"/>
  ${top}
  <ellipse cx="172" cy="238" rx="6" ry="7.5" fill="#1f2937"/><ellipse cx="228" cy="238" rx="6" ry="7.5" fill="#1f2937"/>
  <path d="M176 280 C190 296 210 296 224 280" stroke="#7c2d12" stroke-width="5" stroke-linecap="round" fill="none"/>
  <circle cx="156" cy="266" r="10" fill="#f87171" opacity=".22"/><circle cx="244" cy="266" r="10" fill="#f87171" opacity=".22"/>
</svg>`
}

/* ------------------------------------------------------------------ made-up tutors */
const VIEWER_TZ = 'New York (GMT-4)'

const MAYA = {
  key: 'full', id: 'maya', name: 'Maya Reyes', first: 'Maya', cur: '$', place: 'Toronto, Canada', tzName: 'Toronto (GMT-4)',
  speaks: ['English (native)', 'Spanish (C1)'], since: 2018,
  headline: 'IELTS and business English coach. I help busy professionals reach band 7+ and run meetings with confidence.',
  about: [
    'Hi, I\'m Maya. I\'ve coached IELTS and workplace English for eight years, first at a language school in Toronto and now one-to-one. Most of my students are busy professionals who need a score, a promotion, or both.',
    'Lessons are practical. We start with a quick check of your level, then work from your real material: your essays, your presentations, your last meeting. You leave every lesson with three things to practise before we meet again.',
  ],
  fit: ['You have an IELTS date and need a plan', 'You understand English but freeze when you speak at work', 'You want honest feedback, not just praise'],
  notFit: ['You are a complete beginner (A1). Ask me and I\'ll suggest a tutor who specialises in that.'],
  subjects: [{ n: 'IELTS (Academic and General)', lv: ['B1', 'C1'] }, { n: 'Business English', lv: ['B1', 'C2'] }, { n: 'Everyday conversation', lv: ['A2', 'C1'] }],
  trial: { min: 30, price: 10, d: 'First lesson only. We check your level and agree on a plan.' },
  lessons: [{ t: '30-minute lesson', min: 30, price: 22, d: 'Speaking practice, or feedback on one essay.' }, { t: '60-minute lesson', min: 60, price: 40, d: 'A full IELTS skills lesson or a mock interview.' }],
  pack: { n: 10, min: 60, price: 360, note: '$36 a lesson, you save $40. Use within 4 months.' },
  rating: 4.9, nrev: 38, dist: { 5: 33, 4: 5, 3: 0, 2: 0, 1: 0 }, taught: 412, students: 61, reply: 'within 1 hour', rebook: '74%',
  video: { len: '1:12', cap: 'Hi, I\'m Maya. Here\'s how my lessons work.' },
  photo: { skin: '#B9835A', hair: '#2B1B17', hairStyle: 'long', shirt: '#312E81', inner: '#F8FAFC', bg: ['#C7D2FE', '#A5B4FC'] },
  free: false, isNew: false,
  slots: [
    { d: 'Today', date: 'Thu, Oct 22', t: ['6:00 PM', '7:00 PM'] }, { d: 'Fri', date: 'Oct 23', t: ['9:00 AM', '10:00 AM', '4:00 PM', '5:00 PM'] },
    { d: 'Sat', date: 'Oct 24', t: ['11:00 AM', '12:00 PM'] }, { d: 'Mon', date: 'Oct 26', t: ['8:00 AM', '1:00 PM', '6:00 PM'] }, { d: 'Tue', date: 'Oct 27', t: ['9:00 AM', '5:00 PM'] },
  ],
  reviews: [
    { n: 'Anna K.', c: 'Germany', l: 24, m: 'Sep 2026', r: 5, q: 'I needed band 7 for my visa and got 7.5 in writing. Maya marks my essays within a day and tells me exactly which sentence cost me points.' },
    { n: 'Luis M.', c: 'Mexico', l: 12, m: 'Aug 2026', r: 5, q: 'Meetings in English used to make me nervous. We now role-play my real weekly meeting, and last week my manager said my update was clear.' },
    { n: 'Hye-jin P.', c: 'South Korea', l: 31, m: 'Jul 2026', r: 5, q: 'Patient and well organised. Every lesson ends with three things to practise, and she remembers what we did last time.' },
    { n: 'James R.', c: 'USA', l: 6, m: 'Jun 2026', r: 4, q: 'Helpful trial lesson and a clear plan. Evening times fill up quickly, so book early.' },
    { n: 'Fatima A.', c: 'Egypt', l: 18, m: 'May 2026', r: 5, q: 'My speaking score went from 6 to 7 in two months. The mock interviews were the most useful part.' },
    { n: 'Marco D.', c: 'Italy', l: 9, m: 'Apr 2026', r: 5, q: 'Clear explanations without the jargon. I always know what to practise next.' },
  ],
  related: [
    { n: 'Olivia Grant', h: 'IELTS writing and academic English', r: 4.8, c: 52, p: '$38' },
    { n: 'Tom Becker', h: 'Business English for managers', r: 4.9, c: 29, p: '$35' },
    { n: 'Aisha Rahman', h: 'Relaxed English conversation', r: 5.0, c: 11, p: '$28' },
  ],
  relTitle: 'More English tutors',
  creds: [],
}

const DANIEL = {
  key: 'free', id: 'daniel', name: 'Daniel Weiss', first: 'Daniel', cur: '€', place: 'Berlin, Germany', tzName: 'Berlin (GMT+2)',
  speaks: ['German (native)', 'English (C2)'], since: 2022,
  headline: 'German for people moving to Germany, and for Goethe exam candidates. Clear grammar, lots of speaking.',
  about: [
    'Hallo! I\'m Daniel, a German teacher in Berlin. For four years I\'ve taught expats and exam candidates, and I make you speak from the first lesson. Grammar comes in when you need it, not before.',
    'Before our first lesson I send a short level quiz. After each lesson you get a one-page summary: new words, the mistakes we fixed, and a small task for the next time.',
  ],
  fit: ['You are moving to Germany and need German for daily life', 'You are preparing for a Goethe exam (A2 to B2)', 'You studied German at school but cannot speak it'],
  notFit: ['You want to study German literature at university level.'],
  subjects: [{ n: 'German for beginners', lv: ['A1', 'B1'] }, { n: 'Goethe exam preparation', lv: ['A2', 'B2'] }, { n: 'Conversation', lv: ['B1', 'C1'] }],
  trial: { min: 30, price: 8, d: 'First lesson only. We find your level and a first goal.' },
  lessons: [{ t: '45-minute lesson', min: 45, price: 28, d: 'Grammar and speaking, built around your goal.' }, { t: '60-minute lesson', min: 60, price: 35, d: 'Exam practice or a longer conversation lesson.' }],
  pack: null,
  rating: 4.8, nrev: 17, dist: { 5: 13, 4: 4, 3: 0, 2: 0, 1: 0 }, taught: 150, students: 22, reply: 'within a day', rebook: '68%',
  video: null,
  photo: { skin: '#E8B995', hair: '#7A4B24', hairStyle: 'short', shirt: '#334155', inner: '#E2E8F0', bg: ['#FDE68A', '#FCA5A5'] },
  free: true, isNew: false,
  slots: [
    { d: 'Today', date: 'Thu, Oct 22', t: ['1:00 PM', '2:00 PM'] }, { d: 'Fri', date: 'Oct 23', t: ['9:00 AM', '11:00 AM'] },
    { d: 'Sat', date: 'Oct 24', t: [] }, { d: 'Mon', date: 'Oct 26', t: ['8:00 AM', '12:00 PM', '2:00 PM'] }, { d: 'Tue', date: 'Oct 27', t: ['9:00 AM'] },
  ],
  reviews: [
    { n: 'Sophie L.', c: 'France', l: 14, m: 'Sep 2026', r: 5, q: 'I passed Goethe B1 after three months. The one-page summaries after each lesson made revising easy.' },
    { n: 'Ravi P.', c: 'India', l: 8, m: 'Aug 2026', r: 5, q: 'I moved to Berlin knowing nothing. Daniel taught me what I actually needed at the pharmacy and the town hall.' },
    { n: 'Elena V.', c: 'Spain', l: 20, m: 'Jul 2026', r: 4, q: 'Very clear grammar explanations. I would like a few more speaking games, but he adapts quickly when you ask.' },
    { n: 'Chris T.', c: 'USA', l: 5, m: 'Jun 2026', r: 5, q: 'Friendly, on time, well prepared. The trial lesson already felt like a real lesson.' },
  ],
  related: [
    { n: 'Lena Fischer', h: 'German for kids and teenagers', r: 4.9, c: 33, p: '€30' },
    { n: 'Jonas Kramer', h: 'Business German, B2 to C1', r: 4.7, c: 14, p: '€40' },
    { n: 'Mira Hoffmann', h: 'German conversation for beginners', r: 5.0, c: 9, p: '€24' },
  ],
  relTitle: 'More German tutors',
  creds: [],
}

const PRIYA = {
  key: 'new', id: 'priya', name: 'Priya Nair', first: 'Priya', cur: '$', place: 'Bengaluru, India', tzName: 'Bengaluru (GMT+5:30)',
  speaks: ['English (fluent)', 'Hindi (native)'], since: 2023,
  headline: 'Friendly English conversation practice for beginners and nervous speakers.',
  about: [
    'Hi, I\'m Priya. I teach English conversation to beginners, and I\'ve been tutoring for three years. If speaking English makes you nervous, we\'ll go slowly: short sentences, topics you care about, and no pressure.',
    'Book a 30-minute trial and we\'ll find a pace that suits you. After each lesson I send you the new words and one small thing to try before next time.',
  ],
  fit: ['You are a beginner and want to speak without feeling judged', 'You understand more English than you can say', 'You prefer short, regular lessons'],
  notFit: ['You need exam preparation (IELTS, TOEFL). I do not teach that yet.'],
  subjects: [{ n: 'English conversation', lv: ['A1', 'B1'] }, { n: 'Pronunciation', lv: ['A2', 'B2'] }],
  trial: { min: 30, price: 5, d: 'First lesson only. A relaxed chat so we can find your level.' },
  lessons: [{ t: '30-minute lesson', min: 30, price: 12, d: 'Short conversation practice.' }, { t: '60-minute lesson', min: 60, price: 20, d: 'Conversation plus pronunciation work.' }],
  pack: null,
  rating: 0, nrev: 0, dist: null, taught: 0, students: 0, reply: 'by email', rebook: null,
  video: null, photo: null, mono: 'PN',
  free: true, isNew: true, joined: 'October 2026',
  slots: [
    { d: 'Fri', date: 'Oct 23', t: ['8:00 AM', '9:00 AM'] }, { d: 'Sat', date: 'Oct 24', t: ['7:30 AM'] },
    { d: 'Mon', date: 'Oct 26', t: ['8:00 AM', '9:00 AM'] }, { d: 'Tue', date: 'Oct 27', t: [] }, { d: 'Wed', date: 'Oct 28', t: ['8:00 AM'] },
  ],
  reviews: [],
  related: [
    { n: 'Sam Carter', h: 'Beginner English, patient and slow', r: 4.9, c: 21, p: '$18' },
    { n: 'Grace Lin', h: 'English for travel and daily life', r: 4.8, c: 12, p: '$22' },
    { n: 'Noah Evans', h: 'Conversation practice for nervous speakers', r: 5.0, c: 7, p: '$20' },
  ],
  relTitle: 'More English tutors',
  creds: ['Teaching since 2023', 'CELTA certificate'],
}

/* ------------------------------------------------------------------ shared blocks */
const fromPrice = t => Math.min(...t.lessons.map(l => l.price))
const money = (t, n) => `${t.cur}${n}`
const nextSlot = t => { const d = t.slots.find(s => s.t.length); return { label: `${d.d} ${d.t[0]}`, d } }
const portraitOf = t => (t.photo ? portrait(t.photo, t.id) : '')
const photoBlock = (t, cls) => t.photo ? `<div class="photo-wrap ${cls}">${portraitOf(t)}</div>` : `<div class="monogram ${cls}" role="img" aria-label="${esc(t.name)} has not added a photo yet">${t.mono}</div>`
const bookLabel = t => (t.trial ? `Book a ${money(t, t.trial.price)} trial lesson` : 'Book a lesson')

const slotsRow = (t, days) => days.filter(d => d.t.length).map(d =>
  `<div><div class="day-label">${d.d} <span>${d.date}</span></div><div class="slots">${d.t.map((x, i) => `<a class="slot ${d === nextSlot(t).d && i === 0 ? 'first' : ''}" href="#">${x}</a>`).join('')}</div></div>`).join('')

const tzLine = () => `<div class="tz">${ic('Globe')} Times shown in your time zone: ${VIEWER_TZ}</div>`

const reviewCard = (r, t, i) => `<article class="review"><div>${stars(r.r, `${r.r} out of 5`)}</div>
  <p class="q">“${esc(r.q)}”</p>
  <div class="review-who">${mini(r.n, i)}<div><b>${esc(r.n)} · ${esc(r.c)}</b><span>${r.m}</span></div></div>
  <div style="margin-top:10px"><span class="lesson-tag">${ic('Check')} ${r.l} lessons with ${t.first}</span></div></article>`

const scoreBlock = t => {
  return `<div class="score"><div><div class="big">${t.rating.toFixed(1)}</div>${stars(t.rating)}<div class="muted" style="font-size:12.5px;margin-top:2px">${t.nrev} reviews</div></div>
  <div class="bars">${[5, 4, 3, 2, 1].map(k => `<div class="bar-row"><span>${k}</span><i><b style="width:${(t.dist[k] / t.nrev) * 100}%"></b></i><span>${t.dist[k]}</span></div>`).join('')}</div></div>`
}

const emptyReviews = t => `<div class="empty"><div class="ic">${ic('Star', 20)}</div><div><b>No reviews yet</b><p>${t.first} joined Tutafy in ${t.joined}. Reviews from ${t.first}'s students show up here after their first lessons.</p>
  <p style="margin-top:10px"><a class="btn btn-secondary" href="#">${bookLabel(t)}</a></p></div></div>`

const videoBlock = t => `<a class="video" href="#" aria-label="Play intro video, ${t.video.len}">${portraitOf(t)}<span class="cap">${esc(t.video.cap)}</span><span class="play">${ic('Play', 28)}</span><span class="dur">${t.video.len}</span></a>`

const policyBlock = t => `<div class="policy">
  <div><div class="ph">${ic('Calendar')} Booking</div><p>Pick a time and enter your name and email. No account needed.</p></div>
  <div><div class="ph">${ic('Video')} Video lesson</div><p>Your lesson link comes by email. It opens in your browser, nothing to install.</p></div>
  <div><div class="ph">${ic('RefreshCw')} Cancel or reschedule</div><p>Free up to 24 hours before the lesson. After that, ${t.first} may charge for it.</p></div>
  <div><div class="ph">${ic('CreditCard')} Payment</div><p>Pay by card. ${t.first} sends a secure payment link with your confirmation.</p></div></div>`

const stepsBlock = () => `<ol class="steps"><li><div><b>Choose a time</b><span>Times are shown in your own time zone.</span></div></li>
  <li><div><b>Enter your name and email</b><span>No account, no password.</span></div></li>
  <li><div><b>Get your confirmation</b><span>It has the lesson link, the payment link and a cancel link.</span></div></li></ol>`

const relatedBlock = (t, cls = 'related') => `<div class="${cls}">${t.related.map((r, i) => `<a class="rel" href="#">${mini(r.n, i + 2).replace('mini monogram', 'mini monogram').replace('border-radius:50%', 'border-radius:12px')}<div><b>${esc(r.n)}</b><p>${esc(r.h)}</p><div class="row">${stars(r.r)}<b style="display:inline;font-size:12.5px">${r.r.toFixed(1)}</b><span class="muted">(${r.c})</span></div><div class="row"><b style="display:inline;font-size:12.5px">from ${r.p} / lesson</b></div></div></a>`).join('')}</div>`

const detailsAddedByTutor = t => `<div class="facts">${t.creds.map(c => `<div>${ic('Award')}<span><b>Added by ${t.first}</b>${esc(c)}</span></div>`).join('')}
  <div>${ic('Languages')}<span><b>Speaks</b>${t.speaks.join(' · ')}</span></div><div>${ic('MapPin')}<span><b>Based in</b>${esc(t.place)}</span></div></div>
  <div class="alert alert-info" style="margin-top:14px">${ic('Info', 18)}<span>Items marked “Added by ${t.first}” are written by the tutor. Tutafy does not verify them.</span></div>`

const madeWith = t => `<div class="made">${t.free ? '<a href="#" rel="noopener">Made with Tutafy</a>' : ''}</div>`

const stickyBar = (t, extra = '') => `<div class="stickybar ${extra}"><div class="stickybar-in"><div class="sb-info"><b>From ${money(t, fromPrice(t))}${t.trial ? ` · trial ${money(t, t.trial.price)}` : ''}</b><span>Next free time: ${nextSlot(t).label}</span></div><a class="btn btn-primary" href="#">${t.trial ? 'Book trial' : 'Book a lesson'}</a></div></div>`

const STATE_NAME = { full: 'Full profile (Pro plan)', new: 'New tutor (Free plan, nothing filled in yet)', free: 'Free plan (Made with Tutafy line shown)' }

function shell({ title, bar, body, t, footer = true, extraHead = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="robots" content="noindex">
<link rel="stylesheet" href="styles.css">
${extraHead}
<script>if (location.search.indexOf('shot=full') > -1) document.documentElement.setAttribute('data-shot', 'full')</script>
</head>
<body>
<div class="sample-bar"><b>Design sample</b> · ${esc(bar)} · The tutor, reviews and numbers on this page are made up</div>
<header class="nav"><div class="nav-in"><a class="logo" href="#"><i>${ic('GraduationCap', 16)}</i>Tutafy</a><div class="nav-r"><a class="hide-sm" href="#">All tutors</a></div></div></header>
${body}
${t ? madeWith(t) : ''}
${footer ? `<footer class="foot"><div class="foot-in"><a class="logo" href="#"><i>${ic('GraduationCap', 14)}</i>Tutafy</a><nav aria-label="Footer"><a href="#">About</a><a href="#">Blog</a><a href="#">Contact</a><a href="#">Privacy</a><a href="#">Terms</a></nav></div></footer>` : ''}
</body>
</html>
`
}

/* ------------------------------------------------------------------ VARIANT A: Marketplace */
function pageA(t) {
  const next = nextSlot(t)
  const three = next.d.t.slice(0, 3).map((x, i) => `<a class="slot ${i === 0 ? 'first' : ''}" href="#">${next.d.d} ${x}</a>`).join('')
  const rating = t.isNew
    ? `<div class="rating"><span class="new-pill">${ic('Sparkles', 14)} New on Tutafy · joined ${t.joined}</span></div>`
    : `<div class="rating">${stars(t.rating)}<b>${t.rating.toFixed(1)}</b><span class="muted">(${t.nrev} reviews)</span><span>${t.taught} lessons taught</span></div>`
  const badges = t.isNew
    ? `<span class="chip chip-green">${ic('Zap')} Trial lesson ${money(t, t.trial.price)}</span><span class="chip chip-indigo">${ic('RefreshCw')} Free cancellation</span>`
    : `<span class="chip chip-green"><span class="dot"></span> Replies ${t.reply}</span><span class="chip chip-indigo">${ic('Repeat')} ${t.rebook} of students book again</span>`
  const main = `
<main class="va-wrap"><div class="va-grid"><div class="va-main">
  <section class="card va-hero">${photoBlock(t, '')}
    <div class="top"><h1>${esc(t.name)}</h1><p class="headline">${esc(t.headline)}</p>${rating}</div>
    <div class="tail"><div class="meta"><span>${ic('MapPin')} ${esc(t.place)}</span><span>${ic('Languages')} ${t.speaks.join(' · ')}</span><span>${ic('GraduationCap')} Teaching since ${t.since}</span></div><div class="badges" style="margin-top:14px">${badges}</div></div>
  </section>
  ${t.video ? `<section class="card"><h2>Meet ${t.first}</h2>${videoBlock(t)}</section>` : ''}
  <section class="card va-about"><h2>About ${t.first}</h2><div>${t.about.map(p => `<p>${esc(p)}</p>`).join('')}</div>
    <div class="va-two"><div><h3>A good fit if</h3><ul class="checks">${t.fit.map(x => `<li>${ic('CircleCheck')}<span>${esc(x)}</span></li>`).join('')}</ul></div>
    <div><h3>Probably not for you if</h3><ul class="checks no">${t.notFit.map(x => `<li>${ic('Minus')}<span>${esc(x)}</span></li>`).join('')}</ul></div></div></section>
  <section class="card"><h2>What ${t.first} teaches</h2><div>${t.subjects.map(s => `<div class="subject"><div><b>${esc(s.n)}</b><div class="lv-text">Levels ${lvText(s.lv)}</div></div>${levelMeter(s.lv)}</div>`).join('')}</div></section>
  <section class="card"><h2>Lessons and prices</h2><div>
    ${t.trial ? `<div class="lesson"><div class="lesson-main"><b>Trial lesson <span class="chip chip-green">First lesson only</span></b><p>${t.trial.min} min · ${esc(t.trial.d)}</p></div><div class="price">${money(t, t.trial.price)}</div></div>` : ''}
    ${t.lessons.map(l => `<div class="lesson"><div class="lesson-main"><b>${l.t}</b><p>${esc(l.d)}</p></div><div class="price">${money(t, l.price)}</div></div>`).join('')}
    ${t.pack ? `<div class="lesson"><div class="lesson-main"><b>${t.pack.n} lessons × ${t.pack.min} min <span class="chip chip-amber">Lesson pack</span></b><p>${esc(t.pack.note)}</p></div><div class="price">${money(t, t.pack.price)}</div></div>` : ''}
  </div></section>
  <section class="card" id="reviews"><h2>Reviews</h2>${t.isNew ? emptyReviews(t) : `<div>${scoreBlock(t)}<hr class="hr"><div style="display:grid;gap:12px">${t.reviews.slice(0, 3).map((r, i) => reviewCard(r, t, i)).join('')}</div><p style="margin-top:14px"><a class="btn btn-secondary" href="#">Show all ${t.nrev} reviews</a></p></div>`}</section>
  ${t.isNew ? `<section class="card"><h2>Background</h2>${detailsAddedByTutor(t)}</section>` : ''}
  <section class="card"><h2>When ${t.first} is free</h2><p class="sec-sub">${tzLine()}</p><div style="display:grid;gap:14px;margin-top:14px">${slotsRow(t, t.slots.slice(0, 4))}</div><p style="margin-top:16px"><a class="btn btn-secondary" href="#">See all times</a></p></section>
  <section class="card"><h2>How booking works</h2>${stepsBlock()}<hr class="hr">${policyBlock(t)}</section>
  <section class="card"><h2>${t.relTitle}</h2>${relatedBlock(t)}</section>
</div>
<aside class="va-side" aria-label="Book ${t.first}">
  <div class="card va-book">
    <div class="from"><b>${money(t, fromPrice(t))}</b><span>/ lesson, from</span></div>
    ${t.trial ? `<span class="chip chip-green trial">${ic('Zap')} Trial lesson ${money(t, t.trial.price)} · ${t.trial.min} min</span>` : ''}
    <div class="next"><div class="next-h">${ic('Clock', 15)} Next free times</div><div class="slots">${three}</div><div class="tz" style="margin-top:8px">${ic('Globe')} Your time zone: ${VIEWER_TZ}</div></div>
    <div class="btns"><a class="btn btn-primary btn-lg btn-block" href="#">Book a lesson ${ic('ArrowRight')}</a>${t.trial ? `<a class="btn btn-secondary btn-block" href="#">Book the ${money(t, t.trial.price)} trial</a>` : ''}</div>
    <ul class="checks"><li>${ic('Check')}<span>No account needed</span></li><li>${ic('Check')}<span>Free cancellation up to 24 hours before</span></li><li>${ic('Check')}<span>Video lesson in your browser</span></li></ul>
  </div>
  <div class="va-reply"><span class="dot"></span> ${t.isNew ? `${t.first} replies by email.` : `${t.first} usually replies ${t.reply}.`}</div>
</aside></div></main>`
  return shell({ title: `${t.name}: sample profile, variant A`, bar: `Variant A, Marketplace · ${STATE_NAME[t.key]}`, body: `<div>${main}${stickyBar(t)}</div>`, t })
}

/* ------------------------------------------------------------------ VARIANT B: Personal page */
function pageB(t) {
  const next = nextSlot(t)
  const stats = t.isNew
    ? `<div class="vb-trust"><div><b>${ic('Zap')} Trial lesson</b>${money(t, t.trial.price)} for 30 minutes</div><div><b>${ic('RefreshCw')} Free cancellation</b>Up to 24 hours before</div><div><b>${ic('Mail')} Replies by email</b>You will hear back after booking</div></div>`
    : `<div class="vb-stats"><div><b>${ic('Star', 18)} ${t.rating.toFixed(1)}</b><span>${t.nrev} reviews</span></div><div><b>${t.taught}</b><span>lessons taught</span></div><div><b>${new Date(2026, 9, 22).getFullYear() - t.since} yrs</b><span>teaching</span></div></div>`
  const body = `
<div class="vb-cover" aria-hidden="true"></div>
<div><main class="vb-wrap">
  <header class="vb-head">${photoBlock(t, '')}
    <h1>${esc(t.name)}</h1>
    <div class="where"><span>${ic('MapPin', 15)} ${esc(t.place)}</span><span>${ic('Languages', 15)} ${t.speaks.join(' · ')}</span></div>
    <p class="headline">${esc(t.headline)}</p>
    ${t.isNew ? `<p style="margin-top:12px"><span class="new-pill">${ic('Sparkles', 14)} New on Tutafy · joined ${t.joined}</span></p>` : ''}
  </header>
  ${stats}
  <div class="vb-cta"><a class="btn btn-primary btn-lg" href="#">${bookLabel(t)} ${ic('ArrowRight')}</a>
    <div class="reply"><span class="dot"></span> ${t.isNew ? `${t.first} replies by email` : `Usually replies ${t.reply}`} · Next free time: ${next.label}</div></div>

  ${t.video ? `<section class="vb-sec"><h2>Meet ${t.first}</h2>${videoBlock(t)}</section>` : ''}

  <section class="vb-sec vb-about"><h2>About ${t.first}</h2>${t.about.map(p => `<p>${esc(p)}</p>`).join('')}
    <div class="badges" style="margin-top:16px">${t.subjects.map(s => `<span class="chip chip-indigo">${esc(s.n)} · ${lvText(s.lv)}</span>`).join('')}</div>
    <div class="va-two" style="margin-top:20px"><div><h3>A good fit if</h3><ul class="checks">${t.fit.map(x => `<li>${ic('CircleCheck')}<span>${esc(x)}</span></li>`).join('')}</ul></div>
    <div><h3>Probably not for you if</h3><ul class="checks no">${t.notFit.map(x => `<li>${ic('Minus')}<span>${esc(x)}</span></li>`).join('')}</ul></div></div>
    ${t.isNew ? `<div style="margin-top:18px">${detailsAddedByTutor(t)}</div>` : ''}</section>

  <section class="vb-sec"><h2>Lessons and prices</h2>
    <div class="vb-tiles">
      ${t.trial ? `<div class="vb-tile hl"><span class="tag">START HERE</span><span class="t">Trial lesson · ${t.trial.min} min</span><span class="p">${money(t, t.trial.price)}</span><p>${esc(t.trial.d)}</p></div>` : ''}
      ${t.lessons.map(l => `<div class="vb-tile"><span class="t">${l.t}</span><span class="p">${money(t, l.price)}</span><p>${esc(l.d)}</p></div>`).join('')}
    </div>
    ${t.pack ? `<div class="vb-pack"><span><b>${t.pack.n} lessons × ${t.pack.min} min: ${money(t, t.pack.price)}</b><br><span class="muted" style="font-size:13px">${esc(t.pack.note)}</span></span><a class="btn btn-secondary" href="#">Ask about a pack</a></div>` : ''}
  </section>

  <section class="vb-sec"><h2>${t.isNew ? 'Reviews' : `${t.rating.toFixed(1)} from ${t.nrev} reviews`}</h2>
    ${t.isNew ? emptyReviews(t) : `<div class="vb-carousel" tabindex="0" aria-label="Student reviews, scroll sideways">${t.reviews.map((r, i) => reviewCard(r, t, i)).join('')}</div>`}
  </section>

  <section class="vb-sec"><h2>Pick a time</h2><p class="sec-sub" style="margin-bottom:12px">${tzLine()}</p>
    <div class="vb-days" role="tablist" aria-label="Days">${t.slots.map(d => `<div class="vb-day ${d === next.d ? 'on' : ''}"><b>${d.d}</b><span>${d.t.length ? `${d.t.length} ${d.t.length === 1 ? 'time' : 'times'}` : 'Full'}</span></div>`).join('')}</div>
    <div class="vb-slots"><div class="day-label">${next.d.d} <span>${next.d.date}</span></div><div class="slots">${next.d.t.map((x, i) => `<a class="slot ${i === 0 ? 'first' : ''}" href="#">${x}</a>`).join('')}</div></div>
  </section>

  <section class="vb-sec vb-faq"><h2>Before you book</h2>
    <details open><summary>How does booking work ${ic('ChevronDown')}</summary><p>Pick a time, enter your name and email, and you are done. There is no account to create. Your confirmation email has the lesson link.</p></details>
    <details><summary>Can I cancel or reschedule? ${ic('ChevronDown')}</summary><p>Yes, free up to 24 hours before the lesson, with the link in your confirmation email. After that, ${t.first} may charge for the lesson.</p></details>
    <details><summary>How do I pay? ${ic('ChevronDown')}</summary><p>By card. ${t.first} sends a secure payment link with your confirmation.</p></details>
    <details><summary>What do I need for the lesson? ${ic('ChevronDown')}</summary><p>A laptop or phone with a camera and a quiet place. The lesson opens in your browser; there is nothing to install.</p></details>
  </section>

  <section class="vb-sec"><h2>${t.relTitle}</h2>${relatedBlock(t)}</section>
</main>${stickyBar(t, 'vb-bar')}</div>`
  return shell({ title: `${t.name}: sample profile, variant B`, bar: `Variant B, Personal page · ${STATE_NAME[t.key]}`, body, t })
}

/* ------------------------------------------------------------------ VARIANT C: Video-first */
function pageC(t) {
  const next = nextSlot(t)
  const media = t.video ? videoBlock(t) : `<div class="vc-photo">${t.photo ? portraitOf(t) : `<div class="monogram" role="img" aria-label="${esc(t.name)} has not added a photo yet">${t.mono}</div>`}</div>`
  const strip = t.isNew
    ? [['Sparkles', `Joined ${t.joined.split(' ')[0]}`, 'New tutor'], ['Zap', `${money(t, t.trial.price)} trial`, '30 minutes'], ['RefreshCw', '24 hours', 'Free cancellation'], ['UserCheck', 'No account', 'Name and email only']]
    : [['Star', `${t.rating.toFixed(1)} / 5`, `${t.nrev} reviews`], ['BookOpen', `${t.taught}`, 'lessons taught'], ['Users', `${t.students}`, 'students'], ['Clock', t.reply.replace('within ', '< '), 'usual reply time']]
  const lessons = []
  if (t.trial) lessons.push({ t: 'Trial lesson', d: `${t.trial.min} min`, p: t.trial.price, x: t.trial.d, hl: true })
  t.lessons.forEach(l => lessons.push({ t: l.t, d: `${l.min} min`, p: l.price, x: l.d }))
  const body = `
<section class="vc-hero"><div class="vc-hero-in">
  ${media}
  <div><span class="eyebrow">${t.isNew ? `${ic('Sparkles', 14)} New on Tutafy` : `<span class="dot"></span> Replies ${t.reply}`}</span>
    <h1>${esc(t.name)}</h1><p class="headline">${esc(t.headline)}</p>
    ${t.isNew ? '' : `<div class="rating">${stars(t.rating)}<b>${t.rating.toFixed(1)}</b><span class="muted">(${t.nrev} reviews)</span></div>`}
    <div class="where"><span>${ic('MapPin')} ${esc(t.place)}</span><span>${ic('Languages')} ${t.speaks.join(' · ')}</span></div>
    <div class="btns"><a class="btn btn-light btn-lg" href="#">${bookLabel(t)} ${ic('ArrowRight')}</a><a class="btn btn-ghost-dark btn-lg" href="#times">See free times</a></div></div>
</div></section>
<div class="vc-strip"><div class="vc-strip-in">${strip.map(([i, b, s]) => `<div><span class="ico">${ic(i, 20)}</span><div><b>${b}</b><span>${s}</span></div></div>`).join('')}</div></div>
<div><div class="vc-tabs"><div class="vc-tabs-in"><nav aria-label="Sections"><a class="on" href="#about">About</a><a href="#lessons">Lessons</a><a href="#reviews">Reviews</a><a href="#times">Times</a><a href="#policies">Policies</a></nav>
  <div class="mini-book"><div class="p"><b>From ${money(t, fromPrice(t))}</b>per lesson</div><a class="btn btn-primary" href="#">Book a lesson</a></div></div></div>
<main class="vc-wrap">
  <section class="card" id="about"><h2>About ${t.first}</h2><div class="vc-about"><div>${t.about.map(p => `<p>${esc(p)}</p>`).join('')}
    <div class="va-two"><div><h3>A good fit if</h3><ul class="checks">${t.fit.map(x => `<li>${ic('CircleCheck')}<span>${esc(x)}</span></li>`).join('')}</ul></div>
    <div><h3>Probably not for you if</h3><ul class="checks no">${t.notFit.map(x => `<li>${ic('Minus')}<span>${esc(x)}</span></li>`).join('')}</ul></div></div></div>
    <div><div class="lbl" style="margin-bottom:10px">At a glance</div><div class="facts">
      ${t.subjects.map(s => `<div style="display:block"><b style="color:var(--g900);font-size:14px">${esc(s.n)}</b>${levelMeter(s.lv)}</div>`).join('')}
      <div>${ic('GraduationCap')}<span><b>${t.isNew ? 'Added by ' + t.first : 'Teaching since'}</b>${t.isNew ? t.creds.join(' · ') : t.since}</span></div>
    </div>${t.isNew ? `<div class="alert alert-info" style="margin-top:14px">${ic('Info', 18)}<span>Items marked “Added by ${t.first}” are written by the tutor. Tutafy does not verify them.</span></div>` : ''}</div></div></section>

  <section class="card" id="lessons"><h2>Lessons and prices</h2><div class="vc-lessons" style="margin-top:20px">
    ${lessons.map(l => `<div class="vc-lesson ${l.hl ? 'hl' : ''}">${l.hl ? '<span class="tag">BEST FOR A FIRST LESSON</span>' : ''}<span class="t">${l.t}</span><span class="p">${money(t, l.p)}</span><span class="d">${l.d}</span><p>${esc(l.x)}</p><a class="btn ${l.hl ? 'btn-primary' : 'btn-secondary'}" href="#">Book</a></div>`).join('')}
  </div>${t.pack ? `<div class="vc-pack"><span><b>${t.pack.n} lessons × ${t.pack.min} min: ${money(t, t.pack.price)}</b> <span class="muted">· ${esc(t.pack.note)}</span></span><a class="btn btn-secondary" href="#">Ask about a pack</a></div>` : ''}</section>

  <section class="card" id="reviews"><h2>Reviews</h2>${t.isNew ? emptyReviews(t) : `<div class="vc-rev-top">${scoreBlock(t)}<div class="badges"><span class="chip chip-green">${ic('Repeat')} ${t.rebook} of students book again</span><span class="chip">${ic('Users')} ${t.students} students taught</span></div></div>
    <div class="vc-revs">${t.reviews.slice(0, 4).map((r, i) => reviewCard(r, t, i)).join('')}</div><p style="margin-top:14px"><a class="btn btn-secondary" href="#">Show all ${t.nrev} reviews</a></p>`}</section>

  <section class="card" id="times"><h2>Pick a time</h2><div class="vc-next"><div>${tzLine()}</div><span class="chip chip-green">${ic('Clock')} Next free time: ${next.label}</span></div>
    <div class="vc-week">${t.slots.map(d => `<div class="vc-col"><div class="dh">${d.d}<span>${d.date.replace(/^[A-Za-z]+, /, '')}</span></div>${d.t.length ? `<div class="slots-in" style="display:grid;gap:8px">${d.t.map((x, i) => `<a class="slot ${d === next.d && i === 0 ? 'first' : ''}" href="#">${x}</a>`).join('')}</div>` : '<div class="none">No times</div>'}</div>`).join('')}</div></section>

  <section class="card" id="policies"><h2>How booking works</h2>${policyBlock(t)}</section>
  <section class="card"><h2>${t.relTitle}</h2>${relatedBlock(t, 'vc-rel')}</section>
</main>${stickyBar(t)}</div>`
  return shell({ title: `${t.name}: sample profile, variant C`, bar: `Variant C, Video-first · ${STATE_NAME[t.key]}`, body, t })
}

/* ------------------------------------------------------------------ tutor dashboard samples */
const DNAV = [['LayoutDashboard', 'Dashboard', 1], ['Users', 'Students'], ['BookOpen', 'Lessons'], ['Calendar', 'Calendar'], ['MessageCircle', 'Messages'], ['Clock', 'Availability'], ['Settings', 'Settings']]
function dashShell({ title, bar, main, tab }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><meta name="robots" content="noindex"><link rel="stylesheet" href="styles.css">
<script>if (location.search.indexOf('shot=full') > -1) document.documentElement.setAttribute('data-shot', 'full')</script></head>
<body>
<div class="sample-bar"><b>Design sample</b> · ${esc(bar)} · Made-up tutor and numbers</div>
<div class="d-shell">
<aside class="d-side"><a class="logo" href="#"><i>${ic('GraduationCap', 16)}</i>Tutafy</a><div class="g">Main</div>
${DNAV.map(([i, l, on]) => `<a href="#" class="${l === tab || (on && !tab) ? 'on' : ''}">${ic(i)} ${l}</a>`).join('')}</aside>
<div class="d-main"><div class="d-top"><span class="muted">Welcome back, Priya</span><div class="who"><span class="chip chip-indigo">Free plan</span><i>PN</i></div></div>
<div class="d-mob-top"><a class="logo" href="#"><i>${ic('GraduationCap', 16)}</i>Tutafy</a><span class="chip chip-indigo">Free plan</span></div>
${main}
<nav class="d-tabbar" aria-label="Main">${[['LayoutDashboard', 'Home'], ['Calendar', 'Calendar'], ['BookOpen', 'Lessons'], ['Users', 'Students'], ['Menu', 'More']].map(([i, l]) => `<a href="#" class="${l === (tab === 'Settings' ? 'More' : 'Home') ? 'on' : ''}">${ic(i)}${l}</a>`).join('')}</nav>
</div></div></body></html>
`
}

const STEPS = [
  { id: 'headline', t: 'Add a one-sentence headline', s: 'Say who you teach and what makes you different.', pct: 10, cta: 'Write headline' },
  { id: 'about', t: 'Write your introduction', s: 'Use a template and fill in the blanks.', pct: 15, cta: 'Use a template' },
  { id: 'prices', t: 'Set your lesson prices', s: 'Students want to see a price before they book.', pct: 15, cta: 'Set prices' },
  { id: 'hours', t: 'Set your free hours', s: 'Students cannot book you until you do.', pct: 20, cta: 'Set free hours' },
  { id: 'photo', t: 'Add a clear photo of your face', s: 'Smiling, good light, plain background.', pct: 15, cta: 'Upload photo' },
  { id: 'review', t: 'Ask your first student for a review', s: 'Send a link after a lesson. We show it with the lesson count.', pct: 15, cta: 'Send review link' },
  { id: 'video', t: 'Add a 60-second intro video', s: 'Optional. Paste a YouTube or Vimeo link.', pct: 10, cta: 'Add video' },
]
function profileCard(done, order) {
  const items = order.map(id => STEPS.find(s => s.id === id))
  const total = items.reduce((a, s) => a + (done.includes(s.id) ? s.pct : 0), 0)
  const firstTodo = items.find(s => !done.includes(s.id))
  const bar = items.filter(s => done.includes(s.id)).map(s => `<i style="width:${s.pct}%"></i>`).join('')
  const rows = items.map(s => {
    const d = done.includes(s.id), nx = firstTodo && firstTodo.id === s.id
    return `<li class="pc-step ${d ? 'done' : ''} ${nx ? 'next' : ''}" data-step="${s.id}"><span class="tick ${nx ? 'cur' : ''}">${d ? ic('Check', 13) : ''}</span>
      <div><b>${s.t}${d ? '' : `<span class="gain">+${s.pct}%</span>`}</b><span class="sub">${d ? 'Done' : s.s}</span></div>
      ${d ? '' : `<a class="btn ${nx ? 'btn-primary' : 'btn-secondary'}" href="#">${s.cta}</a>`}</li>`
  }).join('')
  return { total, html: `<section class="card pc" aria-labelledby="pc-title">
    <div class="pc-head"><div><h2 id="pc-title">Make your profile ready for students</h2><p>Students decide in a few seconds. A complete profile gives them a reason to book a trial lesson.</p></div>
    <div class="pc-pct"><div class="ring" style="--p:${total}" aria-hidden="true"></div><div><b>${total}%</b><div class="muted" style="font-size:12.5px">complete</div></div></div></div>
    <div class="pc-bar" role="progressbar" aria-valuenow="${total}" aria-valuemin="0" aria-valuemax="100" aria-label="Profile ${total}% complete">${bar}</div>
    <ol class="pc-steps">${rows}</ol>
    <div class="pc-foot"><span>${ic('Eye', 15)} Your public page: <b>tutafy.com/tutors/priya-nair</b></span><a class="l" href="#">Preview how students see it ${ic('ArrowRight', 14)}</a></div></section>` }
}
const DASH_STATS = `<div class="d-stats"><div class="d-stat"><span>Lessons this week</span><b>0</b></div><div class="d-stat"><span>Active students</span><b>0</b></div><div class="d-stat"><span>Page visits (7 days)</span><b>12</b></div></div>`

function dashPage1() {
  const card = profileCard(['headline', 'about', 'prices'], ['hours', 'photo', 'review', 'video', 'headline', 'about', 'prices'])
  // Open items first, done items last, so the next action is always at the top.
  return dashShell({ title: 'Dashboard: profile completion (sample)', bar: 'Tutor dashboard · Profile completion at 40%', tab: 'Dashboard',
    main: `<div class="d-body"><h1>Dashboard</h1>${card.html}${DASH_STATS}</div>` })
}
function dashPage3() {
  const slim = `<section class="success" aria-label="Profile complete"><span class="ic">${ic('Check', 20)}</span><div class="grow"><b>Your profile is complete</b><span class="muted" style="font-size:13.5px">Share your page. Most students arrive from a link you send.</span></div>
    <div class="linkbox"><span>tutafy.com/tutors/priya-nair</span><a class="btn btn-primary" style="min-height:38px;padding:6px 14px" href="#">${ic('Copy', 15)} Copy link</a></div></section>`
  return dashShell({ title: 'Dashboard: profile complete (sample)', bar: 'Tutor dashboard · Profile at 100% (the card shrinks to one line)', tab: 'Dashboard',
    main: `<div class="d-body"><h1>Dashboard</h1>${slim}${DASH_STATS}</div>` })
}

const TEMPLATES = [
  { id: 'beginner', n: 'Beginners and nervous speakers', s: 'Warm, slow, no pressure', on: true,
    t: `Hi, I'm <i class="ph-fill">[your name]</i>. I teach <i class="ph-fill">[subject]</i> to <i class="ph-fill">[who you teach, for example beginners]</i>, and I've been tutoring for <i class="ph-fill">[number]</i> years.<br><br>If speaking feels hard, we'll go slowly: short sentences, topics you care about, and no pressure. After every lesson I send you the new words and one small thing to try before next time.<br><br>Book a trial lesson and we'll find a pace that suits you.` },
  { id: 'exam', n: 'Exam preparation', s: 'IELTS, TOEFL, Goethe, DELE',
    t: `Hi, I'm <i class="ph-fill">[your name]</i>. I help <i class="ph-fill">[who, for example busy professionals]</i> prepare for <i class="ph-fill">[exam]</i>. <i class="ph-fill">[One result, for example: Most of my students reach band 7 or higher.]</i><br><br>We start with a quick check of your level, then work from your real material. You leave every lesson with <i class="ph-fill">[number]</i> things to practise before we meet again.<br><br>A good fit if you have an exam date and need a plan.` },
  { id: 'work', n: 'Work and career', s: 'Meetings, interviews, emails', t: '' },
  { id: 'kids', n: 'Kids and teens', s: 'Written for parents', t: '' },
]
function dashPage2() {
  const tpl = TEMPLATES.find(x => x.on)
  const main = `<div class="d-body"><h1>Settings · About you</h1>
<div class="ed-grid"><div style="display:grid;gap:16px">
  <section class="card" style="display:grid;gap:18px">
    <div class="field"><span class="lbl">Photo <small>Shown on your public page</small></span>
      <div class="dropzone"><div class="ph">${ic('Camera', 28)}</div><div><b>Upload a clear photo of your face</b><ul><li>• Smiling, looking at the camera</li><li>• Good light, plain background</li><li>• At least 800 × 1000 px (portrait)</li></ul><p style="margin-top:10px"><a class="btn btn-secondary" href="#">Choose photo</a></p></div></div></div>
    <div class="field"><label for="hl">Headline <small>One sentence: who you teach and what makes you different</small></label>
      <input id="hl" class="input" value="Friendly English conversation practice for beginners and nervous speakers" aria-describedby="hl-help">
      <div class="counter" id="hl-help">72 / 90 characters</div>
      <div class="help">Pattern: <b>[what you teach]</b> for <b>[who]</b>. <b>[your edge]</b>. Avoid “passionate” and “experienced”; show a result instead.</div></div>
  </section>
  <section class="card" style="display:grid;gap:14px">
    <div class="field"><span class="lbl">Introduction <small>Start from a template, then replace the highlighted parts</small></span>
      <div class="tpl-row" role="group" aria-label="Templates">${TEMPLATES.map(x => `<button class="tpl ${x.on ? 'on' : ''}" type="button" aria-pressed="${x.on ? 'true' : 'false'}"><b>${x.n}</b><span>${x.s}</span></button>`).join('')}</div></div>
    <div class="field"><label for="ab">Your introduction <small>Write as if you were talking to one student</small></label>
      <div class="textarea" id="ab" role="textbox" aria-multiline="true" style="min-height:230px">${tpl.t}</div>
      <div class="counter">Aim for 400 to 900 characters</div></div>
    <div class="alert alert-info">${ic('Lightbulb', 18)}<span>A good introduction answers three questions: <b>Who do you help?</b> <b>What happens in a lesson?</b> <b>Why you?</b></span></div>
  </section>
  <section class="card" style="display:grid;gap:14px"><span class="lbl">Subjects and levels <small>Students filter by these</small></span>
    <div class="field"><label for="sj">Subject</label><input id="sj" class="input" value="English conversation"></div>
    <div class="field"><span class="lbl">Levels you teach <small>Select the first and the last</small></span><div class="range" role="group" aria-label="Levels">${LEVELS.map((l, i) => `<button type="button" class="${i <= 2 ? 'on' : ''}" aria-pressed="${i <= 2}">${l}</button>`).join('')}</div></div>
    <div class="field"><label for="vd">Intro video <small>Optional</small></label><input id="vd" class="input" placeholder="Paste a YouTube or Vimeo link"><div class="help">60 to 90 seconds. Say who you help, then show how a lesson feels. Filming on your phone is fine.</div></div>
  </section>
  <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-primary btn-lg" href="#">Save profile</a><a class="btn btn-secondary btn-lg" href="#">Preview public page</a></div>
</div>
<aside class="preview-frame" aria-label="Live preview"><div class="ph-h"><span>How students see you</span><span>Updates as you type</span></div>
  <div class="preview-body"><div class="row"><div class="monogram" style="width:64px;height:80px;border-radius:12px;font-size:22px">PN</div><div><h3>Priya Nair</h3><p class="hl">Friendly English conversation practice for beginners and nervous speakers</p></div></div>
  <div class="badges"><span class="chip chip-indigo">English conversation · A1–B1</span><span class="chip chip-green">${ic('Zap')} Trial from $5</span></div>
  <hr class="hr" style="margin:2px 0"><p style="color:var(--g700);font-size:14px">Hi, I'm Priya. I teach English conversation to beginners, and I've been tutoring for three years. If speaking feels hard, we'll go slowly: short sentences, topics you care about, and no pressure…</p>
  <div class="alert alert-info">${ic('Info', 18)}<span>No photo yet. Students will see your initials. A photo is the first thing they look at.</span></div></div></aside></div></div>`
  return dashShell({ title: 'Settings: About you, with templates (sample)', bar: 'Tutor settings · About you (headline, introduction templates, video, subjects)', tab: 'Settings', main })
}

/* ------------------------------------------------------------------ design system + gallery */
function systemPage() {
  const sw = (n, v, use) => `<div class="sw"><i style="background:${v}"></i><div><b>${n}</b>${v}<br><span class="muted">${use}</span></div></div>`
  const body = `<div class="ds"><div><h1>Design system for the public profile</h1><p class="muted" style="margin-top:6px;max-width:760px">Same indigo and type as the live Tutafy pages. One change on purpose: buttons use indigo-600 so white text passes contrast (6.3:1) at every size. Public pages are light only, like the live ones.</p></div>
  <section class="card"><h2>Colour</h2><div class="swatches">${sw('Indigo 600', '#4F46E5', 'Primary buttons, links')}${sw('Indigo 500', '#6366F1', 'Logo, level bars, focus')}${sw('Indigo 50', '#EEF2FF', 'Tinted blocks, chips')}${sw('Indigo 950', '#1E1B4B', 'Variant C hero')}${sw('Gray 900', '#111827', 'Text')}${sw('Gray 500', '#6B7280', 'Secondary text (4.8:1)')}${sw('Page', '#F7F8FA', 'Background')}${sw('Amber 500', '#F59E0B', 'Stars only')}${sw('Emerald 600', '#059669', 'Free, available, done')}${sw('Red 600', '#DC2626', 'Errors only')}</div></section>
  <section class="card"><h2>Type</h2><div>
    <div class="type-row"><code>Display / 40 800</code><span style="font-size:40px;font-weight:800;letter-spacing:-.03em;line-height:1.1">Maya Reyes</span></div>
    <div class="type-row"><code>H1 / 30 800</code><span style="font-size:30px;font-weight:800;letter-spacing:-.02em">Maya Reyes</span></div>
    <div class="type-row"><code>H2 / 18 700</code><span style="font-size:18px;font-weight:700">Lessons and prices</span></div>
    <div class="type-row"><code>Headline / 18 500</code><span style="font-size:18px;font-weight:500;color:var(--g700)">IELTS and business English coach.</span></div>
    <div class="type-row"><code>Body / 15 400</code><span style="font-size:15px">Lessons are practical. We start with a quick check of your level.</span></div>
    <div class="type-row"><code>Small / 13 400</code><span style="font-size:13px;color:var(--g500)">Times shown in your time zone</span></div></div>
    <p class="muted" style="margin-top:10px">Font: Geist, as the live site (falls back to the system font in these samples). Spacing scale: 4, 8, 12, 16, 24, 36. Radius: 10 (slots), 14 (inner cards), 16 (cards), 999 (chips).</p></section>
  <section class="card"><h2>Buttons, chips, badges</h2><div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center"><a class="btn btn-primary btn-lg" href="#">Book a $10 trial lesson</a><a class="btn btn-primary" href="#">Book a lesson</a><a class="btn btn-secondary" href="#">See all times</a><span style="background:#312E81;padding:10px;border-radius:12px"><a class="btn btn-light" href="#">Book a trial</a></span><span class="chip chip-green"><span class="dot"></span> Replies within 1 hour</span><span class="chip chip-indigo">${ic('Repeat')} 74% book again</span><span class="chip chip-amber">Lesson pack</span><span class="new-pill">${ic('Sparkles', 14)} New on Tutafy</span><a class="slot first" href="#">6:00 PM</a><a class="slot" href="#">7:00 PM</a></div>
    <p class="muted" style="margin-top:10px">Minimum touch target 44 px (slots 40 px). Focus ring: 3 px indigo at 35%. Every button has a text label.</p></section>
  <section class="card"><h2>States</h2><div class="cols">
    <div><div class="lbl" style="margin-bottom:8px">Empty: no reviews yet</div>${emptyReviews({ first: 'Priya', joined: 'October 2026', trial: { price: 5 }, cur: '$' })}</div>
    <div><div class="lbl" style="margin-bottom:8px">Empty: no free times</div><div class="empty"><div class="ic">${ic('CalendarX', 20)}</div><div><b>No free times in the next 14 days</b><p>Send a message and Priya will suggest a time.</p><p style="margin-top:10px"><a class="btn btn-secondary" href="#">Message Priya</a></p></div></div></div>
    <div><div class="lbl" style="margin-bottom:8px">Loading: times</div><div class="card" style="display:grid;gap:10px"><div class="skeleton" style="height:14px;width:40%"></div><div style="display:flex;gap:8px"><div class="skeleton" style="height:40px;width:84px;border-radius:10px"></div><div class="skeleton" style="height:40px;width:84px;border-radius:10px"></div><div class="skeleton" style="height:40px;width:84px;border-radius:10px"></div></div></div></div>
    <div><div class="lbl" style="margin-bottom:8px">Error: times did not load</div><div class="alert alert-error">${ic('AlertCircle', 18)}<span><b>We could not load the free times.</b> Check your connection and try again. <a href="#" style="text-decoration:underline">Try again</a></span></div></div>
    <div><div class="lbl" style="margin-bottom:8px">Booking closed</div><div class="alert alert-info">${ic('Info', 18)}<span><b>Maya is not taking new bookings right now.</b> You can still read the profile and reviews.</span></div></div>
    <div><div class="lbl" style="margin-bottom:8px">No photo: initials fallback</div><div style="display:flex;gap:12px;align-items:center"><div class="monogram" style="width:96px;height:120px;border-radius:14px;font-size:32px">PN</div><span class="muted" style="font-size:13px">Never a grey silhouette. On the public page we do not nag; the nag lives on the tutor's dashboard.</span></div></div></div></section>
  <section class="card"><h2>Rules the three variants share</h2><table><tr><th>Rule</th><th>Why</th></tr>
    <tr><td>Price and next free time are visible without scrolling on a phone (sticky bar)</td><td>The booking decision needs both numbers</td></tr>
    <tr><td>Empty sections fold away or turn into one calm line; never a blank box or “N/A”</td><td>A new tutor must still look trustworthy</td></tr>
    <tr><td>Every review says how many lessons the student had with the tutor</td><td>Proof that the student really took lessons</td></tr>
    <tr><td>Facts the tutor typed are marked “Added by the tutor”; facts Tutafy counted are not</td><td>Honest about what is verified</td></tr>
    <tr><td>Times are shown in the visitor's own time zone</td><td>Removes the most common booking mistake</td></tr>
    <tr><td>“Made with Tutafy”: 56 px strip, gray, 11 px, only on the Free plan</td><td>Same as the live pages (T-0717)</td></tr></table></section></div>`
  return shell({ title: 'Design system for the public profile (sample)', bar: 'Design system · tokens, components and states', body, t: null })
}

const FILES = []
const emit = (name, html) => { FILES.push(name); writeFileSync(join(OUT, name), html) }
const TUTORS = { full: MAYA, new: PRIYA, free: DANIEL }
for (const [state, t] of Object.entries(TUTORS)) {
  emit(`a-${state}.html`, pageA(t))
  emit(`b-${state}.html`, pageB(t))
  emit(`c-${state}.html`, pageC(t))
}
emit('dashboard-1.html', dashPage1())
emit('dashboard-2.html', dashPage2())
emit('dashboard-3.html', dashPage3())
emit('system.html', systemPage())

const gallery = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Tutor profile design samples</title><meta name="robots" content="noindex"><link rel="stylesheet" href="styles.css"></head><body>
<div class="sample-bar"><b>Design samples</b> · T-0761 · Nothing here is live. Tutors, reviews and numbers are made up.</div>
<div class="gl"><div><h1>Three designs for the public tutor profile</h1><p class="lead" style="margin-top:8px">Today <code>/tutors/&lt;slug&gt;</code> has initials, a name, a time zone, one line of text and a generic “What to expect” box. Each design below adds a real photo, a one-sentence headline, price and trial lesson, reviews with lesson counts, an intro video, the next free times, and plain cancellation rules. Each has three states: full profile, new tutor, and Free plan.</p></div>
<div class="gl-grid">
${[['A', 'Marketplace', 'Two columns with a booking card that stays in view. The most familiar layout for people who have used italki or Preply. Best for tutors with many reviews.', 'a'],
   ['B', 'Personal page', 'One narrow column, a round photo on a cover, one big button. Made to be shared as a link on Instagram, WhatsApp or an email signature. Best for tutors who bring their own students.', 'b'],
   ['C', 'Video-first', 'A dark hero with the intro video, a stats strip, section tabs and a week grid of times. The most polished first impression. Without a video it falls back to a large photo.', 'c']].map(([k, n, d, v]) => `<div class="card gl-card"><h2>${k}. ${n}</h2><p class="muted">${d}</p><div class="links"><a class="btn btn-secondary" href="${v}-full.html">Full</a><a class="btn btn-secondary" href="${v}-new.html">New tutor</a><a class="btn btn-secondary" href="${v}-free.html">Free plan</a></div></div>`).join('')}
</div>
<section class="card"><h2>Tutor dashboard</h2><p class="muted" style="margin-top:6px">A profile is only as good as what the tutor fills in. Only 6 of 724 tutors have ever set free hours, so the nudge comes first.</p><div class="links" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><a class="btn btn-secondary" href="dashboard-1.html">Completion card (40%)</a><a class="btn btn-secondary" href="dashboard-2.html">About you, with templates</a><a class="btn btn-secondary" href="dashboard-3.html">Complete (100%)</a><a class="btn btn-secondary" href="system.html">Design system and states</a></div></section>
<section><h2 style="font-size:18px;margin-bottom:10px">How the three differ</h2><div class="gl-wrap-table"><table><tr><th></th><th>A. Marketplace</th><th>B. Personal page</th><th>C. Video-first</th></tr>
<tr><td>Layout</td><td>Content column + sticky booking card</td><td>Single centred column</td><td>Full-width hero, tabs, cards</td></tr>
<tr><td>First impression</td><td>Photo, name, headline, rating, badges</td><td>Round photo on cover, three big numbers, one button</td><td>Video (or large photo) on dark indigo</td></tr>
<tr><td>Booking button</td><td>Card on the right; sticky bar on phones</td><td>Big button in the header; floating bar on every size</td><td>Buttons in hero; price + button in the tab bar</td></tr>
<tr><td>Times</td><td>Next days as lists of chips</td><td>Day pills, then chips</td><td>Week grid, five columns</td></tr>
<tr><td>Reviews</td><td>Score + three stacked reviews</td><td>Sideways carousel</td><td>Score + two-column grid</td></tr>
<tr><td>New tutor</td><td>“New on Tutafy” pill, reviews fold into one calm line, background box</td><td>Trust trio replaces the stats, reviews fold into one line</td><td>Stats strip becomes “joined, trial, cancel, no account”</td></tr>
<tr><td>Strength</td><td>Familiar, scannable, converts on desktop</td><td>Warm, great on phones and for shared links</td><td>Most memorable; video gets the room it needs</td></tr>
<tr><td>Weakness</td><td>Looks like everyone else</td><td>No persistent side card on desktop</td><td>Heaviest to build; hero looks empty without photo or video</td></tr></table></div></section></div></body></html>
`
emit('index.html', gallery)
console.log(`wrote ${FILES.length} files:`, FILES.join(', '))
