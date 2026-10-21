import type { NextConfig } from "next";

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
