// The tutor's intro video (T-0915): a LINK to a YouTube or Vimeo video, never a file on Tutafy. Pure and import-free, so the server route, the
// profile page, the browser component, next.config.ts and the node tests all use this one rule.
//
// What is accepted, and only this:
//   - https (never http, never another scheme), no user name or password in the address, no port;
//   - the host youtube.com, youtu.be or vimeo.com (also with a leading "www." or, for YouTube, "m."): nothing else, so a look-alike such as
//     youtube.com.evil.example, evil-youtube.com or a host that merely ends in the name is refused;
//   - a video id of the exact shape each service uses (YouTube: 11 letters, digits, "-" and "_"; Vimeo: 6 to 12 digits, with an optional private
//     hash of 8 to 16 hex digits). The id is checked on its own, so nothing a person types after it can reach the frame address.
// The address that is SAVED is rebuilt from the provider and the id (`canonical`), never the text that was typed; the frame address is rebuilt
// from the same two values again at display time, after the stored value has been checked once more. The frame is the privacy one:
// youtube-nocookie.com for YouTube, and Vimeo's player with dnt=1.

export const INTRO_VIDEO_MAX_LENGTH = 300

export type VideoProvider = 'youtube' | 'vimeo'

export type IntroVideo = {
  provider: VideoProvider
  id: string
  /** Vimeo only: the hash of an unlisted video. */
  hash: string | null
  /** The address that is stored: rebuilt from the provider and the id. */
  canonical: string
  /** The address to open in a new tab ("Watch on YouTube"). */
  watchUrl: string
  /** The frame address, privacy mode. */
  embedUrl: string
}

export type IntroVideoResult = { ok: true; video: IntroVideo } | { ok: false; error: string }

/** The two places a frame may come from. The Content-Security-Policy of the profile page opens exactly these (next.config.ts) and nothing else. */
export const VIDEO_FRAME_ORIGINS = ['https://www.youtube-nocookie.com', 'https://player.vimeo.com'] as const

export const INTRO_VIDEO_HELP = 'Paste a link to a video on YouTube or Vimeo. The video stays on that site; Tutafy only shows it on your profile.'
export const INTRO_VIDEO_ERRORS = {
  empty: 'Paste a link to a YouTube or Vimeo video.',
  tooLong: 'That link is too long. Paste the link to the video itself.',
  notLink: 'That does not look like a link. Paste the full address, starting with https://.',
  notHttps: 'Use a link that starts with https://.',
  wrongSite: 'Only YouTube and Vimeo links work here (youtube.com, youtu.be or vimeo.com).',
  noVideo: 'That link does not point to a single video. Open the video and copy its address.',
} as const

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/
const VIMEO_ID = /^[0-9]{6,12}$/
const VIMEO_HASH = /^[0-9a-f]{8,16}$/

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com'])
const YOUTUBE_SHORT_HOSTS = new Set(['youtu.be', 'www.youtu.be'])
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com'])

const youtube = (id: string): IntroVideo => ({
  provider: 'youtube', id, hash: null,
  canonical: `https://www.youtube.com/watch?v=${id}`,
  watchUrl: `https://www.youtube.com/watch?v=${id}`,
  embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1&autoplay=1`,
})
const vimeo = (id: string, hash: string | null): IntroVideo => ({
  provider: 'vimeo', id, hash,
  canonical: `https://vimeo.com/${id}${hash ? `/${hash}` : ''}`,
  watchUrl: `https://vimeo.com/${id}${hash ? `/${hash}` : ''}`,
  embedUrl: `https://player.vimeo.com/video/${id}?${hash ? `h=${hash}&` : ''}dnt=1&autoplay=1`,
})

