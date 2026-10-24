// Builds the static design samples in this folder (T-0809). Run from the repository root:  node docs/booking-design/build.mjs
// Nothing here touches the app, the database or the live /book pages. Every tutor, review, price and time is made up.
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
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/* A flat illustration that stands in for a tutor's own photo. */
const portrait = () => `<svg class="photo" viewBox="0 0 400 400" role="img" aria-label="Sample portrait (illustration, not a real photo)" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C7D2FE"/><stop offset="1" stop-color="#A5B4FC"/></linearGradient></defs>
<rect width="400" height="400" fill="url(#pg)"/><circle cx="330" cy="70" r="90" fill="#fff" opacity=".18"/>
<path d="M120 200 C108 110 150 85 200 85 C250 85 292 110 280 200 C284 250 270 290 262 330 L138 330 C130 290 116 250 120 200Z" fill="#2B1B17"/>
<path d="M30 400 C30 335 105 292 200 292 C295 292 370 335 370 400Z" fill="#312E81"/><path d="M168 292 L200 345 L232 292Z" fill="#F8FAFC"/>
<rect x="172" y="240" width="56" height="62" rx="22" fill="#B9835A"/><ellipse cx="200" cy="185" rx="66" ry="80" fill="#B9835A"/>
<path d="M132 190 C134 120 168 100 200 100 C236 100 268 120 268 190 C250 150 224 134 200 134 C176 134 150 150 132 190Z" fill="#2B1B17"/>
<ellipse cx="174" cy="190" rx="6" ry="7.5" fill="#1f2937"/><ellipse cx="226" cy="190" rx="6" ry="7.5" fill="#1f2937"/>
<path d="M178 232 C190 246 210 246 222 232" stroke="#7c2d12" stroke-width="5" stroke-linecap="round" fill="none"/></svg>`

/* ------------------------------------------------------------------ pieces */
const sampleBar = t => `<div class="sample"><b>Design sample</b> · ${esc(t)} · every name, price and time is made up · nothing here is the live page</div>`
const star = n => `<span class="stars" aria-hidden="true">${ic('Star', 16).repeat(n)}</span>`

function page({ title, desc, theme = 'light', bar, body, h = '' }) {
  return `<!doctype html><html lang="en"${theme === 'dark' ? ' data-theme="dark"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="stylesheet" href="booking.css">${h}</head><body>
${sampleBar(bar)}${body}</body></html>`
}

const top = (tz = true) => `<header class="top"><div class="top-in"><a class="logo" href="#"><i>${ic('GraduationCap', 16)}</i>Tutafy</a>${tz ? `<span class="tz">${ic('Globe', 14)} Times shown in your time zone: Bangkok (GMT+7)</span>` : ''}</div></header>`
const foot = (made = true) => `<footer class="foot">${made ? `<a href="#">Made with Tutafy</a> · ` : ''}<a href="#">Privacy</a> · <a href="#">Terms</a></footer>`

/* ------------------------------------------------------------------ hero */
function hero(t) {
  const ava = t.photo ? `<div class="ava">${portrait()}</div>` : `<div class="ava" style="background:#E0E7FF;color:#4338CA" role="img" aria-label="${esc(t.name)} initials">${esc(t.name.split(' ').map(x => x[0]).join(''))}</div>`
  const rating = t.reviews
    ? `<span class="rate" style="display:inline-flex;gap:6px;align-items:center">${star(5)}<b>${t.rating}</b><span class="muted">(${t.reviews} reviews)</span></span>`
    : `<span class="pill new">${ic('Sparkles', 14)} New on Tutafy · joined October 2026</span>`
  const meta = [
    t.years ? `<span>${ic('Briefcase')} ${t.years} years teaching</span>` : '',
    t.lessons ? `<span>${ic('BookOpenCheck')} ${t.lessons} lessons taught</span>` : '',
    `<span>${ic('Languages')} ${esc(t.langs)}</span>`,
    `<span>${ic('Clock')} ${esc(t.tz)}</span>`,
  ].join('')
  const chips = (t.subjects || []).map(s => `<span class="pill brand">${esc(s)}</span>`).join('') + (t.trial ? `<span class="pill ok">${ic('Gift', 14)} Trial lesson ${esc(t.trial)}</span>` : '')
  const facts = [
    ['From', t.price ? `${t.price}<small> / ${t.lengths[0]} min</small>` : '<span class="quiet">Ask the tutor</span>'],
    ['Lesson lengths', `${t.lengths.join(' · ')}<small> min</small>`],
    ['Trial lesson', t.trial ? `${t.trial}<small> · once</small>` : '<span class="quiet">Not offered</span>'],
    ['Cancellation', t.cancel ? `Free<small> up to ${t.cancel}h before</small>` : '<span class="quiet">No free cancellation</span>'],
  ].map(([k, v]) => `<div class="fact"><div class="k">${k}</div><div class="v${v.includes('quiet') ? ' quiet-wrap' : ''}">${v}</div></div>`).join('')
  return `<div class="card" style="overflow:hidden"><div class="hero">${ava}
<div class="hero-main"><h1>${esc(t.name)}</h1>${rating}</div>
<div class="hero-rest">${t.headline ? `<p class="headline">${esc(t.headline)}</p>` : ''}<div class="meta">${meta}</div>${chips ? `<div class="chips">${chips}</div>` : ''}</div></div>
<div class="facts">${facts}</div></div>`
}

