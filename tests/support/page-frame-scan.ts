// Finds a tutor page that sets its own width (T-0820). A page must sit in the frame the layout gives it
// (PageFrame) or in a PageColumn; a root element with its own max-w-* is how content ended up pinned to the left.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import path from 'node:path'

/** The first element a component returns: its tag and its attribute text up to the first ">" that is not inside braces. */
export function firstReturnedElements(source: string): { tag: string; attrs: string }[] {
  const out: { tag: string; attrs: string }[] = []
  for (const m of source.matchAll(/\breturn\s*\(?\s*<([A-Za-z][\w.]*)/g)) {
    let i = m.index! + m[0].length
    let depth = 0
    let quote: string | null = null
    const start = i
    for (; i < source.length; i++) {
      const c = source[i]
      if (quote) { if (c === quote) quote = null; continue }
      if (depth > 0) { if (c === '{') depth++; else if (c === '}') depth--; else if (c === '"' || c === "'" || c === '`') quote = c; continue }
      if (c === '{') { depth = 1; continue }
      if (c === '"' || c === "'") { quote = c; continue }
      if (c === '>') break
    }
    out.push({ tag: m[1], attrs: source.slice(start, i) })
  }
  return out
}

/** Roots that set a width of their own: a max-w-* class on the first returned element. */
export function ownWidthRoots(source: string): string[] {
  return firstReturnedElements(source)
    .filter(e => /\bmax-w-/.test(e.attrs))
    .map(e => `<${e.tag}${e.attrs.length > 60 ? e.attrs.slice(0, 60) + '...' : e.attrs}>`)
}

export function tsxFiles(root: string, dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(path.join(root, dir))) {
    const rel = `${dir}/${name}`
    if (statSync(path.join(root, rel)).isDirectory()) tsxFiles(root, rel, out)
    else if (/\.tsx$/.test(name)) out.push(rel)
  }
  return out
}

/** The component files a file imports from src/components (not ui or layout) or with a relative path. */
function importedComponents(root: string, rel: string, source: string): string[] {
  const found: string[] = []
  for (const m of source.matchAll(/from\s+['"]((?:@\/components\/|\.{1,2}\/)[^'"]+)['"]/g)) {
    const spec = m[1]
    const base = spec.startsWith('@/') ? path.posix.join('src', spec.slice(2)) : path.posix.join(path.posix.dirname(rel), spec)
    for (const cand of [`${base}.tsx`, `${base}/index.tsx`]) {
      if (existsSync(path.join(root, cand)) && !/^src\/components\/(ui|layout|admin)\//.test(cand)) found.push(cand)
    }
  }
  return found
}

/** Every file under src/app/(dashboard), plus the components they draw (followed through imports). */
export function dashboardPageFiles(root: string): string[] {
  const seen = new Set<string>(tsxFiles(root, 'src/app/(dashboard)'))
  const queue = [...seen]
  while (queue.length) {
    const rel = queue.pop()!
    for (const dep of importedComponents(root, rel, readFileSync(path.join(root, rel), 'utf8'))) {
      if (!seen.has(dep)) { seen.add(dep); queue.push(dep) }
    }
  }
  return [...seen].sort()
}