/** Reads what a tutor pasted. A bad value says why, in words a tutor can act on. */
export function parseIntroVideo(raw: unknown): IntroVideoResult {
  if (typeof raw !== 'string') return { ok: false, error: INTRO_VIDEO_ERRORS.empty }
  const text = raw.trim()
  if (text === '') return { ok: false, error: INTRO_VIDEO_ERRORS.empty }
  if (text.length > INTRO_VIDEO_MAX_LENGTH) return { ok: false, error: INTRO_VIDEO_ERRORS.tooLong }
  // a control character or a space inside the address is never part of a real link
  if (/[\u0000- \u007f]/.test(text)) return { ok: false, error: INTRO_VIDEO_ERRORS.notLink }
  let url: URL
  try { url = new URL(text) } catch { return { ok: false, error: INTRO_VIDEO_ERRORS.notLink } }
  if (url.protocol !== 'https:') return { ok: false, error: INTRO_VIDEO_ERRORS.notHttps }
  if (url.username !== '' || url.password !== '' || url.port !== '') return { ok: false, error: INTRO_VIDEO_ERRORS.wrongSite }
  const host = url.hostname.toLowerCase()
  const parts = url.pathname.split('/').filter(Boolean)

  if (YOUTUBE_HOSTS.has(host)) {
    // /watch?v=ID, and the path forms /shorts/ID, /embed/ID, /live/ID
    const id = parts[0] === 'watch' && parts.length === 1 ? url.searchParams.get('v') : ['shorts', 'embed', 'live'].includes(parts[0] ?? '') && parts.length === 2 ? parts[1] : null
    return id && YOUTUBE_ID.test(id) ? { ok: true, video: youtube(id) } : { ok: false, error: INTRO_VIDEO_ERRORS.noVideo }
  }
  if (YOUTUBE_SHORT_HOSTS.has(host)) {
    return parts.length === 1 && YOUTUBE_ID.test(parts[0]) ? { ok: true, video: youtube(parts[0]) } : { ok: false, error: INTRO_VIDEO_ERRORS.noVideo }
  }
  if (VIMEO_HOSTS.has(host)) {
    const [id, pathHash] = parts
    // an unlisted video is shared as vimeo.com/ID/HASH or as vimeo.com/ID?h=HASH; a hash that is there must be a real one
    const queryHash = url.searchParams.get('h')
    if (queryHash !== null) {
      return parts.length === 1 && VIMEO_ID.test(id) && VIMEO_HASH.test(queryHash) ? { ok: true, video: vimeo(id, queryHash) } : { ok: false, error: INTRO_VIDEO_ERRORS.noVideo }
    }
    if (parts.length >= 1 && parts.length <= 2 && VIMEO_ID.test(id) && (pathHash === undefined || VIMEO_HASH.test(pathHash))) return { ok: true, video: vimeo(id, pathHash ?? null) }
    return { ok: false, error: INTRO_VIDEO_ERRORS.noVideo }
  }
  return { ok: false, error: INTRO_VIDEO_ERRORS.wrongSite }
}

/**
 * The video a stored value stands for, or null. The stored text is checked again with the same rule that accepted it, and it must be exactly the
 * canonical address that rule makes (anything else in the column, however it got there, is not shown).
 */
export function introVideoFromStored(raw: unknown): IntroVideo | null {
  const parsed = parseIntroVideo(raw)
  return parsed.ok && parsed.video.canonical === raw ? parsed.video : null
}

/** True only for a frame address this file builds: the two privacy origins, a plain path and a short fixed query. Used just before a frame is drawn. */
export function isAllowedEmbedUrl(raw: unknown): boolean {
  if (typeof raw !== 'string' || raw.length > 400) return false
  let url: URL
  try { url = new URL(raw) } catch { return false }
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || url.port !== '') return false
  if (!(VIDEO_FRAME_ORIGINS as readonly string[]).includes(url.origin)) return false
  if (url.origin === 'https://www.youtube-nocookie.com') return /^\/embed\/[A-Za-z0-9_-]{11}$/.test(url.pathname) && url.hash === ''
  return /^\/video\/[0-9]{6,12}$/.test(url.pathname) && url.hash === '' && (url.searchParams.get('h') === null || VIMEO_HASH.test(url.searchParams.get('h') ?? ''))
}

/** The value of the Content-Security-Policy header for the profile page: it limits frames and nothing else, so nothing else on the page is touched. */
export const VIDEO_FRAME_POLICY = `frame-src ${VIDEO_FRAME_ORIGINS.join(' ')}`
