import { RATES_LINKS, RATES_NOTE_TEXT } from '@/lib/marketplace-rates'

// "Rates checked <day>" with the two official pages, printed under a Preply or iTalki number (T-0962).
// The words and the links live in src/lib/marketplace-rates.ts so every page says the same thing.
export function MarketplaceRatesNote({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[12px] text-gray-500 leading-relaxed ${className}`} data-testid="rates-note">
      {RATES_NOTE_TEXT} Sources:{' '}
      {RATES_LINKS.map((l, i) => (
        <span key={l.href}>
          {i > 0 && ' · '}
          <a href={l.href} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">{l.label}</a>
        </span>
      ))}
      .
    </p>
  )
}
