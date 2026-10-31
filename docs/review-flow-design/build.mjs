// Builds the static design options in this folder (T-0876). Run from the repository root:  node docs/review-flow-design/build.mjs
// DESIGN ONLY: nothing here is imported by the app, reads or writes data, or changes any live page. Every tutor, student, review and number is made up.
// Output: index.html (one self-contained page: styles inline, a few lines of script for the theme buttons only).
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as L from 'lucide-react'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = dirname(fileURLToPath(import.meta.url))

const ic = (name, size = 16, cls = '') => {
  const C = L[name]
  if (!C) throw new Error(`lucide icon missing: ${name}`)
  return renderToStaticMarkup(createElement(C, { width: size, height: size, 'aria-hidden': 'true', className: cls, strokeWidth: 2 }))
}
const initials = n => n.split(' ').map(x => x[0]).join('').slice(0, 2)

/* ------------------------------------------------------------------ made-up people */
const TUTOR = { name: 'Tomás Ruiz', tile: ['#DCFCE7', '#15803D'], rating: '4.9', reviews: 44, lessons: 312 }
const REVIEWS = [
  { who: 'Maria K.', stars: 5, when: '2 weeks ago', lessons: 'Took 24 lessons', text: 'Tomás is patient and every lesson has a clear plan. After three months I can order food and ask directions without panicking.', tags: ['Patient', 'Well prepared'], reply: 'Thank you, Maria! Your progress on the past tense has been great.' },
  { who: 'James T.', stars: 5, when: 'a month ago', lessons: 'Took 11 lessons', text: 'Clear explanations and real conversation from the first lesson. He corrects me kindly and sends a short summary afterwards.', tags: ['Clear explanations'] },
  { who: 'Anna L.', stars: 4, when: '2 months ago', lessons: 'Took 6 lessons', text: 'Very friendly. I would like a little more speaking practice and a little less grammar, but he adapted when I asked.', tags: ['Friendly'] },
]
const TAGS = [['Patient', 31], ['Clear explanations', 28], ['Well prepared', 22], ['Fun', 14]]

/* ------------------------------------------------------------------ small parts */
const tile = (t, size = 48) => `<span class="tile" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.26)}px;--t-bg:${t.tile[0]};--t-fg:${t.tile[1]};font-size:${Math.round(size * 0.36)}px" role="img" aria-label="${t.name} has not added a photo yet">${initials(t.name)}</span>`
const starRow = (n, size = 16, total = 5) => `<span class="stars" role="img" aria-label="${n} out of ${total} stars">${Array.from({ length: total }, (_, i) => ic('Star', size, i < n ? 'star on' : 'star off')).join('')}</span>`
const btn = (label, kind = 'pri', extra = '') => `<button type="button" class="btn ${kind} ${extra}">${label}</button>`
const chip = (label, on = false) => `<button type="button" class="chip${on ? ' on' : ''}" aria-pressed="${on}">${on ? ic('Check', 14) : ''}${label}</button>`
const chips = (items, on) => `<div class="chips">${items.map((x, i) => chip(x, [].concat(on).includes(i))).join('')}</div>`
const note = (icon, text) => `<p class="note">${ic(icon, 14)}<span>${text}</span></p>`

/** The big star picker. `n` stars filled, `hover` is not drawn (a static sample). */
const picker = (n, size = 34) => `<div class="picker" role="radiogroup" aria-label="Your rating">${Array.from({ length: 5 }, (_, i) => `<button type="button" role="radio" aria-checked="${i + 1 === n}" aria-label="${i + 1} star${i ? 's' : ''}" class="pk${i < n ? ' on' : ''}">${ic('Star', size, 'star ' + (i < n ? 'on' : 'off'))}</button>`).join('')}</div>`

