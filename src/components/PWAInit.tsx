'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

export function PWAInit() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Capture install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      // Show banner after 30 seconds on first visit
      const dismissed = localStorage.getItem('pwa-banner-dismissed')
      if (!dismissed) {
        setTimeout(() => setShowBanner(true), 30000)
      }
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setShowBanner(false)
    setInstallPrompt(null)
  }

  function dismiss() {
    setShowBanner(false)
    localStorage.setItem('pwa-banner-dismissed', '1')
  }

  if (!showBanner || !installPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-[#0A0A0F] border border-white/10 rounded-2xl p-4 flex items-center gap-3 shadow-2xl">
        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[14px] font-bold">T</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white">Install Tutafy</p>
          <p className="text-[11px] text-white/40">Add to home screen for quick access</p>
        </div>
        <button
          onClick={install}
          className="flex items-center gap-1.5 text-[12px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
        >
          <Download className="h-3.5 w-3.5" /> Install
        </button>
        <button onClick={dismiss} className="text-white/30 hover:text-white/60 flex-shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
