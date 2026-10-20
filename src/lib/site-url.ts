// The ONE main address of the public site. tutafy.com redirects (308) to
// www.tutafy.com, so www is the address Google must see in every canonical link,
// the sitemap, robots.txt, og:url and the JSON-LD.
//
// It is a constant on purpose, not read from NEXT_PUBLIC_APP_URL: that variable has
// been empty, BOM'd or set to the non-www address on Vercel, and a crawler-facing
// address must not change with the environment. Never write the address by hand
// anywhere else in the SEO code; import it from here.
export const SITE_URL = 'https://www.tutafy.com'

/** Absolute address of a path on the main site, e.g. `/blog` -> `https://www.tutafy.com/blog`. */
export function absoluteUrl(path: string): string {
  if (path === '' || path === '/') return SITE_URL
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
