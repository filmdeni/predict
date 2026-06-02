import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BOT_USER_IDS = [
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0001-000000000002',
  '00000000-0000-0000-0001-000000000003',
  '00000000-0000-0000-0001-000000000004',
  '00000000-0000-0000-0001-000000000005',
]
const BOT_WAGERS = [80, 120, 60, 100, 150]

const LEAGUES = [
  { slug: 'eng.1',   name: 'Premier League',     category_id: 22 },
  { slug: 'esp.1',   name: 'La Liga',             category_id: 22 },
  { slug: 'tha.1',   name: 'ไทยลีก',              category_id: 22 },
  { slug: 'fra.1',   name: 'Ligue 1',             category_id: 22 },
  { slug: 'ger.1',   name: 'Bundesliga',          category_id: 22 },
  { slug: 'ita.1',   name: 'Serie A',             category_id: 22 },
  { slug: 'uefa.champions_league', name: 'UCL',   category_id: 22 },
  { slug: 'nba',     name: 'NBA',                 category_id: 24, sport: 'basketball' },
]

interface ESPNTeam {
  id: string
  displayName: string
  logo?: string
}

interface ESPNEvent {
  id: string
  date: string
  competitions: {
    status: { type: { name: string; completed: boolean } }
    competitors: { team: ESPNTeam; homeAway: string; winner?: boolean; score?: string }[]
  }[]
}

async function fetchEvents(league: typeof LEAGUES[number]): Promise<ESPNEvent[]> {
  const sport = league.sport ?? 'soccer'
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league.slug}/scoreboard`,
    { next: { revalidate: 0 } }
  )
  if (!res.ok) throw new Error(`ESPN error: ${res.status}`)
  const data = await res.json()
  return data.events ?? []
}

async function alreadySeeded(eventId: string): Promise<boolean> {
  const { data } = await supabase
    .from('questions')
    .select('id')
    .ilike('description', `%"event_id":"${eventId}"%`)
    .limit(1)
  return (data?.length ?? 0) > 0
}

async function seedMockPredictions(questionId: string, optA: string, optB: string, optDraw: string) {
  const opts = [optA, optB, optDraw]
  const bets = BOT_USER_IDS.map((userId, i) => {
    const r = Math.random()
    return {
      question_id: questionId,
      user_id: userId,
      option_id: r < 0.45 ? optA : r < 0.80 ? optB : optDraw,
      coins_wagered: BOT_WAGERS[i],
    }
  })

  const pool: Record<string, number> = { [optA]: 0, [optB]: 0, [optDraw]: 0 }
  bets.forEach(b => { pool[b.option_id] = (pool[b.option_id] ?? 0) + b.coins_wagered })
  const total = Object.values(pool).reduce((s, v) => s + v, 0)

  await supabase.from('predictions').insert(
    bets.map(b => ({
      ...b,
      odds_at_time: pool[b.option_id] > 0 ? total / pool[b.option_id] : 1,
    }))
  )

  await supabase.from('questions')
    .update({ pool, total_pool: total, predictions_count: bets.length })
    .eq('id', questionId)
}

function isAuthorized(req: Request) {
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: Request) { return handler(req) }
export async function POST(req: Request) { return handler(req) }

async function handler(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const results: object[] = []

  for (const league of LEAGUES) {
    try {
      const events = await fetchEvents(league)
      // Only upcoming (not completed)
      const upcoming = events.filter(e => {
        const comp = e.competitions[0]
        return !comp.status.type.completed && new Date(e.date).getTime() > Date.now()
      })

      for (const event of upcoming) {
        if (await alreadySeeded(event.id)) continue

        const comp = event.competitions[0]
        const [teamA, teamB] = comp.competitors
        const optA   = teamA.team.id
        const optB   = teamB.team.id
        const optDraw = 'draw'

        const closesAt = new Date(new Date(event.date).getTime() + 2.5 * 60 * 60 * 1000)

        const { data: q, error } = await supabase.from('questions').insert({
          category_id: league.category_id,
          created_by: BOT_USER_IDS[0],
          title: `[${league.name}] ${teamA.team.displayName} vs ${teamB.team.displayName} — ใครชนะ?`,
          description: JSON.stringify({
            type: 'sports',
            event_id: event.id,
            league: league.slug,
            league_name: league.name,
            team_a: { id: optA, name: teamA.team.displayName },
            team_b: { id: optB, name: teamB.team.displayName },
          }),
          options: [
            { id: optA,   label: teamA.team.displayName, icon_url: teamA.team.logo ?? null },
            { id: optB,   label: teamB.team.displayName, icon_url: teamB.team.logo ?? null },
            { id: optDraw, label: 'เสมอ' },
          ],
          closes_at: closesAt.toISOString(),
          card_style: 'bars',
        }).select('id').single()

        if (error) throw error
        await seedMockPredictions(q.id, optA, optB, optDraw)
        results.push({ event_id: event.id, question_id: q.id, league: league.slug, match: `${teamA.team.displayName} vs ${teamB.team.displayName}` })
      }
    } catch (err) {
      results.push({ league: league.slug, error: String(err) })
    }
  }

  return NextResponse.json({ ok: true, seeded: results.filter((r: any) => r.question_id).length, results })
}
