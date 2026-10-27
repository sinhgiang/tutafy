// Builds the static design samples in this folder (T-0764). Run from the repository root:  node docs/directory-design/build.mjs
// Nothing here touches the app, the database or the live /tutors page. Every tutor, review and number is made up.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as L from 'lucide-react'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = dirname(fileURLToPath(import.meta.url))

/* ------------------------------------------------------------------ helpers (same look as docs/profile-design) */
const ic = (name, size = 16, cls = '') => {
  const C = L[name]
  if (!C) throw new Error(`lucide icon missing: ${name}`)
  return renderToStaticMarkup(createElement(C, { width: size, height: size, 'aria-hidden': 'true', className: cls, strokeWidth: 2 }))
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const initials = n => n.split(' ').map(x => x[0]).join('').slice(0, 2)

/* Flat, made-up portraits that stand in for a tutor's own photo. */
function portrait(p, id) {
  const hair = { long: `<path d="M120 235 C108 130 150 105 200 105 C250 105 292 130 280 235 C284 290 270 330 262 352 L138 352 C130 330 116 290 120 235Z" fill="${p.hair}"/>`, short: '', bun: `<circle cx="200" cy="108" r="34" fill="${p.hair}"/>` }[p.style]
  const top = {
    long: `<path d="M130 215 C132 150 165 128 200 128 C238 128 270 150 270 215 C250 175 220 160 200 160 C175 160 148 178 130 215Z" fill="${p.hair}"/>`,
    short: `<path d="M128 220 C122 140 160 120 200 120 C242 120 278 140 272 220 C262 180 240 158 200 158 C165 158 138 180 128 220Z" fill="${p.hair}"/>`,
    bun: `<path d="M130 215 C134 152 166 132 200 132 C236 132 268 152 270 215 C252 180 224 164 200 164 C176 164 148 180 130 215Z" fill="${p.hair}"/>`,
  }[p.style]
  const g = `g${id}`
  return `<svg class="photo" viewBox="0 0 400 500" role="img" aria-label="Sample portrait (illustration, not a real photo)" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.bg[0]}"/><stop offset="1" stop-color="${p.bg[1]}"/></linearGradient></defs>
  <rect width="400" height="500" fill="url(#${g})"/><circle cx="330" cy="90" r="90" fill="#fff" opacity=".18"/><circle cx="60" cy="420" r="120" fill="#fff" opacity=".12"/>
  ${hair}<path d="M30 500 C30 405 105 352 200 352 C295 352 370 405 370 500Z" fill="${p.shirt}"/><path d="M168 352 L200 410 L232 352Z" fill="${p.inner}"/>
  <rect x="172" y="290" width="56" height="72" rx="22" fill="${p.skin}"/><rect x="172" y="320" width="56" height="30" fill="#000" opacity=".08"/>
  <ellipse cx="200" cy="235" rx="68" ry="82" fill="${p.skin}"/><ellipse cx="132" cy="240" rx="11" ry="20" fill="${p.skin}"/><ellipse cx="268" cy="240" rx="11" ry="20" fill="${p.skin}"/>
  ${top}<ellipse cx="172" cy="238" rx="6" ry="7.5" fill="#1f2937"/><ellipse cx="228" cy="238" rx="6" ry="7.5" fill="#1f2937"/>
  <path d="M176 280 C190 296 210 296 224 280" stroke="#7c2d12" stroke-width="5" stroke-linecap="round" fill="none"/>
  <circle cx="156" cy="266" r="10" fill="#f87171" opacity=".22"/><circle cx="244" cy="266" r="10" fill="#f87171" opacity=".22"/></svg>`
}

// Soft tints for the "no photo" tile, picked from the name so a grid is not one flat colour (never a grey silhouette).
const TILES = [['#E0E7FF', '#4338CA'], ['#FCE7F3', '#BE185D'], ['#DCFCE7', '#15803D'], ['#FEF3C7', '#B45309'], ['#EDE9FE', '#6D28D9'], ['#CCFBF1', '#0F766E']]
const tileFor = name => TILES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TILES.length]

