// T-0895: eslint is part of the checks every pull request must pass, and a new lint problem turns the pull request red.
// What this file checks:
//   - `npm run lint` fails on a warning too (--max-warnings 0), so a warning cannot pile up the way the 177 errors did;
//   - the pull request workflow runs it, before the build;
//   - the real eslint configuration of the project, run on small made-up sources, reports the mistakes that used to be left in
//     (an `any`, a variable nobody reads, state set at once inside an effect) and reports nothing on clean code;
//   - `one()` (src/lib/relation.ts), which replaced the `as any` casts on to-one embeds, reads an object, an array or nothing.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import { one } from '@/lib/relation'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8')

test('npm run lint fails on a warning as well as on an error', () => {
  const scripts = JSON.parse(read('package.json')).scripts as Record<string, string>
  assert.match(scripts.lint, /^eslint\b.*--max-warnings 0\b/)
})

test('the pull request workflow runs the lint before the build', () => {
  const wf = read('.github/workflows/pull-request.yml')
  const lint = wf.indexOf('run: npm run lint')
  const build = wf.indexOf('run: npm run build')
  assert.ok(lint > 0, 'a step runs npm run lint')
  assert.ok(lint < build, 'and it runs before the build')
})

async function lint(code: string, file: string) {
  const eslint = new ESLint({ cwd: ROOT })
  const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, file) })
  return result
}

test('the project configuration reports an explicit any as an error', async () => {
  const r = await lint('export const x: any = 1\n', 'src/lib/probe-any.ts')
  assert.equal(r.errorCount, 1)
  assert.equal(r.messages[0].ruleId, '@typescript-eslint/no-explicit-any')
})

test('the project configuration reports a variable nobody reads, and --max-warnings 0 counts it', async () => {
  const r = await lint('export function f() {\n  const unused = 1\n  return 2\n}\n', 'src/lib/probe-unused.ts')
  assert.equal(r.errorCount, 0)
  assert.equal(r.warningCount, 1)
  assert.equal(r.messages[0].ruleId, '@typescript-eslint/no-unused-vars')
})

test('the project configuration reports state set at once inside an effect', async () => {
  const code = [
    "'use client'",
    "import { useEffect, useState } from 'react'",
    'export function Probe() {',
    '  const [n, setN] = useState(0)',
    '  useEffect(() => { setN(1) }, [])',
    '  return <p>{n}</p>',
    '}',
    '',
  ].join('\n')
  const r = await lint(code, 'src/components/ProbeEffect.tsx')
  assert.equal(r.errorCount, 1)
  assert.equal(r.messages[0].ruleId, 'react-hooks/set-state-in-effect')
})

test('the project configuration reports nothing on clean code', async () => {
  const r = await lint("export const add = (a: number, b: number): number => a + b\n", 'src/lib/probe-clean.ts')
  assert.equal(r.errorCount + r.warningCount, 0)
})

test('one() reads an object, the first of an array, and nothing', () => {
  assert.deepEqual(one({ name: 'Ann' }), { name: 'Ann' })
  assert.deepEqual(one([{ name: 'Ann' }, { name: 'Bo' }]), { name: 'Ann' })
  assert.equal(one([]), null)
  assert.equal(one(null), null)
  assert.equal(one(undefined), null)
})
