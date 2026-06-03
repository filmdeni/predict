import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { payoutQuestion } from '@/lib/game/payout'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const LIQUIPEDIA_UA = 'PawanaPredict/1.0 (ichimoku857@gmail.com)'

async function getTournamentWinner(page: string, options: { id: string }[]): Promise<string | null> {
  const qs = new URLSearchParams({ action: 'parse', page: page.replace(/ /g, '_'), prop: 'wikitext', format: 'json' })
  const res = await fetch(`https://liquipedia.net/pubg/api.php?${qs}`, {
    headers: { 'User-Agent': LIQUIPEDIA_UA, 'Accept-Encoding': 'gzip' },
    next: { revalidate: 0 },
  })
  const data = JSON.parse(await res.text())
  const wikitext: string = data?.parse?.wikitext?.['*'] ?? ''

  // Find 1st place team name from placement table
  const place1 = wikitext.match(/\|place\s*=\s*1[^\d][^\n]*\n(?:[^\n]*\n){0,5}[\s\S]*?team\s*=\s*([^\|\n}]+)/)
  if (place1) {
    const winnerName = place1[1].trim()
    // Match against seeded option IDs (team names)
    const match = options.find(o => o.id.toLowerCase() === winnerName.toLowerCase())
    return match?.id ?? winnerName
  }

  // Fallback: look for winner in final match block
  const winnerBlock = wikitext.match(/Grand[_ ]Finals[\s\S]{0,2000}?\|winner\s*=\s*([^\|\n}]+)/)
  if (winnerBlock) {
    const winnerName = winnerBlock[1].trim()
    const match = options.find(o => o.id.toLowerCase() === winnerName.toLowerCase())
    return match?.id ?? null
  }

  return null
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: Request) { return handler(req) }
export async function POST(req: Request) { return handler(req) }

async function handler(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: questions } = await supabase
    .from('questions').select('id, description, options, closes_at').eq('status', 'open')
    .lte('closes_at', new Date().toISOString())

  const pubgQs = (questions ?? []).filter(q => {
    try { return JSON.parse(q.description ?? '{}').type === 'pubg_tournament' } catch { return false }
  })

  const results = []
  for (const q of pubgQs) {
    try {
      const meta = JSON.parse(q.description!)
      const options = (q.options as { id: string }[]) ?? []
      const winner = await getTournamentWinner(meta.tournament_page, options)
      if (!winner) { results.push({ question_id: q.id, skipped: 'tournament not finished yet' }); continue }
      const paid = await payoutQuestion(supabase, q.id, winner, winner)
      results.push({ question_id: q.id, winner, paid })
    } catch (err) {
      results.push({ question_id: q.id, error: String(err) })
    }
  }

  return NextResponse.json({ ok: true, resolved: results.filter((r: any) => r.winner).length, results })
}