/* ------------------------------------------------------------------ left column */
const about = t => t.about ? `<section class="card" id="about"><h2>About ${esc(t.name.split(' ')[0])}</h2><div class="prose">${t.about}</div></section>` : `<section class="card" id="about"><h2>About ${esc(t.name.split(' ')[0])}</h2><div class="prose"><p class="muted">${esc(t.name.split(' ')[0])} has not written an introduction yet. You can still book a lesson, and say what you want to work on in the message.</p></div></section>`

const REVIEWS = [
  ['Anna K.', 5, '12 lessons with Maya', 'Maya fixed my interview English in three weeks. Every lesson ended with a short list of what to practise, and she remembered it the next time.'],
  ['Tomás R.', 5, '8 lessons with Maya', 'Patient, well prepared, and she never rushes. My IELTS speaking went from 6 to 7.'],
  ['Linh P.', 4, '3 lessons with Maya', 'Clear explanations and friendly. I would like more homework, which she is happy to give when you ask.'],
]
const reviews = t => t.reviews
  ? `<section class="card" id="reviews"><h2>Reviews</h2><div class="sumrow"><span class="big">${t.rating}</span><div>${star(5)}<div class="small muted">${t.reviews} reviews from students</div></div></div>
${REVIEWS.map(r => `<div class="review"><div style="display:flex;gap:8px;align-items:center">${star(r[1])}<b class="small">${r[0]}</b></div><p>${esc(r[3])}</p><div class="by">${r[2]}</div></div>`).join('')}
<button class="readmore">Show all ${t.reviews} reviews</button></section>`
  : `<section class="card" id="reviews"><h2>Reviews</h2><div class="prose"><p class="muted">No reviews yet. ${esc(t.name.split(' ')[0])} is new on Tutafy. Booking a trial lesson is a low-risk way to meet them first.</p></div></section>`

const policy = t => `<section class="card" id="policy"><h2>Booking and cancellation</h2><div class="policy">
<div class="row">${ic('CalendarCheck')}<div><b>Pick a time, get an email</b><span>You book a time with ${esc(t.name.split(' ')[0])} directly. A confirmation and a link to the video lesson arrive by email.</span></div></div>
<div class="row">${ic('RefreshCw')}<div><b>${t.cancel ? `Free cancellation up to ${t.cancel} hours before` : 'No free cancellation window'}</b><span>${t.cancel ? `Cancel or move the lesson more than ${t.cancel} hours before it starts and nothing is owed.` : 'This tutor has not set a free cancellation window. Ask before you book if you may need to move a lesson.'}</span></div></div>
<div class="row">${ic('Wallet')}<div><b>You pay the tutor directly</b><span>Tutafy does not take payment for lessons. After you book, you see how to pay ${esc(t.name.split(' ')[0])}.</span></div></div></div></section>`

