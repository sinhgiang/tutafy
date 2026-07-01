import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tutafy — Tutor Business Platform',
    short_name: 'Tutafy',
    description: 'Manage students, bookings, payments, and lessons',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0A0A0F',
    theme_color: '#6366f1',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
    shortcuts: [
      { name: 'Students', short_name: 'Students', url: '/students', description: 'View your students' },
      { name: 'Lessons', short_name: 'Lessons', url: '/lessons', description: 'View upcoming lessons' },
      { name: 'Calendar', short_name: 'Calendar', url: '/calendar', description: 'View your calendar' },
    ],
    categories: ['education', 'productivity', 'business'],
  }
}
