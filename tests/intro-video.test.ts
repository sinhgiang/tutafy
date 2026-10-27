// T-0915: the intro video link rule (src/lib/intro-video.ts). Only youtube.com, youtu.be and vimeo.com links to ONE video are accepted; everything else is
// refused with a sentence; what is saved and what is framed are rebuilt from the provider and the id, never from the text that was typed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  INTRO_VIDEO_ERRORS, INTRO_VIDEO_MAX_LENGTH, VIDEO_FRAME_ORIGINS, VIDEO_FRAME_POLICY, introVideoFromStored, isAllowedEmbedUrl, parseIntroVideo,
} from '@/lib/intro-video.ts'

const YT = 'dQw4w9WgXcQ'
const AT = '@' // joined into addresses below, so no line of this file reads as an email address (rule 4b)

test('YouTube links in every common shape become one canonical address and a privacy frame', () => {
  const shapes = [
    `https://www.youtube.com/watch?v=${YT}`, `https://youtube.com/watch?v=${YT}`, `https://m.youtube.com/watch?v=${YT}`,
    `https://www.youtube.com/watch?v=${YT}&t=42s&list=PLxyz`, `https://youtu.be/${YT}`, `https://youtu.be/${YT}?si=abc`,
    `https://www.youtube.com/shorts/${YT}`, `https://www.youtube.com/embed/${YT}`, `https://www.youtube.com/live/${YT}`, `  https://youtu.be/${YT}  `,
    `HTTPS://WWW.YOUTUBE.COM/watch?v=${YT}`,
  ]
  for (const s of shapes) {
    const r = parseIntroVideo(s)
    assert.ok(r.ok, s)
    if (!r.ok) continue
    assert.equal(r.video.provider, 'youtube')
    assert.equal(r.video.id, YT)
    assert.equal(r.video.canonical, `https://www.youtube.com/watch?v=${YT}`, 'what is stored is rebuilt, whatever was typed')
    assert.equal(r.video.embedUrl, `https://www.youtube-nocookie.com/embed/${YT}?rel=0&playsinline=1&autoplay=1`, 'the privacy domain, never youtube.com')
    assert.ok(isAllowedEmbedUrl(r.video.embedUrl))
  }
})

test('Vimeo links, with and without the private hash of an unlisted video', () => {
  const plain = parseIntroVideo('https://vimeo.com/123456789')
  assert.ok(plain.ok && plain.video.canonical === 'https://vimeo.com/123456789' && plain.video.embedUrl === 'https://player.vimeo.com/video/123456789?dnt=1&autoplay=1')
  for (const s of ['https://vimeo.com/123456789/abcdef0123456789', 'https://www.vimeo.com/123456789?h=abcdef0123456789']) {
    const r = parseIntroVideo(s)
    assert.ok(r.ok, s)
    if (r.ok) {
      assert.equal(r.video.canonical, 'https://vimeo.com/123456789/abcdef0123456789')
      assert.equal(r.video.embedUrl, 'https://player.vimeo.com/video/123456789?h=abcdef0123456789&dnt=1&autoplay=1', 'Vimeo\'s do-not-track switch is on')
      assert.ok(isAllowedEmbedUrl(r.video.embedUrl))
    }
  }
})

test('other sites are refused with the "only YouTube and Vimeo" sentence, including look-alike hosts', () => {
  const wrongSite = [
    'https://evil.example/watch?v=' + YT, 'https://youtube.com.evil.example/watch?v=' + YT, 'https://evil-youtube.com/watch?v=' + YT, 'https://notyoutube.com/watch?v=' + YT,
    'https://youtu.be.evil.example/' + YT, 'https://vimeo.com.evil.example/123456789', 'https://fakevimeo.com/123456789', 'https://player.vimeo.com/video/123456789',
    'https://www.youtube-nocookie.com/embed/' + YT, 'https://dailymotion.com/video/x7tgad0', 'https://tiktok.com/@a/video/1234567890', 'https://drive.google.com/file/d/abc/view',
    'https://example.com/video.mp4', 'https://localhost/watch?v=' + YT, 'https://127.0.0.1/watch?v=' + YT, 'https://[::1]/x',
    // credentials and ports are how an address is dressed up to look like another host
    `https://youtube.com${AT}evil.example/watch?v=${YT}`, `https://www.youtube.com:8443/watch?v=${YT}`, `https://user:pass${AT}www.youtube.com/watch?v=${YT}`,
    // an encoded or unusual host
    `https://www.youtube.com%2eevil.example/watch?v=${YT}`, `https://www.youтube.com/watch?v=${YT}`,
  ]
  for (const s of wrongSite) {
    const r = parseIntroVideo(s)
    assert.equal(r.ok, false, s)
    if (!r.ok) assert.ok([INTRO_VIDEO_ERRORS.wrongSite, INTRO_VIDEO_ERRORS.notLink].includes(r.error as never), `${s}: ${r.error}`)
  }
})

