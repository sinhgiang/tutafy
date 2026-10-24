// One tutor card of the directory (T-0769, design: docs/directory-design/card.html). Plain markup with no browser state: the page passes
// the zone to read the time in, so the server draw and the tests render the same thing.
import Link from 'next/link'
import { Star, Zap, Languages, Clock, Signal } from 'lucide-react'
import { priceLabel, initialsOf, zoneCity } from '@/lib/tutor-profile'
import { nextAvailableText, LEVEL_OPTIONS, type DirectoryCard } from '@/lib/directory'

// Soft tints for the "no photo" tile, picked from the name so a grid is not one flat colour (never a grey silhouette).
const TILES = [
  ['#E0E7FF', '#4338CA'], ['#FCE7F3', '#BE185D'], ['#DCFCE7', '#15803D'], ['#FEF3C7', '#B45309'], ['#EDE9FE', '#6D28D9'], ['#CCFBF1', '#0F766E'],
] as const
const tileFor = (name: string) => TILES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TILES.length]

export function TutorCard({ card, zone, viewerZone, now }: { card: DirectoryCard; zone: string; viewerZone: string | null; now: Date }) {
  const [bg, fg] = tileFor(card.name)
  const price = priceLabel(card.price, card.currency)
  const trial = card.trialPrice !== null ? priceLabel(card.trialPrice, card.currency) : null
  return (
    <article data-testid="tutor-card" data-slug={card.slug}
      className="bg-white border border-gray-100 rounded-[18px] shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition overflow-hidden flex flex-wrap min-[721px]:flex-nowrap min-[721px]:flex-col">
      {/* The link has no aria-label: its name is made of its own content (a hidden sentence, the photo, the trial badge), so what a visitor reads on
          it is always part of the name (WCAG 2.5.3, the Lighthouse audit "label-content-name-mismatch" failed on the old aria-label). */}
      <Link href={`/tutors/${card.slug}`}
        className="relative block w-28 shrink-0 min-[721px]:w-auto min-[721px]:aspect-[4/3] min-h-[150px] min-[721px]:min-h-0 bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset">
        <span className="sr-only">View {card.name}&apos;s profile</span>
        {card.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.photo} alt={`Photo of ${card.name}`} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div aria-hidden="true" data-testid="card-monogram"
            style={{ background: bg, color: fg }}
            className="absolute inset-0 flex items-center justify-center font-extrabold text-[34px] min-[721px]:text-[56px]">
            {initialsOf(card.name)}
          </div>
        )}
        {trial && (
          <span className="absolute left-1.5 top-1.5 min-[721px]:left-2.5 min-[721px]:top-2.5 inline-flex items-center gap-1 bg-white/95 text-emerald-700 text-[11px] min-[721px]:text-[12px] font-bold px-[7px] py-[3px] min-[721px]:px-[9px] min-[721px]:py-1 rounded-full shadow-sm" data-testid="card-trial">
            <Zap className="h-3 w-3" aria-hidden="true" /> Trial {trial}
          </span>
        )}
      </Link>
      <div className="p-3.5 min-[721px]:px-4 min-[721px]:pt-4 min-[721px]:pb-3 flex flex-col gap-1.5 min-[721px]:gap-2 flex-1 basis-0 min-[721px]:basis-auto min-w-0">
        <div className="flex flex-col min-[721px]:flex-row min-[721px]:items-baseline min-[721px]:justify-between gap-0.5 min-[721px]:gap-2.5">
          <h2 className="text-[16px] min-[721px]:text-[17px] font-extrabold text-gray-900 leading-tight break-words min-w-0">{card.name}</h2>
          {card.rating !== null ? (
            <span className="inline-flex items-center gap-1 text-[13.5px] font-bold text-gray-900 whitespace-nowrap" data-testid="card-rating">
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" aria-hidden="true" />
              <span className="sr-only">Rated </span>{card.rating.toFixed(1)} <span className="text-gray-500 font-medium">({card.reviews})</span>
            </span>
          ) : (
            <span className="self-start text-[12px] font-bold text-indigo-700 bg-indigo-50 rounded-full px-2 py-0.5 whitespace-nowrap" data-testid="card-new">New</span>
          )}
        </div>
        <p className="text-[13.5px] min-[721px]:text-[14px] text-gray-700 leading-snug line-clamp-2 min-[721px]:min-h-10">{card.headline}</p>
        {card.languages.length > 0 && (
          <p className="text-[13px] text-gray-600 flex items-center gap-1.5"><Languages className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> <span className="min-w-0 break-words">{card.languages.join(' · ')}</span></p>
        )}
        {card.levels.length > 0 && (
          <p className="text-[13px] text-gray-600 flex items-center gap-1.5" data-testid="card-levels">
            <Signal className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words"><span className="sr-only">Levels taught: </span>{LEVEL_OPTIONS.filter(o => card.levels.includes(o.id)).map(o => o.label).join(' · ')}</span>
          </p>
        )}
      </div>
      <div className="w-full px-3.5 pb-3.5 min-[721px]:px-4 min-[721px]:pb-4 grid gap-2.5">
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 rounded-xl px-3 py-2 text-[13px]" data-testid="card-next">
          <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <b className="font-bold">Next available</b> · <span data-testid="card-next-time">{nextAvailableText(card, zone, now)}</span>
            <small className="block text-[11px] leading-tight text-emerald-900/80">{viewerZone ? 'Your time' : `${zoneCity(zone)} time`}</small>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2.5">
          <div className="leading-tight" data-testid="card-price">
            {price ? (
              <>
                <small className="block text-[12px] text-gray-600">From</small>
                <b className="text-[20px] font-extrabold text-gray-900">{price}<span className="text-[13px] font-medium text-gray-600"> / lesson</span></b>
              </>
            ) : (
              <b className="text-[14px] font-semibold text-gray-700">Ask for price</b>
            )}
          </div>
          <Link href={`/book/${card.slug}`}
            className="inline-flex items-center justify-center min-h-11 px-5 text-[14px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
            Book<span className="sr-only"> a lesson with {card.name}</span>
          </Link>
        </div>
      </div>
    </article>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-[18px] overflow-hidden" data-testid="card-skeleton">
      <div className="aspect-[4/3] bg-gray-100 animate-pulse" />
      <div className="p-4 grid gap-2.5">
        <div className="h-[18px] w-[55%] bg-gray-100 rounded animate-pulse" />
        <div className="h-3.5 w-[95%] bg-gray-100 rounded animate-pulse" />
        <div className="h-3.5 w-[70%] bg-gray-100 rounded animate-pulse" />
        <div className="h-10 mt-1.5 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}
