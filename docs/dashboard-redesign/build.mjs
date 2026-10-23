// Builds the static design samples in this folder (T-0819). Run from the repository root:  node docs/dashboard-redesign/build.mjs
// Nothing here touches the app, the database or a live page. Every name, price and time is made up.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as L from 'lucide-react'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = dirname(fileURLToPath(import.meta.url))
const ic = (name, size = 18) => {
  const C = L[name]
  if (!C) throw new Error(`lucide icon missing: ${name}`)
  return renderToStaticMarkup(createElement(C, { width: size, height: size, 'aria-hidden': 'true', strokeWidth: 2 }))
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const NAV = [
  ['Main', [['Dashboard', 'LayoutDashboard'], ['Students', 'Users'], ['Lessons', 'BookOpen'], ['Calendar', 'Calendar'], ['Messages', 'MessageCircle', 2]]],
  ['Business', [['Earnings', 'CreditCard'], ['Reports', 'BarChart3'], ['Packages', 'Package'], ['Coupons', 'Tag'], ['Subscriptions', 'RefreshCw'], ['Waitlist', 'ListOrdered'], ['Availability', 'Clock'], ['AI tools', 'Sparkles'], ['Import', 'Upload'], ['Team', 'Wallet', 0, 'Academy']]],
  ['Account', [['Refer & earn', 'Gift'], ['API & webhooks', 'Code2'], ['Settings', 'Settings']]],
]

const side = active => `<aside class="side" aria-label="Main">
  <div class="brand"><i>${ic('GraduationCap', 16)}</i><span>Tutafy</span><span class="plan">PRO</span></div>
  <nav class="nav">${NAV.map(([g, items]) => `<div class="grp">${g}</div>${items.map(([label, icon, n, lock]) => `<a href="#" ${label === active ? 'aria-current="page"' : ''} title="${esc(label)}">${ic(icon)}<span>${esc(label)}</span>${n ? `<b class="count">${n}</b>` : ''}${lock ? `<em class="lock" style="font-style:normal">${lock}</em>` : ''}</a>`).join('')}`).join('')}</nav>
  <div class="side-foot"><div class="plan-card"><b>Pro plan</b><span>Unlimited students</span></div></div>
</aside>`

const topbar = `<header class="topbar">
  <div class="search" role="search">${ic('Search', 16)}<span>Search students, lessons, pages</span><kbd>Ctrl K</kbd></div>
  <div class="top-actions">
    <button class="btn sm hide-m">${ic('Link', 14)} Copy booking link</button>
    <button class="icon-btn" aria-label="Notifications">${ic('Bell')}<i class="dot"></i></button>
    <div class="avatar" aria-label="Account menu">ST</div>
  </div>
</header>`

const tabbar = active => `<nav class="tabbar" aria-label="Primary">${[['Home', 'LayoutDashboard', 'Dashboard'], ['Students', 'Users', 'Students'], ['Lessons', 'BookOpen', 'Lessons'], ['Calendar', 'Calendar', 'Calendar'], ['More', 'Menu', 'More']].map(([l, i, k]) => `<a href="#" ${k === active || (active === 'Earnings' && k === 'More') ? 'aria-current="page"' : ''}>${ic(i)}${l}</a>`).join('')}</nav>`

const page = ({ title, active, theme, body, overlay = '', note = 'Design sample' }) => `<!doctype html>
<html lang="en" ${theme ? `data-theme="${theme}"` : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} · dashboard design sample</title><link rel="stylesheet" href="dash.css"></head>
<body><div class="sample"><b>${note}</b> · ${esc(title)} · every name, price and time is made up · nothing here is the live dashboard</div>
<div class="app">${side(active)}<div class="main">${topbar}<main class="frame">${body}</main></div></div>${tabbar(active)}${overlay}</body></html>`

/* ------------------------------------------------------------------ Earnings (the page the owner flagged) */
const spark = (pts, color = 'var(--brand)') => {
  const w = 200, h = 36, max = Math.max(...pts, 1)
  const d = pts.map((v, i) => `${(i / (pts.length - 1)) * w},${h - 3 - (v / max) * (h - 8)}`).join(' ')
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Trend over eight weeks"><polyline points="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`
}
const kpi = (lab, icon, val, delta, cls, foot, pts) => `<div class="card kpi c3"><div class="lab">${ic(icon, 16)}${lab}</div><div class="val">${val}</div><div class="foot"><span class="delta ${cls}">${delta}</span>${foot}</div>${spark(pts)}</div>`
const weeks = [['Aug 28', 4], ['Sep 4', 6], ['Sep 11', 5], ['Sep 18', 8], ['Sep 25', 7], ['Oct 2', 9], ['Oct 9', 11], ['Oct 16', 10]]
const bars = `<div class="bars" role="img" aria-label="Lessons per week for the last eight weeks">${weeks.map(([d, n], i) => `<div class="b"><em>${n}</em><i class="${i < 7 ? 'dim' : ''}" style="height:${(n / 12) * 100}%"></i>${d}</div>`).join('')}</div>`
const top = [['Maya Okafor', 'MO', 640, 100], ['Daniel Brooks', 'DB', 520, 81], ['Priya Raman', 'PR', 440, 69], ['Lucas Ferreira', 'LF', 360, 56], ['Emma Walsh', 'EW', 280, 44]]
const topList = `<ol class="rank">${top.map(([n, a, v, p]) => `<li><span class="avatar sm">${a}</span><span><b style="font-weight:650">${n}</b></span><span class="tnum" style="font-weight:650">$${v}</span><span class="bar"><i style="width:${p}%"></i></span></li>`).join('')}</ol>`
const pay = [['Oct 21', 'Maya Okafor', '60 min · Conversation', 40, 'Paid', 'ok', 'Card'], ['Oct 19', 'Daniel Brooks', '60 min · Business English', 40, 'Paid', 'ok', 'PayPal'], ['Oct 17', 'Priya Raman', '90 min · Exam prep', 60, 'Pending', 'warn', 'Not set'], ['Oct 16', 'Lucas Ferreira', '45 min · Trial lesson', 15, 'Paid', 'ok', 'Card'], ['Oct 14', 'Emma Walsh', '60 min · Conversation', 40, 'Refunded', 'err', 'Card'], ['Oct 12', 'Maya Okafor', '60 min · Conversation', 40, 'Paid', 'ok', 'Card']]
const payTable = `<table class="cards"><thead><tr><th>Date</th><th>Student</th><th>Lesson</th><th>Method</th><th>Status</th><th class="num">Amount</th></tr></thead><tbody>${pay.map(([d, s, l, a, st, c, m]) => `<tr><td class="m-hide sel"></td><td class="first"><div class="who"><span class="avatar sm">${s.split(' ').map(x => x[0]).join('')}</span><div><b>${s}</b><span>${l}</span></div></div></td><td class="m-hide">${l}</td><td class="m-hide">${m}</td><td class="sub">${d}</td><td class="m-hide"><span class="chip ${c}">${st}</span></td><td class="num last tnum"><b>$${a}.00</b><div class="chip ${c}" style="display:none">${st}</div></td></tr>`).join('')}</tbody></table>`
// Fix: show date on the first column on desktop. (the first column above is the student; the date column is added below)
const payTableDesktop = `<table class="cards"><thead><tr><th>Date</th><th>Student</th><th>Lesson</th><th>Method</th><th>Status</th><th class="num">Amount</th></tr></thead><tbody>${pay.map(([d, s, l, a, st, c, m]) => `<tr><td class="m-hide sel tnum" style="grid-column:auto">${d}</td><td class="first"><div class="who"><span class="avatar sm">${s.split(' ').map(x => x[0]).join('')}</span><div><b>${s}</b><span>${l.split(' · ')[1]}<span class="m-only"> · ${d}</span></span></div></div></td><td class="m-hide">${l}</td><td class="m-hide">${m}</td><td class="m-hide"><span class="chip ${c}">${st}</span></td><td class="num last tnum"><b>$${a}.00</b><div class="m-only" style="margin-top:2px"><span class="chip ${c}">${st}</span></div></td></tr>`).join('')}</tbody></table>`
void payTable

const earningsBody = (withExport = true) => `
<div class="page-head"><div><h1>Earnings</h1><p>What students paid you, and how your lessons are going.</p></div>
  <div class="head-actions"><div class="seg" role="group" aria-label="Period"><button aria-pressed="false">30 days</button><button aria-pressed="true">This quarter</button><button aria-pressed="false">Year</button></div>${withExport ? `<button class="btn">${ic('Download', 16)} Export CSV</button>` : ''}</div></div>
<div class="banner">${ic('CreditCard', 20)}<div><b>Take card payments in the app.</b> Connect Stripe and students pay when they book.</div><button class="btn sm">Connect Stripe</button></div>
<div class="grid">
  ${kpi('Total earned', 'CircleCheck', '$4,860', '+12%', 'up', 'vs last quarter', [2, 3, 3, 4, 5, 5, 6, 8])}
  ${kpi('This month', 'TrendingUp', '$1,240', '+8%', 'up', 'October so far', [1, 2, 2, 3, 3, 4, 4, 5])}
  ${kpi('Pending', 'Clock', '$220', '3', 'flat', 'lessons not paid yet', [3, 2, 4, 3, 2, 3, 4, 3])}
  ${kpi('Cancellation rate', 'CircleX', '4%', '-2 pts', 'up', '2 of 48 lessons', [6, 5, 5, 4, 4, 5, 4, 4])}
  <section class="card c8"><div class="card-h"><div><h2>Lessons per week</h2><span class="sub">Last 8 weeks · 60 lessons</span></div><span class="chip ok">${ic('TrendingUp', 12)} Best month yet</span></div><div class="card-b">${bars}</div></section>
  <section class="card c4"><div class="card-h"><div><h2>Top students</h2><span class="sub">By revenue, this quarter</span></div><a href="#" class="btn ghost sm">View all</a></div><div class="card-b">${topList}</div></section>
  <section class="card c12"><div class="card-h" style="padding-bottom:12px"><div><h2>Payment history</h2><span class="sub">48 payments</span></div></div>
    <div class="toolbar" style="border-top:1px solid var(--line)"><label class="field grow">${ic('Search', 16)}<span>Search student or lesson</span></label><div class="seg" role="group" aria-label="Status"><button aria-pressed="true">All</button><button aria-pressed="false">Paid</button><button aria-pressed="false">Pending</button><button aria-pressed="false">Refunded</button></div><button class="btn sm">${ic('Calendar', 14)} Oct 1 - Oct 21</button><div class="right"><button class="btn sm">${ic('Download', 14)} Export</button></div></div>
    ${payTableDesktop}<div class="pager"><span>Showing 1 to 6 of 48</span><span style="display:flex;gap:8px"><button class="btn sm" disabled>Previous</button><button class="btn sm">Next</button></span></div></section>
</div>`

/* ------------------------------------------------------------------ Students */
const stu = [['Maya Okafor', 'MO', 'B2', 'Active', 'ok', 'Today, 4:00 PM', 'Oct 19', '$0'], ['Daniel Brooks', 'DB', 'C1', 'Active', 'ok', 'Tomorrow, 9:00 AM', 'Oct 20', '$0'], ['Priya Raman', 'PR', 'B1', 'Active', 'ok', 'Fri, 6:30 PM', 'Oct 17', '$60'], ['Lucas Ferreira', 'LF', 'A2', 'Active', 'ok', 'None booked', 'Oct 8', '$0'], ['Emma Walsh', 'EW', 'B2', 'Paused', 'warn', 'None booked', 'Sep 12', '$0'], ['Kenji Mori', 'KM', 'A1', 'Active', 'ok', 'Mon, 8:00 AM', 'Oct 21', '$40'], ['Sofia Marin', 'SM', 'C2', 'Active', 'ok', 'Thu, 5:00 PM', 'Oct 18', '$0']]
const students = `
<div class="page-head"><div><h1>Students</h1><p>48 students · 41 active</p></div><div class="head-actions"><button class="btn">${ic('Upload', 16)} Import</button><button class="btn primary">${ic('Plus', 16)} Add student</button></div></div>
<div class="tabs" role="tablist"><a href="#" aria-current="page">All <span class="n">48</span></a><a href="#">Active <span class="n">41</span></a><a href="#">Paused <span class="n">4</span></a><a href="#">Needs attention <span class="n">3</span></a></div>
<section class="card">
  <div class="toolbar"><label class="field grow">${ic('Search', 16)}<span>Search by name or goal</span></label><button class="btn sm">${ic('ListFilter', 14)} Level</button><button class="btn sm">${ic('ListFilter', 14)} Status</button><button class="btn sm">${ic('Tag', 14)} Tags</button><div class="right"><button class="btn sm">${ic('ArrowUpDown', 14)} Sort: Next lesson</button><button class="btn sm">${ic('Download', 14)} Export</button></div></div>
  <div class="bulk" role="status"><span class="cb on"></span> 2 selected <span style="display:flex;gap:8px;margin-left:auto"><button class="btn sm">${ic('MessageCircle', 14)} Message</button><button class="btn sm">${ic('Tag', 14)} Add tag</button><button class="btn sm">${ic('Pause', 14)} Pause</button></span></div>
  <table class="cards"><thead><tr><th style="width:44px"><span class="cb"></span></th><th><span class="sort">Student ${ic('ArrowDown', 12)}</span></th><th>Level</th><th>Next lesson</th><th>Last lesson</th><th>Status</th><th class="num">Owes</th></tr></thead><tbody>${stu.map(([n, a, lv, st, c, nx, last, owes], i) => `<tr><td class="sel"><span class="cb ${i < 2 ? 'on' : ''}"></span></td><td class="first"><div class="who"><span class="avatar sm">${a}</span><div><b>${n}</b><span>${lv} · ${st}</span></div></div></td><td class="m-hide"><span class="chip brand">${lv}</span></td><td class="m-hide">${nx}</td><td class="sub m-hide">${last}</td><td class="m-hide"><span class="chip ${c}">${st}</span></td><td class="num last tnum">${owes === '$0' ? '<span style="color:var(--ink-3)">$0</span>' : `<b style="color:var(--warn)">${owes}</b>`}</td></tr>`).join('')}</tbody></table>
  <div class="pager"><span>Showing 1 to 7 of 48</span><span style="display:flex;gap:8px"><button class="btn sm" disabled>Previous</button><button class="btn sm">Next</button></span></div>
</section>`

/* ------------------------------------------------------------------ command palette */
const cmd = `<div class="scrim" role="dialog" aria-modal="true" aria-label="Command palette"><div class="cmd">
  <div class="in">${ic('Search', 18)}<span style="color:var(--ink-3)">Type a command or search…</span></div>
  <div class="grp">Jump to</div>
  <div class="it" aria-selected="true">${ic('Users')}Students<kbd>G then S</kbd></div><div class="it">${ic('BookOpen')}Lessons<kbd>G then L</kbd></div><div class="it">${ic('Calendar')}Calendar<kbd>G then C</kbd></div><div class="it">${ic('CreditCard')}Earnings<kbd>G then E</kbd></div>
  <div class="grp">Actions</div>
  <div class="it">${ic('Plus')}Schedule a lesson<kbd>N</kbd></div><div class="it">${ic('UserPlus')}Add a student<kbd>S</kbd></div><div class="it">${ic('Link')}Copy my booking link<kbd>Shift L</kbd></div><div class="it">${ic('Moon')}Switch to dark theme<kbd>Shift D</kbd></div>
  <div class="foot"><span>↑↓ to move</span><span>Enter to open</span><span>Esc to close</span><span style="margin-left:auto">Press ? for all shortcuts</span></div>
</div></div>`

/* ------------------------------------------------------------------ states */
const skeleton = `<div class="grid">${[1, 2, 3, 4].map(() => `<div class="card kpi c3"><div class="sk" style="height:14px;width:40%"></div><div class="sk" style="height:30px;width:60%;margin-top:6px"></div><div class="sk" style="height:12px;width:50%;margin-top:6px"></div></div>`).join('')}
 <div class="card c8"><div class="card-b"><div class="sk" style="height:14px;width:28%"></div><div class="sk" style="height:200px;margin-top:16px"></div></div></div><div class="card c4"><div class="card-b">${[1, 2, 3, 4, 5].map(() => `<div style="display:flex;gap:10px;margin-bottom:14px;align-items:center"><div class="sk" style="width:28px;height:28px;border-radius:50%"></div><div class="sk" style="height:12px;flex:1"></div><div class="sk" style="height:12px;width:48px"></div></div>`).join('')}</div></div></div>`
const statesBody = `
<div class="page-head"><div><h1>Page states</h1><p>Every list and chart page ships these three, plus the normal one.</p></div></div>
<h2 style="margin:0 0 8px;font-size:15px">1. Loading: the page frame stays, the content shows its own shape</h2>${skeleton}
<div class="grid" style="margin-top:28px"><section class="card c6"><div class="card-h"><h2 style="font-size:15px">2. Empty: say what this is for, give one next step</h2></div><div class="state"><div class="ico">${ic('CreditCard', 22)}</div><h3>No payments yet</h3><p>When a student books a lesson with a price, it shows up here with its payment status.</p><div style="display:flex;gap:8px;margin-top:10px"><button class="btn primary">${ic('Link', 16)} Copy booking link</button><button class="btn">Set lesson price</button></div></div></section>
<section class="card c6"><div class="card-h"><h2 style="font-size:15px">3. Error: what failed, that your data is safe, a retry</h2></div><div class="state err"><div class="ico">${ic('CircleAlert', 22)}</div><h3>We could not load your payments</h3><p>Nothing was changed. Check your connection and try again. If it keeps failing, tell us and we will look.</p><div style="display:flex;gap:8px;margin-top:10px"><button class="btn primary">${ic('RotateCw', 16)} Try again</button><button class="btn">Contact support</button></div></div></section></div>`

/* ------------------------------------------------------------------ layout rules */
const wire = (rows, cols = '1fr') => `<div class="wire" style="grid-template-columns:${cols}">${rows}</div>`
const rules = `
<div class="page-head"><div><h1>Layout rules</h1><p>Four kinds of page. Each fills its frame; the frame is centred. No page keeps a fixed width that sticks to the left.</p></div></div>
<section class="card" style="margin-bottom:16px"><div class="rule"><div><h2>0 · The frame (every page)</h2><p class="muted" style="margin-top:6px">Sticky sidebar (232 px, an icon rail from 768 to 1279 px, a bottom bar below 768). Sticky top bar. The content sits in one frame: up to 1440 px wide, centred with <code>margin: 0 auto</code>, 32 px side padding (24 px on tablet, 16 px on a phone).</p></div>
${wire('<div class="brandbox" style="grid-column:1/-1">top bar: search, copy link, bell, account</div>' + '<div>sidebar<br>232</div><div class="brandbox" style="grid-column:span 2;height:90px;display:grid;place-items:center">frame · max 1440 · centred</div>', '70px 1fr 1fr')}</div></section>
<section class="card" style="margin-bottom:16px"><div class="rule"><div><h2>1 · Overview and charts</h2><p class="muted" style="margin-top:6px">Dashboard, Earnings, Reports. A 12-column grid inside the frame. KPI cards span 3, a main chart 8, a ranking 4, a table 12. Below 1280 px KPIs go two across and charts stack. Nothing is capped to 900 px.</p></div>
${wire('<div class="brandbox">KPI</div><div class="brandbox">KPI</div><div class="brandbox">KPI</div><div class="brandbox">KPI</div>', 'repeat(4,1fr)')}</div></section>
<section class="card" style="margin-bottom:16px"><div class="rule"><div><h2>2 · Tables and lists</h2><p class="muted" style="margin-top:6px">Students, Lessons, Waitlist, Coupons, Packages, Subscriptions, Team. The table uses the whole frame. A toolbar sticks above it (search, filters, sort, export). Selecting rows shows a bulk bar. From 1280 px a row can open a side panel instead of a new page. Below 768 px each row becomes a card.</p></div>
${wire('<div class="brandbox" style="grid-column:1/-1">toolbar: search · filters · sort · export</div><div style="grid-column:span 3">table · full width</div><div class="brandbox">side panel</div>', '1fr 1fr 1fr 0.8fr')}</div></section>
<section class="card" style="margin-bottom:16px"><div class="rule"><div><h2>3 · Forms and settings</h2><p class="muted" style="margin-top:6px">Settings, Availability, Import, new lesson, new student. A section list on the left (sticky), the form in a readable column (up to 720 px), and from 1440 px a live preview or help on the right (for example, the booking page as students see it). The whole group is centred in the frame. Focused one-step flows (add a student, new lesson, Upgrade) are one centred column of 720 px.</p></div>
${wire('<div>sections</div><div class="brandbox" style="height:80px;display:grid;place-items:center">form · 720</div><div>preview / help</div>', '0.7fr 1.6fr 1fr')}</div></section>
<section class="card"><div class="rule"><div><h2>4 · Workspaces</h2><p class="muted" style="margin-top:6px">Calendar and Messages use the full height and width of the frame. Calendar: week view by default on a computer, day list on a phone, a mini month and a lessons-today column on the right. Messages: three panes, the conversation list (320 px), the thread, and a student card (300 px, from 1440 px).</p></div>
${wire('<div>conversations</div><div class="brandbox" style="height:80px;display:grid;place-items:center">thread</div><div>student card</div>', '0.8fr 1.8fr 0.8fr')}</div></section>`

/* ------------------------------------------------------------------ design system */
const sw = (name, v, d) => `<div class="sw"><i style="background:var(${v})"></i><p><b>${name}</b>${d}</p></div>`
const ds = `
<div class="page-head"><div><h1>Dashboard design system</h1><p>One family with the public booking page (T-0809): same colours, type and corners. Light and dark.</p></div><div class="head-actions"><button class="btn">${ic('Moon', 16)} Dark preview: add ?theme=dark in the samples</button></div></div>
<div class="grid">
<section class="card c12"><div class="card-h"><h2>Colour (tokens, light and dark)</h2></div><div class="card-b"><div class="swatches">${[['Background', '--bg', 'page'], ['Surface', '--surface', 'cards, sidebar'], ['Surface 2', '--surface-2', 'table head, chips'], ['Line', '--line', 'borders'], ['Ink', '--ink', 'body, 16:1'], ['Ink 3', '--ink-3', 'secondary, 4.5:1+'], ['Brand', '--brand', 'actions, links'], ['Brand soft', '--brand-soft', 'selected, hover'], ['OK', '--ok', 'paid, done'], ['Warn', '--warn', 'pending'], ['Error', '--err', 'failed, cancelled']].map(([n, v, d]) => sw(n, v, d)).join('')}</div><p class="muted" style="margin-top:12px">Rules: nothing lighter than Ink 3 carries text (today the app uses gray-300 and gray-400 for text in 343 places, about 1.5:1 and 2.6:1 on white). Status is never colour alone: always a word.</p></div></section>
<section class="card c6"><div class="card-h"><h2>Type</h2></div><div class="card-b" style="display:grid;gap:10px"><div style="font-size:24px;font-weight:700;letter-spacing:-.02em">Page title · 24/29 · 700</div><div style="font-size:15px;font-weight:650">Card title · 15/22 · 650</div><div>Body · 14/21 · 400 and 520. The smallest text in the product is 13 px (today: 225 places at 9 to 11 px).</div><div class="muted" style="font-size:13px">Secondary · 13/19 · Ink 3</div><div class="tnum" style="font-size:28px;font-weight:700">$4,860 · numbers use tabular figures</div><div style="font-size:12px;font-weight:650;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)">Group label · 12 · caps, only for sidebar groups and table heads</div></div></section>
<section class="card c6"><div class="card-h"><h2>Space, corners, elevation</h2></div><div class="card-b" style="display:grid;gap:10px"><div>Spacing scale: 4, 8, 12, 16, 20, 24, 32, 48. Card padding 20. Grid gap 16 (12 on a phone). Page frame padding 32 / 24 / 16.</div><div>Corners: 8 for controls, 12 for panels inside cards, 16 for cards. Pills are fully round.</div><div>Elevation: cards have a 1 px line and a very light shadow. Only menus, the command palette and dialogs float (shadow 2 and 3).</div><div>Tap targets are 36 px tall on a computer and 44 px on a phone. Focus is a 3 px indigo ring, never removed.</div></div></section>
<section class="card c12"><div class="card-h"><h2>Components</h2></div><div class="card-b" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center"><button class="btn primary">${ic('Plus', 16)} Primary</button><button class="btn">Secondary</button><button class="btn ghost">Ghost</button><button class="btn sm">Small</button><span class="chip ok">Paid</span><span class="chip warn">Pending</span><span class="chip err">Cancelled</span><span class="chip brand">B2</span><span class="chip">Neutral</span><div class="seg"><button aria-pressed="true">Week</button><button aria-pressed="false">Month</button></div><label class="field" style="width:220px">${ic('Search', 16)}<span>Search</span></label><span class="delta up">+12%</span><span class="delta down">-3%</span></div></section>
<section class="card c12"><div class="card-h"><h2>Rules that make it feel like a modern product</h2></div><div class="card-b"><ul style="padding-left:20px;display:grid;gap:6px"><li><b>One page header</b>: title, one sentence, actions on the right, never two headers.</li><li><b>One keyboard model</b>: Ctrl or Cmd K opens the palette; G then a letter jumps to a page; N schedules a lesson; ? lists shortcuts.</li><li><b>Dark theme</b> follows the system and can be set in Settings. Tokens above are the only colours used.</li><li><b>Every list has</b> search, filters, sort, export and a bulk bar when the data can be counted in tens.</li><li><b>Every page has</b> loading, empty and error states, as in the states sample.</li><li><b>Toasts and banners</b> never cover content: toasts bottom-left on a computer, above the bottom bar on a phone; the cookie notice and the push prompt are one calm bar, not two floating cards.</li><li><b>Voice</b>: plain US English, short, no exclamation marks, no emoji in headings.</li></ul></div></section>
</div>`

/* ------------------------------------------------------------------ index */
const index = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Dashboard redesign samples</title><link rel="stylesheet" href="dash.css"></head><body><div class="sample"><b>Design samples</b> · tutor dashboard redesign (T-0819) · made-up data · not the live dashboard</div>
<main class="frame narrow"><div class="page-head"><div><h1>Tutor dashboard: redesign samples</h1><p>Read README.md first. Open each page at 1920, 1440 and 390 px wide.</p></div></div>
<div class="card"><table><tbody>${[['earnings.html', 'Earnings (the page the owner flagged): grid fills the frame, centred'], ['earnings-dark.html', 'The same page in the dark theme'], ['students.html', 'A table page: tabs, search, filters, sort, bulk bar, export, paging; cards on a phone'], ['command.html', 'Command palette (Ctrl K) and shortcuts'], ['states.html', 'Loading, empty and error'], ['layout-rules.html', 'The four page layouts and the frame'], ['design-system.html', 'Colour, type, space, components, rules']].map(([h, t]) => `<tr><td><a href="${h}"><b>${h}</b></a></td><td>${t}</td></tr>`).join('')}</tbody></table></div></main></body></html>`

const files = {
  'earnings.html': page({ title: 'Earnings', active: 'Earnings', body: earningsBody() }),
  'earnings-dark.html': page({ title: 'Earnings (dark theme)', active: 'Earnings', theme: 'dark', body: earningsBody() }),
  'students.html': page({ title: 'Students', active: 'Students', body: students }),
  'command.html': page({ title: 'Command palette over Earnings', active: 'Earnings', body: earningsBody(), overlay: cmd }),
  'states.html': page({ title: 'Page states', active: 'Earnings', body: statesBody }),
  'layout-rules.html': page({ title: 'Layout rules', active: 'Dashboard', body: rules }),
  'design-system.html': page({ title: 'Design system', active: 'Dashboard', body: ds }),
  'index.html': index,
}
for (const [name, html] of Object.entries(files)) writeFileSync(join(OUT, name), html)
console.log('wrote', Object.keys(files).join(', '))
