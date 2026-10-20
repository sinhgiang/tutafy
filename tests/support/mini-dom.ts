// A very small stand-in for a browser page, so a measure written for a real browser (scripts/mobile-audit.mjs)
// can run in `npm test` on a few lines of HTML. It is NOT a layout engine: every size and place is written in
// the sample itself.
//
//   <button style="left:10px;top:0;width:80px;height:30px;border-radius:9999px">Save</button>
//
// What is understood: tags, attributes, text, nested elements, void elements (img, input, br); inline `style`
// with left, top, width, height (px), display, visibility, opacity, position, overflow-x, border-radius; the
// attribute `data-after="44x44"` gives the size of the element's ::after box (what getComputedStyle(el, '::after')
// answers). An element's left and top are relative to its parent's. Selectors: a comma list of compounds made of a
// tag or *, [attr], [attr=value], and :not([attr=value]).
const VOID = new Set(['img', 'input', 'br', 'hr', 'meta', 'link'])
const INLINE = new Set(['a', 'span', 'b', 'i', 'em', 'strong', 'svg', 'label', 'small'])

export interface TextNode { nodeType: 3; textContent: string; parentElement: El | null }

function px(v: string | undefined): number {
  const n = parseFloat(v ?? '')
  return Number.isFinite(n) ? n : 0
}

export class El {
  nodeType = 1 as const
  tagName: string
  attrs: Record<string, string>
  childNodes: Array<El | TextNode> = []
  parentElement: El | null = null
  private cssText: Record<string, string>
  constructor(tag: string, attrs: Record<string, string>) {
    this.tagName = tag.toUpperCase()
    this.attrs = attrs
    this.cssText = {}
    for (const part of (attrs.style ?? '').split(';')) {
      const i = part.indexOf(':')
      if (i > 0) this.cssText[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim()
    }
  }
  get className() { return this.attrs.class ?? '' }
  get type() { return this.attrs.type ?? '' }
  get value() { return this.attrs.value ?? '' }
  get placeholder() { return this.attrs.placeholder ?? '' }
  getAttribute(name: string) { return name in this.attrs ? this.attrs[name] : null }
  get children(): El[] { return this.childNodes.filter((n): n is El => n.nodeType === 1) }
  get firstElementChild(): El | null { return this.children[0] ?? null }
  get textContent(): string { return this.childNodes.map(n => (n.nodeType === 3 ? n.textContent : (n as El).textContent)).join('') }
  get innerText(): string { return this.textContent.replace(/\s+/g, ' ').trim() }
  style(prop: string) { return this.cssText[prop] }

  matches(selector: string): boolean { return parseSelector(selector).some(c => c(this)) }
  closest(selector: string): El | null {
    return this.matches(selector) ? this : (this.parentElement?.closest(selector) ?? null)
  }
  querySelectorAll(selector: string): El[] {
    const test = parseSelector(selector)
    const out: El[] = []
    const walk = (e: El) => { for (const c of e.children) { if (test.some(t => t(c))) out.push(c); walk(c) } }
    walk(this)
    return out
  }
  querySelector(selector: string): El | null { return this.querySelectorAll(selector)[0] ?? null }

  getBoundingClientRect() {
    const parent = this.parentElement?.getBoundingClientRect() ?? { left: 0, top: 0 }
    const left = parent.left + px(this.cssText.left)
    const top = parent.top + px(this.cssText.top)
    const width = px(this.cssText.width), height = px(this.cssText.height)
    return { left, top, width, height, right: left + width, bottom: top + height }
  }
}

// ---- selectors ----------------------------------------------------------------------------------

type Test = (e: El) => boolean

function attrTest(raw: string): Test {
  const m = /^\[([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]$/.exec(raw)
  if (!m) throw new Error(`mini-dom: unsupported attribute selector ${raw}`)
  const [, name, a, b, c] = m
  const want = a ?? b ?? c
  return e => (want === undefined ? name in e.attrs : e.attrs[name] === want)
}

function parseSelector(selector: string): Test[] {
  return selector.split(',').map(s => s.trim()).filter(Boolean).map(compound => {
    const m = /^([a-zA-Z*][\w-]*)?((?:\[[^\]]+\])*)((?::not\(\[[^\]]+\]\))*)$/.exec(compound)
    if (!m) throw new Error(`mini-dom: unsupported selector ${compound}`)
    const tag = m[1], attrs = [...m[2].matchAll(/\[[^\]]+\]/g)].map(x => attrTest(x[0]))
    const nots = [...m[3].matchAll(/:not\((\[[^\]]+\])\)/g)].map(x => attrTest(x[1]))
    return (e: El) => (!tag || tag === '*' || e.tagName === tag.toUpperCase()) && attrs.every(t => t(e)) && !nots.some(t => t(e))
  })
}

// ---- parser -------------------------------------------------------------------------------------

export function parseHtml(html: string): El {
  const root = new El('body', {})
  const stack: El[] = [root]
  const token = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[\w:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g
  for (const m of html.matchAll(token)) {
    const top = stack[stack.length - 1]
    if (m[1]) { // closing tag: pop up to the matching open one
      for (let i = stack.length - 1; i > 0; i--) if (stack[i].tagName === m[1].toUpperCase()) { stack.length = i; break }
    } else if (m[2]) {
      const attrs: Record<string, string> = {}
      for (const a of m[3].matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attrs[a[1]] = a[2] ?? a[3] ?? a[4] ?? ''
      const el = new El(m[2], attrs)
      el.parentElement = top
      top.childNodes.push(el)
      if (!VOID.has(m[2].toLowerCase()) && !m[4]) stack.push(el)
    } else if (m[5]) {
      top.childNodes.push({ nodeType: 3, textContent: m[5], parentElement: top })
    }
  }
  return root
}

// ---- window -------------------------------------------------------------------------------------

/** The part of `window` the measures use: document (body, documentElement.clientWidth) and getComputedStyle. */
export function windowFor(html: string, opts: { width?: number } = {}) {
  const body = parseHtml(html)
  const document = { body, documentElement: { clientWidth: opts.width ?? 390 } }
  const getComputedStyle = (el: El, pseudo?: string) => {
    if (pseudo === '::after') {
      const m = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/.exec(el.attrs['data-after'] ?? '')
      return m ? { width: `${m[1]}px`, height: `${m[2]}px`, content: '""' } : { width: 'auto', height: 'auto', content: 'none' }
    }
    const tag = el.tagName.toLowerCase()
    return {
      display: el.style('display') ?? (tag === 'button' ? 'inline-block' : INLINE.has(tag) ? 'inline' : 'block'),
      visibility: el.style('visibility') ?? 'visible',
      opacity: el.style('opacity') ?? '1',
      position: el.style('position') ?? 'static',
      overflowX: el.style('overflow-x') ?? el.style('overflow') ?? 'visible',
      borderTopLeftRadius: el.style('border-top-left-radius') ?? el.style('border-radius') ?? '0px',
    }
  }
  return { document, getComputedStyle: getComputedStyle as (el: El, pseudo?: string) => Record<string, string>, innerWidth: opts.width ?? 390 }
}