const faq = t => `<section class="card faq" id="faq"><h2>Questions students ask</h2>
<details><summary>How do I book a lesson with ${esc(t.name)}? ${ic('ChevronDown')}</summary><p>Choose a lesson length, pick a day and a time in the calendar, and enter your name and email. You get a confirmation by email straight away.</p></details>
<details><summary>What time zone are the times in? ${ic('ChevronDown')}</summary><p>Times are shown in your own time zone. ${esc(t.name.split(' ')[0])} teaches in ${esc(t.tz)}.</p></details>
<details><summary>${t.trial ? 'How does the trial lesson work?' : 'Can I book a trial lesson?'} ${ic('ChevronDown')}</summary><p>${t.trial ? `Your first lesson with ${esc(t.name.split(' ')[0])} is ${esc(t.trial)}. Switch on “Trial lesson” when you book. It is available once per student.` : `${esc(t.name.split(' ')[0])} does not offer a trial price. You can book a regular lesson and say in the message that you are new.`}</p></details>
<details><summary>What if I need to cancel? ${ic('ChevronDown')}</summary><p>${t.cancel ? `You can cancel for free up to ${t.cancel} hours before the lesson.` : 'This tutor has no free cancellation window. Message them before booking.'}</p></details></section>`

const packages = `<section class="card" id="packages"><h2>Lesson packages</h2><p class="small muted" style="margin-bottom:12px">Buy several lessons at once and pay less per lesson. Paid directly to the tutor.</p><div class="pkgs">
<div class="pkg"><b>5 lesson pack</b><div class="pp">$100 <small>· $20 / lesson</small></div><span class="small muted">Five 60-minute lessons to get started.</span><button class="btn ghost">Buy pack</button></div>
<div class="pkg best"><span class="pill brand" style="justify-self:start">Best value</span><b>10 lesson pack</b><div class="pp">$180 <small>· $18 / lesson</small></div><span class="small muted">Use within six months.</span><button class="btn">Buy pack</button></div></div></section>`

/* ------------------------------------------------------------------ booking card */
const TIMES = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '4:00 PM', '6:00 PM', '7:00 PM', '8:00 PM']

function calendar({ sel = null }) {
  const first = 4 // Oct 1, 2026 is a Thursday (0 = Sunday)
  const cells = []
  for (let i = 0; i < first; i++) cells.push('<span class="blank"></span>')
  for (let d = 1; d <= 31; d++) {
    const dow = (first + d - 1) % 7
    const past = d < 23
    const open = !past && dow !== 0 // closed on Sundays
    const cls = [open ? 'open' : 'off', d === 23 ? 'today' : '', d === sel ? 'sel' : ''].filter(Boolean).join(' ')
    const lab = `${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dow]} October ${d}${past ? ', past' : open ? ', times available' : ', no times'}`
    cells.push(`<button type="button" class="${cls}" ${open ? '' : 'disabled'} aria-label="${lab}"${d === sel ? ' aria-pressed="true"' : ''}>${d}</button>`)
  }
  return `<div class="cal-h"><button class="ib" aria-label="Previous month" disabled>${ic('ChevronLeft')}</button><b>October 2026</b><button class="ib" aria-label="Next month">${ic('ChevronRight')}</button></div>
<div class="cal" role="group" aria-label="October 2026">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(x => `<span class="dow" aria-hidden="true">${x}</span>`).join('')}${cells.join('')}</div>
<div class="legend"><span><i></i>Times available</span><span><i class="x"></i>Not available</span></div>`
}

