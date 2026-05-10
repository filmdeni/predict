export type Pool = Record<string, number>

export function getOdds(pool: Pool, optionId: string): number {
  const total = Object.values(pool).reduce((sum, v) => sum + v, 0)
  const optionPool = pool[optionId] ?? 0
  if (optionPool === 0) return 0
  return total / optionPool
}

export function getPoolShares(pool: Pool): Record<string, number> {
  const total = Object.values(pool).reduce((sum, v) => sum + v, 0)
  if (total === 0) return Object.fromEntries(Object.keys(pool).map(k => [k, 0]))
  return Object.fromEntries(Object.entries(pool).map(([k, v]) => {
    const raw = (v / total) * 100
    return [k, Math.min(95, Math.max(5, raw))]
  }))
}

export function estimatePayout(pool: Pool, optionId: string, wagered: number): number {
  const newPool = { ...pool, [optionId]: (pool[optionId] ?? 0) + wagered }
  const odds = getOdds(newPool, optionId)
  return Math.floor(wagered * odds)
}

export function calcPayout(totalPool: number, winnerPool: number, userWagered: number): number {
  if (winnerPool === 0) return 0
  return Math.floor((userWagered / winnerPool) * totalPool)
}
