'use client'
import { useEffect, useState } from 'react'

export function OAuthCatcher({ children }: { children: React.ReactNode }) {
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      setRedirecting(true)
      const dest = new URL('/auth/callback', window.location.origin)
      dest.searchParams.set('code', code)
      const next = params.get('next')
      if (next) dest.searchParams.set('next', next)
      window.location.replace(dest.toString())
    }
  }, [])

  if (redirecting) return null

  return <>{children}</>
}
