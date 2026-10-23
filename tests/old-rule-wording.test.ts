// T-0703: a value rule that was loosened must not still be stated in a comment or a sentence. The list of old wordings is
// tests/support/old-rules.ts; this file runs the scan over src/ and supabase/migrations/, proves the scan finds an old comment put
// back and passes once it is gone, and keeps the two things around it: the pull request template that asks for the old wording, and
// the pull request check that runs the tests, the type check and the build.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALLOW_MARKER, MIN_REASON_LENGTH, OLD_RULE_PHRASES, SCANNED_ROOTS, describeFinding, scanRepository, scanText } from './support/old-rules.ts'
import { settingsSource } from './support/settings-source.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

// ---- the repository ----------------------------------------------------------------------------------------------------------

test('no comment or sentence in src or supabase/migrations still states a value rule that was replaced', () => {
  const { files, findings } = scanRepository(ROOT)
  assert.ok(files > 250, `the scan read ${files} files`)
  assert.deepEqual(findings.map(describeFinding), [], 'reword the place, or mark real history with `allow-old-rule: <reason>`')
})

test('the scan reads src and the migrations, and the places that keep an old phrase on purpose say why', () => {
  assert.deepEqual(SCANNED_ROOTS, ['src', 'supabase/migrations'])
  const marked = ['src/lib/lesson-durations.ts', 'supabase/migrations/018_lesson_durations.sql']
  for (const f of marked) {
    const text = read(f)
    assert.ok(text.includes(ALLOW_MARKER), `${f} marks its history`)
    // the old phrase is really there, so the marker is doing something (a stale marker would already fail the scan above)
    assert.ok(OLD_RULE_PHRASES.some(p => text.toLowerCase().includes(p.phrase.toLowerCase())), `${f} still has a phrase the marker covers`)
  }
  // the places that were wrong are fixed in the words, not marked
  assert.doesNotMatch(settingsSource(), /30\/45\/60\/90/)
  assert.doesNotMatch(settingsSource(), new RegExp(ALLOW_MARKER))
})

// ---- the list ------------------------------------------------------------------------------------------------------------------

test('the list holds each old wording once, with what it was, what it is now and the ticket', () => {
  const seen = new Set<string>()
  for (const p of OLD_RULE_PHRASES) {
    const key = p.phrase.toLowerCase().replace(/\s+/g, ' ')
    assert.ok(!seen.has(key), `${p.phrase} is listed twice`)
    seen.add(key)
    assert.ok(p.phrase.length >= 6, `${p.phrase} is too short to be a phrase of words`)
    assert.ok(p.was.length > 10 && p.now.length > 10 && /^T-\d+/.test(p.ticket), p.phrase)
    assert.doesNotMatch(p.phrase, /^\[.*\]$/, 'a list of numbers in code is not a phrase of words')
  }
  for (const wanted of ['30, 45, 60 and 90', '30/45/60/90', 'only 30']) assert.ok(seen.has(wanted.toLowerCase()), `${wanted} is on the list`)
})

// ---- the scan itself: an old comment put back is found, taken away it passes ------------------------------------------------------

const OLD_COMMENT = '// the values are cleaned to 30/45/60/90 first.'

test('MUTATION: an old comment put back makes the scan fail, and taking it away makes it pass', () => {
  const clean = 'export const x = 1\n// the values are cleaned to whole minutes from 10 to 240 first.\nexport const y = 2\n'
  assert.deepEqual(scanText('src/a.ts', clean), [])
  const dirty = clean.replace('// the values are cleaned to whole minutes from 10 to 240 first.', OLD_COMMENT)
  const found = scanText('src/a.ts', dirty)
  assert.equal(found.length, 1)
  assert.deepEqual([found[0].file, found[0].line, found[0].problem], ['src/a.ts', 2, 'old-rule'])
  assert.deepEqual(scanText('src/a.ts', dirty.replace(OLD_COMMENT, '// gone')), [])
})

test('the scan finds each listed phrase in a comment, a string, page text and an SQL comment, in any case and spacing', () => {
  for (const p of OLD_RULE_PHRASES) {
    for (const sample of [`// ${p.phrase}`, `const s = '${p.phrase} min'`, `<p>${p.phrase.toUpperCase()}</p>`, `-- ${p.phrase.replace(/ /g, '  ')}`, `/* ${p.phrase} */`, `{/* ${p.phrase} */}`]) {
      assert.equal(scanText('f', sample).length, 1, `${p.phrase} in ${sample}`)
    }
  }
})

test('a phrase wrapped over two comment lines is still found, and reports the line it starts on', () => {
  const wrapped = ['const a = 1', '// the lengths are only 30, 45, 60', '// and 90 minutes', 'const b = 2'].join('\n')
  const found = scanText('f', wrapped)
  assert.deepEqual(found.map(f => [f.line, f.problem]), [[2, 'old-rule']])
  const block = ['/**', ' * the booking page offers 30, 45,', ' * 60 or 90 minutes', ' */'].join('\n')
  assert.equal(scanText('f', block).length, 1)
  assert.equal(scanText('f', '-- offers 30/45/\n-- 60/90 only').length, 0, 'a phrase is words, not a guess at a split inside a token')
})