const SKIN = ['#B9835A', '#E8B995', '#8D5A3B', '#F1C7A5', '#C68642', '#EAC09A', '#7B4B2E', '#D9A77C']
const HAIR = ['#2B1B17', '#7A4B24', '#111827', '#8A5A2B', '#3B2416', '#C9A24D', '#1F2937', '#5B3A29']
const SHIRT = ['#312E81', '#334155', '#0F766E', '#9D174D', '#1D4ED8', '#7C2D12', '#4338CA', '#065F46']
const BG = [['#C7D2FE', '#A5B4FC'], ['#FDE68A', '#FCA5A5'], ['#A7F3D0', '#6EE7B7'], ['#FBCFE8', '#F9A8D4'], ['#BAE6FD', '#7DD3FC'], ['#DDD6FE', '#C4B5FD'], ['#FED7AA', '#FDBA74'], ['#BBF7D0', '#86EFAC']]
const STYLE = ['long', 'short', 'bun', 'short', 'long', 'short', 'bun', 'long']
const photoOf = i => ({ skin: SKIN[i % 8], hair: HAIR[(i * 3) % 8], style: STYLE[i % 8], shirt: SHIRT[(i * 5) % 8], inner: '#F8FAFC', bg: BG[(i * 3 + 1) % 8] })

/* ------------------------------------------------------------------ made-up tutors (all names, numbers and times are samples) */
// p: price from (own currency), c: currency symbol, trial: trial price or null, next: label in the viewer's time zone, rating 0 = new tutor.
const T = [
  { n: 'Maya Reyes', l: ['English', 'Spanish'], h: 'IELTS and business English coach. I help busy professionals reach band 7+.', r: 4.9, k: 38, p: 22, c: '$', trial: 10, next: 'Today 6:00 PM', ph: 0 },
  { n: 'Daniel Weiss', l: ['German', 'English'], h: 'German for people moving to Germany, and for Goethe exam candidates.', r: 4.8, k: 17, p: 28, c: '€', trial: 8, next: 'Today 1:00 PM', ph: 1 },
  { n: 'Priya Nair', l: ['English', 'Hindi'], h: 'Friendly English conversation practice for beginners and nervous speakers.', r: 0, k: 0, p: 12, c: '$', trial: 5, next: 'Tomorrow 8:00 AM', ph: null },
  { n: 'Hana Sato', l: ['Japanese'], h: 'Japanese from zero to JLPT N3, with real conversations from the first lesson.', r: 5.0, k: 9, p: 25, c: '$', trial: 12, next: 'Tomorrow 7:00 PM', ph: 2 },
  { n: 'Lucas Moreau', l: ['French', 'English'], h: 'French for travel and work. Clear grammar, relaxed pace.', r: 4.7, k: 21, p: 30, c: '€', trial: null, next: 'Fri 10:00 AM', ph: 3 },
  { n: 'Sofia Marino', l: ['Italian', 'English'], h: 'Italian for beginners and for people with Italian family. Lots of speaking.', r: 4.9, k: 14, p: 26, c: '$', trial: 9, next: 'Tomorrow 3:00 PM', ph: 4 },
  { n: 'Wei Zhang', l: ['Mandarin'], h: 'Mandarin for adults: pronunciation, tones and everyday conversation.', r: 4.8, k: 31, p: 20, c: '$', trial: 6, next: 'Today 8:00 PM', ph: 5 },
  { n: 'Carlos Mendes', l: ['Portuguese', 'Spanish'], h: 'Brazilian Portuguese for expats and for travellers heading to Brazil.', r: 0, k: 0, p: 18, c: '$', trial: 5, next: 'Sat 11:00 AM', ph: null },
  { n: 'Emma Clarke', l: ['English'], h: 'Academic English and essay writing for university applications.', r: 4.6, k: 52, p: 35, c: '£', trial: null, next: 'Mon 9:00 AM', ph: 6 },
  { n: 'Tomás Ruiz', l: ['Spanish'], h: 'Spanish for travel, work and DELE exams. Patient and structured.', r: 4.9, k: 44, p: 24, c: '$', trial: 8, next: 'Tomorrow 5:00 PM', ph: 7 },
  { n: 'Aisha Rahman', l: ['English'], h: 'Relaxed English conversation for people who understand more than they can say.', r: 5.0, k: 11, p: 28, c: '$', trial: 7, next: 'Today 7:30 PM', ph: 3 },
  { n: 'Jonas Kramer', l: ['German'], h: 'Business German, B2 to C1: emails, meetings and negotiations.', r: 4.7, k: 14, p: 40, c: '€', trial: null, next: 'Fri 2:00 PM', ph: 0 },
]

