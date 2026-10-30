// "Get ready for the tutor directory" (T-1043): the three-step reminder at the top of the tutor dashboard. Plain HTML with no browser state, so the server and the
// tests draw the same thing. The steps, the progress and the addresses come from src/lib/directory-setup.ts; a tutor who finished all three gets no card at all.
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { SETUP_TITLE, type DirectorySetup } from '@/lib/directory-setup'
import { QuickHours } from '@/components/availability/QuickHours'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'

export function DirectorySetupCard({ setup }: { setup: DirectorySetup }) {
  const { steps, doneCount, total, next } = setup
  const left = total - doneCount
  return (
    <section aria-labelledby="directory-setup-title" data-testid="directory-setup" data-done={doneCount} data-total={total}
      className="bg-white rounded-2xl border border-indigo-200 mb-4 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 px-4 sm:px-5 pt-4 pb-3">
        <div className="min-w-0">
          <h2 id="directory-setup-title" className="text-[16px] font-extrabold text-gray-900">{SETUP_TITLE}</h2>
          <p className="text-[13.5px] text-gray-600 mt-0.5 max-w-[560px]">
            {left === 1 ? 'One step left' : `${left} steps left`} before students can find and book you in the directory. It takes a few minutes.
          </p>
        </div>
        <Link href={next.href} data-testid="directory-setup-next"
          className={`inline-flex items-center justify-center gap-1.5 min-h-11 px-5 text-[13.5px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl whitespace-nowrap shrink-0 ${FOCUS}`}>
          {next.action} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="px-4 sm:px-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="grid grid-cols-3 gap-1.5 flex-1" role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={total}
            aria-valuetext={`${doneCount} of ${total} steps done`} aria-label="Directory setup progress" data-testid="directory-setup-progress">
            {/* filled from the left by how many steps are done, whichever steps they are, so the bar reads as one measure of progress */}
            {steps.map((s, i) => <span key={s.id} data-filled={i < doneCount ? 'true' : 'false'} className={`h-1.5 rounded-full ${i < doneCount ? 'bg-emerald-600' : 'bg-gray-200'}`} />)}
          </div>
          <p className="text-[13px] font-bold text-gray-800 whitespace-nowrap" data-testid="directory-setup-count">{doneCount} of {total} done</p>
        </div>
      </div>
      <ol className="px-4 sm:px-5 pb-2">
        {steps.map((s, i) => (
          <li key={s.id} data-step={s.id} data-done={s.done ? 'true' : 'false'}
            className="grid grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3.5 gap-y-2 items-center py-3 border-t border-gray-100">
            <span className={`w-7 h-7 rounded-full grid place-items-center text-[13px] font-bold ${s.done ? 'bg-emerald-600 text-white' : s.id === next.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`} aria-hidden="true">
              {s.done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
            </span>
            <div className="min-w-0">
              <b className={`block text-[14.5px] ${s.done ? 'text-gray-600' : 'text-gray-900'}`}>
                <span className="sr-only">{s.done ? 'Done: ' : 'To do: '}</span>{s.title}
              </b>
              <span className="block text-[13px] text-gray-600 break-words">{s.done ? 'Done' : s.hint}</span>
            </div>
            {!s.done && s.id !== next.id && (
              <Link href={s.href} data-testid={`directory-setup-go-${s.id}`}
                className={`col-start-2 sm:col-start-auto inline-flex items-center justify-center min-h-11 px-4 text-[13px] font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-xl justify-self-start ${FOCUS}`}>
                {s.action}
              </Link>
            )}
            {/* the hours step is the one that keeps tutors out of the directory: a ready-made week, one press, right here (T-1105) */}
            {s.id === 'hours' && !s.done && (
              <div className="col-span-full sm:col-start-2">
                <QuickHours timezone={setup.timezone} />
              </div>
            )}
          </li>
        ))}
      </ol>
      <p className="bg-gray-50 border-t border-gray-100 px-4 sm:px-5 py-3 text-[13px] text-gray-700">
        Your booking link works now for the students you send there. This list goes away when the three steps are done.
      </p>
    </section>
  )
}
