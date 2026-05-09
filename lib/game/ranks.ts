export type RankTier = 'มือใหม่' | 'นักพยากรณ์' | 'โหรมือทอง' | 'เซียนฟันธง' | 'เทพทำนาย'

export type RankDisplay = {
  tier: RankTier
  name: string     // แรงก์
  title: string    // ฉายา
  emoji: string
  color: string
  minRep: number
}

export const RANKS: RankDisplay[] = [
  { tier: 'มือใหม่'     as RankTier, name: 'Seed',   title: 'เดาแต่โดน',       emoji: '🌱', color: '#94a3b8', minRep: 0    },
  { tier: 'นักพยากรณ์' as RankTier, name: 'Pulse',  title: 'คนมีของ',          emoji: '⚡', color: '#60a5fa', minRep: 100  },
  { tier: 'โหรมือทอง'  as RankTier, name: 'Signal', title: 'คนมันแม่น',        emoji: '🎯', color: '#fbbf24', minRep: 500  },
  { tier: 'เซียนฟันธง' as RankTier, name: 'Oracle', title: 'ทรงนี้มาแน่',      emoji: '🔮', color: '#f97316', minRep: 2000 },
  { tier: 'เทพทำนาย'   as RankTier, name: 'Zenith', title: 'ลูกรักจักรวาล',    emoji: '👑', color: '#a855f7', minRep: 5000 },
]

export function getRank(reputation: number) {
  return [...RANKS].reverse().find(r => reputation >= r.minRep) ?? RANKS[0]
}

export function getNextRank(reputation: number) {
  return RANKS.find(r => r.minRep > reputation) ?? null
}

export function getProgressToNext(reputation: number): number {
  const current = getRank(reputation)
  const next = getNextRank(reputation)
  if (!next) return 100
  const range = next.minRep - current.minRep
  return Math.floor(((reputation - current.minRep) / range) * 100)
}
