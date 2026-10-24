'use client'

// The intro video at the top of a tutor's profile (T-0915, design A). It is a poster with a play button, and NOTHING is loaded from YouTube or Vimeo until
// the visitor presses play: no frame, no thumbnail, no cookie, no address is sent before then. A video never starts by itself.
//
// The server already checked the stored link (src/lib/intro-video.ts, introVideoFromStored) and hands over only the frame address it rebuilt. It is checked
// AGAIN here, just before a frame is drawn: an address that is not one of the two privacy frames (youtube-nocookie.com, player.vimeo.com) draws no frame
// at all. The page's Content-Security-Policy (next.config.ts) also refuses a frame from anywhere else. The frame is sandboxed to what a player needs.
import { useState } from 'react'
import { Play, Video, ExternalLink } from 'lucide-react'
import { isAllowedEmbedUrl, type VideoProvider } from '@/lib/intro-video'

const SITE_NAME: Record<VideoProvider, string> = { youtube: 'YouTube', vimeo: 'Vimeo' }

export function IntroVideo({ embedUrl, watchUrl, provider, name, first }: { embedUrl: string; watchUrl: string; provider: VideoProvider; name: string; first: string }) {
  const [playing, setPlaying] = useState(false)
  const allowed = isAllowedEmbedUrl(embedUrl)
  const site = SITE_NAME[provider]
  return (
    <section aria-label={`Intro video from ${name}`} data-testid="intro-video" className="space-y-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl vid-stage">
        {playing && allowed ? (
          <iframe
            src={embedUrl}
            title={`Intro video from ${name}`}
            data-testid="intro-video-frame"
            className="absolute inset-0 h-full w-full border-0"
            allow="autoplay; fullscreen; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            loading="lazy"
          />
        ) : (
          <button
            type="button"
            onClick={() => allowed && setPlaying(true)}
            disabled={!allowed}
            data-testid="intro-video-play"
            aria-label={`Play intro video from ${name}`}
            className="group absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-3 text-left vid-poster focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
          >
            <span className="vid-play flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-transform group-hover:scale-105 sm:h-[72px] sm:w-[72px]" aria-hidden="true">
              <Play className="vid-play-icon ml-1 h-7 w-7" />
            </span>
            <span className="vid-poster-note px-4 text-center text-[14px] font-semibold sm:text-[15px]">Meet {first}: press play</span>
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold vid-chip">
              <Video className="h-3.5 w-3.5" aria-hidden="true" /> Intro video
            </span>
          </button>
        )}
      </div>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-gray-600" data-testid="intro-video-note">
        <span>Hosted on {site}. Nothing loads from {site} until you press play.</span>
        <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
          Watch on {site} <ExternalLink className="h-3 w-3" aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    </section>
  )
}
