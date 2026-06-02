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

async function fetchGoldPricePerBahtWeight(): Promise<number> {
  const headers = { 'User-Agent': 'Mozilla/5.0' }
  const [goldRes, fxRes] = await Promise.all([
    fetch('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d', { headers, next: { revalidate: 0 } }),
    fetch('https://query1.finance.yahoo.com/v8/finance/chart/USDTHB=X?interval=1d&range=1d', { headers, next: { revalidate: 0 } }),
  ])
  if (!goldRes.ok) throw new Error(`Gold fetch error: ${goldRes.status}`)
  if (!fxRes.ok) throw new Error(`FX fetch error: ${fxRes.status}`)
  const goldData = await goldRes.json()
  const fxData = await fxRes.json()
  const ozPriceUSD: number = goldData.chart.result[0].meta.regularMarketPrice
  const usdThb: number = fxData.chart.result[0].meta.regularMarketPrice
  return Math.round(ozPriceUSD * usdThb * (15.244 / 31.1035))
}

async function fetchOilWTI(): Promise<number> {
  const res = await fetch(
    'https://query1.finance.yahoo.com/v8/finance/chart/CL=F?interval=1d&range=1d',
    { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 0 } }
  )
  if (!res.ok) throw new Error(`Yahoo Finance error: ${res.status}`)
  const data = await res.json()
  return data.chart.result[0].meta.regularMarketPrice as number
}

async function getCurrentPrice(commodity: string): Promise<number> {
  if (commodity === 'gold') return fetchGoldPricePerBahtWeight()
  if (commodity === 'oil_wti') return fetchOilWTI()
  throw new Error(`Unknown commodity: ${commodity}`)
}

async function resolveQuestion(questionId: string, correctOption: string, finalPrice: number) {
  const now = new Date().toISOString()

  // Fetch all predictions for this question
  const { data: preds, error: predsErr } = await supabase
    .from('predictions')
    .select('id, user_id, option_id, coins_wagered')
    .eq('question_id', questionId)
    .is('resolved_at', null)

  if (predsErr) throw predsErr
  if (!preds || preds.length === 0) {
    await supabase.from('questions').update({
      status: 'resolved',
      correct_option: correctOption,
      resolved_at: now,
    }).eq('id', questionId)
    return { resolved: 0, paid: 0, final_price: finalPrice }
  }

  // Fetch pool
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

    let coinsWon = 0
    let repDelta = 0

    if (isCorrect) {
      coinsWon = calcPayout(totalPool, winnerPool, pred.coins_wagered)
      repDelta = parseFloat((Math.log(coinsWon / Math.max(pred.coins_wagered, 1)) * 10 + 5).toFixed(2))
      repDelta = Math.max(1, repDelta)
    } else {
      repDelta = -3
    }

    // Update prediction record
    await supabase.from('predictions').update({
      is_correct: isCorrect,
      coins_won: coinsWon,
      rep_delta: repDelta,
      resolved_at: now,
    }).eq('id', pred.id)

    // Skip coin/rep updates for bots
    if (isBot) continue

    if (isCorrect && coinsWon > 0) {
      // Fetch current user coins
      const { data: user } = await supabase
        .from('users')
        .select('coins, reputation, correct_predictions, total_predictions, win_streak, best_streak')
        .eq('id', pred.user_id)
        .single()

      if (!user) continue

      const net = coinsWon - pred.coins_wagered
      const newCoins = user.coins + net
      const newRep = parseFloat((Number(user.reputation) + repDelta).toFixed(2))
      const newCorrect = user.correct_predictions + 1
      const newTotal = user.total_predictions // already counted at prediction time
      const newStreak = user.win_streak + 1
      const newBest = Math.max(user.best_streak, newStreak)
      const newRank = getRank(newRep)

      await supabase.from('users').update({
        coins: newCoins,
        reputation: newRep,
        correct_predictions: newCorrect,
        win_streak: newStreak,
        best_streak: newBest,
        rank: newRank.tier,
      }).eq('id', pred.user_id)

      await supabase.from('coin_transactions').insert({
        user_id: pred.user_id,
        amount: net,
        balance: newCoins,
        reason: 'ทายถูก',
        ref_id: questionId,
      })

      // Notification
      await supabase.from('notifications').insert({
        user_id: pred.user_id,
        type: 'prediction_resolved',
        question_id: questionId,
        is_correct: true,
        coins_won: coinsWon,
        rep_delta: repDelta,
        message: `ทายถูก! คุณได้รับ ${coinsWon.toLocaleString('th-TH')} คะแนน`,
      })

      totalPaid += net
    } else if (!isCorrect) {
      // Deduct reputation only (coins already deducted at bet time)
      const { data: user } = await supabase
        .from('users')
        .select('reputation')
        .eq('id', pred.user_id)
        .single()

      if (!user) continue

      const newRep = Math.max(0, parseFloat((Number(user.reputation) + repDelta).toFixed(2)))
      const newRank = getRank(newRep)

      await supabase.from('users').update({
        reputation: newRep,
        win_streak: 0,
        rank: newRank.tier,
      }).eq('id', pred.user_id)

      await supabase.from('notifications').insert({
        user_id: pred.user_id,
        type: 'prediction_resolved',
        question_id: questionId,
        is_correct: false,
        coins_won: 0,
        rep_delta: repDelta,
        message: `ทายพลาด ราคาจริง: ${finalPrice.toLocaleString('th-TH')}`,
      })
    }
  }

  // Resolve question
  await supabase.from('questions').update({
    status: 'resolved',
    correct_option: correctOption,
    resolved_at: now,
  }).eq('id', questionId)

  return { resolved: preds.length, paid: totalPaid, final_price: finalPrice }
}

function isAuthorized(req: Request): boolean {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: Request) {
  return handler(req)
}

export async function POST(req: Request) {
  return handler(req)
}

async function handler(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results: object[] = []

  // Find all open commodity questions that have passed closes_at
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, description, closes_at')
    .eq('status', 'open')
    .lte('closes_at', now.toISOString())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const commodityQuestions = (questions ?? []).filter(q => {
    try {
      const meta = JSON.parse(q.description ?? '{}')
      return meta.type === 'commodity'
    } catch { return false }
  })

  for (const q of commodityQuestions) {
    try {
      const meta = JSON.parse(q.description!)
      const finalPrice = await getCurrentPrice(meta.commodity)
      const correctOption = finalPrice > meta.threshold ? 'yes' : 'no'
      const result = await resolveQuestion(q.id, correctOption, finalPrice)
      results.push({ question_id: q.id, commodity: meta.commodity, ...result })
    } catch (err) {
      results.push({ question_id: q.id, error: String(err) })
    }
  }

  return NextResponse.json({ ok: true, resolved: results.length, results })
}
