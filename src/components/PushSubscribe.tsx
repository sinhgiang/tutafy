'use client'
import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'

interface Props {
  portalToken?: string
}

export default function PushSubscribe({ portalToken }: Props) {
  const [status, setStatus] = useState<'idle' | 'subscribed' | 'denied' | 'unsupported'>('idle')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') setStatus('denied')
    else if (Notification.permission === 'granted') setStatus('subscribed')
  }, [])

  async function subscribe() {
    if (!('serviceWorker' in navigator)) return
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') { setStatus('denied'); return }

    const reg = await navigator.serviceWorker.ready
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })

    const body: Record<string, unknown> = { subscription: sub.toJSON() }
    if (portalToken) body.portalToken = portalToken

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setStatus('subscribed')
  }

  if (status === 'unsupported' || status === 'denied') return null

  return (
    <button
      onClick={subscribe}
      title={status === 'subscribed' ? 'Notifications enabled' : 'Enable notifications'}
      className={`p-2 rounded-lg transition-colors ${
        status === 'subscribed'
          ? 'text-indigo-600 bg-indigo-50 cursor-default'
          : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      {status === 'subscribed' ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
    </button>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