test('a list of numbers in code, and the new rule, are not found', () => {
  for (const fine of ['export const ALL_DURATIONS = [30, 45, 60, 90] as const', 'check (d in (30, 45, 60, 90))', '// any whole number of minutes from 10 to 240 in steps of 5', "const r = 'only 3 lengths'", '// 30 minutes is the shortest preset', "// lengths 10 to 240; the presets are 30 45 60 90"]) {
    assert.deepEqual(scanText('f', fine), [], fine)
  }
})

test('a marker with a reason, within 3 lines above or 1 below, lets the old phrase stay; too far, or no reason, it does not', () => {
  const reason = 'history, what the first version said'
  assert.deepEqual(scanText('f', `// ${ALLOW_MARKER} ${reason}\n// offers 30, 45, 60 and 90`), [])
  assert.deepEqual(scanText('f', `// offers 30, 45, 60 and 90 ${ALLOW_MARKER} ${reason}`), [])
  assert.deepEqual(scanText('f', `// ${ALLOW_MARKER} ${reason}\n//\n//\n// offers 30, 45, 60 and 90`), [], 'three lines above')
  assert.deepEqual(scanText('f', `// offers 30, 45, 60 and 90\n// ${ALLOW_MARKER} ${reason}`), [], 'one line below')
  assert.deepEqual(scanText('f', `-- ${ALLOW_MARKER} ${reason}\n-- offers 30/45/60/90`), [], 'in SQL')
  assert.deepEqual(scanText('f', `{/* ${ALLOW_MARKER} ${reason} */}\n<p>30/45/60/90</p>`), [], 'in JSX')
  const far = scanText('f', `// ${ALLOW_MARKER} ${reason}\n//\n//\n//\n// offers 30, 45, 60 and 90`)
  assert.deepEqual(far.map(f => f.problem).sort(), ['old-rule', 'stale-marker'], 'four lines above is too far, and the marker then guards nothing')
  const below = scanText('f', `// offers 30, 45, 60 and 90\n//\n// ${ALLOW_MARKER} ${reason}`)
  assert.deepEqual(below.map(f => f.problem).sort(), ['old-rule', 'stale-marker'], 'two lines below is too far')
})

test('a marker with no reason (or a short one) does not let anything stay, and is an error; a marker beside nothing is an error', () => {
  const none = scanText('f', `// ${ALLOW_MARKER}\n// offers 30, 45, 60 and 90`)
  assert.deepEqual(none.map(f => f.problem).sort(), ['marker-without-reason', 'old-rule'])
  assert.ok('too short'.length < MIN_REASON_LENGTH)
  const short = scanText('f', `// ${ALLOW_MARKER} too short\n// offers 30, 45, 60 and 90`)
  assert.deepEqual(short.map(f => f.problem).sort(), ['marker-without-reason', 'old-rule'])
  const stale = scanText('f', `// ${ALLOW_MARKER} history, the first version said so\n// nothing old here`)
  assert.deepEqual(stale.map(f => f.problem), ['stale-marker'])
})

test('one marker covers the phrases beside it, another phrase further down is still found', () => {
  const text = ['// ' + ALLOW_MARKER + ' history, the first version said so', '// offers 30, 45, 60 and 90', '', '', '', '', '// and later 30/45/60/90'].join('\n')
  const found = scanText('f', text)
  assert.deepEqual(found.map(f => [f.line, f.problem]), [[7, 'old-rule']])
})

// ---- what the scan is wired into -----------------------------------------------------------------------------------------------

test('the pull request template asks the author to add the old wording to the list when a value rule changes', () => {
  const template = read('.github/pull_request_template.md')
  assert.match(template, /tests\/support\/old-rules\.ts/)
  assert.match(template, /- \[ \] .*(rule|limit|allowed values).*old wording/i)
})

test('the pull request check runs the type check, the tests and the build (the scan is part of the tests)', () => {
  const workflow = read('.github/workflows/pull-request.yml')
  assert.match(workflow, /^on:\n\s+pull_request:/m)
  const steps = [...workflow.matchAll(/^\s*(?:- )?run: (.+)$/gm)].map(m => m[1].trim())
  for (const wanted of ['npm ci', 'npm run typecheck', 'npm test', 'npm run build']) assert.ok(steps.includes(wanted), `the pull request check runs "${wanted}" (has: ${steps.join(' | ')})`)
  // the build comes after the tests, and needs only placeholder public values: no secret is given to a pull request build
  assert.ok(steps.indexOf('npm run build') > steps.indexOf('npm test'))
  const build = workflow.slice(workflow.indexOf('npm run build'))
  assert.match(build, /NEXT_PUBLIC_SUPABASE_URL/)
  assert.doesNotMatch(workflow, /secrets\./, 'a pull request check holds no secret')
  assert.doesNotMatch(workflow, /SERVICE_ROLE|SECRET_KEY|ACCESS_TOKEN/, 'no private key name in the check')
  assert.match(read('package.json'), /"test": "[^\n]*tests\/\*\.test\.ts/)
  assert.match(read('package.json'), /"build": "next build"/)
})
