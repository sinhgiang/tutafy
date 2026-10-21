// T-0645: a sentence on the Privacy page may not promise more than the code does.
// The table is tests/support/privacy-promises.ts (read its header first). This file runs it:
//   - the page and the table agree (every absolute claim has a marker or a declared reason; no orphan marker or row);
//   - each enforced row holds on the real code and breaks on the same code with one change;
//   - each row that depends on a setting says the condition in the sentence;
//   - the checks themselves are checked: a new undeclared promise, a marker to a missing row, a lost condition and a changed
//     page make them red.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ABSOLUTE, OUT_OF_SCOPE, PRIVACY_PAGE, PROMISES, codeWith, replaceOnce, hasTest, pageSentences, privacyProblems, readSource,
  type PromiseRow,
} from './support/privacy-promises.ts'

const page = () => readSource(PRIVACY_PAGE)

// ---- the page and the table ------------------------------------------------------------------------------

test('every absolute claim on the Privacy page has a [promise: id] marker of a row, or a declared reason to be out of scope', () => {
  assert.deepEqual(privacyProblems(page()), [])
})

test('the page and the table are both read: the counts are what the table says', () => {
  const sentences = pageSentences(page())
  const absolute = sentences.filter(s => s.absolute)
  assert.ok(sentences.length > 25, `only ${sentences.length} sentences were read from the page`)
  const marked = absolute.filter(s => s.ids.length > 0)
  const waved = absolute.filter(s => s.ids.length === 0)
  assert.equal(marked.length + waved.length, absolute.length)
  assert.equal(waved.length, OUT_OF_SCOPE.length, 'one declared reason for each absolute sentence that has no marker')
  for (const row of PROMISES) assert.ok(marked.some(s => s.ids.includes(row.id)), row.id)
})

test('a claim out of scope because it is about our own database is kept by a test that exists', () => {
  for (const o of OUT_OF_SCOPE) {
    if (!o.keptBy) continue
    assert.ok(hasTest(o.keptBy.file, o.keptBy.title), `${o.keptBy.file} has no test titled "${o.keptBy.title}"`)
  }
})

// ---- each row ----------------------------------------------------------------------------------------------

test('every row names a guard that exists in the code', () => {
  for (const r of PROMISES) {
    assert.ok(readSource(r.guard.file).includes(r.guard.symbol), `${r.id}: ${r.guard.file} has no "${r.guard.symbol}"`)
  }
})

test('the right sample: on the real code, no enforced promise is found broken', async () => {
  const code = await codeWith()
  for (const r of PROMISES) {
    if (!r.check) continue
    const found = r.check.breaks(await r.check.evidence(code))
    assert.deepEqual(found, [], `${r.id} is broken by the real code`)
  }
})

test('the violation sample: with one change to the real code, each enforced promise is found broken', async () => {
  for (const r of PROMISES) {
    if (!r.check) continue
    assert.ok(r.check.mutations.length > 0, `${r.id} has no violation sample`)
    for (const m of r.check.mutations) {
      const code = await codeWith(m)
      const found = r.check.breaks(await r.check.evidence(code))
      assert.ok(found.length > 0, `${r.id}: "${m.why}" was not found; the promise would break unseen`)
    }
  }
})

test('a row that depends on a setting names it, says what it must be, and the sentence says the condition', () => {
  const withSetting = PROMISES.filter(r => r.setting)
  assert.deepEqual(withSetting.map(r => r.id), ['addresses-no-codes', 'retention-13-months'])
  for (const r of withSetting) {
    assert.ok(r.setting!.name.length > 20 && r.setting!.wanted.length > 10, r.id)
    assert.ok(r.setting!.sentenceMustSay.length > 0, r.id)
  }
  // the page text is checked by privacyProblems (first test); here: it fails when the condition is gone
  const carrier = pageSentences(page()).find(s => s.ids.includes('addresses-no-codes'))!
  assert.ok(/Enhanced Measurement/.test(carrier.text) && /switched off/.test(carrier.text))
})

test('a setting the code can show still holds: nothing in the code runs the purge, so the sentence says "by hand"', async () => {
  for (const r of PROMISES) {
    if (!r.setting?.assumption) continue
    assert.ok(r.setting.assumption.holds(await codeWith()), `${r.id}: ${r.setting.assumption.says} is no longer true: rewrite the sentence and the row`)
  }
})

// ---- the checks themselves ---------------------------------------------------------------------------------

