import { MADE_WITH_TEXT, madeWithHref, type BrandingSurface } from '@/lib/branding'

// The "Made with Tutafy" line at the foot of a public booking page or the embed window (T-0717).
// It sits in the normal flow under the page, never fixed or floating, so it cannot cover the booking button. The strip it lives in
// has the same height whether the line is shown or not, so turning it off moves nothing on the page.
export function MadeWithTutafy({ show, surface }: { show: boolean; surface: BrandingSurface }) {
  return (
    <div data-testid="made-with-strip" className="h-14 flex items-center justify-center">
      {show && (
        <a href={madeWithHref(surface)} target="_blank" rel="noopener" data-testid="made-with-tutafy"
          className="text-[11px] text-gray-500 hover:text-gray-700 transition-colors">
          {MADE_WITH_TEXT}
        </a>
      )}
    </div>
  )
}
