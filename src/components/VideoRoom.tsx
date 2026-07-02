'use client'

import { useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Video } from 'lucide-react'

declare global {
  interface Window {
    JitsiMeetExternalAPI: new (domain: string, options: object) => { dispose(): void }
  }
}

export function VideoRoom({
  lessonId,
  displayName,
  backUrl,
  lessonLabel,
}: {
  lessonId: string
  displayName: string
  backUrl: string
  lessonLabel: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<{ dispose(): void } | null>(null)

  const initJitsi = useCallback(() => {
    if (!containerRef.current || !window.JitsiMeetExternalAPI) return
    if (apiRef.current) { apiRef.current.dispose(); apiRef.current = null }
    apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
      roomName: `tutafy-lesson-${lessonId}`,
      parentNode: containerRef.current,
      userInfo: { displayName },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        disableDeepLinking: true,
        prejoinPageEnabled: false,
        defaultBackground: '#111827',
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_BRAND_WATERMARK: false,
        MOBILE_APP_PROMO: false,
        HIDE_DEEP_LINKING_LOGO: true,
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'closedcaptions', 'desktop',
          'fullscreen', 'hangup', 'chat', 'tileview', 'settings',
        ],
      },
    })
  }, [lessonId, displayName])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.JitsiMeetExternalAPI) {
      initJitsi()
      return () => { apiRef.current?.dispose() }
    }
    const script = document.createElement('script')
    script.src = 'https://meet.jit.si/external_api.js'
    script.async = true
    script.onload = initJitsi
    document.head.appendChild(script)
    return () => {
      apiRef.current?.dispose()
      if (document.head.contains(script)) document.head.removeChild(script)
    }
  }, [initJitsi])

  return (
    <div className="fixed inset-0 z-[100] bg-gray-950 flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <Link
          href={backUrl}
          className="flex items-center gap-1.5 text-[13px] text-gray-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Exit room
        </Link>
        <span className="text-gray-700">·</span>
        <Video className="h-3.5 w-3.5 text-indigo-400" />
        <span className="text-[13px] text-indigo-300 font-medium truncate max-w-[320px]">{lessonLabel}</span>
        <span className="ml-auto text-[11px] text-gray-600">Powered by Jitsi Meet</span>
      </div>
      <div ref={containerRef} className="flex-1 w-full overflow-hidden" />
    </div>
  )
}