function bookingCard(t, o = {}) {
  const { state = 'empty', length = 60, trialOn = false, prefilled = false } = o
  const lens = t.lengths.map(v => `<button type="button" aria-pressed="${v === length}">${v} min</button>`).join('')
  const trial = t.trial ? `<div class="trial${trialOn ? ' on' : ''}">${ic('Gift')}<span><b>Trial lesson ${esc(t.trial)}</b><br><span class="small muted">Your first lesson, at an introductory price</span></span><span class="sw" role="switch" aria-checked="${trialOn}" aria-label="Trial lesson"></span></div>` : ''
  const quick = `<div class="next"><div class="lab">${ic('Zap')} Soonest times</div><div class="quick"><button class="tbtn"${''}>Tomorrow<small>9:00 AM</small></button><button class="tbtn">Tomorrow<small>6:00 PM</small></button><button class="tbtn">Mon, Oct 26<small>10:00 AM</small></button></div></div><div class="divider">or pick a date</div>`
  const sel = state === 'picked' || state === 'filled' ? 28 : null
  const times = sel
    ? `<div class="times-h"><b>Wed, October 28</b><span class="small muted">${length} min</span></div><div class="times">${TIMES.map(x => `<button class="tbtn" ${x === '6:00 PM' ? 'aria-pressed="true"' : ''}>${x}</button>`).join('')}</div>`
    : ''
  const tzline = `<div class="tzline">${ic('Globe')} Your time zone: Bangkok (GMT+7) · <a href="#">Change</a></div>`
  const hasTime = sel !== null
  const stepDetails = hasTime
    ? `<div class="step"><div class="step-t"><span class="n">3</span>Your details</div>
${prefilled ? `<div class="strip ok" style="margin-bottom:12px">${ic('CheckCircle2')}<span>Signed in as student@example.com</span></div>` : `<button class="google" type="button">${ic('LogIn', 18)} Continue with Google</button><div class="divider">or enter your details</div>`}
<div class="two"><div class="field"><label for="n">Full name</label><input id="n" class="input${state === 'filled' ? '' : ' focus'}" value="${state === 'filled' ? 'Alex Student' : ''}" placeholder="Alex Student" autocomplete="name"></div>
<div class="field"><label for="e">Email</label><input id="e" class="input" value="${state === 'filled' ? 'alex@example.com' : ''}" placeholder="you@example.com" autocomplete="email"></div></div>
<div class="field"><label for="m">Message <em>(optional)</em></label><textarea id="m" class="input" placeholder="What do you want to work on?"></textarea></div></div>`
    : `<div class="step locked"><div class="step-t"><span class="n">3</span>Your details</div><p class="small muted">Choose a time first. Then you only need your name and email.</p></div>`
  const summary = hasTime ? `<div class="sum">${ic('CalendarClock')}<div><b>Wed, October 28 · 6:00 PM</b><span>${length} min with ${esc(t.name.split(' ')[0])} · ${trialOn ? `Trial ${esc(t.trial)}` : `${esc(t.price || '')}`}</span></div></div>` : ''
  const ready = state === 'filled'
  const cta = `<div class="cta"><button class="btn" ${ready ? '' : 'disabled'}>${ready ? `${ic('CalendarCheck', 20)} Book ${length} min lesson` : hasTime ? 'Enter your name and email to book' : 'Choose a day and time'}</button>
<p class="fine">${t.cancel ? `Free cancellation up to ${t.cancel}h before the lesson.` : 'No free cancellation for this tutor.'} You pay the tutor directly.</p></div>`
  return `<div class="card bk" id="book"><div class="bk-head"><h2>Book a lesson</h2><div class="price">${t.price ? `from <b>${esc(t.price)}</b>` : '<span class="small">Price: ask the tutor</span>'}</div></div>
<div class="step" style="border-top:1px solid var(--line)"><div class="step-t"><span class="n">1</span>Lesson length</div><div class="seg" role="group" aria-label="Lesson length">${lens}</div>${trial}</div>
<div class="step"><div class="step-t"><span class="n">2</span>Day and time</div>${sel ? '' : quick}${calendar({ sel })}${times}${tzline}</div>
${stepDetails}${summary}${cta}</div>`
}

const mbar = t => `<div class="mbar"><div class="p">${t.price ? `from<b>${esc(t.price)}</b>` : '<b>Book</b>'}</div><a class="btn" href="#book" style="text-decoration:none">Book a lesson</a></div>`

/* ------------------------------------------------------------------ made-up tutors */
const maya = {
  name: 'Maya Reyes', photo: true, headline: 'IELTS and business English coach. I help busy professionals speak with confidence and reach band 7+.',
  langs: 'English, Spanish', tz: 'New York (GMT−4)', years: 8, lessons: 412, rating: '4.9', reviews: 38, price: '$22', lengths: [30, 45, 60, 90], trial: '$10', cancel: 24,
  subjects: ['IELTS prep', 'Business English', 'Conversation'],
  about: `<p><strong>I teach English to adults who need it for work or for an exam.</strong> Most of my students are engineers, nurses and managers who already know the grammar and want to sound clear and relaxed when it counts.</p>
<p>Every lesson has one goal and ends with a short practice list, so you always know what to do before we meet again.</p>
<ul><li>${ic('Check', 18)}<span>IELTS speaking and writing, with timed practice</span></li><li>${ic('Check', 18)}<span>Interview, meeting and presentation English</span></li><li>${ic('Check', 18)}<span>Relaxed conversation to build fluency</span></li></ul>
<p class="muted small">Teaching since 2018 · CELTA certified · Also speaks Spanish for beginners</p>`,
}
const newbie = { name: 'Priya Nair', photo: false, headline: '', langs: 'English, Hindi', tz: 'Kolkata (GMT+5:30)', years: 0, lessons: 0, rating: '', reviews: 0, price: '', lengths: [30, 60], trial: '', cancel: 0, subjects: [], about: '' }

