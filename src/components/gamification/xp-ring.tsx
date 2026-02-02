'use client'

import { getXpForLevel } from '@/lib/utils/xp-calculator'

interface XpRingProps {
  xp: number
  level: number
  size?: 'sm' | 'md' | 'lg'
}

export function XpRing({ xp, level, size = 'md' }: XpRingProps) {
  const currentLevelXp = getXpForLevel(level)
  const nextLevelXp = getXpForLevel(level + 1)
  const xpIntoLevel = xp - currentLevelXp
  const xpNeeded = nextLevelXp - currentLevelXp
  const progress = Math.min(100, (xpIntoLevel / xpNeeded) * 100)

  const sizeClasses = {
    sm: { container: 'w-16 h-16', text: 'text-lg', subtext: 'text-[8px]' },
    md: { container: 'w-24 h-24', text: 'text-2xl', subtext: 'text-xs' },
    lg: { container: 'w-32 h-32', text: 'text-3xl', subtext: 'text-sm' },
  }

  const { container, text, subtext } = sizeClasses[size]

  // SVG circle properties
  const strokeWidth = size === 'sm' ? 4 : size === 'md' ? 6 : 8
  const radius = size === 'sm' ? 28 : size === 'md' ? 42 : 56
  const circumference = 2 * Math.PI * radius

  return (
    <div className={`relative ${container}`}>
      {/* Background circle */}
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-zinc-800"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (progress / 100) * circumference}
          className="transition-all duration-500"
        />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold ${text} text-white`}>{level}</span>
        <span className={`${subtext} text-zinc-500 font-medium`}>LEVEL</span>
      </div>
    </div>
  )
}

export function XpProgress({ xp, level }: { xp: number; level: number }) {
  const currentLevelXp = getXpForLevel(level)
  const nextLevelXp = getXpForLevel(level + 1)
  const xpIntoLevel = xp - currentLevelXp
  const xpNeeded = nextLevelXp - currentLevelXp
  const progress = Math.min(100, (xpIntoLevel / xpNeeded) * 100)

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>
          Level {level} → {level + 1}
        </span>
        <span className="font-mono">
          {xpIntoLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP
        </span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-lime-500 to-green-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
