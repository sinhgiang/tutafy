// The standard trial lesson (T-1007, the owner's choice W-3173 option 1).
//
// A trial lesson is always 30 minutes, whatever lengths the tutor offers for regular lessons. The tutor still switches it on and sets its
// price in Settings (tutors.trial_enabled, tutors.trial_price: no new column, no migration). It is for a first lesson only: a student who
// already has a lesson with the tutor books a regular one. This file holds the numbers and the words, so the directory card, the profile,
// the booking form, the Settings page and the booking route all say and do the same thing.

export const TRIAL_MINUTES = 30

/** "30-minute trial": the name of the lesson, in a sentence or a heading. */
export const TRIAL_NAME = `${TRIAL_MINUTES}-minute trial`

/** "30-min trial": the same, short enough for a badge on a photo. */
export const TRIAL_BADGE = `${TRIAL_MINUTES}-min trial`

/** The one-sentence rule shown next to the price, in Settings and on the booking form. */
export const TRIAL_RULE = `A trial lesson is always ${TRIAL_MINUTES} minutes and is for a first lesson only.`

/** True when a request for a trial lesson may go ahead: the student has no earlier lesson with this tutor that still stands. */
export function trialAllowed(earlierLessons: number): boolean {
  return earlierLessons === 0
}
