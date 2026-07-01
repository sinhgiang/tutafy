import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { PWAInit } from '@/components/PWAInit'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tutafy — Your entire tutoring business, in one place.',
  description: 'Manage students, bookings, payments, and lessons — all in one place.',
  applicationName: 'Tutafy',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Tutafy' },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    title: 'Tutafy',
    description: 'Manage your tutoring business with AI-powered tools',
    siteName: 'Tutafy',
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
      </body>
    </html>
  )
}
