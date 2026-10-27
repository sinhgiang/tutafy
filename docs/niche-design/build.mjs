// Design samples for T-1006 (stage B): the two filters the directory still lacks, and a niche page. DESIGN ONLY: nothing here is imported by
// the app, reads or writes data, or changes /tutors or /learn. Run `node docs/niche-design/build.mjs` from the repository root; it writes
// index.html, filters.html and niche.html next to this file. Edit this file or niche.css, never the generated .html files.
// Every name, price, rating and time on the pages is made up. Colours and the font are the brand's (src/styles/brand-tokens.css, Geist).
import fs from 'node:fs'
import path from 'node:path'

const DIR = path.resolve(import.meta.dirname)

const head = title => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><meta name="robots" content="noindex">
<link rel="stylesheet" href="../../src/styles/brand-tokens.css"><link rel="stylesheet" href="niche.css">
<script>if (location.search.indexOf('shot=full') > -1) document.documentElement.setAttribute('data-shot', 'full'); if (location.search.indexOf('sheet=0') > -1) document.documentElement.setAttribute('data-sheet', '0')</script></head><body>`

const ico = {
  star: '<svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B" aria-hidden="true"><path d="M12 2l3 6.9 7.5.7-5.7 5 1.7 7.4L12 18l-6.5 4 1.7-7.4-5.7-5 7.5-.7z"/></svg>',
  clock: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  globe: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  chev: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  filter: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
}

const TUTORS = [
  { n: 'Maya Reyes', i: 'MR', c: '#FDE68A', hl: 'Business English for meetings and calls. I also coach IELTS speaking and writing.', lang: 'English, Spanish', lv: 'Intermediate, Advanced', rt: '4.9', rv: 37, p: '$22', next: 'Today, 7:00 PM', trial: '$10 trial' },
  { n: 'Priya Nair', i: 'PN', c: '#BAE6FD', hl: 'Emails, presentations and small talk for people who work in English every day.', lang: 'English, Hindi', lv: 'Intermediate', rt: '4.8', rv: 21, p: '$26', next: 'Tomorrow, 8:30 AM', trial: '$12 trial' },
  { n: 'Tom Becker', i: 'TB', c: '#C7D2FE', hl: 'Interview practice and workplace English for engineers and product people.', lang: 'English, German', lv: 'Intermediate, Advanced', rt: null, rv: 0, p: '$30', next: 'Tomorrow, 6:00 PM', trial: null },
  { n: 'Elena Costa', i: 'EC', c: '#FBCFE8', hl: 'Calm, step by step English for nurses, carers and hospital staff.', lang: 'English, Portuguese', lv: 'Beginner, Intermediate', rt: '5.0', rv: 12, p: '$18', next: 'Wed, 9:00 AM', trial: '$8 trial' },
  { n: 'Samir Haddad', i: 'SH', c: '#BBF7D0', hl: 'Negotiation and customer-call English. Short lessons built around your real calls.', lang: 'English, Arabic', lv: 'Advanced', rt: '4.7', rv: 9, p: '$28', next: 'Thu, 7:30 PM', trial: null },
  { n: 'Lena Fischer', i: 'LF', c: '#FED7AA', hl: 'Writing clear reports and emails. I mark up your own documents in the lesson.', lang: 'English, German', lv: 'Intermediate, Advanced', rt: '4.9', rv: 16, p: '$24', next: 'Fri, 8:00 AM', trial: '$10 trial' },
]

const card = t => `<article class="tcard"><a class="ph" href="#" aria-label="View ${t.n}'s profile"><span class="tile" style="background:${t.c}">${t.i}</span></a>
  <div class="body"><div class="row1"><h2>${t.n}</h2>${t.rt ? `<span class="rt">${ico.star}<b>${t.rt}</b> <i>(${t.rv})</i></span>` : '<span class="newp">New</span>'}</div>
  <p class="hl">${t.hl}</p><p class="lang">${ico.globe} ${t.lang} <span class="lv">· ${t.lv}</span></p>
  <p class="next">${ico.clock} Next free: ${t.next}</p>
  <div class="cta"><div class="pr"><small>From</small><b>${t.p}<span> / lesson</span></b>${t.trial ? `<em>${t.trial}</em>` : ''}</div><a class="btn" href="#">Book</a></div></div></article>`

const header = `<header class="nav"><div class="nav-in"><a class="logo" href="#"><img src="../../public/brand/tutafy-logo.svg" height="34" alt="Tutafy"></a><div class="nav-r"><a href="#" class="hide-s">For tutors</a><a href="#">Student login →</a></div></div></header>`
const footer = `<footer class="foot"><div class="foot-in"><img src="../../public/brand/tutafy-logo.svg" height="26" alt="Tutafy"><span>Tutafy takes 0% of what students pay tutors.</span></div></footer>`
const bar = text => `<div class="sample-bar"><b>Design sample</b> · ${text} · Every tutor, price and time on this page is made up</div>`
const tag = '<span class="newtag">New</span>'

// ---- filters.html ----------------------------------------------------------------------------------------------------------------------
const pill = (label, on = false, extra = '') => `<button class="pill${on ? ' on' : ''}" type="button">${label}${ico.chev}${extra}</button>`
const filters = `${head('Tutor directory: filters (sample)')}
${bar('Directory filters · the six filters that already work stay as they are; the two marked New are proposed')}
${header}
<main class="wrap"><h1>Find a language tutor you can book today</h1>
<p class="lead">Every tutor here has open times in the next 14 days. Book with just your name and email.</p>
<p class="tzline">${ico.globe} Times shown in <b>America/New_York</b> <a href="#">Change</a></p>
<div class="fbar" role="group" aria-label="Filters">
  ${pill('Language', true)}${pill('Price', true)}${pill('Free times')}${pill('Level')}${pill('Time zone')}
  <span class="pillwrap">${pill('Learning for', true, tag)}</span>
  <button class="pill tog" type="button">Trial lesson</button><span class="sp"></span><button class="pill" type="button">Sort: Best match ${ico.chev}</button>
