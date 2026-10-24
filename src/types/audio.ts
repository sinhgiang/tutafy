/** Safari before 14.1 only has the prefixed constructor; the DOM typings do not declare it. */
export type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext }
