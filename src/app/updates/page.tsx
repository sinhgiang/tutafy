import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import { pageMetadata } from '@/lib/page-meta'
import { loadUpdates } from '@/lib/updates'
import { SiteFooter } from '@/components/SiteFooter'
import { UpdatesBrowser } from '@/components/updates/UpdatesBrowser'

export const metadata = pageMetadata('updates')

// Built from the files in content/updates/ (src/lib/updates.ts): a new file is a new entry, and a file with a
// missing version or date stops the build instead of reaching this page. The look follows the owner's pick
// (the Helme Updates page): dark, a small label, a huge title, a version list on the left (sticky, scrolls by
// itself) and the chosen version on the right, with Tutafy's name, logo and indigo.
export default function UpdatesPage() {
  const updates = loadUpdates()
  return (
    <div className="min-h-screen bg-black text-[#ededed]">
      <header className="sticky top-0 z-10 border-b border-[#1f1f1f] bg-black/75 backdrop-blur">
        <div className="mx-auto flex h-[60px] max-w-[1120px] items-center justify-between px-6">
          <Link href="/" aria-label="Tutafy home" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500" aria-hidden="true">
              <GraduationCap className="text-white" style={{ width: 18, height: 18 }} />
            </span>
            <span className="text-[18px] font-semibold tracking-tight text-white">Tutafy</span>
          </Link>
          <nav aria-label="Pages" className="flex items-center gap-5 text-[14px] text-[#a1a1a1] sm:gap-7">
            <Link href="/blog" className="hover:text-white">Blog</Link>
            <Link href="/about" className="hover:text-white">About</Link>
            <Link href="/updates" aria-current="page" className="text-white">Updates</Link>
          </nav>
        </div>
      </header>

      <main>
        <section
          className="relative border-b border-[#1f1f1f] bg-[linear-gradient(#1f1f1f_1px,transparent_1px),linear-gradient(90deg,#1f1f1f_1px,transparent_1px)] bg-[size:64px_64px] bg-[position:center_top] py-14 sm:py-[88px] sm:pb-14"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_30%,transparent_0%,#000_80%)]" />
          <div className="relative mx-auto max-w-[1120px] px-6">
            <p className="mb-4 font-mono text-[13px] uppercase tracking-[0.08em] text-[#8a8a8a]">Changelog</p>
            <h1 className="text-[clamp(44px,7vw,76px)] font-bold leading-[1.02] tracking-[-0.055em] text-white">Updates</h1>
            <p className="mt-4 max-w-[560px] text-[18px] leading-relaxed text-[#a1a1a1]">
              What changed in every version of Tutafy, newest first. Pictures use sample data.
            </p>
          </div>
        </section>

        <UpdatesBrowser entries={updates} />
      </main>

      <SiteFooter tone="dark" />
    </div>
  )
}
