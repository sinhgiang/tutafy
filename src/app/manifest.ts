import type { MetadataRoute } from 'next'
import { BRAND_COLORS } from '@/lib/brand'

// The colours and icons are the brand's (src/lib/brand.ts, T-0969). "any" icons keep the rounded tile with its margin; the "maskable"
// ones are a full square with the logo inside the safe zone, so a phone can cut them into a circle without cutting the cap.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tutafy — Tutor Business Platform',
    short_name: 'Tutafy',
    description: 'Manage students, bookings, payments, and lessons',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: BRAND_COLORS.canvasDark,
    theme_color: BRAND_COLORS.primary,
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/brand/tutafy-icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/brand/tutafy-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Students', short_name: 'Students', url: '/students', description: 'View your students' },
      { name: 'Lessons', short_name: 'Lessons', url: '/lessons', description: 'View upcoming lessons' },
      { name: 'Calendar', short_name: 'Calendar', url: '/calendar', description: 'View your calendar' },
    ],
    categories: ['education', 'productivity', 'business'],
  }
}
