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

// Map PandaScore videogame slug → category_id in our DB
const GAME_CATEGORY: Record<string, number> = {
  'cs-go':              30, // CS2
  'dota-2':             28, // Dota 2
  'valorant':           38, // Valorant
  'league-of-legends':  39, // LoL
  'mlbb':               37, // Mobile Legends
}

const GAME_LABEL: Record<string, string> = {
  'cs-go':              'CS2',
  'dota-2':             'Dota 2',
  'valorant':           'Valorant',
  'league-of-legends':  'LoL',
  'mlbb':               'MLBB',
}

const GAME_IMAGE: Record<string, string> = {
  'cs-go':             'https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg',
  'dota-2':            'https://cdn.akamai.steamstatic.com/steam/apps/570/header.jpg',
  'valorant':          '/images/valorant.png',
  'league-of-legends': '/images/lol.png',
  'mlbb':              '/images/mlbb.png',
}

interface PandaTeam {
  id: number
  name: string
  image_url: string | null
}

interface PandaMatch {
  id: number
  name: string
  begin_at: string
  end_at: string | null
  status: string
  match_type: string
  number_of_games: number
  videogame: { slug: string; name: string }
  opponents: { opponent: PandaTeam }[]
  league: { name: string } | null
  serie: { full_name: string } | null
  tournament: { name: string } | null
  streams_list: { raw_url: string; main: boolean }[]
}

async function fetchTodayMatches(): Promise<PandaMatch[]> {
  const games = Object.keys(GAME_CATEGORY).join(',')
  const res = await fetch(
    `https://api.pandascore.co/matches/upcoming?per_page=20&filter[videogame]=${games}`,
    {
      headers: { Authorization: `Bearer ${process.env.PANDASCORE_TOKEN}` },
      next: { revalidate: 0 },
    }
  )
  if (!res.ok) throw new Error(`PandaScore error: ${res.status}`)
  const all: PandaMatch[] = await res.json()

  // Only matches starting within next 24h
  const now = Date.now()
  const in24h = now + 24 * 60 * 60 * 1000
  return all.filter(m => {
    const t = new Date(m.begin_at).getTime()
    return t >= now && t <= in24h && m.opponents.length === 2
  })
}

async function alreadySeeded(matchId: number): Promise<boolean> {
  const { data } = await supabase
    .from('questions')
    .select('id')
    .ilike('description', `%"match_id":${matchId}%`)
    .limit(1)
  return (data?.length ?? 0) > 0
}

async function seedMockPredictions(questionId: string, teamAId: string, teamBId: string) {
  const bets = BOT_USER_IDS.map((userId, i) => ({
    question_id: questionId,
    user_id: userId,
    option_id: Math.random() < 0.5 ? teamAId : teamBId,
    coins_wagered: BOT_WAGERS[i],
  }))

  const poolA = bets.filter(b => b.option_id === teamAId).reduce((s, b) => s + b.coins_wagered, 0)
  const poolB = bets.filter(b => b.option_id === teamBId).reduce((s, b) => s + b.coins_wagered, 0)
  const total = poolA + poolB

  await supabase.from('predictions').insert(
    bets.map(b => ({
      ...b,
      odds_at_time: b.option_id === teamAId
        ? (poolA > 0 ? total / poolA : 1)
        : (poolB > 0 ? total / poolB : 1),
    }))
  )

  await supabase
    .from('questions')
    .update({
      pool: { [teamAId]: poolA, [teamBId]: poolB },
      total_pool: total,
      predictions_count: bets.length,
    })
    .eq('id', questionId)
}

function isAuthorized(req: Request): boolean {
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: Request) { return handler(req) }
export async function POST(req: Request) { return handler(req) }

async function handler(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const matches = await fetchTodayMatches()
  const results: object[] = []

  for (const match of matches) {
    try {
      if (await alreadySeeded(match.id)) {
        results.push({ match_id: match.id, skipped: 'already seeded' })
        continue
      }

      const gameSlug = match.videogame.slug
      const categoryId = GAME_CATEGORY[gameSlug] ?? 2
      const gameLabel = GAME_LABEL[gameSlug] ?? match.videogame.name

      const teamA = match.opponents[0].opponent
      const teamB = match.opponents[1].opponent
      const optionA = String(teamA.id)
      const optionB = String(teamB.id)

      // closes_at = match begin + 3h buffer for result
      const closesAt = new Date(new Date(match.begin_at).getTime() + 3 * 60 * 60 * 1000)

      const { data: q, error } = await supabase
        .from('questions')
        .insert({
          category_id: categoryId,
          created_by: BOT_USER_IDS[0],
          title: `[${gameLabel}] ${teamA.name} vs ${teamB.name} — ใครชนะ?`,
          description: JSON.stringify({
            type: 'esports',
            match_id: match.id,
            game: gameSlug,
            team_a: { id: teamA.id, name: teamA.name },
            team_b: { id: teamB.id, name: teamB.name },
            league: match.league?.name ?? null,
            serie: match.serie?.full_name ?? null,
            tournament: match.tournament?.name ?? null,
            number_of_games: match.number_of_games ?? null,
            stream_url: match.streams_list?.find(s => s.main)?.raw_url
              ?? match.streams_list?.[0]?.raw_url
              ?? null,
          }),
          options: [
            { id: optionA, label: teamA.name, icon_url: teamA.image_url ?? undefined },
            { id: optionB, label: teamB.name, icon_url: teamB.image_url ?? undefined },
          ],
          image_url: GAME_IMAGE[gameSlug] ?? null,
          closes_at: closesAt.toISOString(),
          card_style: 'bars',
        })
        .select('id')
        .single()

      if (error) throw error
      await seedMockPredictions(q.id, optionA, optionB)
      results.push({ match_id: match.id, question_id: q.id, game: gameSlug, match: match.name })
    } catch (err) {
      results.push({ match_id: match.id, error: String(err) })
    }
  }

  return NextResponse.json({ ok: true, seeded: results.filter((r: any) => r.question_id).length, results })
}
