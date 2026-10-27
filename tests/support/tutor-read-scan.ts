// A scan of the source for every place that reads the `tutors` table or the blocked days (`availability_exceptions`) (T-0774), and for WHICH
// client it reads with. A visitor's key is no longer allowed to read either table (supabase/migrations/025_tutors_not_public.sql), so a
// page or an API that is open to a visitor must read them only with the server's admin client. The scan finds the read, finds the name the
// client goes by, and follows that name back to the line that made it:
//   - 'admin':   made by createAdminClient(), by admin(), or by a client built with the service-role key;
//   - 'param':   a client handed in by the caller (db, client): a helper in src/lib; its callers decide which client it gets;
//   - 'session': everything else (the signed-in user's own session client, or the browser client).
// What it does not see (written in tests/public-tutor-scan.test.ts too): a table name held in a variable, a `tutors(...)` join inside a select
// string, and a client passed through an object field under another name. Comments are ignored.

export type ReadKind = 'admin' | 'param' | 'session'
export type TutorRead = { table: string; line: number; receiver: string; kind: ReadKind; statement: string }

const TABLES = ['tutors', 'availability_exceptions']

/** The source with comments blanked out (same length, so positions and line numbers stay). */
export function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, (m, lead: string) => lead + ' '.repeat(m.length - lead.length))
}

const NAME = String.raw`[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*`

function receiverOf(before: string): string {
  // `x.from(` | `x\n  .from(` | `makeIt().from(` | `(db as T).from(`
  const call = /([A-Za-z_$][\w$.]*)\s*\(\s*\)\s*$/.exec(before)
  if (call) return `${call[1]}()`
  const cast = /\(\s*([A-Za-z_$][\w$]*)\s+as\s+[^)]*\)\s*$/.exec(before)
  if (cast) return cast[1]
  const plain = new RegExp(`(${NAME})\\s*!?\\s*$`).exec(before)
  return plain ? plain[1] : '?'
}

function classify(receiver: string, before: string): ReadKind {
  if (/^(createAdminClient|admin|getAdmin|adminClient)\(\)$/.test(receiver)) return 'admin'
  const name = receiver.replace(/\(\)$/, '')
  const escaped = name.replace(/[.$]/g, m => `\\${m}`)
  // a parameter whose type says it is the server's client: `supabase: ReturnType<typeof createAdminClient>`
  if (new RegExp(String.raw`\b${escaped}\s*:\s*ReturnType<typeof createAdminClient>`).test(before)) return 'admin'
  // the nearest line above that made this name
  const re = new RegExp(String.raw`(?:const|let|var)\s+${escaped}\s*(?::[^=\n]+)?=\s*([^\n]*)(\n[^\n;]*)?`, 'g')
  let expr: string | null = null
  let m: RegExpExecArray | null
  // the expression is the rest of the line; the next line belongs to it only when this one is not finished (ends with an operator or an opening bracket)
  while ((m = re.exec(before))) expr = /[=(,?:&|+]\s*$/.test(m[1]) ? m[1] + (m[2] ?? '') : m[1]
  if (expr !== null) {
    if (/createAdminClient\s*\(|\badmin\s*\(|SERVICE_ROLE/.test(expr)) return 'admin'
    return /^(db|client|anon)$/.test(name) ? 'param' : 'session' // `const client = db as Reader`: still the caller's client
  }
  // no line makes it, so it is a parameter: the name says what the caller must hand in
  if (/^(admin|adminClient)$/.test(name)) return 'admin'
  if (/^(db|client|anon)$/.test(name)) return 'param'
  return 'session'
}

export function findReads(source: string): TutorRead[] {
  const src = stripComments(source.split('\r\n').join('\n'))
  const out: TutorRead[] = []
  const re = new RegExp(String.raw`\.from\(\s*['"](${TABLES.join('|')})['"]\s*\)`, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    const before = src.slice(0, m.index)
    const receiver = receiverOf(before)
    out.push({
      table: m[1],
      line: before.split('\n').length,
      receiver,
      kind: classify(receiver, before),
      statement: src.slice(m.index, m.index + 360).split(/\n\s*\n|;\n/)[0],
    })
  }
  return out
}

/** True when the read is narrowed to the signed-in user's own row: .eq('id' | 'tutor_id', something that names the user). */
export function isOwnRow(statement: string): boolean {
  return /\.eq\(\s*['"](id|tutor_id)['"]\s*,\s*[^)]*\b(user|userId|session)\b/.test(statement)
}

/** Does this file make or use the browser client or the visitor's key directly? */
export function usesVisitorKey(source: string): boolean {
  const src = stripComments(source)
  return /NEXT_PUBLIC_SUPABASE_ANON_KEY/.test(src) || /@\/lib\/supabase\/client/.test(src)
}

/** The text of the first argument of a call whose "(" is at `open`, up to the first "," or ")" that is not inside another pair of brackets. */
function firstArgAt(src: string, open: number): string {
  let depth = 0
  for (let i = open + 1; i < src.length; i++) {
    const c = src[i]
    if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') { if (depth === 0) return src.slice(open + 1, i).trim(); depth-- }
    else if (c === ',' && depth === 0) return src.slice(open + 1, i).trim()
  }
  return src.slice(open + 1).trim()
}

/** For a helper that takes a client: each call to it in this file, with the first argument and the source above the call (to resolve a name). */
export function callsOf(source: string, helper: string): { line: number; firstArg: string; before: string }[] {
  const src = stripComments(source.split('\r\n').join('\n'))
  const out: { line: number; firstArg: string; before: string }[] = []
  const re = new RegExp(String.raw`(?<![\w$.])${helper}\s*\(`, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    const before = src.slice(0, m.index)
    if (/(?:function|import|export)[^\n]*$/.test(before.split('\n').pop() ?? '')) continue // the definition or the import, not a call
    out.push({ line: before.split('\n').length, firstArg: firstArgAt(src, m.index + m[0].length - 1), before })
  }
  return out
}

/** Is this argument the server's client? Resolved the way a read's receiver is: the call that makes it, or the line above that made the name. */
export function argIsAdmin(arg: string, source: string, before: string = stripComments(source)): boolean {
  const a = arg.replace(/\s+as\s+[\w$.<>\[\]| ]+$/, '').replace(/^\((.*)\)$/, '$1').trim()
  if (/createAdminClient\s*\(/.test(a)) return true
  const call = /^([A-Za-z_$][\w$]*)\(\)$/.exec(a)
  if (call) {
    if (/^(admin|getAdmin|adminClient)$/.test(call[1])) return true
    // a function of this file that makes the client: its body must use the server's key
    const def = new RegExp(String.raw`(?:function\s+${call[1]}\b|(?:const|let)\s+${call[1]}\b[^\n]*=)[\s\S]{0,700}`).exec(stripComments(source))
    return !!def && /createAdminClient\s*\(|SERVICE_ROLE/.test(def[0])
  }
  if (/^[A-Za-z_$][\w$.]*$/.test(a)) return classify(a, before) === 'admin'
  return false
}

/** Reads made by a plain REST request (fetch of .../rest/v1/tutors?...), which the client-based scan does not see. */
export function findRestReads(source: string): { table: string; line: number; statement: string }[] {
  const src = stripComments(source.split('\r\n').join('\n'))
  const out: { table: string; line: number; statement: string }[] = []
  const re = /rest\/v1\/(tutors|availability_exceptions)\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) out.push({ table: m[1], line: src.slice(0, m.index).split('\n').length, statement: src.slice(m.index, m.index + 360) })
  return out
}