const card = (t, i = 0) => {
  const [bg, fg] = tileFor(t.n)
  const photo = t.ph == null
    ? `<div class="monogram" style="background:${bg};color:${fg}" role="img" aria-label="${esc(t.n)} has not added a photo yet">${initials(t.n)}</div>`
    : portrait(photoOf(t.ph), `d${i}`)
  return `<article class="tcard"><a class="ph" href="#" aria-label="View ${esc(t.n)}'s profile">${photo}${t.trial ? `<span class="tag">${ic('Zap')} Trial ${t.c}${t.trial}</span>` : ''}</a>
  <div class="body"><div class="row1"><h2>${esc(t.n)}</h2>${t.r ? `<span class="rt">${ic('Star')} ${t.r.toFixed(1)} <span>(${t.k})</span></span>` : '<span class="newp">New</span>'}</div>
    <p class="hl">${esc(t.h)}</p><div class="lang">${ic('Languages')} ${t.l.join(' · ')}</div></div>
  <div class="cta"><div class="next">${ic('Clock')}<div><b>Next available</b> · ${t.next}<small>Your time</small></div></div>
    <div class="buy"><div class="pr"><small>From</small><b>${t.c}${t.p}<span> / lesson</span></b></div><a class="btn btn-primary" href="#">Book</a></div></div></article>`
}

const skeleton = () => `<div class="sk-card"><div class="ph skeleton" style="border-radius:0"></div><div class="b"><div class="skeleton" style="height:18px;width:55%"></div><div class="skeleton" style="height:14px;width:95%"></div><div class="skeleton" style="height:14px;width:70%"></div><div class="skeleton" style="height:40px;margin-top:6px"></div></div></div>`

const invite = () => `<aside class="invite"><span class="ico">${ic('GraduationCap', 22)}</span><h2>Teach on Tutafy</h2><p>Add your free hours and your page appears here.</p>
  <ul><li>${ic('Check')}<span>Free page and booking link</span></li><li>${ic('Check')}<span>No commission, you keep 100%</span></li><li>${ic('Check')}<span>Students book without an account</span></li></ul>
  <p style="margin-top:6px"><a class="btn btn-primary" href="#">Create your free page</a></p></aside>`

const tutorBand = () => `<section class="band"><div><h2>Are you a tutor?</h2><p>Set your free hours, and students can book you here. Free to start, no commission.</p></div><a class="btn btn-light btn-lg" href="#">Create your free page</a></section>`

