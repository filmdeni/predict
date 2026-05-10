'use client'

import { RANKS, type RankTier } from '@/lib/game/ranks'

type Size = 'sm' | 'md' | 'lg'

interface RankAvatarProps {
  avatarUrl: string | null
  displayName: string
  rank: RankTier | string
  size?: Size
  className?: string
}

const SIZE = {
  sm: { outer: 'w-9 h-9',  img: 'w-9 h-9',  badge: 'text-[10px] -bottom-0.5 -right-0.5', frame: 2 },
  md: { outer: 'w-12 h-12', img: 'w-12 h-12', badge: 'text-xs    -bottom-1   -right-1',    frame: 2 },
  lg: { outer: 'w-16 h-16', img: 'w-16 h-16', badge: 'text-sm    -bottom-1   -right-1',    frame: 3 },
}

// Per-rank visual config
const RANK_FX: Record<string, {
  borderWidth: number
  glowStrength: number   // 0 = none
  aura: 'none' | 'pulse' | 'spin' | 'cosmic'
  badgeAnimate: boolean
}> = {
  'ผู้มาใหม่':    { borderWidth: 1, glowStrength: 0,    aura: 'none',   badgeAnimate: false },
  'ผู้ตื่นรู้':   { borderWidth: 2, glowStrength: 4,    aura: 'none',   badgeAnimate: false },
  'นักพยากรณ์':  { borderWidth: 2, glowStrength: 8,    aura: 'none',   badgeAnimate: false },
  'โหรมือทอง':   { borderWidth: 2, glowStrength: 12,   aura: 'pulse',  badgeAnimate: false },
  'เซียนทำนาย':  { borderWidth: 3, glowStrength: 16,   aura: 'pulse',  badgeAnimate: true  },
  'เทพทำนาย':    { borderWidth: 3, glowStrength: 20,   aura: 'spin',   badgeAnimate: true  },
  'จักรวาลเลือก':{ borderWidth: 3, glowStrength: 28,   aura: 'cosmic', badgeAnimate: true  },
}

export default function RankAvatar({
  avatarUrl,
  displayName,
  rank,
  size = 'sm',
  className = '',
}: RankAvatarProps) {
  const rankData = RANKS.find(r => r.tier === rank) ?? RANKS[0]
  const fx = RANK_FX[rank] ?? RANK_FX['ผู้มาใหม่']
  const sz = SIZE[size]

  const borderStyle = fx.glowStrength > 0
    ? {
        boxShadow: `0 0 0 ${fx.borderWidth}px ${rankData.color}, 0 0 ${fx.glowStrength}px ${rankData.color}80`,
      }
    : {
        boxShadow: `0 0 0 ${fx.borderWidth}px ${rankData.color}60`,
      }

  // Aura ring element
  const auraEl = fx.aura !== 'none' && (
    <span
      className={[
        'absolute inset-0 rounded-full pointer-events-none',
        fx.aura === 'pulse'  && 'animate-ping opacity-20',
        fx.aura === 'spin'   && 'animate-spin-slow opacity-30',
        fx.aura === 'cosmic' && 'animate-cosmic opacity-40',
      ].filter(Boolean).join(' ')}
      style={{
        background:
          fx.aura === 'cosmic'
            ? `conic-gradient(from 0deg, ${rankData.color}, #a855f7, #3b82f6, #ec4899, ${rankData.color})`
            : `radial-gradient(circle, ${rankData.color}60 0%, transparent 70%)`,
        ...(fx.aura !== 'cosmic' ? {} : { padding: '3px' }),
      }}
    />
  )

  // Badge element
  const badgeEl = (
    <span
      className={[
        'absolute leading-none select-none z-10',
        sz.badge,
        fx.badgeAnimate && 'animate-bounce-slow',
      ].filter(Boolean).join(' ')}
    >
      {rankData.emoji}
    </span>
  )

  return (
    <span className={`relative inline-flex flex-shrink-0 ${sz.outer} ${className}`}>
      {/* Aura layer (behind avatar) */}
      {fx.aura !== 'none' && (
        <span
          className="absolute -inset-1 rounded-full pointer-events-none z-0"
          style={{
            background:
              fx.aura === 'cosmic'
                ? `conic-gradient(from 0deg, ${rankData.color}50, #a855f750, #3b82f650, #ec489950, ${rankData.color}50)`
                : `radial-gradient(circle, ${rankData.color}30 0%, transparent 70%)`,
            ...(fx.aura === 'cosmic' ? { animation: 'spin 4s linear infinite' } : {}),
            ...(fx.aura === 'pulse' ? { animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite' } : {}),
          }}
        />
      )}

      {/* Avatar circle */}
      <span
        className={`relative z-[1] ${sz.img} rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center`}
        style={borderStyle}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            className="w-full h-full flex items-center justify-center text-sm font-bold"
            style={{ background: `${rankData.color}20`, color: rankData.color }}
          >
            {displayName[0]}
          </span>
        )}
      </span>

      {/* Badge */}
      {badgeEl}
    </span>
  )
}
