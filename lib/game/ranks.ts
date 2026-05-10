export type RankTier =
  | 'ผู้มาใหม่'
  | 'ผู้ตื่นรู้'
  | 'นักพยากรณ์'
  | 'โหรมือทอง'
  | 'เซียนทำนาย'
  | 'เทพทำนาย'
  | 'จักรวาลเลือก'

export type RankDisplay = {
  tier: RankTier
  name: string     // English key
  title: string    // ฉายา
  emoji: string
  color: string
  minRep: number
}

export const RANKS: RankDisplay[] = [
  { tier: 'ผู้มาใหม่',     name: 'Wanderer', title: 'เดาแต่โดน',  emoji: '🌫️', color: '#94a3b8', minRep: 0      },
  { tier: 'ผู้ตื่นรู้',    name: 'Awakened', title: 'ทรงนี้มาแน่',  emoji: '🌙',  color: '#60a5fa', minRep: 150    },
  { tier: 'นักพยากรณ์',   name: 'Seer',     title: 'คนมันแม่น',       emoji: '⚡',  color: '#34d399', minRep: 500    },
  { tier: 'โหรมือทอง',    name: 'Oracle',   title: 'คนมีของ',   emoji: '🎯',  color: '#fbbf24', minRep: 1200   },
  { tier: 'เซียนทำนาย',   name: 'Sage',     title: 'ลูกรักจักรวาล',   emoji: '🔮',  color: '#f97316', minRep: 3000   },
  { tier: 'เทพทำนาย',     name: 'Prophet',  title: 'เทพทำนาย',        emoji: '👁️', color: '#a855f7', minRep: 7000   },
  { tier: 'จักรวาลเลือก', name: 'Chosen',   title: 'จักรวาลกระซิบ',   emoji: '🌌',  color: '#ec4899', minRep: 15000  },
]

export function getRank(reputation: number): RankDisplay {
  return [...RANKS].reverse().find(r => reputation >= r.minRep) ?? RANKS[0]
}

export function getNextRank(reputation: number): RankDisplay | null {
  return RANKS.find(r => r.minRep > reputation) ?? null
}

export function getProgressToNext(reputation: number): number {
  const current = getRank(reputation)
  const next = getNextRank(reputation)
  if (!next) return 100
  const range = next.minRep - current.minRep
  return Math.floor(((reputation - current.minRep) / range) * 100)
}
