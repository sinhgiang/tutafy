'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Video } from 'lucide-react'

type JitsiApi = {
  dispose(): void
  addEventListener(event: string, listener: (...args: any[]) => void): void
  executeCommand(command: string, ...args: any[]): void
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: new (domain: string, options: object) => JitsiApi
  }
}

export function VideoRoom({
  lessonId,
  displayName,
  backUrl,
  lessonLabel,
  jwt,
  appId,
}: {
  lessonId: string
  displayName: string
  backUrl: string
  lessonLabel: string
  // When present, use JaaS (8x8.vc) with a server-signed token: auto-moderator,
  // no extra login, no 5-minute demo cutoff, no watermark. Otherwise the public
  // meet.jit.si demo server is used as a fallback.
  jwt?: string
  appId?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<JitsiApi | null>(null)
  const router = useRouter()
  const [ended, setEnded] = useState(false)
  const useJaas = Boolean(jwt && appId)

  const initJitsi = useCallback(() => {
    if (!containerRef.current || !window.JitsiMeetExternalAPI) return
    if (apiRef.current) { apiRef.current.dispose(); apiRef.current = null }
    const domain = useJaas ? '8x8.vc' : 'meet.jit.si'
    const roomName = useJaas
      ? `${appId}/tutafy-lesson-${lessonId}`
      : `tutafy-lesson-${lessonId}`
    apiRef.current = new window.JitsiMeetExternalAPI(domain, {
      roomName,
      ...(useJaas ? { jwt } : {}),
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

    // When the user hangs up (or the call closes), take them straight back into
    // Tutafy instead of leaving them on Jitsi's "thanks for using" screen.
    const goBack = () => {
      setEnded(true)
      // Small delay so the "call ended" screen is visible for a beat
      setTimeout(() => router.push(backUrl), 900)
    }
    apiRef.current.addEventListener('readyToClose', goBack)
    apiRef.current.addEventListener('videoConferenceLeft', goBack)
  }, [lessonId, displayName, backUrl, router, useJaas, appId, jwt])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.JitsiMeetExternalAPI) {
      initJitsi()
      return () => { apiRef.current?.dispose() }
    }
    const script = document.createElement('script')
    script.src = useJaas
      ? `https://8x8.vc/${appId}/external_api.js`
      : 'https://meet.jit.si/external_api.js'
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

      {ended && (
        <div className="absolute inset-0 z-[110] bg-gray-950/95 flex flex-col items-center justify-center gap-3 text-center px-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
            <Video className="h-6 w-6 text-indigo-300" />
          </div>
          <p className="text-[15px] font-semibold text-white">Call ended</p>
          <p className="text-[13px] text-gray-400">Taking you back to Tutafy…</p>
        </div>
      )}
    </div>
  )
}
