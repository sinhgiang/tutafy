import type { NextConfig } from "next";
import { VIDEO_FRAME_POLICY } from "./src/lib/intro-video";

const nextConfig: NextConfig = {
  // The Updates page and the sitemap read content/updates/*.md while the server runs (src/lib/updates.ts);
  // without this the folder may not be copied into the deployed functions.
  outputFileTracingIncludes: {
    '/updates': ['./content/updates/**/*'],
    '/sitemap.xml': ['./content/updates/**/*'],
  },
  async headers() {
    return [
      {
        // T-0915: a tutor's profile may show an intro video from YouTube or Vimeo, and from nowhere else. The policy limits frames and nothing else
        // (no other directive, so nothing else on the page is touched); the two origins are the privacy frames the page builds (src/lib/intro-video.ts).
        source: '/tutors/:slug',
        headers: [{ key: 'Content-Security-Policy', value: VIDEO_FRAME_POLICY }],
      },
      {
        source: '/embed/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
        ],
      },
    ]
  },
};

export default nextConfig;
