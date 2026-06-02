import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcPayout } from '@/lib/game/odds'
import { getRank } from '@/lib/game/ranks'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BOT_USER_IDS = new Set([
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0001-000000000002',
  '00000000-0000-0000-0001-000000000003',
  '00000000-0000-0000-0001-000000000004',
  '00000000-0000-0000-0001-000000000005',
])

async function fetchMatchResult(matchId: number): Promise<{ winnerId: number | null; status: string }> {
  const res = await fetch(`https://api.pandascore.co/matches/${matchId}`, {
    headers: { Authorization: `Bearer ${process.env.PANDASCORE_TOKEN}` },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`PandaScore error: ${res.status}`)
  const m = await res.json()
  return { winnerId: m.winner_id ?? null, status: m.status }
}

async function payoutQuestion(questionId: string, correctOption: string, winnerName: string) {
  const now = new Date().toISOString()

  const { data: preds } = await supabase
    .from('predictions')
    .select('id, user_id, option_id, coins_wagered')
    .eq('question_id', questionId)
    .is('resolved_at', null)

  if (!preds || preds.length === 0) {
    await supabase.from('questions').update({
      status: 'resolved', correct_option: correctOption, resolved_at: now,
    }).eq('id', questionId)
    return 0
  }

  const { data: q } = await supabase
    .from('questions')
    .select('pool, total_pool')
    .eq('id', questionId)
    .single()

  const pool: Record<string, number> = (q?.pool as Record<string, number>) ?? {}
  const totalPool: number = q?.total_pool ?? 0
  const winnerPool: number = pool[correctOption] ?? 0
  let totalPaid = 0

  for (const pred of preds) {
    const isCorrect = pred.option_id === correctOption
    const isBot = BOT_USER_IDS.has(pred.user_id)
    const coinsWon = isCorrect ? calcPayout(totalPool, winnerPool, pred.coins_wagered) : 0
    const repDelta = isCorrect
      ? Math.max(1, parseFloat((Math.log(coinsWon / Math.max(pred.coins_wagered, 1)) * 10 + 5).toFixed(2)))
      : -3

    await supabase.from('predictions').update({
      is_correct: isCorrect, coins_won: coinsWon, rep_delta: repDelta, resolved_at: now,
    }).eq('id', pred.id)

    if (isBot) continue

    const { data: user } = await supabase
      .from('users')
      .select('coins, reputation, correct_predictions, win_streak, best_streak')
      .eq('id', pred.user_id)
      .single()

    if (!user) continue

    if (isCorrect && coinsWon > 0) {
      const net = coinsWon - pred.coins_wagered
      const newCoins = user.coins + net
      const newRep = parseFloat((Number(user.reputation) + repDelta).toFixed(2))
      const newStreak = user.win_streak + 1

      await supabase.from('users').update({
        coins: newCoins,
        reputation: newRep,
        correct_predictions: user.correct_predictions + 1,
        win_streak: newStreak,
        best_streak: Math.max(user.best_streak, newStreak),
        rank: getRank(newRep).tier,
      }).eq('id', pred.user_id)

      await supabase.from('coin_transactions').insert({
        user_id: pred.user_id, amount: net, balance: newCoins,
        reason: 'ทายถูก', ref_id: questionId,
      })

      await supabase.from('notifications').insert({
        user_id: pred.user_id, type: 'prediction_resolved', question_id: questionId,
        is_correct: true, coins_won: coinsWon, rep_delta: repDelta,
        message: `ทายถูก! ${winnerName} ชนะ — ได้รับ ${coinsWon.toLocaleString('th-TH')} คะแนน`,
      })

      totalPaid += net
    } else if (!isCorrect) {
      const newRep = Math.max(0, parseFloat((Number(user.reputation) + repDelta).toFixed(2)))
      await supabase.from('users').update({
        reputation: newRep, win_streak: 0, rank: getRank(newRep).tier,
      }).eq('id', pred.user_id)

      await supabase.from('notifications').insert({
        user_id: pred.user_id, type: 'prediction_resolved', question_id: questionId,
        is_correct: false, coins_won: 0, rep_delta: repDelta,
        message: `ทายพลาด ${winnerName} คือผู้ชนะ`,
      })
    }
  }

  await supabase.from('questions').update({
    status: 'resolved', correct_option: correctOption, resolved_at: now,
  }).eq('id', questionId)

  return totalPaid
}

function isAuthorized(req: Request): boolean {
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: Request) { return handler(req) }
export async function POST(req: Request) { return handler(req) }

async function handler(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find open esports questions past closes_at
  const { data: questions } = await supabase
    .from('questions')
    .select('id, description, closes_at')
    .eq('status', 'open')
    .lte('closes_at', new Date().toISOString())

  const esportsQuestions = (questions ?? []).filter(q => {
    try { return JSON.parse(q.description ?? '{}').type === 'esports' } catch { return false }
  })

  const results: object[] = []

  for (const q of esportsQuestions) {
    try {
      const meta = JSON.parse(q.description!)
      const { winnerId, status } = await fetchMatchResult(meta.match_id)

      if (status !== 'finished' || !winnerId) {
        results.push({ question_id: q.id, skipped: `match status: ${status}` })
        continue
      }

      const correctOption = String(winnerId)
      const winnerName = winnerId === meta.team_a.id ? meta.team_a.name : meta.team_b.name
      const paid = await payoutQuestion(q.id, correctOption, winnerName)
      results.push({ question_id: q.id, winner: winnerName, paid })
    } catch (err) {
      results.push({ question_id: q.id, error: String(err) })
    }
  }

  return NextResponse.json({ ok: true, resolved: results.filter((r: any) => r.winner).length, results })
}
