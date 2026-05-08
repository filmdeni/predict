export type RankTier = 'มือใหม่' | 'นักพยากรณ์' | 'โหรมือทอง' | 'เซียนฟันธง' | 'เทพทำนาย'

export const RANKS = [
  { tier: 'มือใหม่'     as RankTier, minRep: 0,    color: '#94a3b8', emoji: '🌱' },
  { tier: 'นักพยากรณ์' as RankTier, minRep: 100,  color: '#60a5fa', emoji: '🔮' },
  { tier: 'โหรมือทอง'  as RankTier, minRep: 500,  color: '#fbbf24', emoji: '⭐' },
  { tier: 'เซียนฟันธง' as RankTier, minRep: 2000, color: '#f97316', emoji: '🏆' },
  { tier: 'เทพทำนาย'   as RankTier, minRep: 5000, color: '#a855f7', emoji: '🌟' },
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
