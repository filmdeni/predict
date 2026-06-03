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

// Query GDELT for Thai news matching keywords (last 24h)
async function checkGDELT(keywords: string[]): Promise<boolean> {
  // GDELT GKG API: search for articles in Thai sources mentioning keywords
  // Uses the free GDELT 2.0 DOC API
  const query = keywords.map(k => `"${k}"`).join(' OR ')
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query + ' sourcelang:thai OR sourcelang:english domain:.th')}&mode=artlist&maxrecords=5&timespan=1440&format=json`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 0 },
    })
    if (!res.ok) return false
    const data = await res.json()
    return (data.articles?.length ?? 0) > 0
  } catch {
    return false
  }
}

async function resolveQuestion(questionId: string, correctOption: string, foundKeyword: boolean) {
  const now = new Date().toISOString()

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
    return { resolved: 0, paid: 0, found_news: foundKeyword }
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

    let coinsWon = 0
    let repDelta = 0

    if (isCorrect) {
      coinsWon = calcPayout(totalPool, winnerPool, pred.coins_wagered)
      repDelta = parseFloat((Math.log(coinsWon / Math.max(pred.coins_wagered, 1)) * 10 + 5).toFixed(2))
      repDelta = Math.max(1, repDelta)
    } else {
      repDelta = -3
    }

    await supabase.from('predictions').update({
      is_correct: isCorrect,
      coins_won: coinsWon,
      rep_delta: repDelta,
      resolved_at: now,
    }).eq('id', pred.id)

    if (isBot) continue

    if (isCorrect && coinsWon > 0) {
      const { data: user } = await supabase
        .from('users')
        .select('coins, reputation, correct_predictions, total_predictions, win_streak, best_streak')
        .eq('id', pred.user_id)
        .single()

      if (!user) continue

      const net = coinsWon - pred.coins_wagered
      const newCoins = user.coins + net
      const newRep = parseFloat((Number(user.reputation) + repDelta).toFixed(2))
      const newStreak = user.win_streak + 1
      const newBest = Math.max(user.best_streak, newStreak)
      const newRank = getRank(newRep)

      await supabase.from('users').update({
        coins: newCoins,
        reputation: newRep,
        correct_predictions: user.correct_predictions + 1,
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
        message: `ทายพลาด — ${foundKeyword ? 'พบข่าว' : 'ไม่พบข่าว'}ในวันนั้น`,
      })
    }
  }

  await supabase.from('questions').update({
    status: 'resolved',
    correct_option: correctOption,
    resolved_at: now,
  }).eq('id', questionId)

  return { resolved: preds.length, paid: totalPaid, found_news: foundKeyword }
}

function isAuthorized(req: Request): boolean {
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: Request) { return handler(req) }
export async function POST(req: Request) { return handler(req) }

async function handler(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const results: object[] = []

  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, description, closes_at')
    .eq('status', 'open')
    .lte('closes_at', now.toISOString())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const politicsQuestions = (questions ?? []).filter(q => {
    try {
      const meta = JSON.parse(q.description ?? '{}')
      return meta.type === 'politics'
    } catch { return false }
  })

  for (const q of politicsQuestions) {
    try {
      const meta = JSON.parse(q.description!)
      const keywords: string[] = meta.keywords ?? []
      const foundNews = await checkGDELT(keywords)
      const correctOption = foundNews ? 'yes' : 'no'
      const result = await resolveQuestion(q.id, correctOption, foundNews)
      results.push({ question_id: q.id, template_id: meta.template_id, correct: correctOption, ...result })
    } catch (err) {
      results.push({ question_id: q.id, error: String(err) })
    }
  }

  return NextResponse.json({ ok: true, resolved: results.length, results })
}
