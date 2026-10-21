// T-0712: every place that tells a customer where to write shows BOTH contact addresses, the first one first, as mailto links, and
// the addresses are typed once (src/lib/contact.ts). Pages are rendered for real (renderToStaticMarkup), and the whole of src/ is read.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import type React from 'react'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { CONTACT_EMAILS, PRIMARY_CONTACT_EMAIL, SUPPORT_CONTACT_EMAIL, REPLY_PROMISE } = await import('@/lib/contact.ts')
const ContactPage = (await import('@/app/contact/page.tsx')).default as () => React.ReactElement
const PrivacyPage = (await import('@/app/privacy/page.tsx')).default as () => React.ReactElement
const TermsPage = (await import('@/app/terms/page.tsx')).default as () => React.ReactElement

const mailtos = (html: string) => [...html.matchAll(/href="mailto:([^"?]+)(?:\?[^"]*)?"/g)].map(m => m[1].replace(/&amp;/g, '&'))

test('the two addresses: the owner\'s address first, the company mailbox second, both whole addresses', () => {
  assert.deepEqual([...CONTACT_EMAILS], [PRIMARY_CONTACT_EMAIL, SUPPORT_CONTACT_EMAIL])
  assert.equal(PRIMARY_CONTACT_EMAIL, 'tubxeebyajtube@gmail.com')
  assert.equal(SUPPORT_CONTACT_EMAIL, 'support@tutafy.com')
})

test('/contact shows both addresses, the first first, each a clickable mailto link, and the reply promise', () => {
  const html = renderToStaticMarkup(ContactPage())
  const links = mailtos(html)
  assert.deepEqual(links.filter(a => CONTACT_EMAILS.includes(a as never)), [
    PRIMARY_CONTACT_EMAIL, SUPPORT_CONTACT_EMAIL,   // the "Email us" card
    PRIMARY_CONTACT_EMAIL,                          // the feedback card
    PRIMARY_CONTACT_EMAIL, SUPPORT_CONTACT_EMAIL,   // "Prefer email? Reach us directly at ..."
  ])
  // the visible text of each address is the address itself, so what a person reads is what the link opens
  for (const a of CONTACT_EMAILS) assert.ok(html.includes(`>${a}</a>`), `${a} is the text of a link`)
  assert.ok(html.includes('Support &amp; general questions'))
  assert.ok(html.indexOf('Prefer email?') < html.indexOf(REPLY_PROMISE), 'the promise stands under the addresses')
  assert.equal(REPLY_PROMISE, 'We usually reply within one business day.')
  assert.ok(html.includes(`</a>. ${REPLY_PROMISE}`), 'a full stop and a space between the last address and the promise (it ran together before this check)')
  assert.ok(html.indexOf(`>${PRIMARY_CONTACT_EMAIL}</a>`) < html.indexOf(`>${SUPPORT_CONTACT_EMAIL}</a>`), 'the owner\'s address first')
  // no link is inside another link (a clickable card around two links is invalid)
  assert.ok(!/<a [^>]*>(?:(?!<\/a>)[\s\S])*<a /.test(html), 'no <a> inside an <a>')
})

test('/privacy and /terms tell the customer both addresses, the first first, as mailto links', () => {
  for (const [name, page] of [['privacy', PrivacyPage], ['terms', TermsPage]] as const) {
    const html = renderToStaticMarkup(page())
    assert.deepEqual(mailtos(html), [PRIMARY_CONTACT_EMAIL, SUPPORT_CONTACT_EMAIL], name)
  }
})

// ---- the whole of src/ ----------------------------------------------------------------------------------------------------------

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${name}`
    if (statSync(path.join(ROOT, rel)).isDirectory()) sourceFiles(rel, out)
    else if (/\.(ts|tsx)$/.test(name)) out.push(rel)
  }
  return out
}
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

// The only files that may type an address. Each one is listed with the reason; a new one needs a reason here.
const MAY_TYPE: Record<string, string> = {
  'src/lib/contact.ts': 'the one place the two contact addresses are written',
  'src/lib/admin.ts': 'ADMIN_EMAIL: the owner\'s sign-in account, compared by the admin gate; not shown to customers',
  'src/app/(auth)/register/page.tsx': 'sends the owner\'s own sign-in to /admin after registering; not shown to customers',
  'src/app/(admin)/admin/settings/page.tsx': 'the owner\'s own admin settings page, shows the account; not shown to customers',
  'src/lib/email-config.ts': 'the Reply-To of outgoing mail (T-0686, on its own branch): the code uses the company mailbox as the address that replies go to',
}

test('no file of src/ types either contact address except the files listed with a reason; the list holds no file that does not need to be there', () => {
  const offenders: string[] = []
  const used = new Set<string>()
  for (const f of sourceFiles('src')) {
    const text = read(f)
    for (const a of CONTACT_EMAILS) {
      if (!text.includes(a)) continue
      if (MAY_TYPE[f]) used.add(f)
      else offenders.push(`${f} types ${a}: draw it with <ContactEmails /> or import it from src/lib/contact.ts`)
    }
  }
  assert.deepEqual(offenders, [])
  // a listed file that exists must really type an address, so the list cannot grow stale (email-config.ts is allowed to be absent)
  for (const f of Object.keys(MAY_TYPE)) {
    let exists = true
    try { read(f) } catch { exists = false }
    if (exists) assert.ok(used.has(f), `${f} is listed but types no contact address: remove it from MAY_TYPE`)
  }
})

test('the pages that tell a customer to email use <ContactEmails />, and say nothing like "email <address>" without it', () => {
  const pages = ['src/app/contact/page.tsx', 'src/app/privacy/page.tsx', 'src/app/terms/page.tsx', 'src/app/(dashboard)/upgrade/page.tsx', 'src/app/(dashboard)/upgrade/success/page.tsx']
  for (const f of pages) assert.match(read(f), /<ContactEmails\b/, f)
  // any other file that links to mailto: with a fixed text must name no address (the waitlist and the progress report link to a customer's own email: a variable)
  // src/lib/push.ts: the VAPID contact that push services may write to, never printed to a customer
  const NOT_SHOWN = new Set(['src/lib/push.ts'])
  for (const f of sourceFiles('src').filter(f => !NOT_SHOWN.has(f))) {
    for (const m of read(f).matchAll(/mailto:([^"'`\s>]+)/g)) {
      assert.ok(m[1].startsWith('$') || m[1].startsWith('{'), `${f}: mailto:${m[1]} must come from a variable (src/lib/contact.ts for a contact address)`)
    }
  }
})
