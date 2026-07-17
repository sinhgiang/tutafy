import type { GamificationResult } from '@/lib/gamification'
import { Flame } from 'lucide-react'

// Presentational card for the student portal: level + XP progress, current
// streak, and a badge grid (earned badges in colour, locked ones dimmed).
export function GamificationCard({ data, firstName }: { data: GamificationResult; firstName: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Level header */}
      <div className="bg-gradient-to-br from-indigo-500 to-violet-500 px-5 py-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <span className="text-[18px] font-black">{data.level}</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-indigo-100 uppercase tracking-widest">Level {data.level}</p>
              <p className="text-[16px] font-bold leading-tight">{data.levelTitle}</p>
            </div>
          </div>
          {data.streakWeeks > 0 && (
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-300" fill="currentColor" />
              <span className="text-[12px] font-bold">{data.streakWeeks}-week streak</span>
            </div>
          )}
        </div>

        {/* XP progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-indigo-100 mb-1.5">
            <span className="font-semibold">{data.xp.toLocaleString()} XP</span>
            <span>{data.xpIntoLevel} / {data.xpForNextLevel} to Level {data.level + 1}</span>
          </div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${Math.min(100, data.progressPct)}%` }} />
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Badges</p>
          <p className="text-[11px] font-semibold text-gray-400">{data.earnedCount}/{data.totalBadges} earned</p>
        </div>
        <div className="grid grid-cols-5 gap-2.5">
          {data.badges.map(b => (
            <div key={b.id} title={`${b.name} — ${b.desc}`}
              className={`flex flex-col items-center gap-1 rounded-xl py-2.5 px-1 border transition-colors ${
                b.earned ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'
              }`}>
              <span className={`text-[20px] leading-none ${b.earned ? '' : 'opacity-30 grayscale'}`}>{b.emoji}</span>
              <span className={`text-[9px] font-semibold text-center leading-tight ${b.earned ? 'text-amber-700' : 'text-gray-300'}`}>
                {b.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