const reviewCard = (r, opts = {}) => `<article class="rv">
  <div class="rvh"><span class="av">${initials(r.who)}</span><div><b>${r.who}</b><span class="mut"> · ${r.when}</span><div class="took">${ic('BadgeCheck', 14)} ${r.lessons} with ${TUTOR.name.split(' ')[0]}</div></div><span class="rvs">${starRow(r.stars, 14)}</span></div>
  <p class="rvt">${r.text}</p>
  ${opts.tags === false ? '' : `<div class="rvtags">${r.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>`}
  ${r.reply && opts.reply !== false ? `<div class="reply"><b>${ic('CornerDownRight', 14)} Reply from ${TUTOR.name.split(' ')[0]}</b><p>${r.reply}</p></div>` : ''}
</article>`

const trust = `<p class="trust">${ic('ShieldCheck', 15)}<span>Only students who have had a lesson with this tutor can write a review. Tutors cannot edit or remove a review.</span></p>`

/* ------------------------------------------------------------------ PART 1: the invitation after the first lesson */
const emailShell = inner => `<div class="mail"><div class="mailh"><span class="mfrom">Tutafy Bookings</span><span class="mut">to you · today, 9:00 AM</span></div><div class="mailb">${inner}</div><p class="mailf">You booked one lesson with ${TUTOR.name} on Tutafy. We only send this once, and one reminder if you do not answer. <a href="#a-stop">Stop reminders</a></p></div>`

const p1A = () => emailShell(`
  <h3>How was your first lesson with ${TUTOR.name.split(' ')[0]}?</h3>
  <p class="mut">Tap a star. It takes ten seconds, and it helps the next student choose.</p>
  <div class="mailstars" role="group" aria-label="Rate your lesson">${[1, 2, 3, 4, 5].map(n => `<a class="ms" href="#a-s${n}" aria-label="${n} star${n > 1 ? 's' : ''}">${ic('Star', 30, 'star on')}<span>${n}</span></a>`).join('')}</div>
  <p class="small mut">Not now? You can rate any time from your student page.</p>`)

const p1B = () => `<div class="stack">
  <section class="panel portal" aria-label="Your lesson">
    <div class="pbanner"><span class="pb-i">${ic('MessageSquareHeart', 22)}</span><div><b>How was your first lesson with ${TUTOR.name.split(' ')[0]}?</b><p class="mut">Your lesson on Thursday at 7:30 PM is finished.</p></div></div>
    <div class="pbrow">${picker(0, 30)}<span class="small mut">Tap a star to start</span></div>
    <div class="pbfoot">${btn('Not now', 'ghost')}<a href="#a-never" class="small">Do not ask again</a></div>
  </section>
  <div class="after-label"><span>and one plain email</span></div>
  ${emailShell(`<h3>Your first lesson is finished</h3><p>Tell ${TUTOR.name.split(' ')[0]} and future students how it went.</p>${btn('Rate your lesson', 'pri')}`)}
</div>`

const p1C = () => `<div class="stack">
  <ol class="timeline" aria-label="When we ask">
    <li><span class="dot"></span><b>Lesson ends</b><span class="mut">Nothing is sent yet</span></li>
    <li><span class="dot on"></span><b>Next morning, 9:00</b><span class="mut">One question by email</span></li>
    <li><span class="dot"></span><b>3 days later</b><span class="mut">One reminder, only if no answer</span></li>
    <li><span class="dot end"></span><b>Then we stop</b><span class="mut">Never a third email</span></li>
  </ol>
  ${emailShell(`<h3>Would you book ${TUTOR.name.split(' ')[0]} again?</h3><p class="mut">One tap. Then you can add stars and a few words if you like.</p>
    <div class="yn"><a class="yes" href="#a-yes">${ic('ThumbsUp', 20)}<b>Yes</b><span>I would book again</span></a><a class="no" href="#a-no">${ic('ThumbsDown', 20)}<b>Not sure</b><span>Tell us more</span></a></div>`)}
</div>`

/* ------------------------------------------------------------------ PART 2: the review form */
const formHead = `<div class="fhead">${tile(TUTOR, 48)}<div><b>Review ${TUTOR.name}</b><span class="mut">Lesson on Thursday, 22 Oct</span></div></div>`
const publicNote = note('Eye', 'Your review is public with your first name and last initial (Maria K.). You can edit it for 7 days.')

const p2A = () => `<section class="panel form" aria-label="Write a review">
  ${formHead}
  <div class="field"><div class="flabel">Your rating <span class="req">Required</span></div>${picker(5)}</div>
  <div class="field"><div class="flabel">What stood out? <span class="optl">Optional</span></div>${chips(['Patient', 'Clear explanations', 'Well prepared', 'Fun', 'Good value'], [0, 2])}</div>
  <div class="field"><label class="flabel" for="r1">Tell other students what it was like <span class="optl">Optional</span></label><div class="ta">Tomás is patient and every lesson has a clear plan.<span class="count">52 / 500</span></div></div>
  ${publicNote}
  ${btn('Publish my review', 'pri', 'wide')}
  ${trust}
</section>`

const p2B = () => `<div class="stack"><section class="panel form" aria-label="Write a review, step 2 of 3">
  ${formHead}
  <div class="prog"><span>Step 2 of 3</span><div class="barp" role="progressbar" aria-valuenow="2" aria-valuemin="1" aria-valuemax="3"><i style="width:66%"></i></div></div>
  <h3 class="q">What went well?</h3>
  <p class="mut">Pick any that fit. Skip if none do.</p>
  <div class="bigopts">${[['Patient', 'He gave me time', 1], ['Clear explanations', 'I understood the why', 1], ['Well prepared', 'There was a plan', 0], ['Fun', 'I enjoyed it', 0]].map(([t, h, on]) => `<button type="button" class="big${on ? ' on' : ''}" aria-pressed="${!!on}"><b>${t}</b><small>${h}</small>${on ? ic('Check', 16, 'tick') : ''}</button>`).join('')}</div>
  <div class="nav">${btn(`${ic('ArrowLeft', 16)}Back`, 'ghost')}${btn(`Next${ic('ArrowRight', 16)}`, 'pri')}</div>
  </section>
  <div class="after-label"><span>step 3 of 3</span></div>
  <section class="panel form" aria-label="Write a review, step 3 of 3">
    <h3 class="q">Add a few words?</h3><p class="mut">Optional. Public with your first name and last initial.</p>
    <div class="ta">Tomás is patient and every lesson has a clear plan.<span class="count">52 / 500</span></div>
    ${publicNote}${btn('Publish my review', 'pri', 'wide')}${trust}
  </section></div>`

const rate3 = (label, n, hint) => `<div class="field"><div class="flabel">${label} <span class="mut hint2">${hint}</span></div>${picker(n, 28)}</div>`
const p2C = () => `<section class="panel form" aria-label="Write a review">
  ${formHead}
  ${rate3('Teaching', 5, 'Explanations, corrections')}
  ${rate3('Preparation', 5, 'Plan, materials, homework')}
  ${rate3('Communication', 4, 'Friendly, on time, replies')}
  <div class="overall"><span>Overall</span>${starRow(5, 18)}<b>4.7</b><span class="mut small">average of the three, shown on the profile</span></div>
  <div class="field"><label class="flabel" for="r3">Your words <span class="optl">Optional</span></label><div class="ta">Tomás is patient and every lesson has a clear plan.<span class="count">52 / 500</span></div></div>
  ${publicNote}${btn('Publish my review', 'pri', 'wide')}${trust}
</section>`

/* ------------------------------------------------------------------ PART 3: reviews and lessons taught on the profile */
const bars = [[5, 78], [4, 16], [3, 4], [2, 1], [1, 1]]
const dist = () => `<div class="dist" aria-label="Rating breakdown">${bars.map(([n, p]) => `<div class="drow"><span>${n}</span>${ic('Star', 12, 'star on')}<div class="dbar"><i style="width:${p}%"></i></div><span class="mut">${p}%</span></div>`).join('')}</div>`
const lessonsFact = `<span class="fact">${ic('GraduationCap', 15)} <b>${TUTOR.lessons}</b> lessons taught on Tutafy</span>`
const profHead = `<div class="phead">${tile(TUTOR, 64)}<div><h2>${TUTOR.name}</h2><p class="mut">Spanish for travel, work and DELE exams.</p></div></div>`

const p3A = () => `<div class="stack">
  ${profHead}
  <section class="panel sum" aria-label="Reviews">
    <div class="sumtop"><div class="big4"><b>${TUTOR.rating}</b>${starRow(5, 18)}<span class="mut">${TUTOR.reviews} reviews</span></div>${dist()}<div class="sumfacts">${lessonsFact}<span class="fact">${ic('BadgeCheck', 15)} Every review is from a student who took a lesson</span></div></div>
  </section>
  <section class="rvlist" aria-label="Student reviews">${REVIEWS.map(r => reviewCard(r)).join('')}<p class="more"><a href="#a-all">Show all ${TUTOR.reviews} reviews</a></p></section>
</div>`

const p3B = () => `<div class="stack">
  ${profHead}
  <div class="inline"><span class="rate">${starRow(5, 15)}<b>${TUTOR.rating}</b><a href="#a-rv">(${TUTOR.reviews} reviews)</a></span><span class="sep">·</span>${lessonsFact}</div>
  <section class="panel sumB" aria-label="Reviews">
    <h3>Reviews</h3>
    <div class="filters" role="group" aria-label="Filter reviews">${chips(['All', 'Patient 31', 'Clear explanations 28', 'Well prepared 22', 'Fun 14'], 0)}</div>
    <div class="rvlist tight">${REVIEWS.slice(0, 2).map(r => reviewCard(r, { tags: false })).join('')}</div>
    <p class="more"><a href="#a-all">Show all ${TUTOR.reviews} reviews</a></p>
  </section></div>`

const p3C = () => `<div class="stack">
  ${profHead}
  <section class="panel high" aria-label="What students say">
    <div class="hiTop"><div class="big4 row"><b>${TUTOR.rating}</b><div>${starRow(5, 16)}<span class="mut">${TUTOR.reviews} reviews · ${TUTOR.lessons} lessons taught</span></div></div></div>
    <p class="flabel">Students often mention</p>
    <div class="tagcount">${TAGS.map(([t, n]) => `<span class="tc"><b>${t}</b><span>${n}</span></span>`).join('')}</div>
    <p class="flabel">In their words</p>
    <div class="quotes">${REVIEWS.slice(0, 3).map(r => `<blockquote><p>“${r.text.split('.')[0]}.”</p><footer>${r.who}, ${r.lessons.toLowerCase()}</footer></blockquote>`).join('')}</div>
    <p class="more"><a href="#a-all">Read all ${TUTOR.reviews} reviews</a></p>
  </section>
  <section class="rvlist" aria-label="A review with a reply">${reviewCard(REVIEWS[0])}</section></div>`

/** The same facts on a directory card, per option. */
function dirCard(kind) {
  const line = kind === 'A' ? `${starRow(5, 14)} <b>${TUTOR.rating}</b> <span class="mut">(${TUTOR.reviews}) · ${TUTOR.lessons} lessons</span>`
    : kind === 'B' ? `${starRow(5, 14)} <b>${TUTOR.rating}</b> <span class="mut">(${TUTOR.reviews})</span>` : `${starRow(5, 14)} <b>${TUTOR.rating}</b> <span class="mut">(${TUTOR.reviews}) · Patient, Clear explanations</span>`
  return `<article class="dcard"><div class="dphoto" style="--t-bg:${TUTOR.tile[0]};--t-fg:${TUTOR.tile[1]}"><span>${initials(TUTOR.name)}</span></div><div class="dbody"><h4>${TUTOR.name}</h4><div class="line">${line}</div>${kind === 'B' ? `<p class="small mut">${TUTOR.lessons} lessons taught on Tutafy</p>` : ''}<p class="mut small">Spanish for travel, work and DELE exams.</p></div></article>`
}
const dirStrip = kind => `<div class="dirstrip"><h4>On the tutor directory card</h4><div class="dcards">${dirCard(kind)}</div></div>`

/* ------------------------------------------------------------------ page */
const frames = html => `<div class="frames">
  <figure class="fig desk"><figcaption>${ic('Monitor', 14)} Computer, 1100 px wide</figcaption><div class="frame desktop">${html}</div></figure>
  <figure class="fig ph"><figcaption>${ic('Smartphone', 14)} Phone, 390 px wide</figcaption><div class="frame phone">${html}</div></figure>
</div>`

function option(id, letter, title, pitch, pros, cons, html, extra = '') {
  return `<section class="opt" id="${id}" aria-labelledby="${id}-h">
  <header><span class="letter">${letter}</span><div><h3 id="${id}-h">${title}</h3><p>${pitch}</p></div></header>
  <div class="proscons"><div><h4>${ic('Check', 14)} Good for</h4><ul>${pros.map(x => `<li>${x}</li>`).join('')}</ul></div><div><h4>${ic('Info', 14)} Watch out for</h4><ul>${cons.map(x => `<li>${x}</li>`).join('')}</ul></div></div>
  ${frames(html)}
  ${extra}
</section>`
}

const BASE_CSS = `
:root { --bg:#f7f8fa; --surface:#fff; --surface2:#f1f3f7; --line:#e5e7eb; --line2:#c9ced8; --ink:#111827; --ink2:#4b5563; --ink3:#6b7280; --acc:#4f46e5; --acc-ink:#4338ca; --acc-bg:#eef2ff; --acc-line:#c7d2fe; --ok:#047857; --ok-bg:#ecfdf5; --warn-bg:#fffbeb; --star:#f59e0b; --pri-ink:#fff; --shadow:0 1px 2px rgba(16,24,40,.06),0 6px 20px rgba(16,24,40,.06); --video:#0f172a; color-scheme: light; }
:root[data-theme="dark"] { --bg:#0e1118; --surface:#161a24; --surface2:#1d2230; --line:#2b3142; --line2:#4a5268; --ink:#f2f4fa; --ink2:#c9cedd; --ink3:#a3abc0; --acc:#6366f1; --acc-ink:#a9b4ff; --acc-bg:rgba(129,140,248,.16); --acc-line:rgba(129,140,248,.45); --ok:#6ee7b7; --ok-bg:rgba(16,185,129,.14); --warn-bg:rgba(245,158,11,.12); --shadow:0 1px 2px rgba(0,0,0,.4),0 6px 20px rgba(0,0,0,.35); --video:#05070c; color-scheme: dark; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#0e1118; --surface:#161a24; --surface2:#1d2230; --line:#2b3142; --line2:#4a5268; --ink:#f2f4fa; --ink2:#c9cedd; --ink3:#a3abc0; --acc:#6366f1; --acc-ink:#a9b4ff; --acc-bg:rgba(129,140,248,.16); --acc-line:rgba(129,140,248,.45); --ok:#6ee7b7; --ok-bg:rgba(16,185,129,.14); --warn-bg:rgba(245,158,11,.12); --shadow:0 1px 2px rgba(0,0,0,.4),0 6px 20px rgba(0,0,0,.35); --video:#05070c; color-scheme: dark; } }
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.5 "Geist", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
a { color: var(--acc-ink); text-underline-offset: 2px; }
h1,h2,h3,h4,p,ul { margin: 0; }
ul { padding: 0; list-style: none; }
svg { flex-shrink: 0; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.mut { color: var(--ink3); } .small { font-size: 13px; }

/* ----- the sheet around the samples ----- */
.bar { }
.topbar { position: sticky; top: 0; z-index: 30; background: var(--surface); border-bottom: 1px solid var(--line); }
.topin { max-width: 1240px; margin: 0 auto; padding: 10px 20px; display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
.sample { font-size: 12.5px; color: var(--ink2); background: var(--warn-bg); border: 1px solid var(--line); border-radius: 999px; padding: 4px 12px; }
.topin nav { display: flex; gap: 4px; flex-wrap: wrap; margin-left: auto; }
.topin nav a { text-decoration: none; color: var(--ink2); font-weight: 600; font-size: 13px; min-height: 36px; padding: 0 12px; display: inline-flex; align-items: center; border-radius: 999px; }
.topin nav a:hover { background: var(--surface2); color: var(--ink); }
.theme { display: inline-flex; border: 1px solid var(--line2); border-radius: 999px; overflow: hidden; }
.theme button { font: inherit; font-size: 13px; font-weight: 600; min-height: 36px; padding: 0 12px; border: 0; background: transparent; color: var(--ink2); cursor: pointer; display: inline-flex; gap: 6px; align-items: center; }
.theme button[aria-pressed="true"] { background: var(--acc); color: #fff; }
.wrap { max-width: 1240px; margin: 0 auto; padding: 28px 20px 80px; }
.hero h1 { font-size: 34px; letter-spacing: -.03em; line-height: 1.1; font-weight: 800; }
.hero p { margin-top: 10px; color: var(--ink2); max-width: 720px; font-size: 16px; }
.part { margin-top: 56px; }
.part > h2 { font-size: 26px; letter-spacing: -.02em; font-weight: 800; }
.part > .lead { color: var(--ink2); margin-top: 8px; max-width: 760px; }
.reco { margin-top: 16px; border: 1px solid var(--acc-line); background: var(--acc-bg); border-radius: 14px; padding: 14px 16px; max-width: 760px; }
.reco b { color: var(--acc-ink); }
.opt { margin-top: 36px; padding-top: 28px; border-top: 1px solid var(--line); }
.opt > header { display: flex; gap: 14px; align-items: flex-start; }
.letter { width: 40px; height: 40px; border-radius: 12px; background: var(--acc); color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 18px; flex-shrink: 0; }
.opt h3 { font-size: 20px; font-weight: 800; letter-spacing: -.01em; }
.opt header p { color: var(--ink2); margin-top: 4px; max-width: 760px; }
.proscons { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 16px; max-width: 900px; }
.proscons h4 { font-size: 13px; display: flex; gap: 6px; align-items: center; color: var(--ink2); margin-bottom: 6px; }
.proscons li { font-size: 14px; color: var(--ink2); padding-left: 14px; position: relative; margin-top: 3px; }
.proscons li::before { content: ""; position: absolute; left: 0; top: 9px; width: 5px; height: 5px; border-radius: 50%; background: var(--line2); }
.frames { display: flex; flex-direction: column; gap: 28px; margin-top: 22px; }
.fig { margin: 0; } .fig.desk { width: 100%; max-width: 1100px; min-width: 0; } .fig.ph { width: 392px; max-width: 100%; }
.fig figcaption { font-size: 12.5px; font-weight: 600; color: var(--ink3); margin-bottom: 8px; display: flex; gap: 6px; align-items: center; }
.frame { container-type: inline-size; background: var(--bg); border: 1px solid var(--line2); border-radius: 16px; padding: 22px; overflow: hidden; }
.frame.phone { width: 392px; max-width: 100%; padding: 16px; }
.dirstrip { margin-top: 18px; max-width: 900px; } .dirstrip h4 { font-size: 13px; color: var(--ink2); margin-bottom: 8px; }
.dcards { display: flex; gap: 14px; flex-wrap: wrap; }
/* ?only=p1a shows one option alone (used for the pictures) */
body[data-only] .hero, body[data-only] .part > h2, body[data-only] .part > .lead, body[data-only] .reco, body[data-only] .owner, body[data-only] .opt:not(.show) { display: none; }
body[data-only] .part { margin-top: 0; } body[data-only] .opt { margin-top: 0; border-top: 0; padding-top: 0; }
.owner { margin-top: 56px; border-top: 1px solid var(--line); padding-top: 28px; max-width: 860px; }
.owner h2 { font-size: 22px; font-weight: 800; } .owner h3 { font-size: 16px; margin-top: 18px; } .owner p, .owner li { color: var(--ink2); margin-top: 6px; }
.owner ul { padding-left: 0; } .owner li { padding-left: 16px; position: relative; } .owner li::before { content: ""; position: absolute; left: 0; top: 11px; width: 6px; height: 6px; border-radius: 50%; background: var(--acc); }

/* ----- product parts (the same look as the live tutor directory) ----- */
.tile { display: inline-grid; place-items: center; background: var(--t-bg); color: var(--t-fg); font-weight: 800; flex-shrink: 0; }
:root[data-theme="dark"] .tile, :root[data-theme="dark"] .ptile { background: var(--surface2); color: var(--acc-ink); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .tile, :root:not([data-theme="light"]) .ptile { background: var(--surface2); color: var(--acc-ink); } }
.btn { font: inherit; font-weight: 700; font-size: 14px; min-height: 44px; padding: 0 18px; border-radius: 12px; border: 1px solid transparent; display: inline-flex; gap: 8px; align-items: center; justify-content: center; cursor: pointer; }
.btn.pri { background: var(--acc); color: #fff; } .btn.pri:hover { filter: brightness(1.08); }
.btn.sec { background: var(--surface); color: var(--acc-ink); border-color: var(--acc-line); }
.btn.ghost { background: transparent; color: var(--ink2); border-color: var(--line2); }
.btn.wide { width: 100%; }
.btn:focus-visible, .chip:focus-visible, .seg button:focus-visible, .big:focus-visible, .blank:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { font: inherit; font-size: 14px; font-weight: 500; min-height: 44px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--line2); background: var(--surface); color: var(--ink); cursor: pointer; display: inline-flex; gap: 6px; align-items: center; }
.chip.on { background: var(--acc); border-color: var(--acc); color: #fff; font-weight: 600; }
.chip.static { min-height: 32px; font-size: 13px; padding: 0 12px; cursor: default; background: var(--acc-bg); border-color: var(--acc-line); color: var(--acc-ink); }
.seg { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--line2); border-radius: 12px; overflow: hidden; background: var(--surface); }
.seg button { font: inherit; font-size: 14px; font-weight: 500; min-height: 44px; padding: 0 14px; border: 0; border-right: 1px solid var(--line); background: transparent; color: var(--ink); cursor: pointer; }
.seg button:last-child { border-right: 0; } .seg button.on { background: var(--acc); color: #fff; font-weight: 700; }
.panel { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 22px; box-shadow: var(--shadow); }
.panel h3 { font-size: 20px; font-weight: 800; letter-spacing: -.01em; }
.field { margin-top: 18px; } .flabel { font-size: 13px; font-weight: 700; color: var(--ink2); margin-bottom: 8px; } .hint { font-size: 12.5px; color: var(--ink3); margin-top: 6px; }
.tz { display: flex; gap: 6px; align-items: center; font-size: 13px; color: var(--ink3); margin-top: 14px; flex-wrap: wrap; }
.switch-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; margin-top: 16px; }
.switch-row b { display: block; font-size: 14px; } .switch-row small { color: var(--ink3); font-size: 12.5px; }
.sw { width: 44px; height: 26px; border-radius: 999px; background: var(--line2); position: relative; flex-shrink: 0; } .sw i { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.3); } .sw.on { background: var(--acc); } .sw.on i { left: 21px; }
.sticky-cta { margin-top: 20px; }
.cols { display: grid; gap: 22px; }
@container (min-width: 760px) { .c-form { grid-template-columns: 380px 1fr; align-items: start; } .c-prof { grid-template-columns: 1fr 320px; align-items: start; } }
.results-head h3 { font-size: 20px; font-weight: 800; } .results-head p { margin-top: 4px; font-size: 14px; }
.mgrid { display: grid; gap: 14px; margin-top: 14px; }
@container (min-width: 1000px) { .stack .mgrid { grid-template-columns: repeat(3, 1fr); } }
.mcard { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 16px; box-shadow: var(--shadow); display: grid; gap: 10px; align-content: start; }
.mtop { display: flex; gap: 12px; align-items: center; } .mid { min-width: 0; flex: 1; } .mid h4 { font-size: 17px; font-weight: 800; line-height: 1.2; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.line { font-size: 13px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 3px; }
.rank { font-size: 12px; font-weight: 800; color: var(--acc-ink); background: var(--acc-bg); border-radius: 999px; padding: 2px 9px; align-self: flex-start; }
.rate { display: inline-flex; align-items: center; gap: 4px; font-size: 13.5px; } .star { color: var(--star); fill: var(--star); }
.whyh { font-size: 12px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: var(--ink3); }
.why li { display: flex; gap: 8px; font-size: 14px; color: var(--ink); margin-top: 4px; } .ok { color: var(--ok); margin-top: 3px; }
.next { display: flex; gap: 8px; align-items: center; background: var(--ok-bg); color: var(--ok); border-radius: 12px; padding: 8px 12px; font-size: 13px; } .next b { font-weight: 700; } .next small { display: block; font-size: 11.5px; opacity: .85; line-height: 1.2; }
.mfoot, .book .price { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.price small { display: block; font-size: 12px; color: var(--ink3); line-height: 1.1; } .price b { font-size: 22px; font-weight: 800; }
.mgrid.compact .why li:nth-child(3) { display: none; }
.stack { display: grid; gap: 22px; }
.prog { display: flex; gap: 14px; align-items: center; font-size: 13px; font-weight: 700; color: var(--ink2); } .bar { flex: 1; height: 6px; background: var(--surface2); border-radius: 99px; overflow: hidden; } .bar i { display: block; height: 100%; background: var(--acc); border-radius: 99px; }
.answers { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 14px; }
.q { font-size: 26px !important; letter-spacing: -.02em; margin-top: 18px; line-height: 1.15; }
.bigopts { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
@container (min-width: 760px) { .bigopts { grid-template-columns: repeat(4, 1fr); } }
.big { font: inherit; text-align: left; min-height: 96px; border: 1px solid var(--line2); background: var(--surface); color: var(--ink); border-radius: 16px; padding: 14px; display: grid; gap: 2px; align-content: start; cursor: pointer; position: relative; }
.big svg { color: var(--ink3); margin-bottom: 6px; } .big b { font-size: 16px; } .big small { color: var(--ink3); font-size: 13px; }
.big.on { border-color: var(--acc); background: var(--acc-bg); box-shadow: 0 0 0 1px var(--acc) inset; } .big.on svg { color: var(--acc-ink); } .big .tick { position: absolute; right: 12px; top: 12px; color: var(--acc-ink); margin: 0; }
.nav { display: flex; justify-content: space-between; gap: 10px; margin-top: 20px; }
.after-label { display: flex; align-items: center; gap: 12px; color: var(--ink3); font-size: 12.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; } .after-label::before, .after-label::after { content: ""; flex: 1; border-top: 1px dashed var(--line2); }
.based { font-size: 14px; color: var(--ink2); } .based a { margin-left: 6px; font-weight: 600; display: inline-flex; gap: 4px; align-items: center; }
.sentence .sent { font-size: 24px; line-height: 1.9; letter-spacing: -.01em; margin-top: 12px; font-weight: 500; }
@container (max-width: 480px) { .sentence .sent { font-size: 19px; line-height: 2; } }
.blank { font: inherit; font-weight: 800; color: var(--acc-ink); background: var(--acc-bg); border: 0; border-bottom: 2px solid var(--acc); border-radius: 8px 8px 0 0; padding: 0 8px; min-height: 40px; display: inline-flex; gap: 4px; align-items: center; cursor: pointer; vertical-align: middle; }
.sent-foot { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 8px; }
.sent-foot .tz { margin: 0; }

/* ----- verified badge and intro video ----- */
.vpill { display: inline-flex; gap: 4px; align-items: center; font-size: 12.5px; font-weight: 700; color: var(--ok); background: var(--ok-bg); border: 1px solid color-mix(in srgb, var(--ok) 30%, transparent); border-radius: 999px; padding: 2px 10px 2px 8px; }
.vicon { display: inline-grid; place-items: center; color: var(--ok); }
.poster, .player, .photo4, .vthumb, .dphoto { position: relative; overflow: hidden; }
.poster { aspect-ratio: 16 / 9; border-radius: 18px; background: var(--video); display: grid; place-items: center; }
.ptile { display: inline-grid; place-items: center; background: var(--t-bg, #E0E7FF); color: var(--t-fg, #4338CA); font-weight: 800; border-radius: 22px; width: 96px; height: 96px; font-size: 34px; opacity: .9; }
.pcap { position: absolute; left: 16px; right: 16px; top: 16px; color: #e2e8f0; font-size: 15px; font-weight: 600; line-height: 1.35; max-width: 32ch; } .player .pcap { top: 52px; }
.poster { background: #0f172a; } .player { background: #0f172a; }
.ptile.big { width: 120px; height: 120px; font-size: 42px; } .ptile.sm { width: 56px; height: 56px; font-size: 20px; border-radius: 14px; }
.play { position: absolute; width: 68px; height: 68px; border-radius: 50%; background: rgba(255,255,255,.94); color: #1e1b4b; display: grid; place-items: center; box-shadow: 0 6px 24px rgba(0,0,0,.4); } .play svg { margin-left: 3px; fill: currentColor; } .play.sm { width: 40px; height: 40px; } .play.sm svg { width: 16px; height: 16px; }
.dur { position: absolute; left: 12px; bottom: 12px; background: rgba(2,6,23,.82); color: #fff; border-radius: 999px; padding: 3px 10px; font-size: 12px; font-weight: 600; display: inline-flex; gap: 5px; align-items: center; }
.cc { position: absolute; right: 12px; bottom: 12px; background: rgba(2,6,23,.82); color: #fff; border-radius: 8px; padding: 3px 8px; font-size: 12px; font-weight: 600; display: inline-flex; gap: 5px; align-items: center; }
.namerow { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 16px; } .namerow h2 { font-size: 28px; letter-spacing: -.02em; font-weight: 800; line-height: 1.1; display: inline-flex; gap: 8px; align-items: center; }
.headline { margin-top: 8px; font-size: 16px; color: var(--ink2); }
.facts { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 12px; font-size: 14px; color: var(--ink2); } .facts li { display: inline-flex; gap: 6px; align-items: center; }
.about { margin-top: 20px; } .about h3 { font-size: 18px; font-weight: 800; } .about p { margin-top: 6px; color: var(--ink2); }
.book { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 18px; display: grid; gap: 12px; box-shadow: var(--shadow); }
.trial { display: inline-flex; gap: 6px; align-items: center; font-size: 13px; font-weight: 700; color: var(--ok); }
.pop { margin-top: 10px; background: var(--surface); border: 1px solid var(--line2); border-radius: 16px; padding: 14px 16px; box-shadow: var(--shadow); max-width: 440px; position: relative; }
.pop::before { content: ""; position: absolute; top: -7px; left: 36px; width: 12px; height: 12px; background: var(--surface); border-left: 1px solid var(--line2); border-top: 1px solid var(--line2); transform: rotate(45deg); }
.pop-h { font-weight: 800; display: flex; gap: 6px; align-items: center; color: var(--ok); margin-bottom: 8px; }
.pop-a { display: inline-flex; gap: 4px; align-items: center; font-size: 13.5px; font-weight: 600; margin-top: 8px; }
.vlist li { display: flex; gap: 10px; margin-top: 10px; } .vlist .vi { color: var(--ok); margin-top: 2px; } .vlist b { display: block; font-size: 14px; } .vlist span { display: block; font-size: 13px; color: var(--ink3); }
.trust { margin-top: 18px; border: 1px solid color-mix(in srgb, var(--ok) 35%, var(--line)); background: var(--surface); border-radius: 16px; padding: 16px; }
.trust h3 { font-size: 17px; font-weight: 800; display: flex; gap: 8px; align-items: center; color: var(--ok); }
.photo4 { aspect-ratio: 4 / 3; border-radius: 18px; display: grid; place-items: center; background: var(--surface2); }
.photo4 .ptile.big { background: var(--t-bg, #DCFCE7); } .corner { position: absolute; right: 12px; top: 12px; width: 36px; height: 36px; border-radius: 50%; background: var(--surface); color: var(--ok); display: grid; place-items: center; box-shadow: var(--shadow); }
.vidcard { margin-top: 18px; display: flex; gap: 14px; align-items: center; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 12px; flex-wrap: wrap; }
.vthumb { width: 168px; aspect-ratio: 16 / 9; border-radius: 12px; background: var(--video); display: grid; place-items: center; flex-shrink: 0; } .vthumb .play.sm { background: rgba(255,255,255,.94); } .vthumb .dur { left: 8px; bottom: 8px; padding: 1px 8px; }
.vtext { display: grid; gap: 6px; min-width: 200px; flex: 1; } .vtext b { font-size: 16px; } .vtext span { color: var(--ink2); font-size: 14px; } .vtext .btn { justify-self: start; min-height: 40px; }
.mediabox { display: grid; gap: 10px; }
.mtabs { display: inline-flex; justify-self: start; border: 1px solid var(--line2); border-radius: 999px; padding: 3px; background: var(--surface); } .mtabs button { font: inherit; font-size: 13.5px; font-weight: 600; border: 0; background: transparent; color: var(--ink2); min-height: 38px; padding: 0 14px; border-radius: 999px; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; } .mtabs button.on { background: var(--acc); color: #fff; }
.player { aspect-ratio: 16 / 9; border-radius: 18px; background: var(--video); display: grid; place-items: center; }
.player .ctrl { position: absolute; left: 10px; right: 10px; bottom: 10px; display: flex; gap: 12px; align-items: center; background: rgba(2,6,23,.82); color: #fff; border-radius: 12px; padding: 8px 12px; font-size: 12px; } .scrub { flex: 1; height: 4px; background: rgba(255,255,255,.3); border-radius: 9px; } .scrub i { display: block; height: 100%; background: #818cf8; border-radius: 9px; } .t { font-variant-numeric: tabular-nums; }
.ribbon { position: absolute; left: 12px; top: 12px; z-index: 2; display: inline-flex; gap: 5px; align-items: center; background: var(--surface); color: var(--ok); font-size: 12.5px; font-weight: 800; border-radius: 999px; padding: 4px 11px 4px 9px; box-shadow: var(--shadow); }
.tip-note { margin-top: 8px; } .tip { display: inline-block; font-size: 12.5px; background: var(--ink); color: var(--bg); border-radius: 8px; padding: 6px 10px; }
.dcard { width: 300px; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; overflow: hidden; box-shadow: var(--shadow); }
.dphoto { aspect-ratio: 4 / 3; display: grid; place-items: center; background: var(--t-bg); color: var(--t-fg); font-weight: 800; font-size: 54px; } :root[data-theme="dark"] .dphoto { background: var(--surface2); color: var(--acc-ink); } @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .dphoto { background: var(--surface2); color: var(--acc-ink); } }
.vchip { position: absolute; right: 10px; bottom: 10px; background: rgba(2,6,23,.82); color: #fff; font-size: 12px; font-weight: 600; border-radius: 999px; padding: 2px 9px; display: inline-flex; gap: 4px; align-items: center; }
.dbody { padding: 12px 14px 14px; display: grid; gap: 4px; justify-items: start; } .dbody h4 { font-size: 17px; font-weight: 800; display: inline-flex; gap: 6px; align-items: center; }
`
const css = BASE_CSS + `
/* ----- review flow parts ----- */
.stars { display: inline-flex; gap: 2px; vertical-align: middle; } .star.on { color: var(--star); fill: var(--star); } .star.off { color: var(--line2); fill: none; }
.mail { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow); max-width: 560px; }
.mailh { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 12px 18px; background: var(--surface2); border-bottom: 1px solid var(--line); font-size: 13px; } .mfrom { font-weight: 700; }
.mailb { padding: 22px 22px 18px; display: grid; gap: 12px; justify-items: start; } .mailb h3 { font-size: 22px; font-weight: 800; letter-spacing: -.01em; line-height: 1.2; }
.mailf { padding: 12px 18px; font-size: 12.5px; color: var(--ink3); border-top: 1px solid var(--line); }
.mailstars { display: flex; gap: 8px; flex-wrap: wrap; } .ms { display: grid; justify-items: center; gap: 2px; width: 56px; padding: 8px 0 6px; border: 1px solid var(--line2); border-radius: 14px; text-decoration: none; color: var(--ink2); background: var(--surface); font-weight: 700; font-size: 13px; min-height: 64px; } .ms:hover { border-color: var(--acc); } 
.yn { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; } .yn a { display: grid; gap: 2px; justify-items: center; text-align: center; padding: 14px 8px; border-radius: 14px; text-decoration: none; border: 1px solid var(--line2); min-height: 92px; color: var(--ink); } .yn a span { font-size: 12.5px; color: var(--ink3); } .yn .yes { background: var(--acc-bg); border-color: var(--acc); } .yn svg { color: var(--acc-ink); }
.pbanner { display: flex; gap: 12px; align-items: flex-start; } .pb-i { width: 44px; height: 44px; border-radius: 14px; background: var(--acc-bg); color: var(--acc-ink); display: grid; place-items: center; flex-shrink: 0; } .pbanner b { font-size: 17px; }
.pbrow { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; margin-top: 14px; } .pbfoot { display: flex; gap: 14px; align-items: center; margin-top: 14px; flex-wrap: wrap; }
.picker { display: inline-flex; gap: 2px; } .pk { background: none; border: 0; padding: 4px; min-width: 44px; min-height: 44px; display: grid; place-items: center; cursor: pointer; border-radius: 12px; } .pk:focus-visible { outline: 2px solid var(--acc); }
.timeline { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 0; margin: 0; list-style: none; } @container (max-width: 560px) { .timeline { grid-template-columns: 1fr; } }
.timeline li { display: grid; gap: 2px; border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; background: var(--surface); font-size: 14px; } .timeline .mut { font-size: 13px; } .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--line2); } .dot.on { background: var(--acc); } .dot.end { background: var(--ink3); }
.fhead { display: flex; gap: 12px; align-items: center; } .fhead b { display: block; font-size: 17px; } .fhead .mut { font-size: 13px; }
.req, .optl { font-weight: 500; font-size: 12px; margin-left: 6px; color: var(--ink3); } .req { color: var(--acc-ink); } .hint2 { font-weight: 400; font-size: 12.5px; }
.ta { border: 1px solid var(--line2); border-radius: 12px; min-height: 96px; padding: 12px 14px; font-size: 15px; background: var(--surface); position: relative; padding-bottom: 28px; } .count { position: absolute; right: 12px; bottom: 8px; font-size: 12px; color: var(--ink3); }
.note { display: flex; gap: 8px; font-size: 13px; color: var(--ink2); margin-top: 14px; align-items: flex-start; } .note svg { margin-top: 2px; color: var(--ink3); }
.trust { display: flex; gap: 8px; font-size: 13px; color: var(--ink2); margin-top: 14px; align-items: flex-start; } .trust svg { color: var(--ok); margin-top: 2px; }
.form .btn.wide { margin-top: 16px; }
.overall { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 18px; padding: 12px 14px; background: var(--acc-bg); border-radius: 12px; } .overall b { font-size: 20px; }
.prog { display: flex; gap: 14px; align-items: center; font-size: 13px; font-weight: 700; color: var(--ink2); margin-top: 16px; } .barp { flex: 1; height: 6px; background: var(--surface2); border-radius: 99px; overflow: hidden; } .barp i { display: block; height: 100%; background: var(--acc); border-radius: 99px; }
.q { font-size: 24px !important; letter-spacing: -.02em; margin-top: 14px; line-height: 1.15; }
.bigopts { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; } .big { font: inherit; text-align: left; min-height: 84px; border: 1px solid var(--line2); background: var(--surface); color: var(--ink); border-radius: 16px; padding: 12px 14px; display: grid; gap: 2px; align-content: start; cursor: pointer; position: relative; } .big b { font-size: 15.5px; } .big small { color: var(--ink3); font-size: 13px; } .big.on { border-color: var(--acc); background: var(--acc-bg); box-shadow: 0 0 0 1px var(--acc) inset; } .big .tick { position: absolute; right: 12px; top: 12px; color: var(--acc-ink); }
.nav { display: flex; justify-content: space-between; gap: 10px; margin-top: 18px; }
.after-label { display: flex; align-items: center; gap: 12px; color: var(--ink3); font-size: 12.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; } .after-label::before, .after-label::after { content: ""; flex: 1; border-top: 1px dashed var(--line2); }
.phead { display: flex; gap: 14px; align-items: center; } .phead h2 { font-size: 26px; letter-spacing: -.02em; font-weight: 800; line-height: 1.1; }
.sumtop { display: grid; gap: 18px; align-items: center; } @container (min-width: 760px) { .sumtop { grid-template-columns: 180px 1fr 1fr; } }
.big4 { display: grid; gap: 4px; } .big4 b { font-size: 44px; line-height: 1; letter-spacing: -.03em; } .big4.row { display: flex; gap: 14px; align-items: center; } .big4.row b { font-size: 40px; }
.dist { display: grid; gap: 6px; } .drow { display: grid; grid-template-columns: 14px 14px 1fr 38px; gap: 8px; align-items: center; font-size: 13px; } .dbar { height: 8px; background: var(--surface2); border-radius: 99px; overflow: hidden; } .dbar i { display: block; height: 100%; background: var(--star); border-radius: 99px; }
.sumfacts { display: grid; gap: 8px; font-size: 14px; color: var(--ink2); } .fact { display: inline-flex; gap: 8px; align-items: flex-start; } .fact svg { color: var(--ok); margin-top: 3px; } .fact b { color: var(--ink); }
.rvlist { display: grid; gap: 12px; } .rvlist.tight { margin-top: 12px; }
.rv { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 16px; display: grid; gap: 8px; }
.rvh { display: flex; gap: 12px; align-items: flex-start; } .rvh > div { flex: 1; min-width: 0; } .rvs { margin-left: auto; } .av { width: 40px; height: 40px; border-radius: 50%; background: var(--acc-bg); color: var(--acc-ink); display: grid; place-items: center; font-weight: 800; font-size: 14px; flex-shrink: 0; }
.took { display: flex; gap: 5px; align-items: center; font-size: 12.5px; color: var(--ok); margin-top: 2px; font-weight: 600; } .rvt { font-size: 15px; color: var(--ink); }
.rvtags { display: flex; gap: 6px; flex-wrap: wrap; } .tag { font-size: 12.5px; font-weight: 600; background: var(--surface2); color: var(--ink2); border-radius: 999px; padding: 3px 10px; }
.reply { background: var(--surface2); border-radius: 12px; padding: 10px 12px; font-size: 14px; } .reply b { display: flex; gap: 6px; align-items: center; font-size: 13px; color: var(--ink2); } .reply p { margin-top: 4px; color: var(--ink2); }
.more { margin-top: 12px; font-weight: 600; font-size: 14px; }
.inline { display: flex; gap: 10px 14px; flex-wrap: wrap; align-items: center; font-size: 14px; } .inline .rate { display: inline-flex; gap: 6px; align-items: center; } .sep { color: var(--line2); }
.sumB h3, .high h3 { font-size: 18px; font-weight: 800; } .filters { margin-top: 12px; }
.tagcount { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0 16px; } .tc { display: inline-flex; gap: 8px; align-items: center; border: 1px solid var(--line2); border-radius: 999px; padding: 6px 12px; font-size: 14px; background: var(--surface); } .tc span { color: var(--ink3); font-weight: 600; }
.flabel { font-size: 13px; font-weight: 700; color: var(--ink2); }
.quotes { display: grid; gap: 10px; margin-top: 8px; } @container (min-width: 760px) { .quotes { grid-template-columns: repeat(3, 1fr); } }
.quotes blockquote { margin: 0; background: var(--surface2); border-radius: 14px; padding: 14px; } .quotes p { font-size: 15px; } .quotes footer { margin-top: 8px; font-size: 13px; color: var(--ink3); }
.rate b { font-weight: 800; }
`

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Review Flow Options</title>
<style>${css}</style>
</head>
<body>
<div class="topbar"><div class="topin">
  <span class="sample">${ic('Info', 14)} Design samples. Nothing is built. Every name, review and number is made up.</span>
  <div class="theme" role="group" aria-label="Colour scheme"><button type="button" data-t="system" aria-pressed="true">${ic('Monitor', 14)} System</button><button type="button" data-t="light" aria-pressed="false">${ic('Sun', 14)} Light</button><button type="button" data-t="dark" aria-pressed="false">${ic('Moon', 14)} Dark</button></div>
  <nav aria-label="Sections"><a href="#part1">1 · The invitation</a><a href="#part2">2 · The form</a><a href="#part3">3 · On the profile</a><a href="#decide">What I need from you</a></nav>
</div></div>
<main class="wrap">
  <header class="hero">
    <h1>Real reviews, asked for after the first lesson</h1>
    <p>Three parts, three designs each: how we ask a student for a review, the review form, and how reviews and "lessons taught" show on a tutor's profile. Every design is shown on a computer and on a 390 px phone; Light, Dark and System switch the colours. Pick one design for each part and I will build it.</p>
    <div class="reco" style="margin-top:16px"><b>The rules behind all nine designs.</b> Only a student who had a lesson held can review. One review for each student and tutor. A tutor cannot edit or delete a review, only reply once. The student writes with a signed link (no account), and the tutor's profile counts only lessons that were held. Reviews that exist today stay as they are.</div>
  </header>

  <section class="part" id="part1" aria-labelledby="part1-h">
    <h2 id="part1-h">1 · Asking for the review after the first lesson</h2>
    <p class="lead">Most students will not write a review unless asked at the right moment, and asking too much feels like spam. The first lesson is the best moment: the memory is fresh and the student is deciding whether to continue.</p>
    <div class="reco"><b>My suggestion: A.</b> A star in the email is the lowest friction (one tap), the page that opens already holds the rating, and it needs no new screen in the student page. C asks a better question but needs two steps. B depends on the student opening the portal.</div>
    ${option('p1a', 'A', 'An email with five stars to tap', 'Sent the morning after the first lesson. Tapping a star opens the form with that rating already chosen.',
      ['Lowest effort: one tap', 'No account and no portal visit needed', 'Works in every email app (the stars are links)'],
      ['Some email apps preview links, so the link must only open the form and never save a rating by itself', 'A star tap can be a mis-tap, so the form shows it and lets the student change it'],
      p1A())}
    ${option('p1b', 'B', 'A banner in the student portal, plus one plain email', 'The student page shows "How was your first lesson?" with stars once the lesson is over. The email only says the lesson is finished and has one button.',
      ['Feels like part of the product, not marketing', 'The banner can stay until answered or dismissed'],
      ['Students who book without an account may never open the portal', 'More to build: a banner in the portal and the email'],
      p1B())}
    ${option('p1c', 'C', 'One yes-or-no question, then the stars', '"Would you book Tomás again?" is easier to answer than a rating. A "yes" leads to the stars and a few words, a "not sure" to private feedback for the tutor. One reminder, then we stop.',
      ['Answers are more honest than stars', '"Not sure" gives the tutor private feedback instead of a public low rating, without hiding anything from the student'],
      ['Two steps lose some students', 'Needs a place for private feedback, which is more to build'],
      p1C())}
  </section>

  <section class="part" id="part2" aria-labelledby="part2-h">
    <h2 id="part2-h">2 · The review form</h2>
    <p class="lead">What the student sees after tapping the link. It must be short, say plainly what becomes public, and make clear the review is real.</p>
    <div class="reco"><b>My suggestion: A.</b> Stars first, a few tags, optional words, on one screen: it takes under a minute and the tags give search engines and future students short, comparable facts. B is gentler on a phone but longer. C collects more signal but three ratings feel like a survey.</div>
    ${option('p2a', 'A', 'One card: stars, tags, a few words', 'Stars are required, the tags and the text are optional. It says what is public, for how long it can be edited, and who may review.',
      ['Fastest: under a minute', 'Tags become short, comparable facts on the profile', 'One screen to build'],
      ['Long text boxes on a phone are tiring, so the text is optional and capped at 500 characters'],
      p2A())}
    ${option('p2b', 'B', 'Three short steps', 'Stars, then "What went well?" with big answers, then optional words. A progress bar and Back on each step.',
      ['Easy to do one-handed on a phone', 'Each step can be explained'],
      ['More taps; a step is lost when someone leaves', 'Three screens to build and test'],
      p2B())}
    ${option('p2c', 'C', 'Three ratings and words', 'Teaching, preparation and communication each get stars; the overall rating is their average.',
      ['More detail for the tutor to learn from', 'Harder to give a vague 5 stars'],
      ['Feels like a survey and may lower the number of reviews', 'The average hides which part was weak unless the profile shows all three'],
      p2C())}
  </section>

  <section class="part" id="part3" aria-labelledby="part3-h">
    <h2 id="part3-h">3 · Reviews and lessons taught on the tutor's profile</h2>
    <p class="lead">A new tutor has no reviews, so the number of lessons taught on Tutafy is the second proof. Both must be easy to trust: every review says how many lessons that student took, and the lesson count only counts lessons that were held.</p>
    <div class="reco"><b>My suggestion: A.</b> The classic summary (average, breakdown, count, lessons taught) is what students from Airbnb, Amazon and iTalki already read, so it needs no learning. C is the most persuasive once a tutor has many reviews, and could be added later. B is the lightest but hides the breakdown.</div>
    ${option('p3a', 'A', 'A summary card, then the reviews', 'The average with a breakdown by stars, the number of reviews and lessons taught, a line saying every review is from a student who took a lesson, then the reviews.',
      ['Familiar, trusted, easy to read', 'The breakdown shows that a 4.9 is not made of 5s alone'],
      ['Takes a lot of height on a phone before the first review'],
      p3A(), dirStrip('A'))}
    ${option('p3b', 'B', 'A line by the name, a Reviews section with tag filters', 'The rating and lessons taught sit by the name; the reviews can be filtered by what students mention (Patient, Clear explanations...).',
      ['Light: the proof is visible without scrolling', 'Filters let a student check what matters to them'],
      ['No star breakdown', 'Filters need enough reviews to be useful'],
      p3B(), dirStrip('B'))}
    ${option('p3c', 'C', 'Highlights first: what students mention, in their words', 'Tag counts ("Patient 31"), three short quotes, then a full review with the tutor’s reply. Good once there are many reviews.',
      ['Persuasive: quotes answer "what is it like?"', 'Tag counts are real text for search engines and AI answers'],
      ['Useless with fewer than about 10 reviews, so it needs a fallback', 'Quotes are chosen by a rule, which must be fair and visible'],
      p3C(), dirStrip('C'))}
  </section>

  <section class="owner" id="decide" aria-labelledby="decide-h">
    <h2 id="decide-h">What I need from you</h2>
    <h3>1. Pick one design for each part</h3>
    <p>Part 1: A, B or C. Part 2: A, B or C. Part 3: A, B or C. Or say "A for the form, B for the profile".</p>
    <h3>2. Rules to confirm (they change what I build)</h3>
    <ul>
      <li><b>Low ratings:</b> are shown like any other review (my suggestion, it is what makes the rest believable). The tutor can reply once, publicly, but cannot hide or edit it.</li>
      <li><b>Edit window:</b> the student can change their own review for 7 days.</li>
      <li><b>Names:</b> first name and last initial (Maria K.), never an email.</li>
      <li><b>Existing reviews:</b> kept as they are. They get no "lessons taken" line until a lesson can be matched to them.</li>
      <li><b>Abuse:</b> a review link works once and only for a held lesson; the same student cannot review the same tutor twice; Tutafy can remove a review only for abuse (hate, spam, a clearly different tutor), and says so on the page.</li>
    </ul>
    <h3>Notes on all nine designs</h3>
    <ul>
      <li>Words are English only. Targets are at least 44 px. Text is at least 4.5 to 1 against its background in both colour schemes. A star is never the only way to read a rating: the number is always written.</li>
      <li>Photos are initials tiles, like the live directory. Nothing is sent or saved in these samples.</li>
    </ul>
  </section>
</main>
<script>
(function () {
  var root = document.documentElement, btns = document.querySelectorAll('.theme button')
  function set(t) {
    if (t === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t)
    btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-t') === t ? 'true' : 'false') })
  }
  btns.forEach(function (b) { b.addEventListener('click', function () { set(b.getAttribute('data-t')) }) })
  var q = /[?&]theme=(light|dark)/.exec(location.search); if (q) set(q[1])
  var o = /[?&]only=(p[123][abc])/.exec(location.search)
  if (o) { document.body.setAttribute('data-only', o[1]); document.getElementById(o[1]).classList.add('show') }
})()
</script>
</body>
</html>
`

writeFileSync(join(OUT, 'index.html'), html)
console.log('wrote index.html', Math.round(html.length / 1024) + ' KB')
