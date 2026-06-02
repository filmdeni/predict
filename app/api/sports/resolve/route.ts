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

async function fetchResult(eventId: string, leagueSlug: string): Promise<{ correctOption: string | null; winnerName: string }> {
  const sport = leagueSlug === 'nba' ? 'basketball' : 'soccer'
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/${sport}/${leagueSlug}/summary?event=${eventId}`,
    { next: { revalidate: 0 } }
  )
  if (!res.ok) throw new Error(`ESPN error: ${res.status}`)
  const data = await res.json()
  const comp = data.boxscore?.teams ?? data.header?.competitions?.[0]

  // Try header path
  const header = data.header?.competitions?.[0]
  if (!header) return { correctOption: null, winnerName: '' }

  if (!header.status?.type?.completed) return { correctOption: null, winnerName: '' }

  const competitors = header.competitors ?? []
  const winner = competitors.find((c: any) => c.winner)
  const scores = competitors.map((c: any) => Number(c.score ?? 0))

  if (!winner) {
    // draw
    return { correctOption: 'draw', winnerName: 'เสมอ' }
  }

  return { correctOption: winner.team?.id ?? winner.id, winnerName: winner.team?.displayName ?? '' }
}

async function payoutQuestion(questionId: string, correctOption: string, winnerName: string) {
  const now = new Date().toISOString()
  const { data: preds } = await supabase.from('predictions')
    .select('id, user_id, option_id, coins_wagered')
    .eq('question_id', questionId).is('resolved_at', null)

  if (!preds?.length) {
    await supabase.from('questions').update({ status: 'resolved', correct_option: correctOption, resolved_at: now }).eq('id', questionId)
    return
  }

  const { data: q } = await supabase.from('questions').select('pool, total_pool').eq('id', questionId).single()
  const pool: Record<string, number> = (q?.pool as Record<string, number>) ?? {}
  const totalPool = q?.total_pool ?? 0
  const winnerPool = pool[correctOption] ?? 0

  for (const pred of preds) {
    const isCorrect = pred.option_id === correctOption
    const isBot = BOT_USER_IDS.has(pred.user_id)
    const coinsWon = isCorrect ? calcPayout(totalPool, winnerPool, pred.coins_wagered) : 0
    const repDelta = isCorrect ? Math.max(1, parseFloat((Math.log(coinsWon / Math.max(pred.coins_wagered, 1)) * 10 + 5).toFixed(2))) : -3

    await supabase.from('predictions').update({ is_correct: isCorrect, coins_won: coinsWon, rep_delta: repDelta, resolved_at: now }).eq('id', pred.id)
    if (isBot) continue

    const { data: user } = await supabase.from('users').select('coins, reputation, correct_predictions, win_streak, best_streak').eq('id', pred.user_id).single()
    if (!user) continue

    if (isCorrect && coinsWon > 0) {
      const net = coinsWon - pred.coins_wagered
      const newCoins = user.coins + net
      const newRep = parseFloat((Number(user.reputation) + repDelta).toFixed(2))
      const newStreak = user.win_streak + 1
      await supabase.from('users').update({ coins: newCoins, reputation: newRep, correct_predictions: user.correct_predictions + 1, win_streak: newStreak, best_streak: Math.max(user.best_streak, newStreak), rank: getRank(newRep).tier }).eq('id', pred.user_id)
      await supabase.from('coin_transactions').insert({ user_id: pred.user_id, amount: net, balance: newCoins, reason: 'ทายถูก', ref_id: questionId })
      await supabase.from('notifications').insert({ user_id: pred.user_id, type: 'prediction_resolved', question_id: questionId, is_correct: true, coins_won: coinsWon, rep_delta: repDelta, message: `ทายถูก! ${winnerName} — ได้รับ ${coinsWon.toLocaleString('th-TH')} คะแนน` })
    } else if (!isCorrect) {
      const newRep = Math.max(0, parseFloat((Number(user.reputation) + repDelta).toFixed(2)))
      await supabase.from('users').update({ reputation: newRep, win_streak: 0, rank: getRank(newRep).tier }).eq('id', pred.user_id)
      await supabase.from('notifications').insert({ user_id: pred.user_id, type: 'prediction_resolved', question_id: questionId, is_correct: false, coins_won: 0, rep_delta: repDelta, message: `ทายพลาด ผลคือ: ${winnerName}` })
    }
  }

  await supabase.from('questions').update({ status: 'resolved', correct_option: correctOption, resolved_at: now }).eq('id', questionId)
}

function isAuthorized(req: Request) {
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: Request) { return handler(req) }
export async function POST(req: Request) { return handler(req) }

async function handler(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: questions } = await supabase.from('questions')
    .select('id, description').eq('status', 'open').lte('closes_at', new Date().toISOString())

  const sportsQs = (questions ?? []).filter(q => {
    try { return JSON.parse(q.description ?? '{}').type === 'sports' } catch { return false }
  })

  const results: object[] = []
  for (const q of sportsQs) {
    try {
      const meta = JSON.parse(q.description!)
      const { correctOption, winnerName } = await fetchResult(meta.event_id, meta.league)
      if (!correctOption) { results.push({ question_id: q.id, skipped: 'not finished yet' }); continue }
      await payoutQuestion(q.id, correctOption, winnerName)
      results.push({ question_id: q.id, winner: winnerName })
    } catch (err) {
      results.push({ question_id: q.id, error: String(err) })
    }
  }

  return NextResponse.json({ ok: true, resolved: results.filter((r: any) => r.winner).length, results })
}