/* ------------------------------------------------------------------ pages */
const shell = (t, o, extra = {}) => `${top()}<main class="wrap">${hero(t)}<div class="cols"><div class="content">${about(t)}${extra.packages ? packages : ''}${reviews(t)}${policy(t)}${faq(t)}</div><aside class="book">${extra.book ?? bookingCard(t, o)}</aside></div></main>${foot(!extra.nobrand)}${mbar(t)}`

const pages = {}
pages['booking-empty'] = page({ title: 'Book a lesson with Maya Reyes (design: nothing chosen yet)', desc: 'Design sample: profile and booking page, no date chosen.', bar: 'profile and booking page · nothing chosen yet', body: shell(maya, { state: 'empty' }, { packages: true }) })
pages['booking-picked'] = page({ title: 'Book a lesson with Maya Reyes (design: time chosen)', desc: 'Design sample: a day and time chosen, details step open.', bar: 'a day and a time chosen', body: shell(maya, { state: 'picked', length: 60 }, { packages: true }) })
pages['booking-ready'] = page({ title: 'Book a lesson with Maya Reyes (design: ready to book)', desc: 'Design sample: details filled, trial lesson on, button ready.', bar: 'details filled in, trial lesson on, ready to book', body: shell(maya, { state: 'filled', length: 60, trialOn: true }, { packages: true }) })
pages['booking-dark'] = page({ title: 'Book a lesson with Maya Reyes (design: dark)', desc: 'Design sample: dark theme.', theme: 'dark', bar: 'dark theme', body: shell(maya, { state: 'picked', length: 60 }, { packages: true }) })
pages['booking-new'] = page({ title: 'Book a lesson with Priya Nair (design: new tutor)', desc: 'Design sample: a new tutor with no photo, no price, no reviews.', bar: 'new tutor: no photo, no price, no reviews, Free plan', body: shell(newbie, { state: 'empty', length: 60 }) })

const nohours = `<div class="card bk" id="book"><div class="bk-head"><h2>No times open right now</h2></div><div class="step"><p class="muted">Maya has no free times in the next 14 days. Leave your email and we will tell you the moment one opens.</p>
<div class="two" style="margin-top:14px"><div class="field"><label>Full name</label><input class="input" placeholder="Alex Student"></div><div class="field"><label>Email</label><input class="input" placeholder="you@example.com"></div></div>
<div class="field"><label>Message <em>(optional)</em></label><textarea class="input" placeholder="What do you want to work on?"></textarea></div></div>
<div class="cta"><button class="btn">${ic('Bell', 20)} Tell me when a time opens</button><p class="fine">We only use your email for this. No account needed.</p></div></div>`
pages['booking-nohours'] = page({ title: 'Book a lesson with Maya Reyes (design: no times)', desc: 'Design sample: waitlist when there are no times.', bar: 'no free times: waitlist', body: shell(maya, {}, { book: nohours }) })

