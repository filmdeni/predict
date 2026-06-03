import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { payoutQuestion } from '@/lib/game/payout'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const LIQUIPEDIA_UA = 'PawanaPredict/1.0 (ichimoku857@gmail.com)'

// Known slug → full name (same map as seed route)
const TEAM_NAMES: Record<string, string> = {
  fs: 'WANIN Flash Wolves', bru: 'Buriram United Esports', solyx: 'Solyx',
  kog: 'Kong Gaming', tenacity: 'Tenacity', hd: 'HD Esports',
  ea: 'EVOS Esports', bac: 'BAC Esports', godji: 'Godji',
  talon: 'Talon Esports', bacon: 'Bacon Time', ig: 'Invictus Gaming', ts: 'True Sight',
}

function slugToName(slug: string): string {
  return TEAM_NAMES[slug.toLowerCase()] ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

async function getMatchWinner(
  pageRef: string,
  matchId: string, // format: "rov-slug1-slug2-YYYY-MM-DD"
): Promise<string | null> {
  const res = await fetch(
    `https://liquipedia.net/arenaofvalor/api.php?action=parse&page=${encodeURIComponent(pageRef)}&format=json&prop=wikitext`,
    { headers: { 'User-Agent': LIQUIPEDIA_UA, 'Accept-Encoding': 'gzip' }, next: { revalidate: 0 } }
  )
  const data = JSON.parse(await res.text())
  const wikitext: string = data?.parse?.wikitext?.['*'] ?? ''

  // Extract slugs from matchId: "rov-{slug1}-{slug2}-{date}"
  const parts = matchId.replace(/^rov-/, '').split('-')
  // Date is last 3 parts (YYYY-MM-DD), slugs are before that
  const dateParts = parts.slice(-3)
  const slugParts = parts.slice(0, -3)
  // slug1 and slug2 could themselves contain hyphens, but Liquipedia slugs are typically single words
  const slug1 = slugParts[0] ?? ''
  const slug2 = slugParts[1] ?? ''

  const matchBlocks = wikitext.split(/\|M\d+={{Match/)
  for (const block of matchBlocks.slice(1)) {
    const opp1 = block.match(/\|opponent1={{TeamOpponent\|([^\|}\n ]+)/)
    const opp2 = block.match(/\|opponent2={{TeamOpponent\|([^\|}\n ]+)/)
    const winner = block.match(/\|winner=(\d)/)
    if (!opp1 || !opp2 || !winner) continue

    // Exact slug match — no fuzzy matching
    if (opp1[1] !== slug1 || opp2[1] !== slug2) continue

    const winnerIdx = parseInt(winner[1])
    if (winnerIdx === 1) return slugToName(slug1)
    if (winnerIdx === 2) return slugToName(slug2)
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
    .from('questions').select('id, description, closes_at').eq('status', 'open')
    .lte('closes_at', new Date().toISOString())

  const rovQs = (questions ?? []).filter(q => {
    try { return JSON.parse(q.description ?? '{}').type === 'rov' } catch { return false }
  })

  const results = []
  for (const q of rovQs) {
    try {
      const meta = JSON.parse(q.description!)
      const winner = await getMatchWinner(meta.page_ref, meta.match_id)
      if (!winner) { results.push({ question_id: q.id, skipped: 'no result yet' }); continue }
      const paid = await payoutQuestion(supabase, q.id, winner, winner)
      results.push({ question_id: q.id, winner, paid })
    } catch (err) {
      results.push({ question_id: q.id, error: String(err) })
    }
  }

  return NextResponse.json({ ok: true, resolved: results.filter((r: any) => r.winner).length, results })
}
