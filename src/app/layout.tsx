import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { PWAInit } from '@/components/PWAInit'
import { CookieConsent } from '@/components/CookieConsent'
import { Analytics } from '@/components/Analytics'
import { VisitorTracker } from '@/components/VisitorTracker'
import { ROOT_METADATA } from '@/lib/page-meta'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

// Site-wide defaults (main address, social image, robots). Each public page sets its
// own title, description and canonical address through pageMetadata() in
// src/lib/page-meta.ts; the canonical is never set here, or every page would claim
// to be the home page.
export const metadata: Metadata = ROOT_METADATA

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
      <body className={geist.className}>
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