/* ------------------------------------------------------------------ page shell */
function shell({ title, bar, body, extra = '' }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><meta name="robots" content="noindex">
<link rel="stylesheet" href="../profile-design/styles.css"><link rel="stylesheet" href="directory.css">
<script>if (location.search.indexOf('shot=full') > -1) document.documentElement.setAttribute('data-shot', 'full')</script></head>
<body>
<div class="sample-bar"><b>Design sample</b> · ${esc(bar)} · The tutors, prices and times on this page are made up</div>
<header class="nav"><div class="nav-in"><a class="logo" href="#"><i>${ic('GraduationCap', 16)}</i>Tutafy</a><div class="nav-r"><a class="hide-sm" href="#">For tutors</a><a href="#">Student login</a></div></div></header>
${body}
<footer class="foot"><div class="foot-in"><a class="logo" href="#"><i>${ic('GraduationCap', 14)}</i>Tutafy</a><nav aria-label="Footer"><a href="#">About</a><a href="#">Blog</a><a href="#">Contact</a><a href="#">Privacy</a><a href="#">Terms</a></nav></div></footer>
${extra}
</body></html>
`
}

const LANGS = [['English', 14], ['Spanish', 6], ['German', 4], ['French', 3], ['Japanese', 2], ['Italian', 2], ['Mandarin', 2], ['Portuguese', 2]]

const head = () => `<div class="dr-head"><h1>Find a language tutor you can book today</h1><p>Every tutor here has open times in the next 14 days. Book with just your name and email.</p>
  <div class="dr-tz">${ic('Globe')} Times shown in New York time · <a href="#">Change</a></div></div>`

/** the search box and the row of filters; `on` says which are active, `open` which popover is drawn (desktop only) */
function filterBar({ on = {}, applied = [], open = null, sort = 'Recommended' }) {
  const n = Object.values(on).filter(Boolean).length
  const fb = (key, label, icon) => `<button class="fbtn dr-d-only ${on[key] ? 'on' : ''}" type="button" aria-haspopup="dialog" aria-expanded="${open === key}">${ic(icon)} ${label} ${ic('ChevronDown')}</button>`
  const pop = {
    time: `<div class="pop" style="left:265px;top:150px" role="dialog" aria-label="Free times"><div class="grp"><h3>Day (next 14 days)</h3><div class="opts"><button class="opt">Any day</button><button class="opt">Today</button><button class="opt">Next 3 days</button><button class="opt">This weekend</button></div></div>
      <div class="grp"><h3>Time of day (your time)</h3><div class="opts"><button class="opt">Morning <span class="c">before 12</span></button><button class="opt">Afternoon</button><button class="opt on">Evening <span class="c">after 5 PM</span></button></div></div>
      <div class="foot-row"><button class="clear">Clear</button><a class="btn btn-primary" href="#" style="min-height:40px">Show 2 tutors</a></div></div>`,
  }[open] ?? ''
  return `<div class="dr-bar"><div class="dr-search">${ic('Search')}<input type="search" placeholder="Search by name or language" aria-label="Search tutors"></div>
  <div class="dr-filters" role="group" aria-label="Filters">
    ${fb('lang', 'Language', 'Languages')}${fb('price', 'Price', 'Wallet')}${fb('time', 'Free times', 'CalendarClock')}${fb('trial', 'Trial lesson', 'Zap')}
    <button class="fbtn dr-m-only ${n ? 'on' : ''}" type="button">${ic('SlidersHorizontal')} Filters ${n ? `<span class="n">${n}</span>` : ''}</button>
    <span class="sp"></span><button class="fbtn sort" type="button">${ic('ArrowUpDown')} Sort: ${sort} ${ic('ChevronDown')}</button></div>
  ${applied.length ? `<div class="dr-applied">${applied.map(a => `<span class="achip">${a}<button type="button" aria-label="Remove filter ${esc(a)}">${ic('X', 14)}</button></span>`).join('')}<button class="clear" type="button">Clear all</button></div>` : ''}
  ${pop}</div>`
}

const count = (n, of, extra = '') => `<div class="dr-count"><span><b>${n} ${n === 1 ? 'tutor' : 'tutors'}</b>${of ? ` of ${of}` : ''} with open times${extra}</span></div>`

/* ------------------------------------------------------------------ pages */
const pages = {}

pages['full.html'] = shell({
  title: 'Tutor directory: full (sample)', bar: 'Directory · normal state, 27 tutors',
  body: `<main class="dr-wrap">${head()}${filterBar({})}${count(12, 27)}
  <div class="grid">${T.map((t, i) => card(t, i)).join('')}</div>
  <div class="more"><a class="btn btn-secondary" href="#">Show more tutors</a><span>Showing 12 of 27</span></div>${tutorBand()}</main>`,
})

pages['filtered.html'] = shell({
  title: 'Tutor directory: filters applied (sample)', bar: 'Directory · English, up to $30, trial lesson, evenings; Free times open',
  body: `<main class="dr-wrap">${head()}${filterBar({ on: { lang: 1, price: 1, time: 1, trial: 1 }, applied: ['English', 'Up to $30', 'Evening', 'Trial lesson'], open: 'time' })}
  ${count(2, 27)}
  <div class="grid">${[T[0], T[10]].map((t, i) => card(t, i)).join('')}
    <aside class="invite" style="background:#fff;border-style:solid;border-color:var(--g200)"><span class="ico">${ic('Lightbulb', 22)}</span><h2>1 more tutor if you drop “Evening”</h2><p>Priya Nair has a trial lesson and teaches English, but her next free time is in the morning.</p><p><button class="btn btn-secondary" type="button">Show any time of day</button></p></aside></div></main>`,
})

pages['filters.html'] = shell({
  title: 'Tutor directory: filter sheet (sample)', bar: 'Directory · all filters in one sheet (phone), same sheet as a dialog on a computer',
  body: `<main class="dr-wrap">${head()}${filterBar({ on: { lang: 1 }, applied: ['English'] })}${count(14, 27)}<div class="grid">${T.slice(0, 3).map((t, i) => card(t, i)).join('')}</div></main>`,
  extra: `<div class="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-label="Filters"><div class="sh"><h2>Filters</h2><button class="x" type="button" aria-label="Close">${ic('X', 18)}</button></div>
    <div class="grp"><h3>Language</h3><div class="opts">${LANGS.map(([l, c], i) => `<button class="opt ${i === 0 ? 'on' : ''}">${l} <span class="c">${c}</span></button>`).join('')}</div><p class="sec-sub" style="margin-top:6px;font-size:12.5px;color:var(--g500)">Only languages with a tutor who can be booked are listed.</p></div>
    <div class="grp"><h3>Price per lesson</h3><div class="opts"><button class="opt on">Any</button><button class="opt">Up to $15</button><button class="opt">$15 to $30</button><button class="opt">$30 to $50</button><button class="opt">$50+</button></div><p style="margin-top:6px;font-size:12.5px;color:var(--g500)">Other currencies are converted at approximate rates.</p></div>
    <div class="grp"><h3>Free times (your time)</h3><div class="opts"><button class="opt on">Any day</button><button class="opt">Today</button><button class="opt">Next 3 days</button><button class="opt">This weekend</button></div><div class="opts" style="margin-top:8px"><button class="opt">Morning</button><button class="opt">Afternoon</button><button class="opt">Evening</button></div></div>
    <div class="grp"><div class="toggle"><div><b>Trial lesson offered</b><span class="s">Tutors with a cheaper first lesson</span></div><span class="sw-ui" role="switch" aria-checked="false"></span></div></div>
    <div class="foot-row"><button class="clear" type="button">Clear all</button><a class="btn btn-primary" href="#">Show 14 tutors</a></div></div></div>`,
})

pages['few.html'] = shell({
  title: 'Tutor directory: few tutors (sample)', bar: 'Directory · only 3 tutors can be booked today (invite tutors to join)',
  body: `<main class="dr-wrap">${head()}
  <div class="notice"><span class="ic">${ic('Sprout', 20)}</span><div><b>We are just getting started</b><p>We only list tutors who have open times, so there are 3 today. More join every week.</p></div></div>
  ${filterBar({})}${count(3, 3)}
  <div class="grid">${[T[0], T[3], T[9]].map((t, i) => card(t, i)).join('')}${invite()}</div></main>`,
})

pages['nomatch.html'] = shell({
  title: 'Tutor directory: no match (sample)', bar: 'Directory · filters match nobody',
  body: `<main class="dr-wrap">${head()}${filterBar({ on: { lang: 1, price: 1 }, applied: ['French', 'Up to $15'] })}
  <div class="statebox"><span class="big-ic">${ic('SearchX')}</span><h2>No tutors match these filters</h2><p>No French tutor with open times charges up to $15 a lesson.</p>
    <p class="sug">Try <button type="button">removing “Up to $15” (3 tutors)</button> or <button type="button">another language</button>.</p>
    <div class="acts"><a class="btn btn-primary" href="#">Clear all filters</a></div></div></main>`,
})

pages['empty.html'] = shell({
  title: 'Tutor directory: empty (sample)', bar: 'Directory · nobody can be booked right now (launch state)',
  body: `<main class="dr-wrap">${head()}
  <div class="statebox"><span class="big-ic">${ic('CalendarX', 30)}</span><h2>No tutors have open times right now</h2><p>We only list tutors you can book. Check back soon, or if you teach, add your free hours and your page appears here.</p>
    <div class="acts"><a class="btn btn-primary" href="#">Create your free page</a><a class="btn btn-secondary" href="#">How the directory works</a></div></div></main>`,
})

pages['error.html'] = shell({
  title: 'Tutor directory: error and loading (sample)', bar: 'Directory · the list could not be loaded, and the loading state below it',
  body: `<main class="dr-wrap">${head()}${filterBar({ on: { lang: 1 }, applied: ['English'] })}
  <div class="alert alert-error" style="margin-top:22px" role="alert">${ic('AlertCircle', 18)}<span><b>We could not load the tutors.</b> Check your connection and try again. Your filters are kept. <a href="#" style="text-decoration:underline;font-weight:700">Try again</a></span></div>
  <div class="dr-count"><span class="muted">Loading looks like this</span></div>
  <div class="grid" aria-busy="true">${skeleton()}${skeleton()}${skeleton()}</div></main>`,
})

pages['card.html'] = shell({
  title: 'Tutor card anatomy (sample)', bar: 'Card · anatomy and variants',
  body: `<main class="dr-wrap"><div class="dr-head"><h1>The tutor card</h1><p>One card, four sizes of information. The photo and the next free time carry the decision; the price and the Book button sit together at the bottom.</p></div>
  <div class="an-grid" style="margin-top:26px"><div>${card(T[0], 0)}</div><div><ol class="an-list">
    <li><div><b>Photo</b><span>4:3 crop of the tutor's photo. No photo: a soft coloured tile with initials, never a grey silhouette. The green “Trial $10” tag shows only when the tutor offers a trial lesson.</span></div></li>
    <li><div><b>Name and rating</b><span>Stars and review count. A tutor with no reviews shows a quiet “New” pill, so an empty rating never looks like a bad one.</span></div></li>
    <li><div><b>One-sentence headline</b><span>Two lines at most. Until the headline field exists (T-0761), the first sentence of the introduction is used.</span></div></li>
    <li><div><b>Languages</b><span>What the tutor teaches, in the tutor's order.</span></div></li>
    <li><div><b>Next available</b><span>The first free time in the visitor's own time zone (“Today 6:00 PM”, “Tomorrow 8:00 AM”, “Fri 10:00 AM”). It is the reason this tutor is listed; a card without one is never shown.</span></div></li>
    <li><div><b>Price and Book</b><span>“From” the lowest lesson price, in the tutor's own currency. The whole photo is a link to the profile; the Book button goes straight to the booking page.</span></div></li></ol></div></div>
  <h2 style="font-size:20px;font-weight:800;margin:36px 0 14px">Variants</h2>
  <div class="variants">${[card(T[2], 2), card(T[4], 4), card(T[8], 8), card({ ...T[3], n: 'Alexandra Konstantinopoulou-Papadakis', h: 'Japanese from zero to JLPT N3, with real conversations from the first lesson, every lesson, in small steps.' }, 3)].join('')}</div>
  <p class="sec-sub" style="margin-top:10px;font-size:13.5px;color:var(--g500)">Left to right: new tutor with no photo and no reviews; no trial lesson; a different currency (£); a very long name and headline (both wrap, the card keeps its height).</p></main>`,
})

/* ------------------------------------------------------------------ tutor side: "Your listing" card for the dashboard */
function dashShell(main, bar) {
  const NAV = [['LayoutDashboard', 'Dashboard', 1], ['Users', 'Students'], ['BookOpen', 'Lessons'], ['Calendar', 'Calendar'], ['MessageCircle', 'Messages'], ['Clock', 'Availability'], ['Settings', 'Settings']]
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Your listing (sample)</title><meta name="robots" content="noindex">
<link rel="stylesheet" href="../profile-design/styles.css"><link rel="stylesheet" href="directory.css">
<script>if (location.search.indexOf('shot=full') > -1) document.documentElement.setAttribute('data-shot', 'full')</script></head><body>
<div class="sample-bar"><b>Design sample</b> · ${esc(bar)} · Made-up tutor</div>
<div class="d-shell"><aside class="d-side"><a class="logo" href="#"><i>${ic('GraduationCap', 16)}</i>Tutafy</a><div class="g">Main</div>${NAV.map(([i, l, on]) => `<a href="#" class="${on ? 'on' : ''}">${ic(i)} ${l}</a>`).join('')}</aside>
<div class="d-main"><div class="d-top"><span class="muted">Welcome back, Carlos</span><div class="who"><span class="chip chip-indigo">Free plan</span><i>CM</i></div></div>
<div class="d-mob-top"><a class="logo" href="#"><i>${ic('GraduationCap', 16)}</i>Tutafy</a><span class="chip chip-indigo">Free plan</span></div>
<div class="d-body"><h1>Dashboard</h1>${main}</div>
<nav class="d-tabbar" aria-label="Main">${[['LayoutDashboard', 'Home'], ['Calendar', 'Calendar'], ['BookOpen', 'Lessons'], ['Users', 'Students'], ['Menu', 'More']].map(([i, l]) => `<a href="#" class="${l === 'Home' ? 'on' : ''}">${ic(i)}${l}</a>`).join('')}</nav></div></div></body></html>
`
}
const row = (ok, title, sub, cta) => `<li class="ls-row ${ok === 'opt' ? 'opt' : ok ? 'ok' : 'bad'}"><span class="t">${ok === true ? ic('Check', 13) : ic('Minus', 13)}</span><div><b>${title}</b><span class="sub">${sub}</span></div>${cta ? `<a class="btn btn-secondary" href="#">${cta}</a>` : ''}</li>`

