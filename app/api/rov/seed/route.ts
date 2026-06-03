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

const ROV_CATEGORY_ID = 46
const LIQUIPEDIA_UA = 'PawanaPredict/1.0 (ichimoku857@gmail.com)'

// Known RoV Pro League team slugs → full names
const TEAM_NAMES: Record<string, string> = {
  fs:       'WANIN Flash Wolves',
  bru:      'Buriram United Esports',
  solyx:    'Solyx',
  kog:      'Kong Gaming',
  tenacity: 'Tenacity',
  hd:       'HD Esports',
  ea:       'EVOS Esports',
  bac:      'BAC Esports',
  godji:    'Godji',
  talon:    'Talon Esports',
  bacon:    'Bacon Time',
  ig:       'Invictus Gaming',
  ts:       'True Sight',
}

function slugToName(slug: string): string {
  return TEAM_NAMES[slug.toLowerCase()] ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

async function liquipediaFetch(wiki: string, params: Record<string, string>): Promise<string> {
  const qs = new URLSearchParams({ ...params, format: 'json' })
  const res = await fetch(`https://liquipedia.net/${wiki}/api.php?${qs}`, {
    headers: {
      'User-Agent': LIQUIPEDIA_UA,
      'Accept-Encoding': 'gzip',
    },
    next: { revalidate: 0 },
  })
  const text = await res.text()
  const data = JSON.parse(text)
  return data?.parse?.wikitext?.['*'] ?? ''
}

async function getCurrentSeasonPage(): Promise<string | null> {
  const year = new Date().getFullYear()
  const month = new Date().getMonth() + 1
  // Try current + next season in order
  const candidates = [
    `RoV_Pro_League/${year}/Fall/Group_Stage`,
    `RoV_Pro_League/${year}/Fall/Playoffs`,
    `RoV_Pro_League/${year}/Summer/Group_Stage`,
    `RoV_Pro_League/${year}/Summer/Playoffs`,
    `RoV_Pro_League/${year}/Winter/Group_Stage`,
    `RoV_Pro_League/${year}/Winter/Playoffs`,
    `RoV_Pro_League/${year + 1}/Winter/Group_Stage`,
  ]
  // Prefer current season based on month
  const currentSeason = month <= 4 ? 'Winter' : month <= 8 ? 'Summer' : 'Fall'
  const ordered = [
    `RoV_Pro_League/${year}/${currentSeason}/Group_Stage`,
    ...candidates.filter(c => !c.includes(`/${currentSeason}/`)),
  ]
  for (const page of ordered) {
    const wikitext = await liquipediaFetch('arenaofvalor', { action: 'parse', page, prop: 'wikitext' })
    if (wikitext.length > 200 && wikitext.includes('TeamOpponent')) return page
  }
  return null
}

interface RovMatch {
  team1: string
  team2: string
  date: Date
  bestof: number
  pageRef: string
  matchId: string
}

function parseMatches(wikitext: string, pageRef: string): RovMatch[] {
  const matches: RovMatch[] = []
  // Split by Match blocks
  const matchBlocks = wikitext.split(/\|M\d+={{Match/)
  for (const block of matchBlocks.slice(1)) {
    const opp1 = block.match(/\|opponent1={{TeamOpponent\|([^\|}\n ]+)/)
    const opp2 = block.match(/\|opponent2={{TeamOpponent\|([^\|}\n ]+)/)
    const dateStr = block.match(/\|date=([^\|}\n]+)/)
    const bestof = block.match(/\|bestof=(\d+)/)
    const winner = block.match(/\|winner=(\d)/)

    if (!opp1 || !opp2 || !dateStr) continue
    if (winner) continue // already has result, skip

    const rawDate = dateStr[1].replace(/{{Abbr\/[^}]+}}/g, '+07:00').trim()
    const date = new Date(rawDate)
    if (isNaN(date.getTime())) continue
    if (date < new Date()) continue // past match

    const matchId = `rov-${opp1[1]}-${opp2[1]}-${date.toISOString().slice(0, 10)}`
    matches.push({
      team1: slugToName(opp1[1]),
      team2: slugToName(opp2[1]),
      date,
      bestof: parseInt(bestof?.[1] ?? '3'),
      pageRef,
      matchId,
    })
  }
  return matches
}

function isAuthorized(req: Request) {
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: Request) { return handler(req) }
export async function POST(req: Request) { return handler(req) }

async function handler(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const page = await getCurrentSeasonPage()
  if (!page) return NextResponse.json({ ok: false, error: 'No active RoV season found' })

  const wikitext = await liquipediaFetch('arenaofvalor', { action: 'parse', page, prop: 'wikitext' })
  const matches = parseMatches(wikitext, page)

  // Check already-seeded match IDs
  const { data: existing } = await supabase
    .from('questions')
    .select('description')
    .eq('category_id', ROV_CATEGORY_ID)
    .eq('status', 'open')

  const existingIds = new Set(
    (existing ?? []).map(q => {
      try { return JSON.parse(q.description ?? '{}').match_id } catch { return null }
    }).filter(Boolean)
  )

  const results = []

  for (const match of matches) {
    if (existingIds.has(match.matchId)) {
      results.push({ skipped: match.matchId, reason: 'already seeded' })
      continue
    }

    const title = `[RoV] ${match.team1} vs ${match.team2} — ใครชนะ?`
    const options = [
      { id: match.team1, label: match.team1 },
      { id: match.team2, label: match.team2 },
    ]
    const description = JSON.stringify({
      type: 'rov',
      match_id: match.matchId,
      team_a: { id: match.team1, name: match.team1 },
      team_b: { id: match.team2, name: match.team2 },
      bestof: match.bestof,
      page_ref: match.pageRef,
    })

    const closesAt = new Date(match.date.getTime() - 5 * 60 * 1000) // 5 min before

    const { data: q, error } = await supabase
      .from('questions')
      .insert({
        title,
        category_id: ROV_CATEGORY_ID,
        options,
        closes_at: closesAt.toISOString(),
        status: 'open',
        created_by: BOT_USER_IDS[0],
        description,
        pool: {},
        total_pool: 0,
        predictions_count: 0,
        image_url: '/images/rov.png',
      })
      .select('id')
      .single()

    if (error || !q) { results.push({ error: error?.message, match: match.matchId }); continue }

    // Bot predictions
    const bets = BOT_USER_IDS.map((userId, i) => ({
      question_id: q.id, user_id: userId,
      option_id: options[i % 2].id,
      coins_wagered: BOT_WAGERS[i],
    }))
    const pool: Record<string, number> = {}
    let total = 0
    for (const b of bets) { pool[b.option_id] = (pool[b.option_id] ?? 0) + b.coins_wagered; total += b.coins_wagered }
    await supabase.from('predictions').insert(
      bets.map(b => ({ ...b, odds_at_time: pool[b.option_id] > 0 ? total / pool[b.option_id] : 1 }))
    )
    await supabase.from('questions').update({ pool, total_pool: total, predictions_count: bets.length }).eq('id', q.id)

    results.push({ question_id: q.id, match: `${match.team1} vs ${match.team2}`, date: match.date })
  }

  return NextResponse.json({ ok: true, seeded: results.filter((r: any) => r.question_id).length, results })
}
