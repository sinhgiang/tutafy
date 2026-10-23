'use client'

// Keeps the <html> "dark" class in step with the shell's theme while the tutor is in the app, follows the system
// when no choice was saved, and lets go of the class when the tutor leaves. Draws nothing.
import { useEffect } from 'react'
import { paintTheme, releaseTheme, savedPref, systemPrefersDark } from './theme-client'
import { resolveTheme } from '@/lib/dashboard-theme'

export function ThemeSync() {
  useEffect(() => {
    paintTheme(resolveTheme(savedPref(), systemPrefersDark()))
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = () => { if (savedPref() === 'system') paintTheme(resolveTheme('system', query.matches)) }
    query.addEventListener('change', onSystemChange)
    return () => { query.removeEventListener('change', onSystemChange); releaseTheme() }
  }, [])
  return null
}
