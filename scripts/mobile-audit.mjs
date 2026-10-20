// Phone/tablet layout audit (T-0629). It is a browser module: open each page in a hidden
// iframe of a chosen CSS width and measure what the ticket's criteria name:
//   sideways scroll (page and the main column), content running off or cut inside a card,
//   buttons / fields / stand-alone links under 44px, text under 14px, images wider than
//   their frame. aria-hidden pieces (decorative pictures) are skipped.
//
// How to run it (docs/feature-map.md, "Phone check"):
//   1. node scripts/mock-supabase.mjs          (fake data, http://localhost:54399)
//   2. build and start the app against it, with the three variables from that file's header
//   3. copy this file to public/__audit.mjs for the run, and delete the copy afterwards
//   4. in the browser, on any page of the app:
//        const m = await import('/__audit.mjs'); await m.run('after-pub-390', m.PUBLIC, 390)
//      (m.TUTOR needs the tutor session cookie from /__session?as=tutor, m.ADMIN the admin one;
//       the results go to MOCK_SAVE_DIR of the mock server, one JSON file per run.)
//   m.fingerprint() is a hash of every box's size and place: equal before and after a change
//   at 1440 wide proves the desktop layout did not move.
// m.audit() measures the page it is loaded in; m.probe(url, width) one page with details.
export function audit(win = window) {
  const document = win.document, getComputedStyle = win.getComputedStyle.bind(win), innerWidth = win.innerWidth, location = win.location, NodeFilter = win.NodeFilter
  const de = document.documentElement
  const cw = de.clientWidth
  const vis = el => {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return false
    if (r.width <= 1 && r.height <= 1) return false // sr-only
    return true
  }
  const describe = el => {
    const cls = (typeof el.className === 'string' ? el.className : '').split(/\s+/).filter(Boolean).slice(0, 4).join('.')
    const txt = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('alt') || '').trim().replace(/\s+/g, ' ').slice(0, 28)
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}${txt ? ` "${txt}"` : ''}`
  }
  const clipAncestor = el => {
    for (let p = el.parentElement; p && p !== document.body && p !== de; p = p.parentElement) {
      if (p.tagName === 'MAIN') return null // the main column is judged by mainScroll, it is not a place to hide content
      const ox = getComputedStyle(p).overflowX
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return p
    }
    return null
  }
  const all = [...document.body.querySelectorAll('*')]
  const offenders = []
  for (const el of all) {
    if (!vis(el)) continue
    const cs = getComputedStyle(el)
    if (cs.position === 'fixed') continue
    const r = el.getBoundingClientRect()
    if (r.right > cw + 1 || r.left < -1) {
      const c = clipAncestor(el)
      if (c) { const cr = c.getBoundingClientRect(); if (cr.right <= cw + 1 && cr.left >= -1) continue }
      offenders.push({ el: describe(el), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) })
    }
  }
  // only the outermost offenders (skip children of an offender)
  const top = offenders.slice(0, 400)

  const small = []
  const seenSmall = new Set()
  const sel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=menuitem], [role=switch], [role=checkbox]'
  for (const el of document.body.querySelectorAll(sel)) {
    if (!vis(el) || el.closest('[aria-hidden="true"]')) continue
    const cs = getComputedStyle(el)
    if (cs.position === 'fixed' && el.getBoundingClientRect().bottom < 0) continue
    if (el.tagName === 'A' && cs.display === 'inline') {
      // an inline link inside running text is not a stand-alone target
      const par = el.parentElement
      const own = par ? [...par.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).length : 0
      if (own > 0) continue
    }
    const r = el.getBoundingClientRect()
    if (el.getAttribute('role') === 'switch') {
      // a switch keeps its drawn shape (a 44px box would make it a circle); its touch area is the invisible ::after box around it
      const a = getComputedStyle(el, '::after')
      const aw = parseFloat(a.width) || 0, ah = parseFloat(a.height) || 0
      if (aw < 43.5 || ah < 43.5) small.push({ el: describe(el), w: Math.round(aw), h: Math.round(ah) })
      continue
    }
    if (el.type === 'checkbox' || el.type === 'radio') {
      const lab = el.closest('label')
      if (lab) { const lr = lab.getBoundingClientRect(); if (lr.height >= 44) continue }
    }
    const iconOnly = !(el.innerText || el.getAttribute('aria-label') || el.value || el.placeholder || '').trim() || (el.innerText || '').trim().length <= 1
    if (r.height < 43.5 || (iconOnly && r.width < 43.5)) {
      const key = describe(el) + Math.round(r.height)
      if (seenSmall.has(key)) continue
      seenSmall.add(key)
      small.push({ el: describe(el), w: Math.round(r.width), h: Math.round(r.height) })
    }
  }

  // buttons stretched out of the shape they are drawn in (the 44px minimums once turned the settings switches into circles with the knob
  // half way, and "no target under 44px" counted that as a pass): a switch must stay a pill with its knob at one end, and an icon-only
  // fully rounded button must stay a circle
  const distorted = []
  for (const el of document.body.querySelectorAll('button, [role=switch], [role=button]')) {
    if (!vis(el) || el.closest('[aria-hidden="true"]')) continue
    const r = el.getBoundingClientRect()
    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
    const round = radius >= Math.min(r.width, r.height) / 2 - 0.5
    if (el.getAttribute('role') === 'switch') {
      const knob = el.firstElementChild
      const kr = knob && knob.getBoundingClientRect()
      const gaps = kr ? [kr.left - r.left, r.right - kr.right] : []
      if (r.width < r.height * 1.5 || !gaps.length || Math.min(...gaps) > 4) distorted.push({ el: describe(el), w: Math.round(r.width), h: Math.round(r.height), knobGap: gaps.map(Math.round) })
    } else if (round && !(el.innerText || '').trim() && Math.abs(r.width - r.height) > 2 && el.querySelector('svg, img') == null) {
      distorted.push({ el: describe(el), w: Math.round(r.width), h: Math.round(r.height) })
    }
  }

  // short labels (buttons, links) that break onto two lines: a squeezed menu or button
  const wrapped = []
  for (const el of document.body.querySelectorAll('a[href], button')) {
    if (!vis(el) || el.closest('[aria-hidden="true"]')) continue
    const label = (el.innerText || '').trim()
    if (label.length < 2 || label.length > 18 || label.includes(String.fromCharCode(10))) continue
    // look at the text only (icons sit at other heights): more than one line of text in a short label means it broke
    const tops = new Set()
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let tn = tw.nextNode(); tn; tn = tw.nextNode()) {
      if (!tn.textContent.trim()) continue
      const rg = document.createRange(); rg.selectNodeContents(tn)
      for (const r of rg.getClientRects()) if (r.width > 2) tops.add(Math.round(r.top / 8))
    }
    if (tops.size > 1) wrapped.push({ el: describe(el), label })
  }
  // text drawn over other text (a fixed-height box that the text outgrew): leaf text boxes that overlap by a third or more
  const boxes = []
  for (const el of document.body.querySelectorAll('*')) {
    if (!vis(el) || el.closest('[aria-hidden="true"]')) continue
    const dt = el.closest('details')
    if (dt && !dt.open && !el.closest('summary')) continue // the answer of a closed question is not on screen
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1)
    if (!hasText) continue
    let skip = false
    for (let p = el; p && p !== document.body; p = p.parentElement) { const pos = getComputedStyle(p).position; if (pos === 'absolute' || pos === 'fixed' || pos === 'sticky') { skip = true; break } }
    if (skip) continue
    const rg = document.createRange(); rg.selectNodeContents(el)
    const rs = [...rg.getClientRects()].filter(r => r.width > 2 && r.height > 2)
    if (!rs.length) continue
    const own = el.getBoundingClientRect() // text cut off by a line clamp or overflow stays inside its own box
    const l = Math.max(own.left, Math.min(...rs.map(r => r.left))), t = Math.max(own.top, Math.min(...rs.map(r => r.top))), rr = Math.min(own.right, Math.max(...rs.map(r => r.right))), b = Math.min(own.bottom, Math.max(...rs.map(r => r.bottom)))
    boxes.push({ el, l, t, r: rr, b })
  }
  const overlaps = []
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], c = boxes[j]
    if (a.el.contains(c.el) || c.el.contains(a.el)) continue
    const w = Math.min(a.r, c.r) - Math.max(a.l, c.l), h = Math.min(a.b, c.b) - Math.max(a.t, c.t)
    if (w > 2 && h > 2 && (w * h) / Math.min((a.r - a.l) * (a.b - a.t), (c.r - c.l) * (c.b - c.t)) > 0.33) overlaps.push({ a: describe(a.el), b: describe(c.el) })
  }
  const textSizes = {}
  const smallTextEls = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const seenEl = new Set()
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue
    const el = n.parentElement
    if (!el || seenEl.has(el) || !vis(el) || el.closest('[aria-hidden="true"]')) continue
    if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue
    seenEl.add(el)
    const fs = parseFloat(getComputedStyle(el).fontSize)
    if (fs < 14) {
      const k = String(Math.round(fs * 10) / 10)
      textSizes[k] = (textSizes[k] || 0) + 1
      if (smallTextEls.length < 40) smallTextEls.push({ el: describe(el), fs })
    }
  }

  const imgs = []
  for (const im of document.body.querySelectorAll('img, video, iframe, canvas, svg')) {
    if (!vis(im)) continue
    const r = im.getBoundingClientRect()
    let par = im.parentElement
    while (par && par.clientWidth === 0 && par !== document.body) par = par.parentElement
    const pw = par ? par.clientWidth : cw
    if (r.right > cw + 1 || (par && r.width > pw + 2 && !clipAncestor(im))) imgs.push({ el: describe(im), w: Math.round(r.width), parentW: pw, right: Math.round(r.right) })
  }

  const clipped = []
  for (const el of all) {
    if (!vis(el)) continue
    const cs = getComputedStyle(el)
    if (['hidden', 'clip'].includes(cs.overflowX) && el.scrollWidth > el.clientWidth + 2 && el.textContent.trim()) {
      clipped.push({ el: describe(el), sw: el.scrollWidth, cw: el.clientWidth, ellipsis: cs.textOverflow === 'ellipsis' })
    }
  }

  // the page's main column scrolling sideways inside itself (overflow-y:auto makes overflow-x auto too)
  const mainEl = document.querySelector('main')
  const mainScroll = mainEl && mainEl.scrollWidth > mainEl.clientWidth + 1 ? { sw: mainEl.scrollWidth, cw: mainEl.clientWidth } : null
  const hidden = []
  for (const el of all) { if (!vis(el)) continue; const cs = getComputedStyle(el); if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1 && el.tagName !== 'MAIN' && el.clientWidth > 0) hidden.push({ el: describe(el), sw: el.scrollWidth, cw: el.clientWidth }) }
  return {
    mainScroll, scrollers: hidden.slice(0, 6),
    path: location.pathname + location.search,
    vw: innerWidth, cw, sw: de.scrollWidth, bodySw: document.body.scrollWidth,
    overflowX: de.scrollWidth > cw || document.body.scrollWidth > cw,
    offenders: top.slice(0, 8), offenderCount: top.length,
    smallTargets: small.length, smallTargetSample: small.slice(0, 12),
    distortedCount: distorted.length, distorted: distorted.slice(0, 6),
    smallTextCount: Object.values(textSizes).reduce((a, b) => a + b, 0), textSizes, smallTextSample: smallTextEls.slice(0, 8),
    overlaps: overlaps.slice(0, 6), overlapCount: overlaps.length, wrapped, imgOverflow: imgs.slice(0, 6), clipped: clipped.filter(c => !c.ellipsis).slice(0, 6),
  }
}

export function brief(n = 3, win = window) {
  const a = audit(win)
  const f = x => x.map(o => `${o.el}${o.w != null ? ` [${o.w}x${o.h ?? ''}]` : ''}`)
  return {
    p: a.path, vw: a.vw, sw: a.sw, cw: a.cw, ovf: a.overflowX,
    off: a.offenderCount, offTop: a.offenders.slice(0, n).map(o => `${o.el} L${o.left} R${o.right}`),
    tap: a.smallTargets, tapTop: f(a.smallTargetSample.slice(0, n)), dist: a.distortedCount, distTop: f(a.distorted.slice(0, n)),
    txt: a.smallTextCount, sizes: a.textSizes, txtTop: a.smallTextSample.slice(0, 2).map(o => `${o.el} ${o.fs}`),
    img: a.imgOverflow.length, imgTop: a.imgOverflow.slice(0, 2).map(o => `${o.el} w${o.w}`),
    clip: a.clipped.length, main: a.mainScroll ? a.mainScroll.sw + '>' + a.mainScroll.cw : null, clipTop: a.clipped.slice(0, 2).map(o => `${o.el} ${o.sw}>${o.cw}`),
  }
}

// Open each address in a hidden iframe of the given CSS width, wait, measure, close.
export async function batch(urls, width, height = 844, wait = 1800, n = 3) {
  const out = []
  for (const u of urls) {
    const f = document.createElement('iframe')
    f.style.cssText = 'position:fixed;left:-20000px;top:0;border:0;width:' + width + 'px;height:' + height + 'px'
    document.body.appendChild(f)
    try {
      await new Promise((res, rej) => { f.onload = res; f.onerror = rej; f.src = u; setTimeout(res, 15000) })
      await new Promise(r => setTimeout(r, wait))
      const r = brief(n, f.contentWindow)
      r.p = f.contentWindow.location.pathname + f.contentWindow.location.search
      out.push(r)
    } catch (e) { out.push({ p: u, err: String(e) }) }
    f.remove()
  }
  return out
}

export function fingerprint(win = window, skipTableFrames = false) {
  let h = 2166136261 >>> 0, n = 0
  const walk = el => {
    // the scrolling frame added around a table (T-0629) is a new box, not a moved one: it can be left out of the hash
    if (skipTableFrames && el.tagName === 'DIV' && el.className === 'overflow-x-auto' && el.children.length === 1 && el.firstElementChild.tagName === 'TABLE') return
    const r = el.getBoundingClientRect()
    if (r.width || r.height) {
      const s = `${el.tagName}|${Math.round(r.left)}|${Math.round(r.top)}|${Math.round(r.width)}|${Math.round(r.height)}|${getComputedStyle(el).fontSize}`
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 }
      n++
    }
  }
  const getComputedStyle = win.getComputedStyle.bind(win)
  win.document.body.querySelectorAll('*').forEach(walk)
  return `${(h >>> 0).toString(16)}:${n}`
}

// Full run: open each address in an iframe of this CSS width (5 at a time), measure everything, save the lot to the mock server's save folder.
export async function run(label, urls, width, height = 844, wait = 1500) {
  const out = new Array(urls.length)
  let next = 0
  const worker = async () => {
    while (next < urls.length) {
      const i = next++
      const u = urls[i]
      const f = document.createElement('iframe')
      f.style.cssText = 'position:fixed;left:-20000px;top:0;border:0;width:' + width + 'px;height:' + height + 'px'
      document.body.appendChild(f)
      try {
        await new Promise(res => { f.onload = res; f.src = u; setTimeout(res, 15000) })
        await new Promise(r => setTimeout(r, wait))
        const w = f.contentWindow
        const a = audit(w)
        a.fp = fingerprint(w)
        a.fp2 = fingerprint(w, true)
        a.finalPath = w.location.pathname + w.location.search
        a.req = u
        out[i] = a
      } catch (e) { out[i] = { req: u, err: String(e) } }
      f.remove()
    }
  }
  await Promise.all([1, 2, 3, 4, 5].map(worker))
  await fetch('http://localhost:54399/__save/' + label + '.json', { method: 'POST', body: JSON.stringify(out) })
  return out.map(x => x.err ? x.req + ' ERR' : x.req + (x.finalPath !== x.req ? ' -> ' + x.finalPath : '') + ' sw' + x.sw + '/' + x.cw + ' off' + x.offenderCount + ' main' + (x.mainScroll ? x.mainScroll.sw + '>' + x.mainScroll.cw : 0) + ' tap' + x.smallTargets + ' dist' + x.distortedCount + ' txt' + x.smallTextCount + ' img' + x.imgOverflow.length + ' clip' + x.clipped.length + ' wrap' + x.wrapped.length)
}

// URL lists for the runs
export const PUBLIC = ["/","/tutors","/blog","/blog/get-your-first-tutoring-clients","/blog/marketplace-vs-independent-the-real-math","/blog/preply-alternatives-for-tutors","/blog/best-tutor-management-software","/blog/how-to-price-tutoring-lessons","/blog/how-to-teach-english-online","/blog/stop-tutoring-no-shows","/blog/how-to-start-an-online-tutoring-business","/blog/how-much-does-preply-take","/blog/tutafy-review","/blog/tutafy-vs-alternatives","/blog/free-tutor-management-software","/blog/how-to-write-a-tutoring-business-plan","/blog/how-to-choose-a-tutoring-niche","/blog/how-to-build-a-tutor-website","/blog/group-tutoring-classes-pricing","/blog/tutoring-cancellation-policy-and-contracts","/blog/how-to-retain-tutoring-students","/blog/ai-tools-for-tutors","/blog/best-video-call-tool-for-tutors","/blog/parent-communication-and-parent-portal","/blog/how-to-leave-preply-migration-guide","/blog/how-to-hire-tutors-and-build-a-team","/blog/how-to-build-a-tutor-referral-program","/about","/customers","/contact","/register","/login","/student/login","/privacy","/terms","/book/sarah-test","/tutors/sarah-test","/embed/sarah-test","/switch","/offline"]
export const TUTOR = ["/dashboard","/students","/students/00000000-0000-4000-a000-000000000001","/students/00000000-0000-4000-a000-000000000001/edit","/students/new","/lessons","/lessons/00000000-0000-4000-d000-000000000001","/lessons/00000000-0000-4000-d000-000000000001/edit","/lessons/new","/calendar","/messages","/messages/00000000-0000-4000-a000-000000000001","/messages/broadcast","/payments","/settings","/upgrade","/availability","/ai","/coupons","/developers","/import","/packages","/referral","/reports","/subscriptions","/team","/waitlist","/onboarding"]
export const ADMIN = ["/admin","/admin/analytics","/admin/buyers","/admin/revenue","/admin/settings","/admin/students","/admin/tutors","/admin/migrate","/super-admin","/super-admin/people/00000000-0000-4000-8000-000000000001"]
export const PORTAL = ["/portal/00000000-0000-4000-c000-000000000001","/portal/00000000-0000-4000-c000-000000000001/messages","/portal/00000000-0000-4000-c000-000000000001/lessons/00000000-0000-4000-d000-000000000001","/portal/00000000-0000-4000-c000-000000000001/certificate/00000000-0000-4000-d000-000000000001","/portal/parent/00000000-0000-4000-c000-000000000001","/student/dashboard"]

const S = '00000000-0000-4000-a000-000000000001', L = '00000000-0000-4000-d000-000000000001', T = '00000000-0000-4000-c000-000000000001'
export const SHEET_PUBLIC = ['/', '/tutors', '/blog', '/blog/best-tutor-management-software', '/blog/tutafy-vs-alternatives', '/about', '/customers', '/contact', '/register', '/login', '/student/login', '/privacy', '/terms', '/book/sarah-test', '/tutors/sarah-test', '/switch']
export const SHEET_APP = ['/dashboard', '/students', '/students/' + S, '/lessons', '/lessons/' + L, '/calendar', '/messages', '/messages/' + S, '/payments', '/settings', '/upgrade', '/availability', '/reports', '/team', '/packages', '/ai']
export const SHEET_ADMIN = ['/admin', '/admin/tutors', '/super-admin', '/admin/buyers', '/admin/students', '/admin/revenue', '/admin/analytics', '/admin/settings', '/admin/migrate', '/super-admin/people/00000000-0000-4000-8000-000000000001', '/portal/' + T, '/portal/' + T + '/messages', '/portal/' + T + '/lessons/' + L, '/portal/parent/' + T]
export const SHEET_DESK = ['/', '/blog/tutafy-vs-alternatives', '/register', '/book/sarah-test', '/dashboard', '/payments', '/settings', '/upgrade']

// One page, one width: the full audit with the offenders that are not tiny svg parts.
export async function probe(u, width = 390, height = 844, wait = 2500) {
  const f = document.createElement('iframe')
  f.style.cssText = 'position:fixed;left:-20000px;top:0;border:0;width:' + width + 'px;height:' + height + 'px'
  document.body.appendChild(f)
  await new Promise(res => { f.onload = res; f.src = u; setTimeout(res, 20000) })
  await new Promise(r => setTimeout(r, wait))
  const a = audit(f.contentWindow)
  a.finalPath = f.contentWindow.location.pathname
  f.remove()
  const offenders = a.offenders.filter(o => !/^(path|svg|circle|line|polyline|rect)\b/.test(o.el))
  return { path: a.finalPath, sw: a.sw, cw: a.cw, main: a.mainScroll, offenders: offenders.slice(0, 10), scrollers: a.scrollers, clipped: a.clipped, tap: a.smallTargetSample.slice(0, 14), tapN: a.smallTargets, dist: a.distorted, txtN: a.smallTextCount, sizes: a.textSizes, txt: a.smallTextSample.slice(0, 10), img: a.imgOverflow }
}
