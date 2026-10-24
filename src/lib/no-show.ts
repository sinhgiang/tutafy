// "Student didn't show up?": a lesson can be marked a no-show only while it is still scheduled and its start time has passed (a lesson
// that has not begun cannot have been missed, and one already completed, cancelled or marked is left alone). The lesson page decides
// whether to show the card with this; the route decides whether to accept the call with the same function.
export function noShowOffered(status: string | null | undefined, startsAt: string | null | undefined, now: number): boolean {
  if (status !== 'scheduled' || !startsAt) return false
  const start = new Date(startsAt).getTime()
  return Number.isFinite(start) && start <= now
}
