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

interface ThaiOilPrices {
  diesel: number   // ดีเซล B7
  gasohol95: number // แก๊สโซฮอล 95 E10
}

async function fetchThaiOilPrices(): Promise<ThaiOilPrices> {
  // PTT embeds a JS variable `latestFallbackPrices` with all current retail prices
  const res = await fetch('https://www.pttor.com/th/oil-price', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'th,en;q=0.9',
    },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`PTT fetch error: ${res.status}`)
  const html = await res.text()

  const match = html.match(/latestFallbackPrices\s*=\s*(\{.+?\});/)
  if (!match) throw new Error('Cannot find latestFallbackPrices in PTT page')

  const prices: Record<string, { price: number }> = JSON.parse(match[1])

  // "ดีเซล" = Diesel B7 (standard diesel, most-used), "เบนซินแก๊สโซฮอล์ 95" = Gasohol 95
  const diesel = prices['ดีเซล']?.price
  const gasohol95 = prices['เบนซินแก๊สโซฮอล์ 95']?.price

  if (!diesel || !gasohol95) throw new Error('Missing price keys in PTT data')

  return { diesel, gasohol95 }
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step
}

const US_STOCKS = [
  { ticker: 'NVDA',  label: 'Nvidia',    step: 5,   logo: 'https://www.google.com/s2/favicons?sz=64&domain=nvidia.com' },
  { ticker: 'AAPL',  label: 'Apple',     step: 5,   logo: 'https://www.google.com/s2/favicons?sz=64&domain=apple.com' },
  { ticker: 'MSFT',  label: 'Microsoft', step: 5,   logo: 'https://www.google.com/s2/favicons?sz=64&domain=microsoft.com' },
  { ticker: 'TSLA',  label: 'Tesla',     step: 10,  logo: 'https://www.google.com/s2/favicons?sz=64&domain=tesla.com' },
  { ticker: 'AMZN',  label: 'Amazon',    step: 5,   logo: 'https://www.google.com/s2/favicons?sz=64&domain=amazon.com' },
  { ticker: 'META',  label: 'Meta',      step: 5,   logo: 'https://www.google.com/s2/favicons?sz=64&domain=meta.com' },
  { ticker: 'GOOGL', label: 'Google',    step: 5,   logo: 'https://www.google.com/s2/favicons?sz=64&domain=google.com' },
]

interface StockQuote {
  price: number
  previousClose: number
  dayHigh: number
  dayLow: number
  week52High: number
  week52Low: number
  volume: number
  name: string
}

async function fetchStockQuote(ticker: string): Promise<StockQuote> {
  const res = await fetch(
    `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5d`,
    { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 0 } }
  )
  if (!res.ok) throw new Error(`Yahoo Finance error for ${ticker}: ${res.status}`)
  const data = await res.json()
  const meta = data.chart.result[0].meta
  return {
    price: meta.regularMarketPrice,
    previousClose: meta.chartPreviousClose,
    dayHigh: meta.regularMarketDayHigh,
    dayLow: meta.regularMarketDayLow,
    week52High: meta.fiftyTwoWeekHigh,
    week52Low: meta.fiftyTwoWeekLow,
    volume: meta.regularMarketVolume,
    name: meta.shortName ?? ticker,
  }
}

