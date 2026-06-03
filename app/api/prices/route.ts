import { NextResponse } from 'next/server'
import { fetchAllPrices } from '@/lib/prices'

export type { PriceData } from '@/lib/prices'

export async function GET() {
  try {
    const data = await fetchAllPrices()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
