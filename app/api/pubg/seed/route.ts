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

const PUBG_CATEGORY_ID = 45
const LIQUIPEDIA_UA = 'PawanaPredict/1.0 (ichimoku857@gmail.com)'

async function liquipediaSearch(wiki: string, query: string): Promise<string[]> {
  const qs = new URLSearchParams({ action: 'query', list: 'search', srsearch: query, srlimit: '10', format: 'json' })
  const res = await fetch(`https://liquipedia.net/${wiki}/api.php?${qs}`, {
    headers: { 'User-Agent': LIQUIPEDIA_UA, 'Accept-Encoding': 'gzip' },
    next: { revalidate: 0 },
  })
  const data = JSON.parse(await res.text())
  return (data?.query?.search ?? []).map((r: { title: string }) => r.title)
}

async function liquipediaWikitext(wiki: string, page: string): Promise<string> {
  const qs = new URLSearchParams({ action: 'parse', page, prop: 'wikitext', format: 'json' })
  const res = await fetch(`https://liquipedia.net/${wiki}/api.php?${qs}`, {
    headers: { 'User-Agent': LIQUIPEDIA_UA, 'Accept-Encoding': 'gzip' },
    next: { revalidate: 0 },
  })
  const data = JSON.parse(await res.text())
  return data?.parse?.wikitext?.['*'] ?? ''
}

interface PubgTournament {
  page: string
  name: string
  startDate: Date
  endDate: Date
  teams: string[]
}

async function findUpcomingTournaments(): Promise<PubgTournament[]> {
  const year = new Date().getFullYear()
  const pages = await liquipediaSearch('pubg', `PUBG Global Series ${year}`)
  const seriesPages = pages.filter(p => p.includes('Series Final') || p.includes('Grand Finals'))

  const tournaments: PubgTournament[] = []
  for (const page of seriesPages.slice(0, 4)) {
    const wikitext = await liquipediaWikitext('pubg', page.replace(/ /g, '_'))
    if (!wikitext) continue

    // Extract dates (sdate/edate format used by Liquipedia PUBG)
    const sdate = wikitext.match(/\|sdate\s*=\s*([\d-]+)/)
    const edate = wikitext.match(/\|edate\s*=\s*([\d-]+)/)
    if (!sdate) continue
    const startDate = new Date(sdate[1])
    const endDate = edate ? new Date(edate[1]) : new Date(startDate.getTime() + 3 * 86400000)
    if (isNaN(startDate.getTime())) continue

    // Only upcoming tournaments (start date in the future)
    if (startDate < new Date()) continue

    // Extract team names — filter out tbd/TBD placeholders
    const teamMatches = wikitext.matchAll(/\{\{Opponent\|([^\n|{}]+)/g)
    const teams = [...new Set([...teamMatches].map(m => m[1].trim()))]
      .filter(t => t.length > 1 && !['tbd', 'TBD'].includes(t))
      .slice(0, 16)

    // If teams not yet decided, use known PGS global partners as placeholder
    const finalTeams = teams.length >= 4 ? teams : [
      'Team Liquid', 'Twisted Minds', 'Petrichor Road', 'Made in Thailand',
      'The Expendables', 'CERBERUS Esports', 'Four Angry Men', '17 Gaming',
    ]

    const name = page.replace(/_/g, ' ')
    tournaments.push({ page, name, startDate, endDate, teams: finalTeams })
  }
  return tournaments
}

function isAuthorized(req: Request) {
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: Request) { return handler(req) }
export async function POST(req: Request) { return handler(req) }

async function handler(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tournaments = await findUpcomingTournaments()

  const { data: existing } = await supabase
    .from('questions').select('description').eq('category_id', PUBG_CATEGORY_ID)
  const existingRefs = new Set(
    (existing ?? []).map(q => { try { return JSON.parse(q.description ?? '{}').tournament_page } catch { return null } }).filter(Boolean)
  )

  const results = []

  for (const t of tournaments) {
    if (existingRefs.has(t.page)) { results.push({ skipped: t.page, reason: 'already seeded' }); continue }

    const shortName = t.name.replace('PUBG Global Series/', 'PGS ').replace(/\//g, ' - ')
    const title = `ทีมไหนจะแชมป์ ${shortName}?`
    const options = t.teams.slice(0, 8).map(team => ({ id: team, label: team }))

    const description = JSON.stringify({
      type: 'pubg_tournament',
      tournament_page: t.page,
      tournament_name: t.name,
    })

    const { data: q, error } = await supabase.from('questions').insert({
      title,
      category_id: PUBG_CATEGORY_ID,
      options,
      closes_at: new Date(t.startDate.getTime() - 60 * 60 * 1000).toISOString(),
      status: 'open',
      created_by: BOT_USER_IDS[0],
      description,
      pool: {},
      total_pool: 0,
      predictions_count: 0,
      image_url: '/images/pubg.jpg',
    }).select('id').single()

    if (error || !q) { results.push({ error: error?.message, tournament: t.name }); continue }

    // Bot predictions spread across first 5 teams
    const bets = BOT_USER_IDS.map((userId, i) => ({
      question_id: q.id, user_id: userId,
      option_id: options[i % options.length].id,
      coins_wagered: BOT_WAGERS[i],
    }))
    const pool: Record<string, number> = {}
    let total = 0
    for (const b of bets) { pool[b.option_id] = (pool[b.option_id] ?? 0) + b.coins_wagered; total += b.coins_wagered }
    await supabase.from('predictions').insert(
      bets.map(b => ({ ...b, odds_at_time: pool[b.option_id] > 0 ? total / pool[b.option_id] : 1 }))
    )
    await supabase.from('questions').update({ pool, total_pool: total, predictions_count: bets.length }).eq('id', q.id)
    results.push({ question_id: q.id, tournament: t.name, teams: t.teams.length })
  }

  return NextResponse.json({ ok: true, seeded: results.filter((r: any) => r.question_id).length, results })
}
