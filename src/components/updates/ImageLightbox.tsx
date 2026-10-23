'use client'

import { useRef } from 'react'

// A picture on the Updates page that opens large when pressed (T-0834). It is a real <button> around the picture, so
// Tab reaches it and Enter or Space opens it; the large view is a native <dialog> opened with showModal(), which
// brings Esc to close it, keeps Tab inside it and gives focus back to the button afterwards. A close button and a
// press on the dark area close it too. The picture keeps its description (`alt`) in both sizes.
export function ImageLightbox({ src, alt, width, height }: { src: string; alt: string; width?: number; height?: number }) {
  const dialog = useRef<HTMLDialogElement>(null)
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label={`Enlarge picture: ${alt}`}
        className="block w-full cursor-zoom-in overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a small static picture, like the blog images */}
        <img src={src} alt={alt} width={width} height={height} decoding="async" className="block h-auto w-full" />
      </button>
      <dialog
        ref={dialog}
        aria-label={alt}
        data-testid="updates-lightbox"
        onClick={e => { if (e.target === e.currentTarget) dialog.current?.close() }}
        className="m-auto max-h-[94vh] w-[min(96vw,1500px)] max-w-none overflow-hidden rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-gray-900/70"
      >
        <button
          type="button"
          onClick={() => dialog.current?.close()}
          aria-label="Close picture"
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[20px] font-bold leading-none text-gray-900 shadow-md ring-1 ring-gray-200 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          <span aria-hidden="true">×</span>
        </button>
        <div className="max-h-[94vh] overflow-auto">
          {/* eslint-disable-next-line @next/next/no-img-element -- the same static picture, shown large */}
          <img src={src} alt={alt} loading="lazy" decoding="async" className="mx-auto block h-auto max-h-[94vh] w-auto max-w-full" />
        </div>
      </dialog>
    </>
  )
}
