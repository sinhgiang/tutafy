// Gamification is computed purely from data the student already generates
// (completed lessons, vocabulary learned, homework submitted) — no extra tables
// or migrations. Given the same inputs it always returns the same result, so it
// stays correct even as lessons are added or removed.

export interface GamificationInput {
  lessons: number        // completed lessons
  words: number          // vocabulary words learned
  homework: number       // homework submissions
  lessonDates: string[]  // ISO timestamps of completed lessons (for streaks)
}

export interface Badge {
  id: string
  name: string
  desc: string
  emoji: string
  earned: boolean
}

export interface GamificationResult {
  xp: number
  level: number
  levelTitle: string
  xpIntoLevel: number     // XP earned inside the current level
  xpForNextLevel: number  // XP needed to finish the current level
  progressPct: number     // 0-100 progress toward the next level
  streakWeeks: number
  badges: Badge[]
  earnedCount: number
  totalBadges: number
}

// XP weights — completing a lesson is worth the most, then homework, then words.
const XP_PER_LESSON = 50
const XP_PER_HOMEWORK = 25
const XP_PER_WORD = 5

const LEVEL_TITLES = [
  'Beginner', 'Rising Star', 'Achiever', 'Scholar', 'Explorer',
  'Expert', 'Master', 'Champion', 'Grandmaster', 'Legend',
]

// XP required to clear a given level (1-indexed). Each level costs a bit more
// than the last, so early wins come fast and later ones feel earned.
function xpToClear(level: number): number {
  return 200 + (level - 1) * 150
}

function computeLevel(xp: number): { level: number; xpIntoLevel: number; xpForNextLevel: number } {
  let level = 1
  let remaining = xp
  let need = xpToClear(level)
  while (remaining >= need) {
    remaining -= need
    level += 1
    need = xpToClear(level)
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: need }
}

// Count consecutive calendar weeks (Mon–Sun) that contain at least one completed
// lesson, ending at the most recent lesson's week. A gap of a full empty week
// breaks the streak.
function computeStreak(lessonDates: string[]): number {
  if (lessonDates.length === 0) return 0

  // Week key = year * 100 + ISO-ish week number based on days since epoch Monday.
  const weekKey = (d: Date): number => {
    // Days since a fixed Monday (1970-01-05 was a Monday).
    const epochMonday = Date.UTC(1970, 0, 5)
    const days = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - epochMonday) / 86400000)
    return Math.floor(days / 7)
  }

  const weeks = new Set<number>()
  for (const iso of lessonDates) {
    const d = new Date(iso)
    if (!Number.isNaN(d.getTime())) weeks.add(weekKey(d))
  }
  if (weeks.size === 0) return 0

  const latest = Math.max(...weeks)
  let streak = 0
  let w = latest
  while (weeks.has(w)) {
    streak += 1
    w -= 1
  }
  return streak
}

export function computeGamification(input: GamificationInput): GamificationResult {
  const xp =
    input.lessons * XP_PER_LESSON +
    input.homework * XP_PER_HOMEWORK +
    input.words * XP_PER_WORD

  const { level, xpIntoLevel, xpForNextLevel } = computeLevel(xp)
  const levelTitle = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)]
  const progressPct = xpForNextLevel > 0 ? Math.round((xpIntoLevel / xpForNextLevel) * 100) : 0
  const streakWeeks = computeStreak(input.lessonDates)

  const badges: Badge[] = [
    { id: 'first-lesson', name: 'First Steps', desc: 'Complete your first lesson', emoji: '🎯', earned: input.lessons >= 1 },
    { id: 'five-lessons', name: 'Getting Going', desc: 'Complete 5 lessons', emoji: '🔥', earned: input.lessons >= 5 },
    { id: 'ten-lessons', name: 'Committed', desc: 'Complete 10 lessons', emoji: '⭐', earned: input.lessons >= 10 },
    { id: 'twentyfive-lessons', name: 'Dedicated', desc: 'Complete 25 lessons', emoji: '🏆', earned: input.lessons >= 25 },
    { id: 'fifty-lessons', name: 'Veteran', desc: 'Complete 50 lessons', emoji: '👑', earned: input.lessons >= 50 },
    { id: 'words-50', name: 'Wordsmith', desc: 'Learn 50 words', emoji: '📚', earned: input.words >= 50 },
    { id: 'words-150', name: 'Vocabulary Master', desc: 'Learn 150 words', emoji: '🧠', earned: input.words >= 150 },
    { id: 'homework-10', name: 'Homework Hero', desc: 'Submit 10 homeworks', emoji: '✍️', earned: input.homework >= 10 },
    { id: 'streak-4', name: 'On Fire', desc: '4-week learning streak', emoji: '⚡', earned: streakWeeks >= 4 },
    { id: 'streak-8', name: 'Unstoppable', desc: '8-week learning streak', emoji: '💎', earned: streakWeeks >= 8 },
  ]

  return {
    xp,
    level,
    levelTitle,
    xpIntoLevel,
    xpForNextLevel,
    progressPct,
    streakWeeks,
    badges,
    earnedCount: badges.filter(b => b.earned).length,
    totalBadges: badges.length,
  }
}
