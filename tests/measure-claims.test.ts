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

import { CLAIMS, MEASURE_FILES, CLAIM_WORDS, KIND_WORDS, LEFT_WITHOUT_ROW, commentBlocks, claimProblems, kindProblems, readRepoFile } from './support/measure-claims.ts'
import { parseHtml, windowFor } from './support/mini-dom.ts'

for (const c of CLAIMS) {
  test(`${c.id}: the measure reports ${c.kind} when it is broken, and passes it when it is right`, async () => {
    assert.ok(c.kind.length > 10 && c.file.length > 0)
    for (const [i, s] of [c.broken, ...(c.moreBroken ?? [])].entries()) {
      assert.equal(await c.run(s as never), true, `${c.id}: broken sample ${i + 1} was NOT reported: the measure skips this kind`)
    }
    for (const [i, s] of [c.good, ...(c.moreGood ?? [])].entries()) {
      assert.equal(await c.run(s as never), false, `${c.id}: right sample ${i + 1} was reported: the measure is wrong, or the sample is`)
    }
  })
}

test('the table is whole: unique ids, every row has two different samples and a file that exists', () => {
  assert.ok(CLAIMS.length >= 30, 'the table lost rows')
  assert.equal(new Set(CLAIMS.map(c => c.id)).size, CLAIMS.length)
  for (const c of CLAIMS) {
    assert.match(c.id, /^[a-z][a-z0-9-]*$/)
    assert.notDeepEqual(c.broken, c.good, `${c.id}: the broken and the right sample are the same`)
    assert.ok(readRepoFile(c.file).length > 0, c.file)
    assert.ok(MEASURE_FILES.includes(c.file), `${c.file} (row ${c.id}) is not in MEASURE_FILES, so its comments would never be checked`)
    assert.ok(Array.isArray(c.covers), `${c.id}: no covers`)
  }
  for (const f of MEASURE_FILES) assert.ok(KIND_WORDS[f]?.length, `${f} has no KIND_WORDS: the kinds its comments name would not be checked`)
  for (const l of LEFT_WITHOUT_ROW) assert.ok(l.what.length > 20 && l.why.length > 40, `LEFT_WITHOUT_ROW needs a reason: ${l.what}`)
})

test('every claim in the comments of the measure files has a row in the table, and every row is claimed', () => {
  const files = Object.fromEntries(MEASURE_FILES.map(f => [f, readRepoFile(f)]))
  assert.deepEqual(claimProblems(CLAIMS, files), [])
})

test('every kind a measure comment names has a row that covers it (the comment cannot hide kinds behind one marker)', () => {
  const files = Object.fromEntries(MEASURE_FILES.map(f => [f, readRepoFile(f)]))
  assert.deepEqual(kindProblems(CLAIMS, files), [])
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

// ---- the kind rule (T-0641 review): one marker cannot answer for a list of kinds ----------------------------------------

const kinds = { 'a.mjs': [['button', /\bbuttons?\b/i], ['summary', /\bsummary\b/i], ['tab', /\btabs?\b/i]] as [string, RegExp][] }
const krow = (id: string, covers: string[]) => ({ id, file: 'a.mjs', covers })

test('a comment that names kinds is red unless a row it marks covers each one; one row for the whole list is red', () => {
  const list = '// Every button, summary and tab under 44px is reported. [claim: small]\nexport function f() {}\n'
  const one = kindProblems([krow('small', ['button'])], { 'a.mjs': list }, kinds).join('\n')
  assert.match(one, /names "summary" but no row it marks covers it/)
  assert.match(one, /names "tab" but no row it marks covers it/)
  const all = '// Every button, summary and tab under 44px is reported. [claim: b] [claim: s] [claim: t]\n'
  assert.deepEqual(kindProblems([krow('b', ['button']), krow('s', ['summary']), krow('t', ['tab'])], { 'a.mjs': all }, kinds), [])
  // rows that exist but are not marked in THIS comment do not count
  assert.equal(kindProblems([krow('small', ['button']), krow('s', ['summary']), krow('t', ['tab'])], { 'a.mjs': list }, kinds).length, 2)
})

test('the kind rule is not fooled: marker text is not a kind, "tablet" is not "tab", no marker is the claim rule\'s business, an unknown kind is red', () => {
  assert.deepEqual(kindProblems([krow('small-tab', ['button'])], { 'a.mjs': '// Every button is reported. [claim: small-tab]\n' }, kinds), [])
  assert.deepEqual(kindProblems([krow('b', ['button'])], { 'a.mjs': '// A button on a tablet is reported, we summarise it. [claim: b]\n' }, kinds), [])
  assert.deepEqual(kindProblems([], { 'a.mjs': '// the summary is described here\n' }, kinds), [])
  assert.match(kindProblems([krow('b', ['buton'])], { 'a.mjs': '// A button is reported. [claim: b]\n' }, kinds).join('\n'), /covers "buton", which is not a kind of a\.mjs/)
  assert.deepEqual(kindProblems([], { 'other.mjs': '// A summary is reported. [claim: x]\n' }, kinds), [])
})

test('the real kind lists see the kinds the real comments name (a list that matches nothing would pass everything)', () => {
  const marker = /\[claim: [\w-]+\]/g
  const audit = commentBlocks(readRepoFile('scripts/mobile-audit.mjs')).find(b => b.text.includes('[claim: small-target-button]'))!.text.replace(marker, ' ')
  const seen = KIND_WORDS['scripts/mobile-audit.mjs'].filter(([, w]) => w.test(audit)).map(([n]) => n)
  for (const k of ['button', 'link', 'field', 'select', 'textarea', 'summary', 'tab', 'menu item', 'checkbox', 'switch']) assert.ok(seen.includes(k), `the kind list does not see "${k}" in the findSmallTargets comment`)
  const scans = commentBlocks(readRepoFile('tests/support/mobile-scans.ts')).map(b => b.text.replace(marker, ' ')).join('\n')
  for (const [name, w] of KIND_WORDS['tests/support/mobile-scans.ts']) assert.ok(w.test(scans), `the kind "${name}" is named in no comment of mobile-scans.ts: take it out of KIND_WORDS`)
  const limits = commentBlocks(readRepoFile('tests/support/rate-limit-check.ts')).map(b => b.text.replace(marker, ' ')).join('\n')
  for (const [name, w] of KIND_WORDS['tests/support/rate-limit-check.ts']) assert.ok(w.test(limits), `the kind "${name}" is named in no comment of rate-limit-check.ts: take it out of KIND_WORDS`)
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
