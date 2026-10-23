'use client'

import { useSyncExternalStore } from 'react'
import { ImageLightbox } from '@/components/updates/ImageLightbox'
import { formatUpdateDate, formatUpdateDateShort, pickVersion, type UpdateEntry } from '@/lib/updates-format'

// The two columns of the Updates page: the list of versions on the left, the chosen version on the right.
// Which version is chosen comes from the address (/updates#v1.3.0), so every version has its own link and the
// back button works; with no address, or on the server, it is the newest. Every version is in the page (the
// ones not chosen are `hidden`), so a search engine or a reader without scripts still gets all the text.
// Colours, type and corners are Tutafy's own (white page, gray text, indigo accent, rounded-2xl cards), the same
// as the blog and About pages; only the two-column layout comes from the pattern the owner picked.

const subscribe = (notify: () => void) => {
  window.addEventListener('hashchange', notify)
  return () => window.removeEventListener('hashchange', notify)
}
const currentHash = () => window.location.hash
const serverHash = () => ''

function LatestBadge() {
  return <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 text-[12px] font-semibold leading-[20px] text-emerald-700">Latest</span>
}

/** After a pick, bring the chosen version into view: always on a phone (the list sits above it), on a desktop only when scrolled past its top. */
function bringIntoView(target: HTMLElement | null) {
  if (!target) return
  const top = target.getBoundingClientRect().top + window.scrollY - 90
  if (window.innerWidth < 1024 || window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' })
}

/** Which version the address points at: the one in the address, else the newest. */
export function UpdatesBrowser({ entries }: { entries: UpdateEntry[] }) {
  const hash = useSyncExternalStore(subscribe, currentHash, serverHash)
  return <UpdatesView entries={entries} selected={pickVersion(hash, entries)} />
}

/** The two columns for a chosen version (a plain function of its inputs, so a test can show any version). */
export function UpdatesView({ entries, selected }: { entries: UpdateEntry[]; selected: string }) {
  return (
    <div className="mx-auto max-w-6xl px-6 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
      <nav
        aria-label="Versions"
        className="-mx-6 max-h-[300px] overflow-y-auto border-b border-gray-100 py-2 [scrollbar-color:var(--color-gray-300)_transparent] [scrollbar-width:thin] lg:sticky lg:top-[65px] lg:mx-0 lg:max-h-[calc(100vh-65px)] lg:border-b-0 lg:border-r lg:py-8"
      >
        {entries.map((e, i) => {
          const on = e.version === selected
          return (
            <a
              key={e.version}
              href={`#v${e.version}`}
              aria-current={on ? 'true' : undefined}
              onClick={() => requestAnimationFrame(() => bringIntoView(document.getElementById('release')))}
              className={`-ml-px block border-l-2 px-6 py-3.5 transition-colors hover:bg-gray-50 lg:pl-4 lg:pr-5 ${on ? 'border-indigo-500 bg-indigo-50/60' : 'border-transparent'}`}
            >
              <span className="flex items-center gap-2">
                <span className="text-[14px] font-bold tabular-nums text-gray-900">v{e.version}</span>
                {i === 0 && <LatestBadge />}
                <span className="ml-auto text-[14px] text-gray-500 lg:hidden">{formatUpdateDateShort(e.date)}</span>
              </span>
              <span className="mt-0.5 hidden text-[14px] text-gray-500 lg:block">{formatUpdateDateShort(e.date)}</span>
              <span className={`mt-1 block text-[14px] leading-snug line-clamp-1 lg:line-clamp-2 ${on ? 'text-gray-900' : 'text-gray-600'}`}>{e.title}</span>
            </a>
          )
        })}
      </nav>

      <div id="release" aria-live="polite" className="min-w-0 pb-20 pt-8 lg:pl-14 lg:pt-10">
        {entries.map((e, i) => (
          <article key={e.version} hidden={e.version !== selected}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[13px] font-bold tabular-nums text-indigo-600">v{e.version}</span>
              {i === 0 && <LatestBadge />}
              <time dateTime={e.date} className="text-[14px] text-gray-500">{formatUpdateDate(e.date)}</time>
            </div>

            <h2 className="mt-5 text-[clamp(28px,3.4vw,38px)] font-extrabold leading-[1.1] tracking-tight text-gray-900">{e.title}</h2>
            {e.summary && <p className="mt-3.5 max-w-[680px] text-[17px] leading-relaxed text-gray-500">{e.summary}</p>}

            {e.image && (
              <figure className="mt-8">
                <ImageLightbox src={e.image.src} alt={e.image.alt} width={e.image.width} height={e.image.height} />
                <figcaption className="mt-2.5 text-[14px] text-gray-500">{e.image.alt} · Tutafy v{e.version}, sample data</figcaption>
              </figure>
            )}

            <ul className="mt-9 divide-y divide-gray-100 border-y border-gray-100">
              {e.bullets.map(b => (
                <li key={b} className="relative py-3 pl-[22px] text-[15px] leading-relaxed text-gray-700 before:absolute before:left-1 before:top-[22px] before:h-1.5 before:w-1.5 before:rounded-full before:bg-indigo-400 before:content-['']">{b}</li>
              ))}
            </ul>

            <div className="mt-12 flex justify-between gap-3">
              {i < entries.length - 1 && (
                <a href={`#v${entries[i + 1].version}`} className="flex min-w-0 flex-1 flex-col rounded-xl border border-gray-200 px-4 py-3 text-[14px] font-bold tabular-nums text-gray-900 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 sm:min-w-[140px] sm:flex-none">
                  <small className="text-[14px] font-medium text-gray-500">Older</small>v{entries[i + 1].version}
                </a>
              )}
              {i > 0 && (
                <a href={`#v${entries[i - 1].version}`} className="ml-auto flex min-w-0 flex-1 flex-col rounded-xl border border-gray-200 px-4 py-3 text-right text-[14px] font-bold tabular-nums text-gray-900 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 sm:min-w-[140px] sm:flex-none">
                  <small className="text-[14px] font-medium text-gray-500">Newer</small>v{entries[i - 1].version}
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
