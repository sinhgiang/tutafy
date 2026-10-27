// T-0712, T-0957: every place that tells a customer where to write shows ONE address, the company mailbox (support@ on tutafy.com), as a
// mailto link, and the address is decided once (src/lib/contact.ts). Pages are rendered for real (renderToStaticMarkup), and the whole
// of src/ is read. T-0908 (rule 4b): no personal address of anyone is written in the code; T-0957: none is shown to a customer either,
// so a leftover CONTACT_EMAIL variable on the host changes nothing on the pages (the tests set one on purpose).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import type React from 'react'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC_ADDRESS = ['support', 'tutafy.com'].join('@') // joined, so this file holds no address of its own (tests/no-contact-addresses.test.ts); the owner's choice (T-0957), the one address a customer sees
const LEFTOVER = 'owner@example.com' // made up: stands for a personal address an old CONTACT_EMAIL variable might still hold
const { contactEmails, SUPPORT_CONTACT_EMAIL, REPLY_PROMISE } = await import('@/lib/contact.ts')
const { DEFAULT_REPLY_TO } = await import('@/lib/email-config.ts')
const ContactPage = (await import('@/app/contact/page.tsx')).default as () => React.ReactElement
const PrivacyPage = (await import('@/app/privacy/page.tsx')).default as () => React.ReactElement
const TermsPage = (await import('@/app/terms/page.tsx')).default as () => React.ReactElement
const { ContactEmails } = await import('@/components/ContactEmails.tsx')

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

test('the address: the support mailbox of tutafy.com alone, the same mailbox the outgoing mail names as Reply-To', () => {
  assert.equal(SUPPORT_CONTACT_EMAIL, PUBLIC_ADDRESS)
  assert.deepEqual(contactEmails(), [PUBLIC_ADDRESS])
  assert.equal(SUPPORT_CONTACT_EMAIL, DEFAULT_REPLY_TO, 'the contact page and the Reply-To of outgoing mail are the same mailbox')
})

test('a leftover CONTACT_EMAIL variable (or none) changes nothing: no personal address is shown', async () => {
  for (const v of [undefined, '', LEFTOVER, `  ${LEFTOVER}\n`, 'not-an-address']) {
    await withContactEmail(v, () => assert.deepEqual(contactEmails(), [PUBLIC_ADDRESS], JSON.stringify(v)))
  }
})

test('/contact shows the support mailbox as a clickable mailto link in all three places, and the reply promise', async () => {
  await withContactEmail(LEFTOVER, () => {
    const html = renderToStaticMarkup(ContactPage())
    assert.deepEqual(mailtos(html), [PUBLIC_ADDRESS, PUBLIC_ADDRESS, PUBLIC_ADDRESS], 'the "Email us" card, the feedback card, "Prefer email?"')
    assert.ok(!html.includes(LEFTOVER), 'no other address on the page')
    assert.ok(!/undefined|null/.test(mailtos(html).join(' ')), 'no mailto link names undefined or null')
    // the visible text of the address is the address itself, so what a person reads is what the link opens
    assert.ok(html.includes(`>${PUBLIC_ADDRESS}</a>`))
    assert.ok(html.includes('Support &amp; general questions'))
    assert.ok(html.indexOf('Prefer email?') < html.indexOf(REPLY_PROMISE), 'the promise stands under the address')
    assert.equal(REPLY_PROMISE, 'We usually reply within one business day.')
    assert.ok(html.includes(`</a>. ${REPLY_PROMISE}`), 'a full stop and a space between the address and the promise')
    assert.match(html, /href="mailto:support@tutafy\.com\?subject=Tutafy%20feedback"/, 'the feedback card writes to the same address')
    // no link is inside another link (a clickable card around two links is invalid)
    assert.ok(!/<a [^>]*>(?:(?!<\/a>)[\s\S])*<a /.test(html), 'no <a> inside an <a>')
  })
})

test('the structured data and the meta tags of /contact name no email address', async () => {
  const page = await import('@/app/contact/page.tsx')
  const html = renderToStaticMarkup(ContactPage())
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => m[1])
  assert.ok(ld.length > 0, 'the page still carries its JSON-LD')
  for (const block of ld) {
    JSON.parse(block.replace(/\\u003c/gi, '<')) // valid JSON
    assert.ok(!/@[A-Za-z0-9-]+\.[A-Za-z]{2,}/.test(block), 'no address in the JSON-LD')
    assert.ok(!/"(email|contactPoint)"/.test(block), 'no email or contactPoint field')
  }
  const meta = JSON.stringify(page.metadata)
  assert.ok(!/@[A-Za-z0-9-]+\.[A-Za-z]{2,}/.test(meta), 'no address in the title, description or social tags')
})

test('/privacy, /terms and the upgrade pages tell the customer the support mailbox, as a mailto link, whatever CONTACT_EMAIL holds', async () => {
  for (const [name, page] of [['privacy', PrivacyPage], ['terms', TermsPage]] as const) {
    for (const v of [LEFTOVER, undefined]) {
      await withContactEmail(v, () => {
        const html = renderToStaticMarkup(page())
        assert.deepEqual(mailtos(html), [PUBLIC_ADDRESS], name)
        assert.ok(!html.includes(LEFTOVER), name)
      })
    }
  }
  // the two upgrade pages need a signed-in tutor, so they are not rendered here; they draw the address with this very component
  await withContactEmail(LEFTOVER, () => {
    const html = renderToStaticMarkup(ContactEmails({ linkClassName: 'underline' }))
    assert.equal(html, `<a href="mailto:${PUBLIC_ADDRESS}" class="underline">${PUBLIC_ADDRESS}</a>`)
  })
  for (const f of ['src/app/(dashboard)/upgrade/page.tsx', 'src/app/(dashboard)/upgrade/success/page.tsx']) {
    assert.match(read(f), /email[^\n]*<ContactEmails\b/, `${f} tells the tutor to email the address from <ContactEmails />`)
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

test('CONTACT_EMAIL is no longer read anywhere in src/ (the personal address has no way back onto a page)', () => {
  for (const f of sourceFiles('src')) assert.ok(!/CONTACT_EMAIL\b/.test(read(f).replace(/SUPPORT_CONTACT_EMAIL/g, '')), `${f} reads CONTACT_EMAIL`)
})
