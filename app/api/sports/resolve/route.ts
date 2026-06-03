import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { payoutQuestion } from '@/lib/game/payout'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fetchResult(eventId: string, leagueSlug: string): Promise<{ correctOption: string | null; winnerName: string }> {
  const sport = leagueSlug === 'nba' ? 'basketball' : 'soccer'
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/${sport}/${leagueSlug}/summary?event=${eventId}`,
    { next: { revalidate: 0 } }
  )
  if (!res.ok) throw new Error(`ESPN error: ${res.status}`)
  const data = await res.json()
  const header = data.header?.competitions?.[0]
  if (!header) return { correctOption: null, winnerName: '' }
  if (!header.status?.type?.completed) return { correctOption: null, winnerName: '' }
  const competitors = header.competitors ?? []
  const winner = competitors.find((c: any) => c.winner)
  if (!winner) return { correctOption: 'draw', winnerName: 'เสมอ' }
  return { correctOption: winner.team?.id ?? winner.id, winnerName: winner.team?.displayName ?? '' }
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
      await payoutQuestion(supabase, q.id, correctOption, winnerName)
      results.push({ question_id: q.id, winner: winnerName })
    } catch (err) {
      results.push({ question_id: q.id, error: String(err) })
    }
  }

  return NextResponse.json({ ok: true, resolved: results.filter((r: any) => r.winner).length, results })
}
