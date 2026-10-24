// T-0915: the Content-Security-Policy of a tutor's profile opens exactly the two places a video frame may come from (the privacy frames of YouTube and Vimeo)
// and nothing else: it carries ONE directive, frame-src, so no other part of the page is limited or opened by it. The headers are read from the real
// next.config.ts, and the origins are compared with the frames the page itself builds.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import config from '../next.config.ts'
import { VIDEO_FRAME_ORIGINS, VIDEO_FRAME_POLICY, parseIntroVideo } from '@/lib/intro-video.ts'

type Rule = { source: string; headers: { key: string; value: string }[] }
const rules = async () => (await (config.headers as () => Promise<Rule[]>)())

test('the profile page (/tutors/:slug) gets a policy with one directive, frame-src, naming exactly the two privacy frame origins', async () => {
  const rule = (await rules()).find(r => r.source === '/tutors/:slug')
  assert.ok(rule, 'a rule for the profile')
  assert.deepEqual(rule.headers, [{ key: 'Content-Security-Policy', value: 'frame-src https://www.youtube-nocookie.com https://player.vimeo.com' }])
  assert.equal(rule.headers[0].value, VIDEO_FRAME_POLICY)
  const directives = rule.headers[0].value.split(';').map(d => d.trim()).filter(Boolean)
  assert.equal(directives.length, 1)
  const [name, ...sources] = directives[0].split(/\s+/)
  assert.equal(name, 'frame-src')
  assert.deepEqual(sources, [...VIDEO_FRAME_ORIGINS])
  // nothing wide: no star, no scheme-only source, no youtube.com, no http, no 'self' that would add this site, no unsafe keyword
  for (const s of sources) assert.match(s, /^https:\/\/[a-z.-]+$/)
  assert.doesNotMatch(rule.headers[0].value, /\*|'self'|'unsafe|data:|blob:|http:|https:(?!\/\/)|\/\/www\.youtube\.com|\/\/youtube\.com|script-src|default-src/)
})

test('the origins the policy opens are exactly the origins of the frames the page builds, for both providers', () => {
  const yt = parseIntroVideo('https://youtu.be/dQw4w9WgXcQ')
  const vm = parseIntroVideo('https://vimeo.com/123456789/abcdef0123456789')
  assert.ok(yt.ok && vm.ok)
  if (!yt.ok || !vm.ok) return
  assert.deepEqual([new URL(yt.video.embedUrl).origin, new URL(vm.video.embedUrl).origin].sort(), [...VIDEO_FRAME_ORIGINS].sort())
})

test('the policy is on the profile only: no other route gets it, and the embed route keeps its own header', async () => {
  const all = await rules()
  const withPolicy = all.filter(r => r.headers.some(h => h.value === VIDEO_FRAME_POLICY))
  assert.deepEqual(withPolicy.map(r => r.source), ['/tutors/:slug'])
  const embed = all.find(r => r.source === '/embed/:path*')!
  assert.deepEqual(embed.headers.map(h => h.key).sort(), ['Content-Security-Policy', 'X-Frame-Options'])
  assert.equal(embed.headers.find(h => h.key === 'Content-Security-Policy')!.value, 'frame-ancestors *')
})