pages['listing-not.html'] = dashShell(`<section class="card ls" aria-labelledby="ls-t"><div class="ls-head"><div><h2 id="ls-t">Your listing in the tutor directory</h2><p>Students find you here when your page can be booked. Two things are missing.</p></div><span class="status no">${ic('EyeOff', 16)} Not listed yet</span></div>
  <ul class="ls-rows">${row(true, 'Your booking page is on', 'tutafy.com/book/carlos-mendes')}${row(true, 'Your name', 'Carlos Mendes')}
    ${row(false, 'Free times in the next 14 days', 'Students cannot book you until you add your weekly hours.', 'Add free hours')}
    ${row(false, 'A longer introduction', 'Yours is 41 characters. Aim for at least 80: who you teach and what a lesson is like.', 'Write introduction')}
    ${row('opt', 'A photo (optional)', 'Not required. Without one, students see a coloured tile with your initials. A photo helps you rank higher.')}</ul>
  <div class="ls-foot">${ic('Info')} The directory only lists tutors a student can book. Your booking link still works for the students you send there.</div></section>`, 'Tutor dashboard · listing status: not listed')

pages['listing-yes.html'] = dashShell(`<section class="card ls" aria-labelledby="ls-t"><div class="ls-head"><div><h2 id="ls-t">Your listing in the tutor directory</h2><p>Students can find and book you. Your next free time is shown on your card.</p></div><span class="status yes">${ic('Eye', 16)} Listed</span></div>
  <ul class="ls-rows">${row(true, 'Your booking page is on', 'tutafy.com/book/carlos-mendes')}${row(true, 'Your name', 'Carlos Mendes')}${row(true, 'Free times in the next 14 days', 'Next free time: Sat 11:00 AM (your time)')}${row(true, 'Introduction', '212 characters')}${row('opt', 'A photo (optional)', 'Not added. A photo helps you rank higher.', null)}</ul>
  <div class="ls-foot">${ic('Info')} <span>See your card: <a href="#" style="color:var(--indigo-700);font-weight:600">View in the directory</a> · Do not want to be listed? <a href="#" style="color:var(--indigo-700);font-weight:600">Turn it off in Settings</a></span></div></section>`, 'Tutor dashboard · listing status: listed')

