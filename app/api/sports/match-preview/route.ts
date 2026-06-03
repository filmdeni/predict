import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('event')
  const league = searchParams.get('league')
  const sport = league === 'nba' ? 'basketball' : 'soccer'

  if (!eventId || !league) return NextResponse.json({ error: 'missing params' }, { status: 400 })

  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/summary?event=${eventId}`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return NextResponse.json({ error: 'espn error' }, { status: 502 })
    const data = await res.json()

    // Odds → implied probability
    const pc = (data.pickcenter ?? [])[0]
    let marketOdds: { home: number; away: number; draw: number | null } | null = null
    if (pc) {
      const homeML: number = pc.homeTeamOdds?.moneyLine ?? null
      const awayML: number = pc.awayTeamOdds?.moneyLine ?? null
      if (homeML && awayML) {
        const toImplied = (ml: number) => ml < 0 ? (-ml) / (-ml + 100) : 100 / (ml + 100)
        const h = toImplied(homeML)
        const a = toImplied(awayML)
        const total = h + a
        marketOdds = {
          home: Math.round((h / total) * 100),
          away: Math.round((a / total) * 100),
          draw: null,
        }
        if (marketOdds.home + marketOdds.away < 100) marketOdds.draw = 100 - marketOdds.home - marketOdds.away
      }
    }

    // Venue
    const venue = data.gameInfo?.venue
    const venueInfo = venue ? {
      name: venue.fullName ?? null,
      city: venue.address?.city ?? null,
      capacity: venue.capacity ?? null,
    } : null

    // News
    const articles = (data.news?.articles ?? []).slice(0, 3).map((a: any) => ({
      headline: a.headline ?? '',
      url: a.links?.web?.href ?? a.links?.mobile?.href ?? '',
      published: a.published ?? '',
    })).filter((a: any) => a.headline && a.url)

    // H2H
    const h2h = (data.headToHeadGames ?? []).slice(0, 1).map((g: any) => {
      const stats: Record<string, string> = {}
      for (const s of g.statistics ?? []) stats[s.name] = s.displayValue
      return { team: g.team?.displayName, wins: stats.wins, losses: stats.losses, ties: stats.ties }
    })

    return NextResponse.json({ marketOdds, venueInfo, articles, h2h })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