</div>
<div class="panel d-only" role="dialog" aria-label="Learning for">
  <h3>What do you want to learn it for? ${tag}</h3>
  <p class="hint">Tutors tick the groups of students they enjoy teaching. Only shown while tutors have ticked at least one.</p>
  <div class="opts"><button class="opt on">Work and career <span class="c">9</span></button><button class="opt">Exams <span class="c">7</span></button><button class="opt">Kids and teens <span class="c">4</span></button><button class="opt">Travel <span class="c">5</span></button><button class="opt">University <span class="c">3</span></button><button class="opt">Conversation <span class="c">11</span></button></div>
  <div class="prow"><h3>Price per lesson ${tag}</h3><div class="range"><label>From<span class="f">$ <b>15</b></span></label><span class="dash">to</span><label>Up to<span class="f">$ <b>30</b></span></label><span class="note">The ready-made groups (Up to $15, $15 to $30 …) stay as shortcuts</span></div></div>
  <div class="frow"><button class="clear" type="button">Clear all</button><a class="btn" href="#">Show 6 tutors</a></div>
</div>
<div class="applied"><span class="achip">English ${ico.x}</span><span class="achip">Work and career ${ico.x}</span><span class="achip">$15 to $30 ${ico.x}</span><button class="clear" type="button">Clear all</button></div>
<p class="count"><b>6 tutors</b> of 27 with open times · Not what you wanted? <a href="/learn/english/working-professionals">Read the guide: English tutors for working professionals</a></p>
<div class="grid">${TUTORS.slice(0, 3).map(card).join('')}</div>
</main>${footer}
<div class="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-label="Filters"><div class="sh"><h2>Filters</h2><button class="x" type="button" aria-label="Close">${ico.x}</button></div>
  <div class="grp"><h3>Language</h3><div class="opts"><button class="opt on">English <span class="c">14</span></button><button class="opt">Spanish <span class="c">6</span></button><button class="opt">German <span class="c">4</span></button></div></div>
  <div class="grp"><h3>Learning for ${tag}</h3><div class="opts"><button class="opt on">Work and career <span class="c">9</span></button><button class="opt">Exams <span class="c">7</span></button><button class="opt">Kids and teens <span class="c">4</span></button><button class="opt">Travel <span class="c">5</span></button><button class="opt">University <span class="c">3</span></button><button class="opt">Conversation <span class="c">11</span></button></div></div>
  <div class="grp"><h3>Price per lesson ${tag}</h3><div class="opts"><button class="opt">Any</button><button class="opt">Up to $15</button><button class="opt on">$15 to $30</button><button class="opt">$30 to $50</button></div>
    <div class="range"><label>From<span class="f">$ <b>15</b></span></label><span class="dash">to</span><label>Up to<span class="f">$ <b>30</b></span></label></div></div>
  <div class="grp"><h3>Level</h3><div class="opts"><button class="opt">Beginner</button><button class="opt on">Intermediate</button><button class="opt">Advanced</button></div></div>
  <div class="grp"><div class="toggle"><div><b>Trial lesson offered</b><span class="s">Tutors with a cheaper first lesson</span></div><span class="sw" role="switch" aria-checked="false"></span></div></div>
  <div class="frow"><button class="clear" type="button">Clear all</button><a class="btn" href="#">Show 6 tutors</a></div></div></div>