for (const [name, html] of Object.entries(pages)) writeFileSync(join(OUT, name), html)

const gallery = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Tutor directory design samples</title><meta name="robots" content="noindex">
<link rel="stylesheet" href="../profile-design/styles.css"><link rel="stylesheet" href="directory.css"></head><body>
<div class="sample-bar"><b>Design samples</b> · T-0764 · Nothing here is live. Tutors, prices and times are made up.</div>
<div class="gl"><div><h1>A tutor directory that lists only tutors you can book</h1><p class="lead" style="margin-top:8px">Today <code>/tutors</code> lists up to 50 tutors whose booking page is switched on, but only 6 of 724 tutors ever chose free hours, so almost every card leads to someone nobody can book. These pages show the directory once it lists only bookable tutors, and every card says when the tutor is next free.</p></div>
<div class="gl-grid">
${[['Directory', 'The normal state with filters, sort and the card grid.', 'full.html'], ['Filters applied', 'Four filters on, with the Free times panel open and a hint that one more tutor matches without “Evening”.', 'filtered.html'], ['Filter sheet', 'All filters in one sheet on a phone (a dialog on a computer).', 'filters.html'], ['Few tutors', 'Only 3 tutors today: an honest note, and a card that invites tutors to join.', 'few.html'], ['No match', 'Filters match nobody: say why, and offer the nearest fix.', 'nomatch.html'], ['Empty', 'Nobody can be booked right now (launch state).', 'empty.html'], ['Error and loading', 'The list did not load, and the loading placeholders.', 'error.html'], ['Card', 'The tutor card, its parts and its variants.', 'card.html'], ['Tutor side', 'The “Your listing” card in the tutor dashboard: not listed (with what to fix) and listed.', 'listing-not.html']].map(([n, d, f]) => `<div class="card gl-card"><h2>${n}</h2><p class="muted">${d}</p><div class="links"><a class="btn btn-secondary" href="${f}">Open</a>${f === 'listing-not.html' ? '<a class="btn btn-secondary" href="listing-yes.html">Listed</a>' : ''}</div></div>`).join('')}
</div>
<section class="card"><h2>Files</h2><p class="muted" style="margin-top:6px"><code>bookable-rule.md</code> the rule, condition by condition. <code>eligible-tutors.sql</code> the read-only count for the owner to run. <code>proposed-code-changes.md</code> how the code would change (a proposal). Designs share colours and type with the new tutor profile (<code>../profile-design</code>).</p></section></div></body></html>
`
writeFileSync(join(OUT, 'index.html'), gallery)
console.log(`wrote ${Object.keys(pages).length + 1} files`)
