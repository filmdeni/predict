import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { payoutQuestion } from '@/lib/game/payout'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fetchMatchResult(matchId: number): Promise<{ winnerId: number | null; status: string }> {
  const res = await fetch(`https://api.pandascore.co/matches/${matchId}`, {
    headers: { Authorization: `Bearer ${process.env.PANDASCORE_TOKEN}` },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`PandaScore error: ${res.status}`)
  const m = await res.json()
  return { winnerId: m.winner_id ?? null, status: m.status }
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
    .from('questions')
    .select('id, description, closes_at')
    .eq('status', 'open')
    .lte('closes_at', new Date().toISOString())

  const esportsQuestions = (questions ?? []).filter(q => {
    try { return JSON.parse(q.description ?? '{}').type === 'esports' } catch { return false }
  })

  const results: object[] = []

  for (const q of esportsQuestions) {
    try {
      const meta = JSON.parse(q.description!)
      const { winnerId, status } = await fetchMatchResult(meta.match_id)

      if (status !== 'finished' || !winnerId) {
        results.push({ question_id: q.id, skipped: `match status: ${status}` })
        continue
      }

      const correctOption = String(winnerId)
      const winnerName = winnerId === meta.team_a.id ? meta.team_a.name : meta.team_b.name
      const paid = await payoutQuestion(supabase, q.id, correctOption, winnerName)
      results.push({ question_id: q.id, winner: winnerName, paid })
    } catch (err) {
      results.push({ question_id: q.id, error: String(err) })
    }
  }

  return NextResponse.json({ ok: true, resolved: results.filter((r: any) => r.winner).length, results })
}
