import { ImageResponse } from 'next/og'

// The share picture of every page that has no picture of its own (T-0850): what shows when a link to Tutafy is pasted into a chat,
// a social post or an AI assistant. 1200 x 630, the size social networks ask for, with the name Tutafy first. Only text the site
// already says (src/lib/site-content.ts): no number, rating or promise that is not on the pages. The size and address are
// kept by tests/seo-brand.test.ts and used in src/lib/page-meta.ts.
const OG_WIDTH = 1200
const OG_HEIGHT = 630

export async function GET() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#4F46E5', color: '#FFFFFF', padding: '72px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 88, height: 88, borderRadius: 24, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
              <path d="M22 10v6" />
              <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
            </svg>
          </div>
          <div style={{ marginLeft: 28, fontSize: 84, fontWeight: 800, letterSpacing: -2 }}>Tutafy</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2, maxWidth: 980 }}>Run your whole tutoring business in one place.</div>
          <div style={{ marginTop: 28, fontSize: 36, lineHeight: 1.3, color: '#E0E7FF', maxWidth: 980 }}>Bookings, video classroom, payments and AI lesson tools. 0% commission.</div>
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#E0E7FF' }}>www.tutafy.com</div>
      </div>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT },
  )
}
