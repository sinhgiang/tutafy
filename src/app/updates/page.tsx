import Link from 'next/link'
import { GraduationCap, ArrowLeft } from 'lucide-react'
import { pageMetadata } from '@/lib/page-meta'
import { loadUpdates, formatUpdateDate } from '@/lib/updates'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata = pageMetadata('updates')

// Built from the files in content/updates/ (src/lib/updates.ts): a new file is a new entry, and a file with a
// missing version or date stops the build instead of reaching this page.
export default function UpdatesPage() {
  const updates = loadUpdates()
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center">
              <GraduationCap className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <span className="text-[17px] font-bold text-gray-900">Tutafy</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <p className="text-[12px] font-bold text-indigo-500 uppercase tracking-widest mb-3">Updates</p>
        <h1 className="text-[34px] font-extrabold text-gray-900 tracking-tight leading-tight">What&apos;s new in Tutafy</h1>
        <p className="text-[15px] text-gray-600 mt-3 leading-relaxed">
          Every change you can see or use, newest first. Free and Pro tutors get the same updates.
        </p>

        <ol className="mt-10 space-y-6">
          {updates.map(u => (
            <li key={u.version}>
              <article id={`v${u.version}`} className="bg-gray-50 rounded-2xl p-6 scroll-mt-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <a href={`#v${u.version}`} className="text-[12px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">Version {u.version}</a>
                  <time dateTime={u.date} className="text-[13px] text-gray-500">{formatUpdateDate(u.date)}</time>
                </div>
                <h2 className="text-[20px] font-bold text-gray-900 mt-3 leading-snug">{u.title}</h2>
                <ul className="mt-3 space-y-2 text-[14px] text-gray-700 leading-relaxed list-disc pl-5 marker:text-indigo-400">
                  {u.bullets.map(b => <li key={b}>{b}</li>)}
                </ul>
                {u.image && (
                  // eslint-disable-next-line @next/next/no-img-element -- a small static picture, like the blog images
                  <img src={u.image.src} alt={u.image.alt} width={u.image.width} height={u.image.height} className="w-full h-auto rounded-xl border border-gray-100 mt-5" />
                )}
              </article>
            </li>
          ))}
        </ol>
      </main>

      <SiteFooter />
    </div>
  )
}