/** The page with one sentence added at the end of the cookies paragraph. */
const withSentence = (s: string) => replaceOnce(page(), 'Declining does not affect your ability to use Tutafy.', `Declining does not affect your ability to use Tutafy. ${s}`)

test('a new absolute promise with no marker turns the check red', () => {
  for (const s of [
    'We never share your data with anyone.',
    'Google always receives a hashed identifier.',
    'No page address is sent to Meta.',
    'Nothing is sent to Google before you press Accept.',
    'Only the page name is sent to Google.',
    "We don't send personal data to Google Analytics.",
    'We will not send any data to an advertising partner.',
  ]) {
    const found = privacyProblems(withSentence(s))
    assert.ok(found.some(p => p.includes('has no [promise: id] marker') && p.includes(s)), `not caught: ${s} (${found.join(' | ')})`)
  }
})

test('a sentence that names a measurer cannot be waved through OUT_OF_SCOPE', () => {
  const lazy = [...OUT_OF_SCOPE, { starts: 'we never share your google data', why: 'laziness' }]
  const found = privacyProblems(withSentence('We never share your Google data with anyone.'), PROMISES, lazy)
  assert.ok(found.some(p => p.includes('names a measurer')), found.join(' | '))
})

test('a marker that points at no row, and a row that no sentence marks, turn the check red', () => {
  const unknown = withSentence('We never share your data with anyone.{/* [promise: no-such-row] */}')
  assert.ok(privacyProblems(unknown).some(p => p.includes('names no row of PROMISES')))
  const orphan: PromiseRow = { ...PROMISES[0], id: 'a-row-nobody-marks' }
  assert.ok(privacyProblems(page(), [...PROMISES, orphan]).some(p => p.includes('a-row-nobody-marks') && p.includes('marked by no sentence')))
})

test('a row whose words are no longer in the sentence it marks turns the check red', () => {
  const reworded = replaceOnce(page(), 'send nothing to Google at all', 'send very little to Google')
  assert.ok(privacyProblems(reworded).some(p => p.includes('private-pages-send-nothing') && p.includes('none of the sentences it marks says')))
})

test('a promise that depends on a setting turns red when its sentence no longer says the condition', () => {
  const noCondition = replaceOnce(page(), ', as long as the automatic page-change option of Google Analytics (called Enhanced Measurement) stays switched off in our Google Analytics settings', '')
  const found = privacyProblems(noCondition)
  assert.ok(found.some(p => p.includes('addresses-no-codes') && p.includes('does not say the condition')), found.join(' | '))
  const noByHand = replaceOnce(page(), 'runs by hand; it is not yet automatic', 'runs every month')
  assert.ok(privacyProblems(noByHand).some(p => p.includes('retention-13-months')))
})

test('an absolute claim that was declared out of scope turns red when its sentence is gone', () => {
  const gone = replaceOnce(page(), 'We do not sell your data.', 'We keep your data safe.')
  assert.ok(privacyProblems(gone).some(p => p.includes('we do not sell your data') && p.includes('matches 0 sentences')))
})

test('the claim words match whole words only', () => {
  const holds = (s: string) => ABSOLUTE.some(re => re.test(s))
  for (const s of ['We took a note of another knot in the notice.', 'A nothingness, a nobody, a nonstop notebook.', 'Monday is a normal day.', 'The cookies are on the table.', 'We keep records for a while.']) {
    assert.equal(holds(s), false, s)
  }
  for (const s of ['We never do it.', 'Only the owner.', 'It is not sent.', "We don't.", 'We don’t.', 'Nothing is sent.', 'No data is sent.', 'We keep it at most 13 months.', 'We send it at all times? Not at all.']) {
    assert.equal(holds(s), true, s)
  }
})

test('the sentences are cut where a reader would cut them', () => {
  const src = "return (<p>We use it, <b>only with your consent</b>, e.g. under COPPA (see below). Next sentence.{/* [promise: tags-only-after-accept] */} Third one? Yes! utm_source).</p>\n  )\n}\nfunction Section() {}"
  const s = pageSentences(src)
  // a full stop before a lower-case letter ("e.g. under") and a closing bracket do not end a sentence; a marker belongs to the sentence before it
  assert.deepEqual(s.map(x => x.text), ['We use it, only with your consent, e.g. under COPPA (see below).', 'Next sentence.', 'Third one?', 'Yes! utm_source).'])
  assert.deepEqual(s.map(x => x.ids), [[], ['tags-only-after-accept'], [], []])
  assert.deepEqual(s.map(x => x.absolute), [true, false, false, false])
})