test('not https, not a link, empty, too long, or with control characters: each is refused with its own sentence', () => {
  assert.deepEqual(parseIntroVideo('http://www.youtube.com/watch?v=' + YT), { ok: false, error: INTRO_VIDEO_ERRORS.notHttps })
  assert.deepEqual(parseIntroVideo('javascript:alert(1)'), { ok: false, error: INTRO_VIDEO_ERRORS.notHttps })
  assert.deepEqual(parseIntroVideo('data:text/html,<script>alert(1)</script>'), { ok: false, error: INTRO_VIDEO_ERRORS.notHttps })
  assert.deepEqual(parseIntroVideo('ftp://youtube.com/watch?v=' + YT), { ok: false, error: INTRO_VIDEO_ERRORS.notHttps })
  assert.deepEqual(parseIntroVideo('www.youtube.com/watch?v=' + YT), { ok: false, error: INTRO_VIDEO_ERRORS.notLink })
  assert.deepEqual(parseIntroVideo('my intro video'), { ok: false, error: INTRO_VIDEO_ERRORS.notLink })
  for (const empty of ['', '   ', '\n', null, undefined, 5, {}, [], true]) assert.deepEqual(parseIntroVideo(empty), { ok: false, error: INTRO_VIDEO_ERRORS.empty }, JSON.stringify(empty))
  assert.deepEqual(parseIntroVideo('https://www.youtube.com/watch?v=' + YT + '&x=' + 'a'.repeat(INTRO_VIDEO_MAX_LENGTH)), { ok: false, error: INTRO_VIDEO_ERRORS.tooLong })
  for (const bad of [`https://youtu.be/${YT}\n`.replace(/\n$/, '\nhttps://evil.example'), `https://youtu.be/${YT} https://evil.example`, `https://youtu.be/${YT}\u0000`, `https://youtu.be/\t${YT}`]) {
    assert.equal(parseIntroVideo(bad).ok, false, JSON.stringify(bad))
  }
})

test('a link that is not one video (a channel, a playlist, the home page, a bad id) is refused with the "single video" sentence', () => {
  const noVideo = [
    'https://www.youtube.com/', 'https://www.youtube.com/@somechannel', 'https://www.youtube.com/playlist?list=PLxyz', 'https://www.youtube.com/watch', 'https://www.youtube.com/watch?v=',
    'https://www.youtube.com/watch?v=short', 'https://www.youtube.com/watch?v=' + YT + 'X', 'https://www.youtube.com/watch?v=<script>al', 'https://www.youtube.com/watch/' + YT,
    'https://www.youtube.com/shorts/', 'https://www.youtube.com/embed/' + YT + '/extra', 'https://youtu.be/', 'https://youtu.be/' + YT + '/more', 'https://youtu.be/short',
    'https://vimeo.com/', 'https://vimeo.com/channels/staffpicks', 'https://vimeo.com/12345', 'https://vimeo.com/1234567890123', 'https://vimeo.com/123456789/ZZZZZZZZ',
    'https://vimeo.com/123456789/abcdef0123456789/extra', 'https://vimeo.com/123456789?h=nothex', 'https://vimeo.com/user12345',
  ]
  for (const s of noVideo) assert.deepEqual(parseIntroVideo(s), { ok: false, error: INTRO_VIDEO_ERRORS.noVideo }, s)
})