</body></html>
`

// ---- niche.html ------------------------------------------------------------------------------------------------------------------------
const faq = [
  ['Do I need a tutor who works in my industry?', 'It helps, but it is not required. A good business English tutor asks for your real emails, slides and call notes and teaches from those. If your field has its own words (legal, medical, software), say so in the first message and look for a tutor who mentions it.'],
  ['How long until I feel easier in meetings?', 'Most people notice small changes after four to six weeks of weekly lessons with practice between them, such as writing your next three emails in English before the lesson. It depends on your starting level and how much you speak at work.'],
  ['Can I book lessons before or after work?', 'Yes. Tutors on this page publish open times in the next 14 days, shown in your own time zone. Early morning and evening times are common; use the Free times filter to see only those.'],
  ['Will my company pay for it?', 'Some employers cover language lessons as training. Tutors can send an invoice for each lesson; ask your manager or HR what they need to see.'],
]
const plan = [
  ['1', 'Your real work', 'Bring two emails and one meeting. The tutor listens for the sentences you avoid and the ones you repeat.'],
  ['2', 'Meetings', 'Opening, interrupting politely, asking for a repeat, and closing with next steps.'],
  ['3', 'Writing', 'Clear emails: subject lines, one request per message, and a tone that is neither cold nor too casual.'],
  ['4', 'Presenting', 'Structure a five-minute update, practise it aloud, and handle one hard question.'],
  ['5', 'Phone and video calls', 'No facial cues: check understanding, summarise, and recover when the line drops.'],
  ['6', 'Small talk', 'The first two minutes of a call and the coffee-machine conversation.'],
  ['7', 'Difficult conversations', 'Saying no, giving feedback, and disagreeing without sounding rude.'],
  ['8', 'Run it yourself', 'A mock meeting from start to finish, then a list of what to keep practising alone.'],
]
const scen = [
  ['Stand-up and status updates', '"We are blocked on the API change. I expect an answer by Thursday."'],
  ['Asking someone to repeat', '"Sorry, could you go over the last point once more?"'],
  ['Declining politely', '"I would like to help, but I cannot take this on before the 15th."'],
  ['Giving feedback', '"Two things worked well. One thing I would change is the order."'],
]
const niche = `${head('English tutors for working professionals (sample niche page)')}
${bar('Niche page · /learn/english/working-professionals · it exists only while at least 3 bookable tutors teach English and ticked Work and career')}
<div class="dir-page">${header}
<main class="wrap">
<nav class="crumbs" aria-label="Breadcrumb"><a href="#">Home</a> / <a href="#">Find tutors</a> / <a href="#">English</a> / <span aria-current="page">Working professionals</span></nav>
<h1>English tutors for working professionals</h1>
<p class="answer">To get better at English for work, pick a tutor who teaches from your real emails, meetings and calls, not from a textbook. Every tutor below ticked Work and career, teaches English and has open times in the next 14 days. Book one lesson, bring a real email, and see if the feedback is useful.</p>
<p class="facts">6 tutors teach English for work and have open times in the next 14 days. Prices from $18 to $30 a lesson. List updated today.</p>
<section aria-labelledby="t"><div class="shead"><h2 id="t">Business English tutors with open times</h2><a class="more" href="#">See all 6 with filters</a></div>
<div class="grid">${TUTORS.slice(0, 3).map(card).join('')}</div><p class="small">Times are shown in each tutor's own time zone. Open a tutor to see free times in yours.</p></section>
<section class="narrow" aria-labelledby="w"><h2 id="w">What you actually practise</h2>
<p>Work English is a handful of situations that repeat. A tutor builds each one with you, you say it aloud, and you leave with sentences you can use that week.</p>
<div class="scen">${scen.map(s => `<div class="sc"><b>${s[0]}</b><q>${s[1]}</q></div>`).join('')}</div></section>
<section aria-labelledby="p"><h2 id="p">A sample eight-week plan</h2>
<p class="intro">One lesson a week. Your tutor will change the order to fit your job, but this shows what a good plan looks like.</p>
<ol class="plan">${plan.map(r => `<li><span class="wk">Week ${r[0]}</span><div><b>${r[1]}</b><p>${r[2]}</p></div></li>`).join('')}</ol></section>
<section aria-labelledby="c"><h2 id="c">How to choose a work English tutor</h2><div class="steps">
<div class="step"><small>Step 1</small><h3>Send them something real</h3><p>Before the trial lesson, message a real email or slide. A good tutor replies with questions about your job, not a price list.</p></div>
<div class="step"><small>Step 2</small><h3>Check the level they teach</h3><p>Use the level filter. Teaching a nervous intermediate speaker is different from polishing an advanced writer.</p></div>
<div class="step"><small>Step 3</small><h3>Pick a time you will keep</h3><p>Weekly lessons only work if they survive your calendar. Use the Free times filter for before or after work.</p></div></div></section>
<section aria-labelledby="n"><h2 id="n">Narrow the list</h2><div class="chips"><a href="#">Intermediate level</a><a href="#">Advanced level</a><a href="#">With a trial lesson</a><a href="#">Up to $15 a lesson</a><a href="#">Free in the evening</a><a href="#">Free before 9 AM</a></div></section>
<section aria-labelledby="f"><h2 id="f">Questions about English for work</h2><dl class="faq">${faq.map(f => `<div><dt>${f[0]}</dt><dd>${f[1]}</dd></div>`).join('')}</dl></section>
<nav aria-label="Related pages" class="rel"><h2 class="h16">Related pages</h2><div class="chips"><a href="#">English tutors (all)</a><a href="#">English for exams</a><a href="#">English for travel</a><a href="#">Spanish for work</a><a href="#">All tutors</a></div></nav>
<p class="rule">A niche page exists only while at least 3 tutors who can be booked today teach that language and ticked that group. When fewer do, the page goes away and so does its line in the sitemap.</p>
</main>${footer}</div></body></html>
`

const index = `${head('T-1006 design samples')}
${bar('T-1006 · stage B · filters and niche pages · design only')}
<main class="wrap narrow"><h1>Stage B: filters and niche pages</h1>
<p class="lead">Two samples. Nothing here runs in the product.</p>
<ul class="idx"><li><a href="filters.html">filters.html</a><span>The directory with the two new filters (Learning for, a price range) on a computer, and the filter sheet on a phone.</span></li>
<li><a href="niche.html">niche.html</a><span>A niche page, English tutors for working professionals, with its own guide, plan and questions.</span></li></ul>
<p class="small">Rebuild with <code>node docs/niche-design/build.mjs</code>. Add <code>?shot=full</code> to a page address for full-page screenshots.</p></main></body></html>
`

fs.writeFileSync(path.join(DIR, 'filters.html'), filters)
fs.writeFileSync(path.join(DIR, 'niche.html'), niche)
fs.writeFileSync(path.join(DIR, 'index.html'), index)
console.log('niche-design: 3 files written')
