import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { PWAInit } from '@/components/PWAInit'
import { CookieConsent } from '@/components/CookieConsent'
import { Analytics } from '@/components/Analytics'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

const SITE = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutafy.com').replace(/[﻿​\s]/g, '').replace(/\/+$/, '') || 'https://tutafy.com'

const DESCRIPTION =
  'Tutafy is the all-in-one software for online tutors: student management, smart scheduling, a built-in video classroom, payments, 10 AI teaching tools, and student & parent portals. Free forever — keep 100% of what you earn, no commission.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'Tutafy — All-in-one software for online tutors',
    template: '%s · Tutafy',
  },
  description: DESCRIPTION,
  applicationName: 'Tutafy',
  verification: { google: 'm76JXehNAqFGxJqYMSnmW1-N0tfnms1WKJ_2NvM8Tu8' },
  keywords: [
    'tutor management software', 'online tutoring platform', 'tutor booking software',
    'tutor scheduling software', 'tutor CRM', 'language tutor software', 'teach online',
    'tutor payment software', 'AI tutoring tools', 'tutoring business software', 'tutor invoicing',
  ],
  authors: [{ name: 'Tutafy' }],
  creator: 'Tutafy',
  publisher: 'Tutafy',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Tutafy' },
  formatDetection: { telephone: false },
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    type: 'website',
    url: SITE,
    title: 'Tutafy — All-in-one software for online tutors',
    description: DESCRIPTION,
    siteName: 'Tutafy',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'Tutafy' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tutafy — All-in-one software for online tutors',
    description: DESCRIPTION,
    images: ['/icon-512.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
      </body>
    </html>
  )
}
