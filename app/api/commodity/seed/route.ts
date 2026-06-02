import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Mock bot user IDs (sequential UUIDs seeded in DB)
const BOT_USER_IDS = [
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0001-000000000002',
  '00000000-0000-0000-0001-000000000003',
  '00000000-0000-0000-0001-000000000004',
  '00000000-0000-0000-0001-000000000005',
]

// Mock wager amounts per bot
const BOT_WAGERS = [80, 120, 60, 100, 150]

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
  // Convert: 1 troy oz = 31.1035g; 1 baht weight = 15.244g
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

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step
}

async function seedMockPredictions(questionId: string, currentPrice: number, threshold: number) {
  // Bots lean slightly toward the more likely side based on current price vs threshold
  const leanYes = currentPrice >= threshold ? 0.65 : 0.35
  const bets = BOT_USER_IDS.map((userId, i) => ({
    question_id: questionId,
    user_id: userId,
    option_id: Math.random() < leanYes ? 'yes' : 'no',
    coins_wagered: BOT_WAGERS[i],
  }))

  const poolYes = bets.filter(b => b.option_id === 'yes').reduce((s, b) => s + b.coins_wagered, 0)
  const poolNo = bets.filter(b => b.option_id === 'no').reduce((s, b) => s + b.coins_wagered, 0)
  const total = poolYes + poolNo

  await supabase.from('predictions').insert(
    bets.map(b => ({
      ...b,
      odds_at_time: b.option_id === 'yes'
        ? (poolYes > 0 ? total / poolYes : 0)
        : (poolNo > 0 ? total / poolNo : 0),
    }))
  )

  await supabase
    .from('questions')
    .update({ pool: { yes: poolYes, no: poolNo }, total_pool: total, predictions_count: bets.length })
    .eq('id', questionId)
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
  const dateLabel = now.toLocaleDateString('th-TH', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok',
  })
  const results: object[] = []

  // Helper: check if a commodity question already exists today
  async function alreadySeededToday(commodity: string): Promise<boolean> {
    const startOfDay = new Date(now)
    startOfDay.setUTCHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('questions')
      .select('id')
      .gte('created_at', startOfDay.toISOString())
      .ilike('description', `%"commodity":"${commodity}"%`)
      .limit(1)
    return (data?.length ?? 0) > 0
  }

  // ---- Gold ----
  try {
    if (await alreadySeededToday('gold')) {
      results.push({ type: 'gold', skipped: 'already seeded today' })
    } else {
    const goldPrice = await fetchGoldPricePerBahtWeight()
    const threshold = roundToStep(goldPrice, 500)

    // closes 16:30 Bangkok (09:30 UTC)
    const closesAt = new Date(now)
    closesAt.setUTCHours(9, 30, 0, 0)
    if (closesAt <= now) closesAt.setUTCDate(closesAt.getUTCDate() + 1)

    const { data: q, error } = await supabase
      .from('questions')
      .insert({
        category_id: 3,
        created_by: BOT_USER_IDS[0],
        title: `ทองคำ ${dateLabel} ราคาปิดจะสูงกว่า ${threshold.toLocaleString('th-TH')} บาท/บาทหนัก ไหม?`,
        description: JSON.stringify({
          type: 'commodity', commodity: 'gold',
          threshold, unit: 'บาท/บาทหนัก', seed_price: goldPrice,
        }),
        options: [
          { id: 'yes', label: `ใช่ สูงกว่า ${threshold.toLocaleString('th-TH')} บาท` },
          { id: 'no',  label: `ไม่ถึง ต่ำกว่า ${threshold.toLocaleString('th-TH')} บาท` },
        ],
        closes_at: closesAt.toISOString(),
        card_style: 'gauge',
      })
      .select('id')
      .single()

    if (error) throw error
    await seedMockPredictions(q.id, goldPrice, threshold)
    results.push({ type: 'gold', question_id: q.id, price: goldPrice, threshold })
    }
  } catch (err) {
    results.push({ type: 'gold', error: String(err) })
  }

  // ---- Oil WTI ----
  try {
    if (await alreadySeededToday('oil_wti')) {
      results.push({ type: 'oil', skipped: 'already seeded today' })
    } else {
    const oilPrice = await fetchOilWTI()
    const threshold = roundToStep(oilPrice, 1)

    // closes 23:00 Bangkok (16:00 UTC)
    const closesAt = new Date(now)
    closesAt.setUTCHours(16, 0, 0, 0)
    if (closesAt <= now) closesAt.setUTCDate(closesAt.getUTCDate() + 1)

    const { data: q, error } = await supabase
      .from('questions')
      .insert({
        category_id: 3,
        created_by: BOT_USER_IDS[1],
        title: `น้ำมัน WTI ${dateLabel} ราคาปิดจะสูงกว่า $${threshold.toFixed(2)} ต่อบาร์เรล ไหม?`,
        description: JSON.stringify({
          type: 'commodity', commodity: 'oil_wti',
          threshold, unit: 'USD/barrel', seed_price: oilPrice,
        }),
        options: [
          { id: 'yes', label: `ใช่ สูงกว่า $${threshold.toFixed(2)}` },
          { id: 'no',  label: `ไม่ถึง ต่ำกว่า $${threshold.toFixed(2)}` },
        ],
        closes_at: closesAt.toISOString(),
        card_style: 'gauge',
      })
      .select('id')
      .single()

    if (error) throw error
    await seedMockPredictions(q.id, oilPrice, threshold)
    results.push({ type: 'oil', question_id: q.id, price: oilPrice, threshold })
    }
  } catch (err) {
    results.push({ type: 'oil', error: String(err) })
  }

  return NextResponse.json({ ok: true, results })
}
