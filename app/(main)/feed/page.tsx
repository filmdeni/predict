'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import QuestionCard from '@/components/feed/QuestionCard'
import CategoryFilter, { PARENT_SUBS } from '@/components/feed/CategoryFilter'
import TopPredictors from '@/components/feed/TopPredictors'
import LiveActivityTicker from '@/components/feed/LiveActivityTicker'
import type { Database } from '@/lib/supabase/types'

const ADMIN_EMAIL = 'zwwzww19192@gmail.com'

type Question = Database['public']['Tables']['questions']['Row'] & {
  categories: { name_th: string; emoji: string; slug: string }
}
type TrendingQuestion = Question & { recent_count: number }

export default function FeedPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [trending, setTrending] = useState<TrendingQuestion[]>([])
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState<{ todayPredictions: number; openCount: number; totalPool: number } | null>(null)
  const [tickKey, setTickKey] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAdmin(user?.email === ADMIN_EMAIL)
    })
  }, [])

  useEffect(() => {
    async function loadStats() {
      const since24h = new Date(Date.now() - 86400000).toISOString()
      const [{ count: todayCount }, { data: openQs }] = await Promise.all([
        supabase.from('predictions').select('*', { count: 'exact', head: true }).gte('placed_at', since24h),
        supabase.from('questions').select('total_pool').eq('status', 'open'),
      ])
      const totalPool = (openQs ?? []).reduce((s, q) => s + ((q as { total_pool: number }).total_pool ?? 0), 0)
      // seed daily offset from date so it's consistent within a day but changes each day
      const today = new Date()
      const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
      const dailyOffset = 180 + (daySeed % 97) + (daySeed % 43)
      setStats({
        todayPredictions: (todayCount ?? 0) + dailyOffset,
        openCount: (openQs ?? []).length,
        totalPool,
      })
    }
    loadStats()
  }, [])

  // mock realtime ticker: randomly bump predictions + pool every 6–14s
  useEffect(() => {
    if (!stats) return
    const schedule = () => setTimeout(() => {
      const predDelta = Math.random() < 0.7 ? 1 : 2
      const poolDelta = predDelta * (Math.floor(Math.random() * 180) + 40)
      setStats(prev => prev ? {
        ...prev,
        todayPredictions: prev.todayPredictions + predDelta,
        totalPool: prev.totalPool + poolDelta,
      } : prev)
      setTickKey(k => k + 1)
      timer = schedule()
    }, 6000 + Math.random() * 8000)
    let timer = schedule()
    return () => clearTimeout(timer)
  }, [!!stats])

  useEffect(() => {
    async function loadTrending() {
      const since24h = new Date(Date.now() - 86400000).toISOString()
      const { data: raw } = await supabase
        .from('predictions')
        .select('question_id')
        .gte('placed_at', since24h)
      if (!raw || raw.length === 0) return

      const counts: Record<string, number> = {}
      ;(raw as { question_id: string }[]).forEach(r => {
        counts[r.question_id] = (counts[r.question_id] ?? 0) + 1
      })
      const topIds = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([id]) => id)

      const { data: qs } = await supabase
        .from('questions')
        .select('*, categories(name_th, emoji, slug)')
        .in('id', topIds)
      if (qs) {
        setTrending(
          (qs as Question[])
            .map(q => ({ ...q, recent_count: counts[q.id] ?? 0 }))
            .sort((a, b) => b.recent_count - a.recent_count)
        )
      }
    }
    loadTrending()
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('questions')
        .select('*, categories(name_th, emoji, slug)')
        .in('status', ['open', 'closed', 'resolved'])
        .order('created_at', { ascending: false })
        .limit(50)

      if (category !== 'all') {
        const slugs = PARENT_SUBS[category] ?? [category]
        const { data: cats } = await supabase
          .from('categories')
          .select('id')
          .in('slug', slugs)
        const ids = (cats ?? []).map((c: { id: number }) => c.id)
        query = query.in('category_id', ids.length > 0 ? ids : [-1])
      }

      const { data } = await query
      setQuestions((data as Question[]) ?? [])
      setLoading(false)
    }
    load()

    const channel = supabase
      .channel('feed-questions')
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'questions' }, payload => {
        setQuestions(prev => prev.filter(q => q.id !== payload.old.id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [category])

  const active = questions.filter(q => q.status !== 'resolved')
  const resolved = questions.filter(q => q.status === 'resolved')
  const hotIds = new Set(trending.map(t => t.id))
  const hotCounts: Record<string, number> = {}
  trending.forEach(t => { hotCounts[t.id] = t.recent_count })

  return (
    <div>
      <CategoryFilter selected={category} onChange={setCategory} />

      {/* Live stats bar */}
      {stats && (
        <div className="mx-6 mt-4 mb-1 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-red-500 bg-red-50 border border-red-100 rounded-full px-2.5 py-1 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
            LIVE
          </span>
          <span className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1 flex-shrink-0">
            👥 <span key={`pred-${tickKey}`} className="font-semibold text-gray-800 inline-block animate-tickUp">{stats.todayPredictions.toLocaleString()}</span> ทายวันนี้
          </span>
          <span className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1 flex-shrink-0">
            🎯 <span className="font-semibold text-gray-800">{stats.openCount}</span> คำถามเปิดอยู่
          </span>
          <span className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1 flex-shrink-0">
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-[8px] leading-none mr-0.5">P</span>
            <span key={`pool-${tickKey}`} className="font-semibold text-gray-800 inline-block animate-tickUp">{(stats.totalPool / 1000).toFixed(0)}K</span> คะแนนรวม
          </span>
        </div>
      )}

      <LiveActivityTicker questions={questions} tickKey={tickKey} />

      <div className="px-6 pt-5 pb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">ตลาดทั้งหมด</h1>
        <Link
          href="/submit"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition-colors"
        >
          + เสนอคำถาม
        </Link>
      </div>

      <div className="px-6 pb-6 space-y-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-44 bg-white rounded-xl animate-pulse border border-gray-200" />
            ))}
          </div>
        ) : (
          <>
            {/* Active questions */}
            {active.length === 0 && resolved.length === 0 ? (
              <div className="text-center text-gray-400 py-16 animate-fadeInUp">
                <p className="text-4xl mb-2">🔮</p>
                <p>ยังไม่มีคำถามในหมวดนี้</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {active.map((q, i) => (
                  <div key={q.id} className="animate-fadeInUp" style={{ animationDelay: `${i * 40}ms` }}>
                    <QuestionCard
                      question={q}
                      isAdmin={isAdmin}
                      isHot={hotIds.has(q.id)}
                      recentCount={hotCounts[q.id]}
                      onDelete={id => setQuestions(prev => prev.filter(x => x.id !== id))}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Resolved questions */}
            {resolved.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-gray-500">เฉลยแล้ว</h2>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{resolved.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 opacity-70">
                  {resolved.map((q, i) => (
                    <div key={q.id} className="animate-fadeInUp" style={{ animationDelay: `${i * 40}ms` }}>
                      <QuestionCard
                        question={q}
                        isAdmin={isAdmin}
                        onDelete={id => setQuestions(prev => prev.filter(x => x.id !== id))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ยอดนิยมวันนี้ */}
            {trending.length > 0 && category === 'all' && (
              <div className="space-y-3 border-t border-gray-100 pt-6">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔥</span>
                  <h2 className="text-sm font-bold text-gray-900">ยอดนิยมวันนี้</h2>
                  <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {trending[0].recent_count}+ ทายใน 24 ชม.
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {trending.map((q, i) => (
                    <div key={q.id} className="animate-fadeInUp" style={{ animationDelay: `${i * 40}ms` }}>
                      <QuestionCard
                        question={q}
                        isAdmin={isAdmin}
                        onDelete={id => setTrending(prev => prev.filter(x => x.id !== id))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <TopPredictors category={category} />
    </div>
  )
}