/* states sheet: loading, error, empty day, booked */
const st = (title, inner, note) => `<div><p class="small muted" style="margin:0 0 8px;font-weight:600">${title}</p>${inner}<p class="small muted" style="margin-top:8px">${note}</p></div>`
const loading = `<div class="card bk"><div class="bk-head"><div class="sk" style="width:140px;height:24px"></div><div class="sk" style="width:80px;height:24px"></div></div><div class="step"><div class="sk" style="height:44px"></div></div><div class="step"><div class="sk" style="height:20px;width:120px;margin-bottom:12px"></div><div class="sk" style="height:240px"></div></div><div class="cta"><div class="sk" style="height:52px"></div></div></div>`
const errorTimes = `<div class="card bk"><div class="step" style="border-top:0"><div class="step-t"><span class="n">2</span>Day and time</div><div class="strip err" role="alert">${ic('AlertCircle')}<span><b>We could not load the free times.</b> Your connection may have dropped. Nothing was booked.</span></div><button class="btn ghost sm" style="margin-top:12px">${ic('RotateCw', 16)} Try again</button></div></div>`
const noDay = `<div class="card bk"><div class="step" style="border-top:0"><div class="step-t"><span class="n">2</span>Day and time</div><div class="times-h" style="margin-top:0"><b>Tue, October 27</b></div><div class="strip warn">${ic('CalendarX')}<span><b>No times left on this day.</b> The next free time is Wed, October 28 at 9:00 AM.</span></div><button class="btn ghost sm" style="margin-top:12px">Show Wed, October 28</button></div></div>`
const formErr = `<div class="card bk"><div class="step" style="border-top:0"><div class="step-t"><span class="n">3</span>Your details</div><div class="field"><label>Email</label><input class="input bad" value="alex@example" aria-invalid="true"><div class="err-t">${ic('AlertCircle', 14)} Enter an email like name@example.com</div></div></div><div class="cta"><div class="strip err" role="alert" style="margin-bottom:12px">${ic('AlertCircle')}<span><b>That time was just taken.</b> Pick another time. Your details are saved.</span></div><button class="btn" disabled>Enter your name and email to book</button></div></div>`
const booked = `<div class="card bk"><div class="step" style="border-top:0;text-align:center;padding:32px 24px"><div style="width:56px;height:56px;border-radius:50%;background:var(--ok-soft);color:var(--ok);display:grid;place-items:center;margin:0 auto 14px">${ic('CheckCircle2', 30)}</div><h2>You are booked</h2><p class="muted" style="margin-top:6px"><b style="color:var(--ink)">Wed, October 28 · 6:00 PM</b><br>60 min with Maya Reyes</p><div class="strip ok" style="margin-top:16px;text-align:left">${ic('Mail')}<span>Confirmation sent to alex@example.com. Can’t find it? Check your spam folder and add our sender address to your contacts.</span></div></div>
<div class="cta"><button class="btn">Open your student portal ${ic('ArrowRight', 18)}</button><p class="fine">Next: pay Maya directly. You will see how below.</p></div></div>`
pages['states'] = page({ title: 'Booking card states (design)', desc: 'Design sample: loading, errors, empty day, booked.', bar: 'loading, errors, an empty day, booked', body: `${top(false)}<main class="wrap"><h1 style="margin-bottom:16px;font-size:24px">Booking card: states</h1><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,420px));gap:24px;align-items:start">
${st('Loading', loading, 'Grey blocks in the shape of the real card. No spinner over an empty page.')}
${st('Free times did not load', errorTimes, 'Says what happened, that nothing was booked, and offers one button.')}
${st('A day with no times', noDay, 'Points to the next free time instead of leaving a blank panel.')}
${st('Form error, time taken', formErr, 'Error text sits next to the field and says how to fix it. Details are kept.')}
${st('Booked', booked, 'Confirmation, the spam-folder line the app already shows, then the student portal.')}
</div></main>` })

