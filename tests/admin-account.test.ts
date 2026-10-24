// T-0908 (rule 4b): the admin account is the ADMIN_EMAIL variable, not an address written in the code. These tests run the real
// src/lib/admin.ts and the real admin gates (page and API) and prove the gate is closed unless the variable names the signed-in account.
import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')

let sessionUser: { id: string; email: string } | null = null
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: sessionUser } }) } }) },
})
mock.module('next/navigation', { exports: { redirect: (to: string) => { throw new Error(`NEXT_REDIRECT:${to}`) } } })

const { adminEmail, isAdminEmail, adminGateTarget } = await import('@/lib/admin.ts')
const { requireAdminPage, adminApiGate } = await import('@/lib/admin-guard.ts')

const OWNER = 'owner@example.com' // made up
const OTHER = 'someone@example.com'

async function withAdminEmail<T>(value: string | undefined, fn: () => T | Promise<T>): Promise<T> {
  const before = process.env.ADMIN_EMAIL
  if (value === undefined) delete process.env.ADMIN_EMAIL
  else process.env.ADMIN_EMAIL = value
  try { return await fn() } finally {
    if (before === undefined) delete process.env.ADMIN_EMAIL
    else process.env.ADMIN_EMAIL = before
  }
}

test('with ADMIN_EMAIL set, only that exact account is the admin', () => {
  const env = { ADMIN_EMAIL: OWNER }
  assert.equal(adminEmail(env), OWNER)
  assert.equal(isAdminEmail(OWNER, env), true)
  assert.equal(isAdminEmail(OWNER.toUpperCase(), env), false)
  assert.equal(isAdminEmail(`x${OWNER}`, env), false)
  assert.equal(isAdminEmail(`${OWNER}.evil.example`, env), false)
  assert.equal(isAdminEmail(OTHER, env), false)
  assert.equal(isAdminEmail(null, env), false)
  assert.equal(isAdminEmail(undefined, env), false)
  assert.equal(isAdminEmail('', env), false)
  assert.equal(adminEmail({ ADMIN_EMAIL: `  ${OWNER}\n` }), OWNER, 'spaces pasted around the value are ignored')
})

test('fail closed: with ADMIN_EMAIL missing, blank or not an address, NOBODY is the admin (not even an empty or missing email)', () => {
  for (const bad of [undefined, '', '   ', 'owner', 'owner@', '@example.com', 'a@b', 'x y@example.com', `${OWNER},${OTHER}`, '*']) {
    const env = { ADMIN_EMAIL: bad }
    assert.equal(adminEmail(env), null, JSON.stringify(bad))
    for (const who of [OWNER, OTHER, '', bad, null, undefined]) assert.equal(isAdminEmail(who as string | null | undefined, env), false, `${JSON.stringify(bad)} / ${JSON.stringify(who)}`)
  }
})

test('the gate target: signed out goes to login, another account to the dashboard, the admin nowhere; unset variable sends everyone away', () => {
  const env = { ADMIN_EMAIL: OWNER }
  assert.equal(adminGateTarget(null, env), '/login')
  assert.equal(adminGateTarget({ email: OTHER }, env), '/dashboard')
  assert.equal(adminGateTarget({ email: OWNER }, env), null)
  assert.equal(adminGateTarget({ email: OWNER }, {}), '/dashboard', 'no ADMIN_EMAIL: even the owner is sent to the dashboard (locked out, never let others in)')
  assert.equal(adminGateTarget({ email: null }, {}), '/dashboard')
})

test('the real page gate and API gate read the variable at the moment of the check', async () => {
  sessionUser = { id: 'u1', email: OWNER }
  await withAdminEmail(OWNER, async () => {
    await assert.doesNotReject(requireAdminPage())
    assert.equal(await adminApiGate(), null)
  })
  await withAdminEmail(undefined, async () => {
    await assert.rejects(requireAdminPage(), /NEXT_REDIRECT:\/dashboard/)
    assert.equal((await adminApiGate())?.status, 403)
  })
  await withAdminEmail(OTHER, async () => {
    await assert.rejects(requireAdminPage(), /NEXT_REDIRECT:\/dashboard/)
    assert.equal((await adminApiGate())?.status, 403)
  })
  sessionUser = null
  await withAdminEmail(OWNER, async () => {
    await assert.rejects(requireAdminPage(), /NEXT_REDIRECT:\/login/)
    assert.equal((await adminApiGate())?.status, 401)
  })
})
