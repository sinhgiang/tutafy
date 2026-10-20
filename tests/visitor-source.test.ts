// Where a visitor came from, and which paths the journey keeps.
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { classifySource, referrerHost, cleanUtm, SOURCES, SOURCE_LABEL } = await import('@/lib/visitor-source.ts')
const { normalizeTrackedPath, isAppPath } = await import('@/lib/track-path.ts')

const from = (referrer: string | null, extra: Record<string, unknown> = {}) =>
  classifySource({ referrerHost: referrerHost(referrer), ...extra })

test('Google Search: google domains in any country, not look-alikes', () => {
  assert.equal(from('https://www.google.com/'), 'google_search')
  assert.equal(from('https://google.co.uk/search?q=tutor+software'), 'google_search')
  assert.equal(from('https://www.google.com.vn/'), 'google_search')
  assert.equal(from('https://google.de/'), 'google_search')
  assert.equal(from('https://notgoogle.com/'), 'other')
  assert.equal(from('https://google.evil.example/'), 'other')
  assert.equal(from('https://www.google.com.evil.example/'), 'other')
})

test('Google Ads: a click id or a paid utm from Google, even with a Google referrer', () => {
  assert.equal(from('https://www.google.com/', { gclid: true }), 'google_ads')
  assert.equal(from(null, { gclid: true }), 'google_ads')
  assert.equal(from(null, { utmSource: 'google', utmMedium: 'cpc' }), 'google_ads')
  assert.equal(from('https://www.google.com/', { utmSource: 'google', utmMedium: 'PPC' }), 'google_ads')
  assert.equal(from(null, { utmSource: 'newsletter', utmMedium: 'cpc' }), 'other') // paid, but not Google Ads
})

test('AI assistants: by referrer site and by the utm_source they add to links', () => {
  assert.equal(from('https://chatgpt.com/'), 'ai_chatgpt')
  assert.equal(from('https://chat.openai.com/c/abc'), 'ai_chatgpt')
  assert.equal(from(null, { utmSource: 'chatgpt.com' }), 'ai_chatgpt')
  assert.equal(from('https://gemini.google.com/app'), 'ai_gemini') // a Google host, but not Google Search
  assert.equal(from('https://claude.ai/chat/xyz'), 'ai_claude')
  assert.equal(from('https://www.perplexity.ai/search?q=x'), 'ai_perplexity')
  assert.equal(from('https://copilot.microsoft.com/'), 'ai_copilot')
  assert.equal(from(null, { utmSource: 'copilot' }), 'ai_copilot')
  assert.equal(from('https://notchatgpt.com/'), 'other')
  assert.equal(from('https://claude.ai.evil.example/'), 'other')
})

test('social, direct and other', () => {
  assert.equal(from('https://l.facebook.com/l.php?u=x'), 'social')
  assert.equal(from('https://t.co/abc'), 'social')
  assert.equal(from('https://www.linkedin.com/feed/'), 'social')
  assert.equal(from('https://www.youtube.com/watch?v=1'), 'social')
  assert.equal(from(null, { utmSource: 'facebook' }), 'social')
  assert.equal(from(null), 'direct')
  assert.equal(from('https://www.tutafy.com/blog'), 'direct') // our own site is not a source
  assert.equal(from('https://duckduckgo.com/'), 'other')
  assert.equal(from('https://www.bing.com/search?q=x'), 'other')
  assert.equal(from(null, { utmSource: 'partner-newsletter' }), 'other')
})

test('every source has a label and the list matches the database check', () => {
  assert.deepEqual(Object.keys(SOURCE_LABEL).sort(), [...SOURCES].sort())
  assert.equal(SOURCES.length, 10)
})

test('referrerHost and cleanUtm: only plain web addresses and plain tags get through', () => {
  assert.equal(referrerHost('https://WWW.Google.com/search?q=secret'), 'www.google.com')
  assert.equal(referrerHost('android-app://com.google.android.gm'), null)
  assert.equal(referrerHost('javascript:alert(1)'), null)
  assert.equal(referrerHost('not a url'), null)
  assert.equal(referrerHost(''), null)
  assert.equal(cleanUtm('spring-2026_sale'), 'spring-2026_sale')
  assert.equal(cleanUtm('<script>'), null)
  assert.equal(cleanUtm('a'.repeat(100)), 'a'.repeat(60))
  assert.equal(cleanUtm(''), null)
  assert.equal(cleanUtm(undefined), null)
})

// ---- paths -------------------------------------------------------------------

test('tracked paths: public pages, blog posts and the tutor sections are kept (shortened)', () => {
  assert.equal(normalizeTrackedPath('/'), '/')
  assert.equal(normalizeTrackedPath('/privacy'), '/privacy')
  assert.equal(normalizeTrackedPath('/blog'), '/blog')
  assert.equal(normalizeTrackedPath('/blog/best-scheduling-tools-for-tutors'), '/blog/best-scheduling-tools-for-tutors')
  assert.equal(normalizeTrackedPath('/blog/best-tools/'), '/blog/best-tools')
  assert.equal(normalizeTrackedPath('/upgrade'), '/upgrade')
  assert.equal(normalizeTrackedPath('/ai'), '/ai')
  assert.equal(normalizeTrackedPath('/students/9f1c2c3e-aaaa-bbbb-cccc-1234567890ab'), '/students') // id cut off
  assert.equal(normalizeTrackedPath('/tutors/some-tutor'), '/tutors')
  assert.equal(normalizeTrackedPath('/pricing?utm_source=x#top'), null) // not a page we keep
  assert.equal(normalizeTrackedPath('/upgrade?plan=pro&token=abc#x'), '/upgrade') // query and fragment dropped
})

test('paths that hold tokens, ids or private areas are never kept', () => {
  for (const p of [
    '/portal/abc123token', '/portal/abc123token/lessons/9', '/student/dashboard', '/student/login',
    '/book/demo-tutor', '/embed/demo-tutor', '/admin', '/admin/buyers', '/super-admin', '/api/track',
    '/settings/stripe/return', '/blog/UPPER', '/blog/a/b', '/blog/' + 'a'.repeat(200),
    '//evil.example/x', 'https://evil.example/', 'upgrade', '', '/ai\n/x', '/a b', '/%2e%2e/admin',
  ]) {
    // /settings/stripe/return is a section path, so it is kept as '/settings' (no id, no query)
    const expected = p === '/settings/stripe/return' ? '/settings' : null
    assert.equal(normalizeTrackedPath(p), expected, JSON.stringify(p))
  }
  assert.equal(normalizeTrackedPath(null), null)
  assert.equal(normalizeTrackedPath(undefined), null)
  assert.equal(normalizeTrackedPath('/' + 'a'.repeat(400)), null)
})

test('isAppPath: the signed-in tutor area and onboarding, not the public pages', () => {
  assert.equal(isAppPath('/dashboard'), true)
  assert.equal(isAppPath('/upgrade'), true)
  assert.equal(isAppPath('/onboarding'), true)
  assert.equal(isAppPath('/'), false)
  assert.equal(isAppPath('/blog/x'), false)
  assert.equal(isAppPath('/login'), false)
  assert.equal(isAppPath(null), false)
})
