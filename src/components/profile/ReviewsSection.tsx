import { CheckCircle2, GraduationCap, Reply, Star } from 'lucide-react'
import { ReplyForm } from '@/components/profile/ReplyForm'
import { agoLabel, tagLabel, type Summary } from '@/lib/reviews-flow'
import type { ProfileReview } from '@/lib/reviews-data'
import { initialsOf, reviewText } from '@/lib/tutor-profile'

// The reviews of a tutor's public profile in the new flow (T-0898, design 3A of T-0876): a summary card (the average, the share of each number of
// stars, the lessons taught, and the line that every review is from a student who took a lesson), then the reviews, each with the name as "Maria K.",
// how many lessons that student took, the stars, the words, the tags and the tutor's one answer. Drawn only while REVIEWS_FLOW is on. The first six
// reviews are open; the rest are behind "Show all", which works without scripts. When the signed-in visitor is this tutor, an unanswered review has
// the one-time answer box (the server refuses anyone else and a second answer).
const SHOWN = 6

function Stars({ rating, size = 'h-3.5 w-3.5' }: { rating: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map(s => <Star key={s} aria-hidden="true" className={`${size} ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />)}
    </span>
  )
}

function ReviewItem({ r, first, now, canReply }: { r: ProfileReview; first: string; now: Date; canReply: boolean }) {
  const text = reviewText(r.comment)
  return (
    <article className="rounded-xl bg-gray-50 p-4" data-testid="profile-review" data-review-id={r.id}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center text-[12px] font-bold shrink-0">{initialsOf(r.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] text-gray-900"><b>{r.name}</b> <span className="text-gray-600">· {agoLabel(r.createdAt, now)}</span></p>
          {r.lessons > 0 && <p className="text-[12.5px] font-semibold text-emerald-800 inline-flex items-center gap-1" data-testid="review-lessons"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Took {r.lessons} {r.lessons === 1 ? 'lesson' : 'lessons'} with {first}</p>}
        </div>
        <Stars rating={r.rating} />
      </div>
      {text && <p className="mt-2.5 text-[14px] leading-relaxed text-gray-800 whitespace-pre-line">{text}</p>}
      {r.tags.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="What stood out">
          {r.tags.map(t => tagLabel(t) && <li key={t} className="text-[12.5px] font-semibold text-gray-700 bg-white border border-gray-200 rounded-full px-2.5 py-0.5">{tagLabel(t)}</li>)}
        </ul>
      )}
      {r.reply ? (
        <div className="mt-3 rounded-lg bg-white border border-gray-200 px-3.5 py-3" data-testid="review-reply">
          <p className="text-[12.5px] font-bold text-gray-700 inline-flex items-center gap-1.5"><Reply className="h-3.5 w-3.5" aria-hidden="true" /> Reply from {first}</p>
          <p className="mt-1 text-[14px] text-gray-800 whitespace-pre-line">{reviewText(r.reply)}</p>
        </div>
      ) : canReply ? <ReplyForm reviewId={r.id} /> : null}
    </article>
  )
}

export function ReviewsSection({ summary, reviews, lessonsTaught, first, now, canReply }: { summary: Summary; reviews: ProfileReview[]; lessonsTaught: number; first: string; now: Date; canReply: boolean }) {
  const open = reviews.slice(0, SHOWN)
  const rest = reviews.slice(SHOWN)
  return (
    <div data-testid="reviews-flow">
      {summary.count > 0 ? (
        <>
          <div className="mt-4 rounded-xl border border-gray-100 p-4 sm:p-5 grid gap-4 sm:grid-cols-[auto_1fr] sm:gap-8 items-center" data-testid="reviews-summary">
            <div>
              <p className="text-[44px] leading-none font-extrabold text-gray-900">{summary.average.toFixed(1)}</p>
              <div className="mt-1.5"><Stars rating={summary.average} size="h-4 w-4" /></div>
              <p className="mt-1 text-[13px] text-gray-700">{summary.count} {summary.count === 1 ? 'review' : 'reviews'}</p>
            </div>
            <div className="grid gap-3 min-w-0">
              <ul className="grid gap-1" aria-label="Reviews by number of stars">
                {([5, 4, 3, 2, 1] as const).map(n => (
                  <li key={n} className="flex items-center gap-2 text-[12.5px] text-gray-700">
                    <span className="w-14 shrink-0 whitespace-nowrap">{n} star{n === 1 ? '' : 's'}</span>
                    <span className="h-2 flex-1 rounded-full bg-gray-200 overflow-hidden" aria-hidden="true"><span className="block h-full bg-amber-400" style={{ width: `${summary.percent[n]}%` }} /></span>
                    <span className="w-9 text-right tabular-nums">{summary.percent[n]}%</span>
                  </li>
                ))}
              </ul>
              <div className="text-[13px] text-gray-800 grid gap-1">
                <p className="inline-flex items-center gap-1.5" data-testid="lessons-taught"><GraduationCap className="h-4 w-4 text-gray-500" aria-hidden="true" /><b>{lessonsTaught}</b> {lessonsTaught === 1 ? 'lesson' : 'lessons'} taught on Tutafy</p>
                <p className="inline-flex items-center gap-1.5 text-emerald-800"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Every review is from a student who took a lesson</p>
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {open.map(r => <ReviewItem key={r.id} r={r} first={first} now={now} canReply={canReply} />)}
          </div>
          {rest.length > 0 && (
            <details className="mt-3" data-testid="reviews-more">
              <summary className="inline-flex items-center min-h-11 cursor-pointer text-[14px] font-bold text-indigo-700 underline underline-offset-2">Show all {reviews.length} reviews</summary>
              <div className="mt-3 grid gap-3">{rest.map(r => <ReviewItem key={r.id} r={r} first={first} now={now} canReply={canReply} />)}</div>
            </details>
          )}
        </>
      ) : null}
    </div>
  )
}
