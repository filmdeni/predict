import { NextResponse } from 'next/server'
import Parser from 'rss-parser'

type RssItem = {
  title?: string
  link?: string
  pubDate?: string
  isoDate?: string
  contentSnippet?: string
  enclosure?: { url?: string }
  mediaContent?: { $?: { url?: string } }
  'content:encoded'?: string
}

const parser = new Parser<Record<string, unknown>, RssItem>({
  timeout: 8000,
  customFields: {
    item: [['media:content', 'mediaContent'], 'enclosure', ['content:encoded', 'content:encoded']],
  },
})

const FEEDS = [
  { source: 'มติชน',        url: 'https://www.matichon.co.th/feed' },
  { source: 'The Standard', url: 'https://thestandard.co/feed/' },
  { source: 'ประชาชาติ',    url: 'https://www.prachachat.net/feed' },
  { source: 'Thai PBS',     url: 'https://www.thaipbs.or.th/news/rss' },
]

function extractImage(item: RssItem): string | null {
  // 1. media:content
  const mc = item.mediaContent?.$?.url
  if (mc) return mc
  // 2. enclosure
  const enc = item.enclosure?.url
  if (enc && /\.(jpg|jpeg|png|webp)/i.test(enc)) return enc
  // 3. first <img> inside content:encoded
  const html = item['content:encoded'] ?? ''
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/)
  if (match?.[1]) return match[1]
  return null
}

export interface NewsItem {
  title: string
  link: string
  pubDate: string
  source: string
  image: string | null
  excerpt: string
}

export async function GET() {
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url)
      return parsed.items.slice(0, 8).map((item): NewsItem => ({
        title: item.title ?? '',
        link: item.link ?? '',
        pubDate: item.pubDate ?? item.isoDate ?? '',
        source: feed.source,
        image: extractImage(item),
        excerpt: (item.contentSnippet ?? '').slice(0, 120).trim(),
      }))
    })
  )

  const items: NewsItem[] = results
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .filter((item) => item.title)
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 40)

  return NextResponse.json({ items })
}