function isUSMarketOpen(): boolean {
  const now = new Date()
  // NYSE: Mon-Fri 09:30-16:00 ET (13:30-20:00 UTC)
  const dayUTC = now.getUTCDay() // 0=Sun, 6=Sat
  if (dayUTC === 0 || dayUTC === 6) return false
  const hUTC = now.getUTCHours() * 60 + now.getUTCMinutes()
  return hUTC >= 13 * 60 + 30 && hUTC < 20 * 60
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
        image_url: 'https://www.google.com/s2/favicons?sz=64&domain=gold.org',
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
        image_url: 'https://www.google.com/s2/favicons?sz=64&domain=cmegroup.com',
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

  // ---- Thai Oil (Diesel B7 + Gasohol 95) ----
  // PTT announces new prices daily at midnight Bangkok time
  // question closes next midnight Bangkok (17:00 UTC)
  try {
    const [dieselDone, gasohol95Done] = await Promise.all([
      alreadySeededToday('oil_diesel_th'),
      alreadySeededToday('oil_gasohol95_th'),
    ])

    if (dieselDone && gasohol95Done) {
      results.push({ type: 'thai_oil', skipped: 'already seeded today' })
    } else {
      const thaiOil = await fetchThaiOilPrices()

      // closes next midnight Bangkok = 17:00 UTC today
      const oilClosesAt = new Date(now)
      oilClosesAt.setUTCHours(17, 0, 0, 0)
      if (oilClosesAt <= now) oilClosesAt.setUTCDate(oilClosesAt.getUTCDate() + 1)

      // Diesel B7
      if (!dieselDone) {
        const dieselThreshold = roundToStep(thaiOil.diesel, 0.5)
        const { data: qd, error: ed } = await supabase
          .from('questions')
          .insert({
            category_id: 3,
            created_by: BOT_USER_IDS[2],
            title: `ดีเซล B7 ${dateLabel} ราคาจะสูงกว่า ${dieselThreshold.toFixed(2)} บาท/ลิตร ไหม?`,
            description: JSON.stringify({
              type: 'commodity', commodity: 'oil_diesel_th',
              threshold: dieselThreshold, unit: 'บาท/ลิตร', seed_price: thaiOil.diesel,
              source: 'ptt',
            }),
            image_url: 'https://www.google.com/s2/favicons?sz=64&domain=pttor.com',
            options: [
              { id: 'yes', label: `ใช่ สูงกว่า ${dieselThreshold.toFixed(2)} บาท` },
              { id: 'no',  label: `ไม่ถึง ${dieselThreshold.toFixed(2)} บาท` },
            ],
            closes_at: oilClosesAt.toISOString(),
            card_style: 'gauge',
          })
          .select('id')
          .single()

        if (ed) throw ed
        await seedMockPredictions(qd.id, thaiOil.diesel, dieselThreshold)
        results.push({ type: 'oil_diesel_th', question_id: qd.id, price: thaiOil.diesel, threshold: dieselThreshold })
      }

      // Gasohol 95 E10
      if (!gasohol95Done) {
        const g95Threshold = roundToStep(thaiOil.gasohol95, 0.5)
        const { data: qg, error: eg } = await supabase
          .from('questions')
          .insert({
            category_id: 3,
            created_by: BOT_USER_IDS[3],
            title: `แก๊สโซฮอล 95 ${dateLabel} ราคาจะสูงกว่า ${g95Threshold.toFixed(2)} บาท/ลิตร ไหม?`,
            description: JSON.stringify({
              type: 'commodity', commodity: 'oil_gasohol95_th',
              threshold: g95Threshold, unit: 'บาท/ลิตร', seed_price: thaiOil.gasohol95,
              source: 'ptt',
            }),
            image_url: 'https://www.google.com/s2/favicons?sz=64&domain=pttor.com',
            options: [
              { id: 'yes', label: `ใช่ สูงกว่า ${g95Threshold.toFixed(2)} บาท` },
              { id: 'no',  label: `ไม่ถึง ${g95Threshold.toFixed(2)} บาท` },
            ],
            closes_at: oilClosesAt.toISOString(),
            card_style: 'gauge',
          })
          .select('id')
          .single()

        if (eg) throw eg
        await seedMockPredictions(qg.id, thaiOil.gasohol95, g95Threshold)
        results.push({ type: 'oil_gasohol95_th', question_id: qg.id, price: thaiOil.gasohol95, threshold: g95Threshold })
      }
    }
  } catch (err) {
    results.push({ type: 'thai_oil', error: String(err) })
  }

  // ---- US Stocks ----
  // Only seed on weekdays; skip if market is closed (weekend)
  const dayUTC = now.getUTCDay()
  if (dayUTC !== 0 && dayUTC !== 6) {
    // US market closes 20:00 UTC — question closes then
    const stockClosesAt = new Date(now)
    stockClosesAt.setUTCHours(20, 0, 0, 0)
    if (stockClosesAt <= now) stockClosesAt.setUTCDate(stockClosesAt.getUTCDate() + 1)

    for (const stock of US_STOCKS) {
      try {
        if (await alreadySeededToday(`stock_${stock.ticker}`)) {
          results.push({ type: stock.ticker, skipped: 'already seeded today' })
          continue
        }

        const quote = await fetchStockQuote(stock.ticker)
        const threshold = roundToStep(quote.price, stock.step)

        const { data: q, error } = await supabase
          .from('questions')
          .insert({
            category_id: 3,
            created_by: BOT_USER_IDS[0],
            title: `${stock.label} (${stock.ticker}) ${dateLabel} ราคาปิดจะสูงกว่า $${threshold.toFixed(2)} ไหม?`,
            description: JSON.stringify({
              type: 'commodity',
              commodity: `stock_${stock.ticker}`,
              ticker: stock.ticker,
              name: quote.name,
              threshold,
              unit: 'USD',
              seed_price: quote.price,
              previous_close: quote.previousClose,
              day_high: quote.dayHigh,
              day_low: quote.dayLow,
              week52_high: quote.week52High,
              week52_low: quote.week52Low,
              volume: quote.volume,
            }),
            image_url: stock.logo,
            options: [
              { id: 'yes', label: `ใช่ สูงกว่า $${threshold.toFixed(2)}` },
              { id: 'no',  label: `ไม่ถึง ต่ำกว่า $${threshold.toFixed(2)}` },
            ],
            closes_at: stockClosesAt.toISOString(),
            card_style: 'gauge',
          })
          .select('id')
          .single()

        if (error) throw error
        await seedMockPredictions(q.id, quote.price, threshold)
        results.push({ type: stock.ticker, question_id: q.id, price: quote.price, threshold })
      } catch (err) {
        results.push({ type: stock.ticker, error: String(err) })
      }
    }
  }

  return NextResponse.json({ ok: true, results })
}
