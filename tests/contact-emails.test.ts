// T-0712: every place that tells a customer where to write shows the contact addresses, the first one first, as mailto links, and
// the addresses are decided once (src/lib/contact.ts). Pages are rendered for real (renderToStaticMarkup), and the whole of src/ is read.
// T-0908 (rule 4b): the owner's own address is not written in the code. It comes from the CONTACT_EMAIL variable; the tests below set a
// made-up one, and prove what the pages show when it is missing.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import type React from 'react'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OWNER = 'owner@example.com' // made up: the real address lives in the server variable CONTACT_EMAIL, never in a file
const { contactEmails, primaryContactEmail, SUPPORT_CONTACT_EMAIL, REPLY_PROMISE } = await import('@/lib/contact.ts')
const { MAIL_DOMAIN, DEFAULT_REPLY_TO } = await import('@/lib/email-config.ts')
const ContactPage = (await import('@/app/contact/page.tsx')).default as () => React.ReactElement
const PrivacyPage = (await import('@/app/privacy/page.tsx')).default as () => React.ReactElement
const TermsPage = (await import('@/app/terms/page.tsx')).default as () => React.ReactElement

const mailtos = (html: string) => [...html.matchAll(/href="mailto:([^"?]+)(?:\?[^"]*)?"/g)].map(m => m[1].replace(/&amp;/g, '&'))

/** Runs `fn` with CONTACT_EMAIL set to `value` (undefined: removed), then puts back what was there. */
async function withContactEmail<T>(value: string | undefined, fn: () => T | Promise<T>): Promise<T> {
  const before = process.env.CONTACT_EMAIL
  if (value === undefined) delete process.env.CONTACT_EMAIL
  else process.env.CONTACT_EMAIL = value
  try { return await fn() } finally {
    if (before === undefined) delete process.env.CONTACT_EMAIL
    else process.env.CONTACT_EMAIL = before
  }
}

test('the addresses: the owner\'s (from CONTACT_EMAIL) first, the company mailbox last, both whole addresses', async () => {
  await withContactEmail(OWNER, () => {
    assert.deepEqual(contactEmails(), [OWNER, SUPPORT_CONTACT_EMAIL])
    assert.equal(primaryContactEmail(), OWNER)
  })
  assert.equal(SUPPORT_CONTACT_EMAIL, `support@${MAIL_DOMAIN}`)
  assert.equal(SUPPORT_CONTACT_EMAIL, DEFAULT_REPLY_TO, 'the contact page and the Reply-To of outgoing mail are the same mailbox')
})

test('CONTACT_EMAIL missing, blank or not an address: the company mailbox alone is shown, never "undefined" and never a made-up address', async () => {
  for (const bad of [undefined, '', '   ', 'not-an-address', 'a@b', 'two@example.com,three@example.com', 'x y@example.com', 'mailto:x@example.com']) {
    await withContactEmail(bad, () => {
      assert.equal(primaryContactEmail(), null, JSON.stringify(bad))
      assert.deepEqual(contactEmails(), [SUPPORT_CONTACT_EMAIL], JSON.stringify(bad))
    })
  }
  // a value that is the company mailbox itself is not listed twice
  await withContactEmail(SUPPORT_CONTACT_EMAIL, () => assert.deepEqual(contactEmails(), [SUPPORT_CONTACT_EMAIL]))
  // spaces around a good value are ignored (a value pasted into the host's form often has them)
  await withContactEmail(`  ${OWNER}\n`, () => assert.deepEqual(contactEmails(), [OWNER, SUPPORT_CONTACT_EMAIL]))
})

test('/contact shows the addresses, the first first, each a clickable mailto link, and the reply promise', async () => {
  await withContactEmail(OWNER, () => {
    const html = renderToStaticMarkup(ContactPage())
    const links = mailtos(html)
    assert.deepEqual(links.filter(a => contactEmails().includes(a)), [
      OWNER, SUPPORT_CONTACT_EMAIL,   // the "Email us" card
      OWNER,                          // the feedback card
      OWNER, SUPPORT_CONTACT_EMAIL,   // "Prefer email? Reach us directly at ..."
    ])
    // the visible text of each address is the address itself, so what a person reads is what the link opens
    for (const a of contactEmails()) assert.ok(html.includes(`>${a}</a>`), `${a} is the text of a link`)
    assert.ok(html.includes('Support &amp; general questions'))
    assert.ok(html.indexOf('Prefer email?') < html.indexOf(REPLY_PROMISE), 'the promise stands under the addresses')
    assert.equal(REPLY_PROMISE, 'We usually reply within one business day.')
    assert.ok(html.includes(`</a>. ${REPLY_PROMISE}`), 'a full stop and a space between the last address and the promise (it ran together before this check)')
    assert.ok(html.indexOf(`>${OWNER}</a>`) < html.indexOf(`>${SUPPORT_CONTACT_EMAIL}</a>`), 'the owner\'s address first')
    // no link is inside another link (a clickable card around two links is invalid)
    assert.ok(!/<a [^>]*>(?:(?!<\/a>)[\s\S])*<a /.test(html), 'no <a> inside an <a>')
  })
})

test('/contact with no CONTACT_EMAIL still works: the company mailbox only, and the feedback card writes to it', async () => {
  await withContactEmail(undefined, () => {
    const html = renderToStaticMarkup(ContactPage())
    assert.ok(!/undefined|null/.test(mailtos(html).join(' ')), 'no mailto link names undefined or null')
    assert.deepEqual(mailtos(html), [SUPPORT_CONTACT_EMAIL, SUPPORT_CONTACT_EMAIL, SUPPORT_CONTACT_EMAIL])
    assert.ok(html.includes(REPLY_PROMISE))
  })
})

test('/privacy and /terms tell the customer the addresses, the first first, as mailto links (and the company mailbox alone when CONTACT_EMAIL is missing)', async () => {
  for (const [name, page] of [['privacy', PrivacyPage], ['terms', TermsPage]] as const) {
    await withContactEmail(OWNER, () => assert.deepEqual(mailtos(renderToStaticMarkup(page())), [OWNER, SUPPORT_CONTACT_EMAIL], name))
    await withContactEmail(undefined, () => assert.deepEqual(mailtos(renderToStaticMarkup(page())), [SUPPORT_CONTACT_EMAIL], name))
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

test('the pages that tell a customer to email use <ContactEmails />, and say nothing like "email <address>" without it', () => {
  const pages = ['src/app/contact/page.tsx', 'src/app/privacy/page.tsx', 'src/app/terms/page.tsx', 'src/app/(dashboard)/upgrade/page.tsx', 'src/app/(dashboard)/upgrade/success/page.tsx']
  for (const f of pages) assert.match(read(f), /<ContactEmails\b/, f)
  // any other file that links to mailto: with a fixed text must name no address (the waitlist and the progress report link to a customer's own email: a variable)
  // src/lib/push.ts: the VAPID contact that push services may write to, never printed to a customer
  const NOT_SHOWN = new Set(['src/lib/push.ts'])
  for (const f of sourceFiles('src').filter(f => !NOT_SHOWN.has(f))) {
    for (const m of read(f).matchAll(/mailto:([A-Za-z0-9$.{_][^"'`\s>]*)/g)) {
      assert.ok(m[1].startsWith('$') || m[1].startsWith('{'), `${f}: mailto:${m[1]} must come from a variable (src/lib/contact.ts for a contact address)`)
    }
  }
})
