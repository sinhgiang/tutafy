import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { loadReviewPageState, type FlowClient } from '@/lib/reviews-data'
import { editOpen, reviewsFlowOn, starsFromAddress } from '@/lib/reviews-flow'
import { ReviewCard, StopRemindersCard } from './ReviewCard'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Review your tutor', robots: { index: false, follow: false } }

// The review page of the new flow (T-0898, design 2A): stars, tags and a few words on one card. Opened from the star links of the invitation email or
// from the student page. Opening it saves nothing: a star in the address only chooses that rating on the form. Closed (404) while the switch is off, and
// for a link or a lesson that is not the student's own.
export default async function ReviewPage({ params, searchParams }: { params: Promise<{ token: string; lessonId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!reviewsFlowOn()) notFound()
  const { token, lessonId } = await params
  const query = await searchParams
  const now = new Date()
  const state = await loadReviewPageState(createAdminClient() as unknown as FlowClient, { portalToken: token, lessonId, now })
  if (!state) notFound()

  const back = (
    <Link href={`/portal/${token}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900 mb-4">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to your lessons
    </Link>
  )

  if (query.stop === '1') {
    return <div>{back}<StopRemindersCard token={token} lessonId={lessonId} tutorName={state.tutor.name} /></div>
  }

  return (
    <div>
      {back}
      <ReviewCard
        token={token}
        lessonId={lessonId}
        tutorName={state.tutor.name}
        lessonDate={new Date(state.lesson.startsAt).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })}
        shownAs={state.shownAs}
        initialStars={starsFromAddress(query.stars)}
        existing={state.existing}
        legacy={state.legacy}
        editable={state.existing ? editOpen(state.existing.createdAt, now) : true}
        editsOn={state.existing ? new Date(new Date(state.existing.createdAt).getTime() + 7 * 24 * 3600 * 1000).toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : null}
      />
    </div>
  )
}
