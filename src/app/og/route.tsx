import { ImageResponse } from 'next/og'
import { BRAND_COLORS } from '@/lib/brand'
import { logoSvg } from '@/lib/brand-svg'
import { LOGO_HEIGHT, LOGO_WIDTH } from '@/lib/brand-wordmark'

// The share picture of every page that has no picture of its own (T-0850): what shows when a link to Tutafy is pasted into a chat,
// a social post or an AI assistant. 1200 x 630, the size social networks ask for, with the name Tutafy first. Only text the site
// already says (src/lib/site-content.ts): no number, rating or promise that is not on the pages. The size and address are
// kept by tests/seo-brand.test.ts and used in src/lib/page-meta.ts.
// T-0969: the logo is the horizontal logo D2 on the dark surface (the same drawing as public/brand/tutafy-logo-dark.svg, handed over as
// a picture), the colours are the brand's (src/lib/brand.ts), and a short amber rule, the tassel's colour, sits above the headline.
const OG_WIDTH = 1200
const OG_HEIGHT = 630
const LOGO_HEIGHT_PX = 100

const LOGO_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(logoSvg('dark', LOGO_HEIGHT_PX)).toString('base64')}`
const LOGO_WIDTH_PX = Math.round((LOGO_HEIGHT_PX * LOGO_WIDTH) / LOGO_HEIGHT)

export async function GET() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: BRAND_COLORS.canvasDark, color: BRAND_COLORS.white, padding: '64px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- an image response is drawn by satori, not by the browser: next/image does not apply */}
          <img src={LOGO_DATA_URI} width={LOGO_WIDTH_PX} height={LOGO_HEIGHT_PX} alt="Tutafy" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: 96, height: 8, borderRadius: 4, background: BRAND_COLORS.accentOnDark, marginBottom: 32 }} />
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2, maxWidth: 980 }}>Run your whole tutoring business in one place.</div>
          <div style={{ marginTop: 28, fontSize: 36, lineHeight: 1.3, color: BRAND_COLORS.primaryLine, maxWidth: 980 }}>Bookings, video classroom, payments and AI lesson tools. 0% commission.</div>
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: BRAND_COLORS.primaryLine }}>www.tutafy.com</div>
      </div>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT },
  )
}
