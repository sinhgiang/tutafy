// The public Updates page (/updates): one text file per version in content/updates/, newest first.
// Adding a file adds an entry; nothing in the page code changes.
//
// A file is named <version>.md and looks like this:
//
//   ---
//   version: 1.4.0
//   date: 2026-10-21
//   title: A short headline
//   summary: One sentence under the headline      (optional)
//   image: /updates/first-student-card.webp      (a .webp or .png file under public/updates/; loadUpdates refuses an entry without one)
//   imageAlt: What the picture shows              (needed with the image)
//   ---
//   - One plain sentence a tutor understands.
//   - Another one.
//
// The rules are checked here (and by tests/updates.test.ts), and a broken file stops the build, so a
// half-written entry can never reach the public page. The text is written for tutors: no ticket names,
// no email addresses or phone numbers (the owner's rule 4b), no private data.
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import type { UpdateEntry } from '@/lib/updates-format'

export { formatUpdateDate, formatUpdateDateShort, pickVersion } from '@/lib/updates-format'
export type { UpdateEntry } from '@/lib/updates-format'

// Read when called (not when the file loads), relative to the folder the server or the test runs in.
export const updatesDir = () => path.join(process.cwd(), 'content', 'updates')
export const publicDir = () => path.join(process.cwd(), 'public')

export const TITLE_MAX = 80
export const BULLET_MAX = 220
export const SUMMARY_MAX = 200
export const BULLETS_MAX = 8

const VERSION = /^\d+\.\d+\.\d+$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/
const PHONE_LIKE = /\+?\d[\d ().-]{7,}\d/g
const DAY = /\d{4}-\d{2}-\d{2}/g
const TICKET = /\b[TW]-\d{3,}\b/

/** A run of nine or more digits (spaces, dashes and brackets allowed) reads like a phone number; a written day does not. */
function hasPhoneNumber(value: string): boolean {
  return (value.replace(DAY, ' ').match(PHONE_LIKE) ?? []).some(run => run.replace(/\D/g, '').length >= 9)
}

function isRealDate(date: string): boolean {
  if (!DATE.test(date)) return false
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d
}

/** 1.10.0 is newer than 1.9.0: compare the numbers, not the letters. Positive when a is newer. */
export function compareVersions(a: string, b: string): number {
  const x = a.split('.').map(Number)
  const y = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]
  return 0
}

/**
 * Reads one file. `fileName` is the name inside content/updates/ (for example "1.4.0.md"); it must match the
 * version written in the file. Throws an Error that names the file and what is wrong.
 */
export function parseUpdate(raw: string, fileName: string): UpdateEntry {
  const fail = (why: string): never => { throw new Error(`content/updates/${fileName}: ${why}`) }
  const text = raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const m = /^---\n([\s\S]*?)\n---[ \t]*(?:\n([\s\S]*))?$/.exec(text)
  if (!m) return fail('the file must start with a header between two --- lines')

  const head: Record<string, string> = {}
  for (const line of m[1].split('\n')) {
    if (!line.trim()) continue
    const kv = /^([A-Za-z]+):[ \t]*(.*)$/.exec(line)
    if (!kv) return fail(`cannot read the header line "${line}"`)
    head[kv[1]] = kv[2].trim()
  }
  const known = ['version', 'date', 'title', 'summary', 'image', 'imageAlt']
  for (const k of Object.keys(head)) if (!known.includes(k)) fail(`unknown header "${k}"`)

  const version = head.version ?? ''
  if (!version) fail('the version is missing')
  if (!VERSION.test(version)) fail(`the version "${version}" must look like 1.4.0`)
  if (fileName !== `${version}.md`) fail(`the file must be named ${version}.md to match its version`)

  const date = head.date ?? ''
  if (!date) fail('the date is missing')
  if (!isRealDate(date)) fail(`the date "${date}" must be a real day written YYYY-MM-DD`)

  const title = head.title ?? ''
  if (!title) fail('the title is missing')
  if (title.length < 3 || title.length > TITLE_MAX) fail(`the title must be 3 to ${TITLE_MAX} characters, it is ${title.length}`)

  const summary = head.summary ?? ''
  if ('summary' in head && (summary.length < 3 || summary.length > SUMMARY_MAX)) fail(`the summary must be 3 to ${SUMMARY_MAX} characters, it is ${summary.length}`)

  const bullets: string[] = []
  for (const line of (m[2] ?? '').split('\n')) {
    if (!line.trim()) continue
    const b = /^- +(\S.*)$/.exec(line.trimEnd())
    if (!b) return fail(`every line under the header must be a bullet starting with "- ", not "${line.trim()}"`)
    bullets.push(b[1])
  }
  if (bullets.length === 0) fail('there must be at least one bullet')
  if (bullets.length > BULLETS_MAX) fail(`at most ${BULLETS_MAX} bullets, there are ${bullets.length}`)
  for (const b of bullets) if (b.length > BULLET_MAX) fail(`a bullet is ${b.length} characters, the limit is ${BULLET_MAX}`)

  const texts: [string, string][] = [['title', title], ['summary', summary], ['imageAlt', head.imageAlt ?? ''], ...bullets.map((b): [string, string] => ['bullet', b])]
  for (const [what, value] of texts) {
    if (EMAIL.test(value)) fail(`the ${what} contains an email address, use ten@example.com style examples or none`)
    if (hasPhoneNumber(value)) fail(`the ${what} contains a phone number`)
    if (TICKET.test(value)) fail(`the ${what} names an internal ticket, write for tutors instead`)
  }

  const entry: UpdateEntry = { version, date, title, ...(summary ? { summary } : {}), bullets }
  if (head.image) {
    if (!/^\/updates\/[A-Za-z0-9._-]+\.(webp|png)$/.test(head.image)) fail(`the image "${head.image}" must be /updates/<name>.webp (or .png) under public/`)
    if (!head.imageAlt) fail('an image needs imageAlt, a sentence describing it')
    entry.image = { src: head.image, alt: head.imageAlt }
  } else if (head.imageAlt) {
    fail('imageAlt is written but there is no image')
  }
  return entry
}