test('what comes after the id never reaches the saved or the framed address', () => {
  const r = parseIntroVideo(`https://www.youtube.com/watch?v=${YT}&autoplay=1&origin=https://evil.example&" onload="x`)
  // a space or quote in the address makes it refused; one that is only a query keeps nothing of it
  assert.equal(r.ok, false)
  const ok = parseIntroVideo(`https://www.youtube.com/watch?v=${YT}&origin=https%3A%2F%2Fevil.example&playlist=${YT}`)
  assert.ok(ok.ok)
  if (ok.ok) {
    assert.ok(!/evil|origin|playlist/.test(ok.video.canonical + ok.video.embedUrl + ok.video.watchUrl))
  }
})

test('at display time a stored value is checked again: only an exact canonical address is shown', () => {
  assert.ok(introVideoFromStored(`https://www.youtube.com/watch?v=${YT}`))
  assert.ok(introVideoFromStored('https://vimeo.com/123456789/abcdef0123456789'))
  // valid links that are not the stored form, hosts that are not ours, and junk: nothing is drawn
  for (const s of [`https://youtu.be/${YT}`, `https://www.youtube.com/watch?v=${YT}&t=1`, 'https://evil.example/watch?v=' + YT, 'javascript:alert(1)', '', null, undefined, 7, `https://www.youtube.com/watch?v=${YT} `]) {
    assert.equal(introVideoFromStored(s), null, JSON.stringify(s))
  }
})

test('the frame address check (used in the browser just before a frame is drawn) accepts only what this rule builds', () => {
  const good = [`https://www.youtube-nocookie.com/embed/${YT}?rel=0&playsinline=1&autoplay=1`, `https://www.youtube-nocookie.com/embed/${YT}`, 'https://player.vimeo.com/video/123456789?dnt=1', 'https://player.vimeo.com/video/123456789?h=abcdef0123456789&dnt=1']
  for (const s of good) assert.ok(isAllowedEmbedUrl(s), s)
  const bad = [
    `https://www.youtube.com/embed/${YT}`, `http://www.youtube-nocookie.com/embed/${YT}`, `https://youtube-nocookie.com/embed/${YT}`, `https://www.youtube-nocookie.com.evil.example/embed/${YT}`,
    `https://www.youtube-nocookie.com:444/embed/${YT}`, `https://user${AT}www.youtube-nocookie.com/embed/${YT}`, 'https://www.youtube-nocookie.com/embed/short', `https://www.youtube-nocookie.com/watch?v=${YT}`,
    `https://www.youtube-nocookie.com/embed/${YT}/x`, `https://www.youtube-nocookie.com/embed/${YT}#x`, 'https://player.vimeo.com/video/123', 'https://player.vimeo.com/video/123456789?h=nothex',
    'https://vimeo.com/123456789', 'https://player.vimeo.com.evil.example/video/123456789', 'javascript:alert(1)', 'data:text/html,x', '//www.youtube-nocookie.com/embed/' + YT,
    '', null, undefined, 3, `https://www.youtube-nocookie.com/embed/${YT}?${'a'.repeat(400)}`,
  ]
  for (const s of bad) assert.equal(isAllowedEmbedUrl(s), false, JSON.stringify(s)?.slice(0, 80))
})

test('the policy opens exactly the two frame origins and no other source (and the origins are the ones the frame builder uses)', () => {
  assert.equal(VIDEO_FRAME_POLICY, 'frame-src https://www.youtube-nocookie.com https://player.vimeo.com')
  assert.deepEqual([...VIDEO_FRAME_ORIGINS], ['https://www.youtube-nocookie.com', 'https://player.vimeo.com'])
  const yt = parseIntroVideo(`https://youtu.be/${YT}`)
  const vm = parseIntroVideo('https://vimeo.com/123456789')
  assert.ok(yt.ok && vm.ok)
  if (yt.ok && vm.ok) {
    assert.ok(VIDEO_FRAME_ORIGINS.includes(new URL(yt.video.embedUrl).origin as never))
    assert.ok(VIDEO_FRAME_ORIGINS.includes(new URL(vm.video.embedUrl).origin as never))
  }
})
