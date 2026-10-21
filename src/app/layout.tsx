import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { PWAInit } from '@/components/PWAInit'
import { CookieConsent } from '@/components/CookieConsent'
import { Analytics } from '@/components/Analytics'
import { VisitorTracker } from '@/components/VisitorTracker'
import { ROOT_METADATA } from '@/lib/page-meta'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })
// Defines --font-geist-mono, which the theme's `font-mono` reads (the Updates page sets its version numbers in it).
// Not preloaded: the file is fetched only on a page that uses it.
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', preload: false })

// Site-wide defaults (main address, social image, robots). Each public page sets its
// own title, description and canonical address through pageMetadata() in
// src/lib/page-meta.ts; the canonical is never set here, or every page would claim
// to be the home page.
export const metadata: Metadata = ROOT_METADATA

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
  // No zoom limit of any kind: a visitor must be able to pinch-zoom (WCAG 1.4.4, Lighthouse
  // "meta-viewport"). tests/accessibility.test.ts fails if a scale limit comes back.
  // Android Chrome: the on-screen keyboard shrinks the page instead of covering it, so a send button stays in view.
  interactiveWidget: 'resizes-content',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${geist.className} ${geistMono.variable}`}>
        {children}
        <Toaster richColors position="top-right" />
        <PWAInit />
        <CookieConsent />
        <Analytics />
        <VisitorTracker />
      </body>
    </html>
  )
}
