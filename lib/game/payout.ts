import { SupabaseClient } from '@supabase/supabase-js'
import { calcPayout } from './odds'
import { getRank } from './ranks'

const BOT_USER_IDS = new Set([
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0001-000000000002',
  '00000000-0000-0000-0001-000000000003',
  '00000000-0000-0000-0001-000000000004',
  '00000000-0000-0000-0001-000000000005',
])

export async function payoutQuestion(
  supabase: SupabaseClient,
  questionId: string,
  correctOption: string,
  winnerName: string,
): Promise<number> {
  const now = new Date().toISOString()

  const [{ data: preds }, { data: q }] = await Promise.all([
    supabase
      .from('predictions')
      .select('id, user_id, option_id, coins_wagered, early_bird_bonus')
      .eq('question_id', questionId)
      .is('resolved_at', null),
    supabase
      .from('questions')
      .select('pool, total_pool')
      .eq('id', questionId)
      .single(),
  ])

  await supabase.from('questions').update({
    status: 'resolved', correct_option: correctOption, resolved_at: now,
  }).eq('id', questionId)

  if (!preds || preds.length === 0) return 0

  const pool: Record<string, number> = (q?.pool as Record<string, number>) ?? {}
  const totalPool: number = q?.total_pool ?? 0
  const winnerPool: number = pool[correctOption] ?? 0

  // Compute payouts
  type PredRow = { id: string; user_id: string; option_id: string; coins_wagered: number; early_bird_bonus: number }
  const humanPreds = (preds as PredRow[]).filter(p => !BOT_USER_IDS.has(p.user_id))
  const humanIds = [...new Set(humanPreds.map(p => p.user_id))]

  // Batch fetch all users
  const { data: users } = await supabase
    .from('users')
    .select('id, coins, reputation, correct_predictions, win_streak, best_streak')
    .in('id', humanIds.length > 0 ? humanIds : ['00000000-0000-0000-0000-000000000000'])

  const userMap = new Map((users ?? []).map(u => [u.id, u]))

  // Compute all updates
  const predUpdates: { id: string; is_correct: boolean; coins_won: number; rep_delta: number }[] = []
  const userUpdates: { id: string; coins: number; reputation: number; correct_predictions: number; win_streak: number; best_streak: number; rank: string }[] = []
  const txInserts: { user_id: string; amount: number; balance: number; reason: string; ref_id: string }[] = []
  const notifInserts: object[] = []
  let totalPaid = 0

  for (const pred of preds as PredRow[]) {
    const isCorrect = pred.option_id === correctOption
    const isBot = BOT_USER_IDS.has(pred.user_id)
    const earlyBird = Number(pred.early_bird_bonus ?? 1)
    const coinsWon = isCorrect ? Math.floor(calcPayout(totalPool, winnerPool, pred.coins_wagered) * earlyBird) : 0
    const repDelta = isCorrect
      ? Math.max(1, parseFloat((Math.log(coinsWon / Math.max(pred.coins_wagered, 1)) * 10 + 5).toFixed(2)))
      : -3

    predUpdates.push({ id: pred.id, is_correct: isCorrect, coins_won: coinsWon, rep_delta: repDelta })
    if (isBot) continue

    const user = userMap.get(pred.user_id)
    if (!user) continue

    if (isCorrect && coinsWon > 0) {
      const net = coinsWon - pred.coins_wagered
      const newCoins = user.coins + net
      const newRep = parseFloat((Number(user.reputation) + repDelta).toFixed(2))
      const newStreak = user.win_streak + 1
      userUpdates.push({ id: pred.user_id, coins: newCoins, reputation: newRep, correct_predictions: user.correct_predictions + 1, win_streak: newStreak, best_streak: Math.max(user.best_streak, newStreak), rank: getRank(newRep).tier })
      txInserts.push({ user_id: pred.user_id, amount: net, balance: newCoins, reason: 'ทายถูก', ref_id: questionId })
      notifInserts.push({ user_id: pred.user_id, type: 'prediction_resolved', question_id: questionId, is_correct: true, coins_won: coinsWon, rep_delta: repDelta, message: `ทายถูก! ${winnerName} ชนะ — ได้รับ ${coinsWon.toLocaleString('th-TH')} คะแนน` })
      totalPaid += net
      // Update local map for subsequent preds from same user
      user.coins = newCoins
      user.reputation = newRep
      user.win_streak = newStreak
      user.best_streak = Math.max(user.best_streak, newStreak)
      user.correct_predictions += 1
    } else if (!isCorrect) {
      const newRep = Math.max(0, parseFloat((Number(user.reputation) + repDelta).toFixed(2)))
      userUpdates.push({ id: pred.user_id, coins: user.coins, reputation: newRep, correct_predictions: user.correct_predictions, win_streak: 0, best_streak: user.best_streak, rank: getRank(newRep).tier })
      notifInserts.push({ user_id: pred.user_id, type: 'prediction_resolved', question_id: questionId, is_correct: false, coins_won: 0, rep_delta: repDelta, message: `ทายพลาด ${winnerName} คือผู้ชนะ` })
      user.reputation = newRep
      user.win_streak = 0
    }
  }

  // Batch writes in parallel
  await Promise.all([
    // Predictions: update in chunks of 20
    ...chunk(predUpdates, 20).map(batch =>
      Promise.all(batch.map(p => supabase.from('predictions').update({ is_correct: p.is_correct, coins_won: p.coins_won, rep_delta: p.rep_delta, resolved_at: now }).eq('id', p.id)))
    ),
    // Users: upsert all at once
    userUpdates.length > 0
      ? supabase.from('users').upsert(userUpdates, { onConflict: 'id' })
      : Promise.resolve(),
    // Transactions: batch insert
    txInserts.length > 0
      ? supabase.from('coin_transactions').insert(txInserts)
      : Promise.resolve(),
    // Notifications: batch insert
    notifInserts.length > 0
      ? supabase.from('notifications').insert(notifInserts)
      : Promise.resolve(),
  ])

  return totalPaid
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}