/**
 * Checks the entries together: no version twice, and a newer version never carries an older date.
 * Returns them newest first.
 */
export function sortUpdates(entries: UpdateEntry[]): UpdateEntry[] {
  const sorted = [...entries].sort((a, b) => compareVersions(b.version, a.version))
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].version === sorted[i - 1].version) throw new Error(`version ${sorted[i].version} is written twice`)
    if (i > 0 && sorted[i].date > sorted[i - 1].date) {
      throw new Error(`version ${sorted[i - 1].version} is newer than ${sorted[i].version} but dated ${sorted[i - 1].date}, before ${sorted[i].date}`)
    }
  }
  return sorted
}

/** Width and height of a .png or .webp file, read from its first bytes; null when it is neither. */
export function imageSize(buf: Buffer): { width: number; height: number } | null {
  const ok = (width: number, height: number) => (width > 0 && height > 0 ? { width, height } : null)
  if (buf.length >= 24 && buf.toString('latin1', 1, 4) === 'PNG' && buf.toString('latin1', 12, 16) === 'IHDR') {
    return ok(buf.readUInt32BE(16), buf.readUInt32BE(20))
  }
  if (buf.length >= 30 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
    const kind = buf.toString('latin1', 12, 16)
    if (kind === 'VP8X') return ok(1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3))
    if (kind === 'VP8 ' && buf[23] === 0x9d && buf[24] === 0x01 && buf[25] === 0x2a) return ok(buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff)
    if (kind === 'VP8L' && buf[20] === 0x2f) {
      const bits = buf.readUInt32LE(21)
      return ok((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1)
    }
  }
  return null
}

// The folders come in as arguments (the tests point them at a scratch copy), so the bundler cannot see where they
// are and would trace the whole project into the server; the ignore marks say the reads are meant, and
// next.config.ts names the one folder the deployed functions need (content/updates).

/**
 * Every entry in the folder, newest first. Throws (and so stops the build) on the first broken file.
 * `pictures` is the folder that holds public/: the pictures are checked there and their size is read. Pass null to
 * skip that (the sitemap only needs the dates, and a deployed function has no public/ folder).
 */
export function loadUpdates(dir: string = updatesDir(), pictures: string | null = publicDir()): UpdateEntry[] {
  const names = readdirSync(/*turbopackIgnore: true*/ dir).filter(n => n.toLowerCase().endsWith('.md')).sort()
  const entries = names.map(n => parseUpdate(readFileSync(path.join(/*turbopackIgnore: true*/ dir, n), 'utf8'), n))
  for (const e of entries) {
    if (pictures === null) continue
    // Every entry carries a picture (the owner's rule, T-0834): a half-done entry never reaches the page.
    if (!e.image) throw new Error(`content/updates/${e.version}.md: the entry has no picture, add image and imageAlt (a .webp or .png under public/updates/)`)
    const file = path.join(/*turbopackIgnore: true*/ pictures, e.image.src)
    if (!existsSync(/*turbopackIgnore: true*/ file)) throw new Error(`content/updates/${e.version}.md: the image ${e.image.src} is not in public/`)
    const size = imageSize(readFileSync(/*turbopackIgnore: true*/ file))
    if (!size) throw new Error(`content/updates/${e.version}.md: the image ${e.image.src} is not a readable .webp or .png file`)
    e.image.width = size.width
    e.image.height = size.height
  }
  return sortUpdates(entries)
}

/** The day of the newest entry (for the sitemap), or undefined when there are none or the folder cannot be read. */
export function newestUpdateDate(dir: string = updatesDir()): string | undefined {
  try {
    return loadUpdates(dir, null)[0]?.date
  } catch {
    return undefined
  }
}
