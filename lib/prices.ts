export interface PriceData {
  gold: number
  diesel: number
  gasohol91: number
  gasohol95: number
  e20: number
  updatedAt: string
}

export async function fetchGold(): Promise<number> {
  const [goldRes, fxRes] = await Promise.all([
    fetch('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 1800 },
    }),
    fetch('https://query1.finance.yahoo.com/v8/finance/chart/USDTHB=X?interval=1d&range=1d', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 1800 },
    }),
  ])
  const [goldData, fxData] = await Promise.all([goldRes.json(), fxRes.json()])
  const ozUSD: number = goldData.chart.result[0].meta.regularMarketPrice
  const usdThb: number = fxData.chart.result[0].meta.regularMarketPrice
  return Math.round(ozUSD * usdThb * (15.244 / 31.1035))
}

export async function fetchThaiOil(): Promise<{ diesel: number; gasohol91: number; gasohol95: number; e20: number }> {
  const res = await fetch('https://www.pttor.com/th/oil-price', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'th,en;q=0.9',
    },
    next: { revalidate: 3600 },
  })
  const html = await res.text()
  const match = html.match(/latestFallbackPrices\s*=\s*(\{.+?\});/)
  if (!match) throw new Error('PTT parse failed')
  const prices: Record<string, { price: number }> = JSON.parse(match[1])
  return {
    diesel: prices['ดีเซล']?.price,
    gasohol91: prices['เบนซินแก๊สโซฮอล์ 91']?.price,
    gasohol95: prices['เบนซินแก๊สโซฮอล์ 95']?.price,
    e20: prices['เบนซินแก๊สโซฮอล์ E20']?.price,
  }
}

export async function fetchWTI(): Promise<number> {
  const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/CL=F?interval=1d&range=1d', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 1800 },
  })
  const data = await res.json()
  return data.chart.result[0].meta.regularMarketPrice as number
}

export async function fetchAllPrices(): Promise<PriceData> {
  const [gold, thaiOil] = await Promise.all([fetchGold(), fetchThaiOil()])
  const now = new Date().toLocaleTimeString('th-TH', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok',
  })
  return {
    gold,
    diesel: thaiOil.diesel,
    gasohol91: thaiOil.gasohol91,
    gasohol95: thaiOil.gasohol95,
    e20: thaiOil.e20,
    updatedAt: now,
  }
}