/* ------------------------------------------------------------------ design system page */
const sw = (n, v, d = '') => `<div style="display:flex;gap:10px;align-items:center"><span style="width:36px;height:36px;border-radius:8px;background:var(${v});border:1px solid var(--line-strong)"></span><span class="small"><b>${n}</b><br><span class="muted">${d}</span></span></div>`
pages['design-system'] = page({ title: 'Tutafy booking design system (design)', desc: 'Colours, type, spacing, cards, buttons and states.', bar: 'design system', body: `${top(false)}<main class="wrap"><h1 style="font-size:26px;margin-bottom:6px">Design system</h1><p class="muted" style="margin-bottom:20px">Same indigo and rounded cards the app already uses, tightened. Light and dark are two sets of the same tokens.</p>
<div class="content"><section class="card"><h2>Colour (light, then dark values in the table)</h2><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px">
${sw('Page', '--bg', '#F6F7FB · dark #0E1117')}${sw('Card', '--surface', '#FFFFFF · dark #171B24')}${sw('Line', '--line', '#E5E7EF · dark #2A3040')}${sw('Text', '--ink', '#111827 · 17.7:1 on card')}${sw('Text, secondary', '--ink-2', '#374151 · 10.3:1')}${sw('Text, quiet', '--ink-3', '#5B6475 · 6.0:1 (never lighter)')}${sw('Brand', '--brand', '#4F46E5 · white on it 6.3:1, on soft 5.6:1 · dark #818CF8')}${sw('Brand soft', '--brand-soft', 'open days, trial row')}${sw('Good', '--ok-soft', '#047857 text · trial, booked')}${sw('Careful', '--warn-soft', '#92400E text · new tutor, no times')}${sw('Error', '--err-soft', '#B42318 text')}${sw('Star', '--star', '#D97706 · 3.2:1 as a shape, always next to the number')}</div>
<p class="small muted" style="margin-top:12px">Old page used grey-300 placeholders and grey-200 numbers (under 2:1). Every text colour here is 4.5:1 or better on its background; measured with the WCAG formula, see README.</p></section>
<section class="card"><h2>Type</h2><div style="display:grid;gap:10px"><div style="font-size:30px;font-weight:750;letter-spacing:-.02em">Name, 30 / 24 px · 750</div><div style="font-size:18px;font-weight:700">Section title, 18 px · 700</div><div style="font-size:17px">Headline, 17 / 15 px · 400</div><div>Body, 15 px (16 px on a phone) · 400 · line 1.5</div><div class="small muted">Small and help text, 13 px · never below 12 px</div></div><p class="small muted" style="margin-top:10px">One family, Geist, which the app already loads. No uppercase tracking labels except in the facts row.</p></section>
<section class="card"><h2>Space, shape, targets</h2><div class="prose"><ul><li>${ic('Check', 18)}<span>8 px grid: 8 · 12 · 16 · 24. Card padding 24 (18 on a phone). Gap between cards 24 (16).</span></li><li>${ic('Check', 18)}<span>Radius: 16 cards, 12 buttons and inputs, 10 time chips, full for day circles.</span></li><li>${ic('Check', 18)}<span>Every tap target is 40 px or more (day circles 40, times 44, buttons 44 to 52). The old page had 36 px days and 11 px help text.</span></li><li>${ic('Check', 18)}<span>Focus ring: 3 px indigo glow on every control. Colour is never the only signal (selected day is filled, not only tinted).</span></li></ul></div></section>
<section class="card"><h2>Buttons and chips</h2><div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center"><button class="btn sm">Primary</button><button class="btn sm ghost">Secondary</button><button class="btn sm" disabled>Disabled</button><button class="tbtn" style="width:120px">9:00 AM</button><button class="tbtn" aria-pressed="true" style="width:120px">6:00 PM</button><span class="pill">Plain</span><span class="pill brand">Subject</span><span class="pill ok">Trial</span><span class="pill new">New</span></div></section>
<section class="card"><h2>Rules for empty, loading and error</h2><div class="prose"><ul><li>${ic('Check', 18)}<span><b>Empty:</b> say what is missing, then what to do. “Choose a day and time” on the button, never a dead grey panel.</span></li><li>${ic('Check', 18)}<span><b>Loading:</b> grey blocks in the real shape (see States). Respect reduced motion.</span></li><li>${ic('Check', 18)}<span><b>Error:</b> what happened, whether anything was saved, one button. Next to the field it belongs to.</span></li><li>${ic('Check', 18)}<span><b>Not filled in by the tutor:</b> the section is hidden, or says so honestly (no reviews yet), never fake content.</span></li></ul></div></section></div></main>` })

/* index */
const list = [
  ['booking-empty', 'Profile and booking page, nothing chosen yet (the main screen)'],
  ['booking-picked', 'A day and a time chosen, details step open'],
  ['booking-ready', 'Details filled in, trial lesson on, button ready'],
  ['booking-dark', 'Dark theme'],
  ['booking-new', 'New tutor: no photo, no price, no reviews, no headline'],
  ['booking-nohours', 'No free times: waitlist'],
  ['states', 'Loading, error, an empty day, form error, booked'],
  ['design-system', 'Colour, type, space, buttons, rules'],
]
pages['index'] = page({ title: 'Booking page design samples', desc: 'Index.', bar: 'index', body: `${top(false)}<main class="wrap"><h1 style="font-size:26px;margin-bottom:12px">Booking page and profile: design samples (T-0809)</h1><div class="card card-pad"><ul style="list-style:none;padding:0;display:grid;gap:10px">${list.map(([f, d]) => `<li><a href="${f}.html"><b>${f}.html</b></a> <span class="muted">· ${d}</span></li>`).join('')}</ul></div></main>` })

for (const [name, html] of Object.entries(pages)) writeFileSync(join(OUT, `${name}.html`), html)
console.log('wrote', Object.keys(pages).length, 'pages')
