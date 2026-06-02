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
  { slug: 'eng.1',   name: 'Premier League', category_id: 22, image: 'https://a.espncdn.com/i/teamlogos/leagues/500/eng.1.png' },
  { slug: 'esp.1',   name: 'La Liga',        category_id: 22, image: 'https://a.espncdn.com/i/teamlogos/leagues/500/esp.1.png' },
  { slug: 'tha.1',   name: 'ไทยลีก',         category_id: 22, image: 'https://a.espncdn.com/i/teamlogos/leagues/500/tha.1.png' },
  { slug: 'fra.1',   name: 'Ligue 1',        category_id: 22, image: 'https://a.espncdn.com/i/teamlogos/leagues/500/fra.1.png' },
  { slug: 'ger.1',   name: 'Bundesliga',     category_id: 22, image: 'https://a.espncdn.com/i/teamlogos/leagues/500/ger.1.png' },
  { slug: 'ita.1',   name: 'Serie A',        category_id: 22, image: 'https://a.espncdn.com/i/teamlogos/leagues/500/ita.1.png' },
  { slug: 'uefa.champions_league', name: 'UCL', category_id: 22, image: 'https://a.espncdn.com/i/teamlogos/leagues/500/uefa.champions_league.png' },
  { slug: 'nba',     name: 'NBA',            category_id: 24, sport: 'basketball', image: 'https://a.espncdn.com/i/teamlogos/leagues/500/nba.png' },
  { slug: 'ufc',     name: 'UFC',            category_id: 23, sport: 'mma',        image: 'https://a.espncdn.com/i/teamlogos/leagues/500/ufc.png' },
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

  // MMA: flatten individual fights from competitions[]
  if (sport === 'mma') {
    const events: ESPNEvent[] = []
    for (const ev of data.events ?? []) {
      const eventName: string = ev.name ?? ''
      const venue: string = ev.venues?.[0]?.fullName ?? ''
      const broadcast: string = ev.competitions?.[0]?.broadcast ?? ''
      for (const comp of ev.competitions ?? []) {
        const fighters = (comp.competitors ?? []).map((c: any) => ({
          team: {
            id: c.athlete?.id ?? c.id,
            displayName: c.athlete?.displayName ?? c.id,
            logo: c.athlete?.flag?.href ?? null,
            record: c.records?.[0]?.summary ?? null,
          },
          homeAway: c.order === 1 ? 'home' : 'away',
          winner: c.winner,
          score: c.score,
        }))
        if (fighters.length === 2) {
          events.push({
            id: comp.id,
            date: comp.date ?? ev.date,
            competitions: [{
              status: comp.status,
              competitors: fighters,
              // @ts-ignore extra fields
              weight_class: comp.type?.abbreviation ?? null,
              event_name: eventName,
              venue,
              broadcast,
            }],
          })
        }
      }
    }
    return events
  }

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

async function seedMockPredictions(questionId: string, optA: string, optB: string, optDraw: string | null) {
  const bets = BOT_USER_IDS.map((userId, i) => {
    const r = Math.random()
    let option_id: string
    if (optDraw) {
      option_id = r < 0.45 ? optA : r < 0.80 ? optB : optDraw
    } else {
      option_id = r < 0.5 ? optA : optB
    }
    return { question_id: questionId, user_id: userId, option_id, coins_wagered: BOT_WAGERS[i] }
  })

  const pool: Record<string, number> = optDraw
    ? { [optA]: 0, [optB]: 0, [optDraw]: 0 }
    : { [optA]: 0, [optB]: 0 }
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
        const optA    = teamA.team.id
        const optB    = teamB.team.id
        const isMMA   = league.sport === 'mma'
        const optDraw = 'draw'

        const closesAt = new Date(new Date(event.date).getTime() + (isMMA ? 4 : 2.5) * 60 * 60 * 1000)

        const options = isMMA
          ? [
              { id: optA, label: teamA.team.displayName, icon_url: teamA.team.logo ?? null },
              { id: optB, label: teamB.team.displayName, icon_url: teamB.team.logo ?? null },
            ]
          : [
              { id: optA,    label: teamA.team.displayName, icon_url: teamA.team.logo ?? null },
              { id: optB,    label: teamB.team.displayName, icon_url: teamB.team.logo ?? null },
              { id: optDraw, label: 'เสมอ' },
            ]

        const { data: q, error } = await supabase.from('questions').insert({
          category_id: league.category_id,
          created_by: BOT_USER_IDS[0],
          title: `[${league.name}] ${teamA.team.displayName} vs ${teamB.team.displayName} — ใครชนะ?`,
          description: JSON.stringify({
            type: 'sports',
            event_id: event.id,
            league: league.slug,
            league_name: league.name,
            team_a: { id: optA, name: teamA.team.displayName, record: (teamA.team as any).record ?? null },
            team_b: { id: optB, name: teamB.team.displayName, record: (teamB.team as any).record ?? null },
            // @ts-ignore
            weight_class: comp.weight_class ?? null,
            // @ts-ignore
            event_name: comp.event_name ?? null,
            // @ts-ignore
            venue: comp.venue ?? null,
            // @ts-ignore
            broadcast: comp.broadcast ?? null,
          }),
          image_url: league.image ?? null,
          options,
          closes_at: closesAt.toISOString(),
          card_style: 'bars',
        }).select('id').single()

        if (error) throw error
        await seedMockPredictions(q.id, optA, optB, isMMA ? null : optDraw)
        results.push({ event_id: event.id, question_id: q.id, league: league.slug, match: `${teamA.team.displayName} vs ${teamB.team.displayName}` })
      }
    } catch (err) {
      results.push({ league: league.slug, error: String(err) })
    }
  }

  return NextResponse.json({ ok: true, seeded: results.filter((r: any) => r.question_id).length, results })
}
