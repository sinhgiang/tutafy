// What the admin Feedback page reads from the feedback table (supabase/migrations/020_feedback.sql). The client is passed in (the
// service-role client, from a page that already passed the admin gate), so the node tests can hand in a fake. Read-only.
import type { FeedbackKind } from '@/lib/feedback'

export const FEEDBACK_LIST_LIMIT = 200

export type FeedbackRow = {
  id: string
  created_at: string
  author_role: 'tutor' | 'student'
  author_email: string
  kind: FeedbackKind
  message: string
}

// Only the part of the Supabase client this file calls.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FeedbackClient = { from(table: string): any }

export async function loadFeedback(admin: FeedbackClient) {
  const countKind = (kind: FeedbackKind): PromiseLike<{ count: number | null; error?: unknown }> =>
    admin.from('feedback').select('id', { count: 'exact', head: true }).eq('kind', kind)

  const [bug, idea, question, list] = await Promise.all([
    countKind('bug'),
    countKind('idea'),
    countKind('question'),
    admin.from('feedback')
      .select('id, created_at, author_role, author_email, kind, message')
      .order('created_at', { ascending: false })
      .limit(FEEDBACK_LIST_LIMIT) as PromiseLike<{ data: FeedbackRow[] | null; error?: unknown }>,
  ])
  const counts = { bug: bug.count ?? 0, idea: idea.count ?? 0, question: question.count ?? 0 }
  return {
    counts,
    total: counts.bug + counts.idea + counts.question,
    rows: list.data ?? [],
    // True when any query failed: the page must say so instead of showing 0 as if nobody had written.
    failed: Boolean(bug.error || idea.error || question.error || list.error),
  }
}
