'use client'

import { useEffect, useState } from 'react'
import { Newspaper, RefreshCw } from 'lucide-react'

interface NewsItem {
  title: string
  link: string
  pubDate: string
  source: string
  image: string | null
  excerpt: string
}

const SOURCE_META: Record<string, { color: string; dot: string }> = {
  'มติชน':        { color: 'text-orange-600', dot: 'bg-orange-400' },
  'The Standard': { color: 'text-blue-600',   dot: 'bg-blue-400'   },
  'ประชาชาติ':    { color: 'text-green-600',  dot: 'bg-green-400'  },
  'Thai PBS':     { color: 'text-teal-600',   dot: 'bg-teal-400'   },
}

function ago(dateStr: string) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr).getTime()) / 60000
  if (diff < 60) return `${Math.floor(diff)} นาทีที่แล้ว`
  if (diff < 1440) return `${Math.floor(diff / 60)} ชม.`
  return `${Math.floor(diff / 1440)} วันที่แล้ว`
}

export default function NewsWidget() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('ทั้งหมด')
  const [failedImgs, setFailedImgs] = useState<Set<string>>(new Set())

  function failImg(url: string) {
    setFailedImgs(prev => { const s = new Set(prev); s.add(url); return s })
  }
  function ok(url: string | null): url is string {
    return !!url && !failedImgs.has(url)
  }

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    try {
      const res = await fetch('/api/admin/news')
      const json = await res.json()
      setItems(json.items ?? [])
    } catch { setItems([]) }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load() }, [])

  const sources = ['ทั้งหมด', ...Array.from(new Set(items.map(i => i.source)))]
  const baseList = filter === 'ทั้งหมด' ? items : items.filter(i => i.source === filter)
  const filtered = (filter === 'ทั้งหมด'
    ? [...baseList].sort((a, b) => (ok(b.image) ? 1 : 0) - (ok(a.image) ? 1 : 0))
    : baseList
  ).slice(0, 12)
  const [featured, ...rest] = filtered

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper size={16} className="text-gray-500" />
          <h2 className="text-sm font-bold text-gray-900">ข่าวล่าสุด</h2>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
        >
          <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
          รีเฟรช
        </button>
      </div>

      {!loading && sources.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {sources.map(s => {
            const meta = SOURCE_META[s]
            const active = filter === s
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {meta && <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white/60' : meta.dot}`} />}
                {s}
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-52 bg-gray-100 animate-pulse rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">ไม่พบข่าว</p>
      ) : (
        <div className="space-y-2">
          {/* Featured card */}
          {featured && (
            <a
              href={featured.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-all group bg-white"
            >
              {ok(featured.image) ? (
                <div className="relative h-44 sm:h-52 bg-gray-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featured.image}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    onError={() => failImg(featured.image as string)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${SOURCE_META[featured.source]?.dot ?? 'bg-gray-400'}`} />
                      <span className="text-[11px] font-semibold text-white/90">{featured.source}</span>
                      <span className="text-white/40 text-[11px]">·</span>
                      <span className="text-white/60 text-[11px]">{ago(featured.pubDate)}</span>
                    </div>
                    <p className="text-white font-bold text-sm leading-snug line-clamp-2">{featured.title}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${SOURCE_META[featured.source]?.dot ?? 'bg-gray-300'}`} />
                    <span className={`text-[11px] font-semibold ${SOURCE_META[featured.source]?.color ?? 'text-gray-500'}`}>{featured.source}</span>
                    <span className="text-gray-300 text-[11px]">·</span>
                    <span className="text-gray-400 text-[11px]">{ago(featured.pubDate)}</span>
                  </div>
                  <p className="text-gray-900 font-bold text-[15px] leading-snug">{featured.title}</p>
                  {featured.excerpt && <p className="text-gray-500 text-xs line-clamp-2">{featured.excerpt}</p>}
                </div>
              )}
            </a>
          )}

          {/* Compact grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {rest.map((item, i) => {
              const meta = SOURCE_META[item.source]
              return (
                <a
                  key={i}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 bg-white border border-gray-100 rounded-xl p-3 hover:border-gray-300 hover:shadow-sm transition-all group"
                >
                  {ok(item.image) && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={() => failImg(item.image as string)}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <p className="text-[13px] font-medium text-gray-900 leading-snug line-clamp-2">{item.title}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta?.dot ?? 'bg-gray-300'}`} />
                      <span className={`text-[10px] font-semibold ${meta?.color ?? 'text-gray-500'}`}>{item.source}</span>
                      {item.pubDate && <span className="text-[10px] text-gray-400">· {ago(item.pubDate)}</span>}
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
