// T-0641: a home-made measure must not say it catches more than it really checks.
// Reviewers caught the same slip twice (lock comment-claims-missing-check; the T-0616 and T-0629 reports): a comment
// said "an icon-only round button must stay a circle" while the code skipped every button that holds an svg, so the
// measure was green and checked nothing for that kind.
//
// 1. Every kind a measure claims has a row in tests/support/measure-claims.ts: a small sample in the broken state and
//    one in the right state. This test runs the REAL measure on both: the broken sample must be reported, the right one
//    must pass.
// 2. In the measure files, every comment that claims a catch must carry a [claim: id] marker of a row, and every row must
//    be claimed in its own file. Missing either way turns this test red.
// Runs in `npm test`; no GitHub Actions.
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { CLAIMS, MEASURE_FILES, CLAIM_WORDS, commentBlocks, claimProblems, readRepoFile } from './support/measure-claims.ts'
import { parseHtml, windowFor } from './support/mini-dom.ts'

for (const c of CLAIMS) {
  test(`${c.id}: the measure reports ${c.kind} when it is broken, and passes it when it is right`, async () => {
    assert.ok(c.kind.length > 10 && c.file.length > 0)
    assert.equal(await c.run(c.broken as never), true, `${c.id}: the broken sample was NOT reported: the measure skips this kind`)
    assert.equal(await c.run(c.good as never), false, `${c.id}: the right sample was reported: the measure is wrong, or the sample is`)
  })
}

test('the table is whole: unique ids, every row has two different samples and a file that exists', () => {
  assert.ok(CLAIMS.length >= 12, 'the table lost rows')
  assert.equal(new Set(CLAIMS.map(c => c.id)).size, CLAIMS.length)
  for (const c of CLAIMS) {
    assert.match(c.id, /^[a-z][a-z0-9-]*$/)
    assert.notDeepEqual(c.broken, c.good, `${c.id}: the broken and the right sample are the same`)
    assert.ok(readRepoFile(c.file).length > 0, c.file)
    assert.ok(MEASURE_FILES.includes(c.file), `${c.file} (row ${c.id}) is not in MEASURE_FILES, so its comments would never be checked`)
  }
})

test('every claim in the comments of the measure files has a row in the table, and every row is claimed', () => {
  const files = Object.fromEntries(MEASURE_FILES.map(f => [f, readRepoFile(f)]))
  assert.deepEqual(claimProblems(CLAIMS, files), [])
})

// ---- the rule catches what it is made for (self-checks on small made-up files) ----------------------------------------

const row = (id: string, file = 'a.mjs') => ({ id, file })

test('a comment that claims a catch with no marker turns the check red', () => {
  const src = '// this measure catches every round icon button that was stretched\nexport function f() {}\n'
  const problems = claimProblems([], { 'a.mjs': src })
  assert.equal(problems.length, 1)
  assert.match(problems[0], /a\.mjs:1: a comment claims a catch \("catches"\)/)
})

test('the same comment with a marker of a row passes; a marker with no row, or a row nobody claims, does not', () => {
  const ok = '// this measure catches every round icon button [claim: round-icon]\nexport function f() {}\n'
  assert.deepEqual(claimProblems([row('round-icon')], { 'a.mjs': ok }), [])
  assert.match(claimProblems([], { 'a.mjs': ok })[0], /\[claim: round-icon\] has no row/)
  assert.match(claimProblems([row('round-icon'), row('other')], { 'a.mjs': ok })[0], /row other: nobody claims it/)
  assert.match(claimProblems([row('round-icon', 'b.mjs')], { 'a.mjs': ok, 'b.mjs': 'export const x = 1\n' })[0], /row round-icon: nobody claims it/)
})

test('every way of claiming is seen: block comments, doc comments, trailing comments, "must stay", "no longer"', () => {
  for (const src of [
    '/* the switch must stay a pill */\n',
    '/**\n * A button with no text\n * must keep its shape.\n */\n',
    'const a = 1 // this is no longer missed\n',
    '// reports are fine\n// and the gap is flagged here\n'.replace('flagged here', 'is flagged'),
    '// an element that is reported\n',
  ]) {
    assert.equal(claimProblems([], { 'a.mjs': src }).length, 1, src)
  }
  // plain description is not a claim
  assert.deepEqual(claimProblems([], { 'a.mjs': '// builds the list of buttons\n/* a note about layout */\nconst x = 1 // fine\n' }), [])
  assert.ok(CLAIM_WORDS.test('it catches') && !CLAIM_WORDS.test('it matches'))
  assert.equal(commentBlocks('// one\n// two\ncode()\n// three\n').length, 2)
})

// ---- the fake page the measures run in ---------------------------------------------------------------------------------

test('the fake page answers what the measures ask: selectors, text, rectangles, styles, the ::after box', () => {
  const root = parseHtml('<div style="left:10px;top:20px;width:100px;height:50px"><a href="/x" style="left:5px;width:40px;height:20px">Go <b>now</b></a><input type="hidden"><input type="text" aria-hidden="true"><img src="a.png"><button role="switch" data-after="44x44"></button></div>')
  assert.equal(root.querySelectorAll('a[href], button').length, 2)
  assert.equal(root.querySelectorAll('input:not([type=hidden])').length, 1)
  assert.equal(root.querySelector('input[type=text]')!.closest('[aria-hidden="true"]')!.tagName, 'INPUT')
  assert.equal(root.querySelector('a')!.innerText, 'Go now')
  assert.deepEqual(root.querySelector('a')!.getBoundingClientRect(), { left: 15, top: 20, width: 40, height: 20, right: 55, bottom: 40 })
  const win = windowFor('<button role="switch" data-after="44x44" style="border-radius:9999px;display:none"></button><button></button>')
  const [sw, plain] = win.document.body.querySelectorAll('button')
  assert.equal(win.getComputedStyle(sw, '::after').width, '44px')
  assert.equal(win.getComputedStyle(plain, '::after').width, 'auto')
  assert.equal(win.getComputedStyle(sw).display, 'none')
  assert.equal(win.getComputedStyle(sw).borderTopLeftRadius, '9999px')
  assert.equal(win.getComputedStyle(plain).display, 'inline-block')
  assert.throws(() => root.querySelectorAll('div > a'), /unsupported selector/)
})
