// Where a visitor first came from. Pure functions, no imports, so the node tests
// can load them. The result is one of the SOURCES below (the same list the
// database check allows in supabase/migrations/015_visitor_tracking.sql).

export const SOURCES = [
  'google_search', 'google_ads',
  'ai_chatgpt', 'ai_gemini', 'ai_claude', 'ai_perplexity', 'ai_copilot',
  'social', 'direct', 'other',
] as const
export type Source = (typeof SOURCES)[number]

export const SOURCE_LABEL: Record<Source, string> = {
  google_search: 'Google Search',
  google_ads: 'Google Ads',
  ai_chatgpt: 'ChatGPT',
  ai_gemini: 'Gemini',
  ai_claude: 'Claude',
  ai_perplexity: 'Perplexity',
  ai_copilot: 'Copilot',
  social: 'Social',
  direct: 'Direct',
  other: 'Other',
}

const OWN_HOSTS = ['tutafy.com', 'localhost']

const AI_BY_HOST: [string, Source][] = [
  ['chatgpt.com', 'ai_chatgpt'],
  ['chat.openai.com', 'ai_chatgpt'],
  ['gemini.google.com', 'ai_gemini'],
  ['bard.google.com', 'ai_gemini'],
  ['claude.ai', 'ai_claude'],
  ['perplexity.ai', 'ai_perplexity'],
  ['copilot.microsoft.com', 'ai_copilot'],
]

// ChatGPT and some other assistants tag outgoing links with utm_source=<their name>.
const AI_BY_UTM: [RegExp, Source][] = [
  [/^(chatgpt(\.com)?|openai)$/i, 'ai_chatgpt'],
  [/^gemini$/i, 'ai_gemini'],
  [/^claude(\.ai)?$/i, 'ai_claude'],
  [/^perplexity(\.ai)?$/i, 'ai_perplexity'],
  [/^(copilot|bing_copilot)$/i, 'ai_copilot'],
]

const SOCIAL_HOSTS = [
  'facebook.com', 'fb.com', 'fb.me', 'instagram.com', 'twitter.com', 'x.com', 't.co',
  'linkedin.com', 'lnkd.in', 'tiktok.com', 'youtube.com', 'youtu.be', 'reddit.com',
  'pinterest.com', 'threads.net', 'zalo.me', 't.me', 'telegram.org', 'whatsapp.com',
]

const GOOGLE_SEARCH_HOST = /^(www\.)?google\.(com|co\.[a-z]{2}|com\.[a-z]{2}|[a-z]{2})$/
const PAID_MEDIUM = /^(cpc|ppc|paid|paidsearch|paid_search|sem)$/i

function hostIs(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`)
}

/** Lower-case host of an http(s) referrer, or null when there is none or it is not a web address. */
export function referrerHost(referrer: string | null | undefined): string | null {
  if (!referrer) return null
  try {
    const u = new URL(referrer)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    return u.hostname.toLowerCase() || null
  } catch {
    return null
  }
}

/** A utm value kept short and plain; anything odd becomes null. */
export function cleanUtm(value: string | null | undefined): string | null {
  const v = (value ?? '').trim().slice(0, 60)
  return /^[A-Za-z0-9._\-+ ]+$/.test(v) ? v : null
}

export type SourceInput = {
  referrerHost?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  gclid?: boolean
}

export function classifySource(input: SourceInput): Source {
  const host = (input.referrerHost ?? '').toLowerCase()
  const utmSource = cleanUtm(input.utmSource) ?? ''
  const utmMedium = cleanUtm(input.utmMedium) ?? ''

  // A Google Ads click id, or a paid medium from Google, beats everything else.
  if (input.gclid) return 'google_ads'
  if (PAID_MEDIUM.test(utmMedium) && /^google/i.test(utmSource)) return 'google_ads'

  // AI assistants: by tag first, then by the site the visitor came from. Before Google
  // Search, because gemini.google.com is a Google host.
  for (const [pattern, source] of AI_BY_UTM) if (pattern.test(utmSource)) return source
  for (const [domain, source] of AI_BY_HOST) if (hostIs(host, domain)) return source

  if (GOOGLE_SEARCH_HOST.test(host)) return 'google_search'
  if (/^google/i.test(utmSource) && /organic/i.test(utmMedium)) return 'google_search'

  if (host && SOCIAL_HOSTS.some(d => hostIs(host, d))) return 'social'
  if (/^(facebook|instagram|twitter|linkedin|tiktok|youtube|reddit|pinterest)$/i.test(utmSource)) return 'social'

  if (host && !OWN_HOSTS.some(d => hostIs(host, d))) return 'other'
  if (utmSource) return 'other'
  return 'direct'
}
