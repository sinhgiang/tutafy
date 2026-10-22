import Link from 'next/link'
import type { Metadata } from 'next'
import { GraduationCap, MailX, CircleCheck, TriangleAlert } from 'lucide-react'
import { SiteFooter } from '@/components/SiteFooter'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token'

// The page behind the "Unsubscribe from these tips" link of the welcome mails (T-0737).
// Opening it changes nothing: it only shows the address and a button. The BUTTON (a POST to /api/unsubscribe) does the
// unsubscribing, so a mail scanner that opens every link in a mail cannot unsubscribe anybody by accident.
// The address in the link is the reader's own (signed), so the page is never indexed and sends no referrer.
export const metadata: Metadata = {
  title: 'Unsubscribe from Tutafy tips',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

type Params = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams
  const token = one(sp.t)
  const done = one(sp.done) === '1'
  const email = !done && token ? verifyUnsubscribeToken(token) : null

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center" aria-hidden="true">
              <GraduationCap className="text-white" style={{ width: 18, height: 18 }} />
            </span>
            <span className="text-[17px] font-bold text-gray-900">Tutafy</span>
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-md w-full mx-auto px-6 py-14 sm:py-20">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 text-center">
          {done ? (
            <>
              <span className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-4" aria-hidden="true"><CircleCheck className="h-5 w-5 text-emerald-600" /></span>
              <h1 className="text-[22px] font-extrabold text-gray-900 tracking-tight">You are unsubscribed</h1>
              <p className="text-[14px] text-gray-500 mt-3 leading-relaxed">
                We will not send you these tips and check-in mails again. Mail about your lessons and bookings is not part of them and will keep coming.
              </p>
              <Link href="/" className="inline-block mt-6 text-[13px] font-semibold text-indigo-600 hover:underline">Back to Tutafy</Link>
            </>
          ) : email ? (
            <>
              <span className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-4" aria-hidden="true"><MailX className="h-5 w-5 text-indigo-500" /></span>
              <h1 className="text-[22px] font-extrabold text-gray-900 tracking-tight">Unsubscribe from Tutafy tips?</h1>
              <p className="text-[14px] text-gray-500 mt-3 leading-relaxed">
                We will stop sending the getting-started tips and check-in mails to
              </p>
              <p className="text-[15px] font-semibold text-gray-900 mt-1 break-all">{email}</p>
              <p className="text-[12px] text-gray-500 mt-3 leading-relaxed">Mail about your lessons and bookings is not affected.</p>
              <form method="post" action={`/api/unsubscribe?t=${encodeURIComponent(token)}`} className="mt-6">
                <button type="submit" className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-[14px] font-semibold px-5 py-3 transition-colors">
                  Unsubscribe
                </button>
              </form>
              <Link href="/" className="inline-block mt-4 text-[13px] font-medium text-gray-500 hover:text-gray-700">No, keep sending them</Link>
            </>
          ) : (
            <>
              <span className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-4" aria-hidden="true"><TriangleAlert className="h-5 w-5 text-amber-600" /></span>
              <h1 className="text-[22px] font-extrabold text-gray-900 tracking-tight">This link does not work</h1>
              <p className="text-[14px] text-gray-500 mt-3 leading-relaxed">
                It may be cut off or changed. Open the link from the email again, or reply to that email and ask us to remove you. We will do it the same day.
              </p>
              <Link href="/" className="inline-block mt-6 text-[13px] font-semibold text-indigo-600 hover:underline">Back to Tutafy</Link>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
