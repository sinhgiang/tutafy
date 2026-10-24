// T-0908 (rule 4b): no real email address or phone number is written in any file the repository tracks (it is public). Examples use
// example.com and made-up numbers; what the product needs at run time comes from the server variables ADMIN_EMAIL and CONTACT_EMAIL
// (src/lib/admin.ts, src/lib/contact.ts) or is a role mailbox built from the site's own domain (src/lib/email-config.ts).
// The detector below is this project's own copy of the rule Helme's weekly scan and push check use (same allowed placeholders), run over
// `git ls-files`, so a new address fails here before it is pushed. Its limits are in the self-check at the end.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const EMAIL = /(?<![A-Za-z0-9._%+-])([A-Za-z0-9._%+-]{1,64})@((?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24})(?![A-Za-z0-9_-])/g
const FILE_TLDS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif', 'ico', 'bmp', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'css', 'scss', 'json', 'md', 'html', 'htm', 'map', 'txt', 'yml', 'yaml', 'xml', 'lock', 'wasm', 'woff', 'woff2', 'ttf', 'otf', 'mp4', 'mov', 'webm', 'pdf', 'zip', 'gz', 'tgz'])
const EXAMPLE_DOMAINS = /^(?:(?:[a-z0-9-]+\.)*example(?:\.[a-z]{2,24}){1,2}|(?:[a-z0-9-]+\.)*(?:domain|yourdomain|your-domain|yourcompany|your-company|mydomain)\.(?:com|org|net)|(?:[a-z0-9-]+\.)*(?:test|example|invalid|localhost))$/i
const NOREPLY_LOCAL = /^(?:no[-_.]?reply|do[-_.]?not[-_.]?reply|donotreply|noreply\+?.*|[0-9]+\+[A-Za-z0-9-]+)$/i

/** Lines (1-based) of `text` that hold an email address that is not a placeholder. */
export function addressLines(text: string): number[] {
  const out: number[] = []
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.includes('@')) return
    for (const m of line.matchAll(EMAIL)) {
      const local = m[1]
      const domain = m[2].toLowerCase()
      const tld = domain.slice(domain.lastIndexOf('.') + 1)
      if (FILE_TLDS.has(tld) || EXAMPLE_DOMAINS.test(domain) || NOREPLY_LOCAL.test(local) || local.toLowerCase() === 'git') continue
      if (/(^|\.)noreply\./i.test(domain) || domain === 'users.noreply.github.com') continue
      out.push(i + 1)
    }
  })
  return out
}

const SKIP_EXT = /\.(png|jpe?g|gif|webp|avif|ico|bmp|svg|woff2?|ttf|otf|eot|mp3|mp4|mov|webm|wav|pdf|zip|gz|tgz|7z|wasm|map|lock)$/i

test('no tracked file holds a real-looking email address (file and line only in the failure, never the value)', () => {
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\0').filter(Boolean)
  const found: string[] = []
  for (const f of files) {
    if (SKIP_EXT.test(f) || path.basename(f) === 'package-lock.json') continue
    let buf: Buffer
    try { buf = readFileSync(path.join(ROOT, f)) } catch { continue }
    if (buf.subarray(0, 8000).includes(0)) continue
    for (const line of addressLines(buf.toString('utf8'))) found.push(`${f}:${line}`)
  }
  assert.deepEqual(found, [], 'real-looking addresses: use ten@example.com in examples; a value the product needs belongs in a server variable (rule 4b)')
})

test('self-check: the detector catches real-looking addresses and lets the placeholders through', () => {
  const real = ['mail me at jane.doe@gmail.com please', 'support@acme-widgets.io', 'a+tag@sub.company.vn', 'x@y.co']
  for (const t of real) assert.deepEqual(addressLines(t), [1], t)
  assert.deepEqual(addressLines('first\nsecond ten@mailhost.org\nthird'), [2], 'the line number is the line of the address')
  const fine = [
    'ten@example.com', 'a@b.example.org', 'noreply@acme.io', 'no-reply@acme.io', '1234+name@users.noreply.github.com',
    'git@github.com:owner/repo.git', 'logo@2x.png', 'lodash@4.17.21', '@/lib/admin', 'user:pass@localhost', 'a@host.test', '@types/node',
  ]
  for (const t of fine) assert.deepEqual(addressLines(t), [], t)
})
