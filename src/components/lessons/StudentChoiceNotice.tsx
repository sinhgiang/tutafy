import Link from 'next/link'
import { emptyStudentNotice, type StudentChoices } from '@/lib/schedule-students'

/** Says why the Student box of Schedule Lesson has nothing to pick (T-1061), and where to go. Draws nothing when there are students. */
export function StudentChoiceNotice({ choices }: { choices: StudentChoices }) {
  const n = emptyStudentNotice(choices)
  if (!n) return null
  const box = n.tone === 'error' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
  return (
    <div role={n.tone === 'error' ? 'alert' : 'status'} data-testid="student-choice-notice" className={`rounded-lg border px-3.5 py-3 ${box}`}>
      <p className="text-[13px] font-semibold text-gray-900">{n.title}</p>
      <p className="mt-0.5 text-[12px] text-gray-600">{n.body}</p>
      {n.action && (
        <Link href={n.action.href} className="mt-2 inline-flex min-h-9 items-center rounded-lg bg-indigo-500 px-3 text-[12px] font-semibold text-white hover:bg-indigo-600">
          {n.action.label}
        </Link>
      )}
    </div>
  )
}
