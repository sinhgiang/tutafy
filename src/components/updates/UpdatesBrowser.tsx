'use client'

import { useSyncExternalStore } from 'react'
import { formatUpdateDate, formatUpdateDateShort, pickVersion, type UpdateEntry } from '@/lib/updates-format'

// The two columns of the Updates page: the list of versions on the left, the chosen version on the right.
// Which version is chosen comes from the address (/updates#v1.3.0), so every version has its own link and the
// back button works; with no address, or on the server, it is the newest. Every version is in the page (the
// ones not chosen are `hidden`), so a search engine or a reader without scripts still gets all the text.

const subscribe = (notify: () => void) => {
  window.addEventListener('hashchange', notify)
  return () => window.removeEventListener('hashchange', notify)
}
const currentHash = () => window.location.hash
const serverHash = () => ''

function LatestBadge() {
  return <span className="rounded-full bg-[#3fb950] px-2 text-[12px] font-semibold leading-[18px] text-[#0a0a0a]">Latest</span>
}

/** After a pick, bring the chosen version into view: always on a phone (the list sits above it), on a desktop only when scrolled past its top. */
function bringIntoView(target: HTMLElement | null) {
  if (!target) return
  const top = target.getBoundingClientRect().top + window.scrollY - 80
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
    <div className="mx-auto max-w-[1120px] px-6 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
      <nav
        aria-label="Versions"
        className="-mx-6 max-h-[300px] overflow-y-auto [scrollbar-color:#3a3a3a_transparent] [scrollbar-width:thin] border-b border-[#1f1f1f] py-2 lg:sticky lg:top-[60px] lg:mx-0 lg:max-h-[calc(100vh-60px)] lg:border-b-0 lg:border-r lg:py-8"
      >
        {entries.map((e, i) => {
          const on = e.version === selected
          return (
            <a
              key={e.version}
              href={`#v${e.version}`}
              aria-current={on ? 'true' : undefined}
              onClick={() => requestAnimationFrame(() => bringIntoView(document.getElementById('release')))}
              className={`-ml-px block border-l-2 px-6 py-3.5 transition-colors hover:bg-[#0b0b0b] lg:pl-4 lg:pr-5 ${on ? 'border-indigo-400 bg-[#0d0d0d]' : 'border-transparent'}`}
            >
              <span className="flex items-center gap-2">
                <span className={`font-mono text-[14px] font-medium ${on ? 'text-white' : 'text-[#cfcfcf]'}`}>v{e.version}</span>
                {i === 0 && <LatestBadge />}
                <span className="ml-auto text-[14px] text-[#8a8a8a] lg:hidden">{formatUpdateDateShort(e.date)}</span>
              </span>
              <span className="mt-0.5 hidden text-[14px] text-[#8a8a8a] lg:block">{formatUpdateDateShort(e.date)}</span>
              <span className={`mt-1 block text-[14px] leading-snug line-clamp-1 lg:line-clamp-2 ${on ? 'text-[#d4d4d4]' : 'text-[#a1a1a1]'}`}>{e.title}</span>
            </a>
          )
        })}
      </nav>

      <div id="release" aria-live="polite" className="min-w-0 pb-24 pt-8 lg:pb-24 lg:pl-14 lg:pt-10">
        {entries.map((e, i) => (
          <article key={e.version} hidden={e.version !== selected}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-md border border-[#2e2e2e] px-2.5 py-0.5 font-mono text-[15px] text-[#ededed]">v{e.version}</span>
              {i === 0 && <LatestBadge />}
              <time dateTime={e.date} className="text-[14px] text-[#8a8a8a]">{formatUpdateDate(e.date)}</time>
            </div>

            <h2 className="mt-5 text-[clamp(28px,3.6vw,40px)] font-bold leading-[1.1] tracking-[-0.04em] text-white">{e.title}</h2>
            {e.summary && <p className="mt-3.5 max-w-[680px] text-[17px] leading-relaxed text-[#a1a1a1]">{e.summary}</p>}

            {e.image && (
              <figure className="mt-8">
                <a href={e.image.src} target="_blank" rel="noopener" className="block overflow-hidden rounded-xl border border-[#2e2e2e] bg-[#0c0c0c] shadow-[0_30px_80px_-30px_rgba(255,255,255,0.07)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a small static picture, like the blog images */}
                  <img src={e.image.src} alt={e.image.alt} width={e.image.width} height={e.image.height} decoding="async" className="block h-auto w-full" />
                </a>
                <figcaption className="mt-2.5 text-[14px] text-[#8a8a8a]">{e.image.alt} · Tutafy v{e.version}, sample data</figcaption>
              </figure>
            )}

            <ul className="mt-9 border-t border-[#1f1f1f]">
              {e.bullets.map(b => (
                <li key={b} className="relative border-b border-[#1f1f1f] py-3 pl-[22px] text-[15.5px] leading-relaxed text-[#d6d6d6] before:absolute before:left-1 before:top-[22px] before:h-1.5 before:w-1.5 before:rounded-full before:bg-indigo-400 before:content-['']">{b}</li>
              ))}
            </ul>

            <div className="mt-12 flex justify-between gap-3">
              {i < entries.length - 1 && (
                <a href={`#v${entries[i + 1].version}`} className="flex min-w-0 flex-1 flex-col rounded-[10px] border border-[#2e2e2e] px-4 py-3 font-mono text-[14px] transition-colors hover:border-[#555] sm:min-w-[140px] sm:flex-none">
                  <small className="font-sans text-[14px] text-[#8a8a8a]">Older</small>v{entries[i + 1].version}
                </a>
              )}
              {i > 0 && (
                <a href={`#v${entries[i - 1].version}`} className="ml-auto flex min-w-0 flex-1 flex-col rounded-[10px] border border-[#2e2e2e] px-4 py-3 text-right font-mono text-[14px] transition-colors hover:border-[#555] sm:min-w-[140px] sm:flex-none">
                  <small className="font-sans text-[14px] text-[#8a8a8a]">Newer</small>v{entries[i - 1].version}
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
