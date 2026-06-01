'use client'

import { useEffect, useState, Suspense, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getPoolShares } from '@/lib/game/odds'
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

// shared drag state across sections
const draggedQuestionRef = { current: null as Question | null }

// ── Admin drag-to-reorder grid ──────────────────────────────────────────────
function DraggableGrid({
  items,
  isAdmin,
  savedIds,
  predictedIds,
  hotIds,
  hotCounts,
  onDelete,
  onReorder,
  onDragStart,
}: {
  items: Question[]
  isAdmin: boolean
  savedIds: Set<string>
  predictedIds: Set<string>
  hotIds: Set<string>
  hotCounts: Record<string, number>
  onDelete: (id: string) => void
  onReorder: (ordered: Question[]) => void
  onDragStart?: (q: Question) => void
}) {
  const dragIndex = useRef<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  function handleDragStart(i: number, q: Question) {
    dragIndex.current = i
    onDragStart?.(q)
  }
  function handleDragEnter(i: number) { setOverIndex(i) }
  function handleDragEnd() {
    const from = dragIndex.current
    if (from === null || overIndex === null || from === overIndex) {
      dragIndex.current = null; setOverIndex(null); return
    }
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(overIndex, 0, moved)
    dragIndex.current = null
    setOverIndex(null)
    onReorder(next)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {items.map((q, i) => (
        <div
          key={q.id}
          draggable={isAdmin}
          onDragStart={() => handleDragStart(i, q)}
          onDragEnter={() => handleDragEnter(i)}
          onDragEnd={handleDragEnd}
          onDragOver={e => e.preventDefault()}
          className={[
            'animate-fadeInUp transition-all',
            isAdmin ? 'cursor-grab active:cursor-grabbing' : '',
            overIndex === i && dragIndex.current !== i ? 'ring-2 ring-indigo-400 rounded-xl scale-[1.02]' : '',
            dragIndex.current === i ? 'opacity-40' : '',
          ].join(' ')}
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <QuestionCard
            question={q}
            isAdmin={isAdmin}
            isHot={hotIds.has(q.id)}
            recentCount={hotCounts[q.id]}
            initialSaved={savedIds.has(q.id)}
            isPredicted={predictedIds.has(q.id)}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  )
}

function TrendingSection({
  trending, isAdmin, trendingDropOver, savedIds, predictedIds, hotCounts,
  onDropOver, onDrop, onUnpin, onDelete, onReorder, onDragStart,
}: {
  trending: TrendingQuestion[]
  isAdmin: boolean
  trendingDropOver: boolean
  savedIds: Set<string>
  predictedIds: Set<string>
  hotCounts: Record<string, number>
  onDropOver: (v: boolean) => void
  onDrop: () => void
  onUnpin: (id: string) => void
  onDelete: (id: string) => void
  onReorder: (items: TrendingQuestion[]) => void
  onDragStart: (q: TrendingQuestion) => void
}) {
  const trendingDragIndex = useRef<number | null>(null)
  const [trendingOverIndex, setTrendingOverIndex] = useState<number | null>(null)

  function handleTrendingDragStart(i: number, q: TrendingQuestion) {
    trendingDragIndex.current = i
    onDragStart(q)
  }
  function handleTrendingDragEnd() {
    const from = trendingDragIndex.current
    if (from === null || trendingOverIndex === null || from === trendingOverIndex) {
      trendingDragIndex.current = null; setTrendingOverIndex(null); return
    }
    const next = [...trending]
    const [moved] = next.splice(from, 1)
    next.splice(trendingOverIndex, 0, moved)
    trendingDragIndex.current = null
    setTrendingOverIndex(null)
    onReorder(next)
  }

  return (
    <section
      onDragOver={isAdmin ? e => { e.preventDefault(); if (trendingDragIndex.current === null) onDropOver(true) } : undefined}
      onDragLeave={isAdmin ? () => onDropOver(false) : undefined}
      onDrop={isAdmin ? e => { e.preventDefault(); onDropOver(false); if (trendingDragIndex.current === null) onDrop() } : undefined}
      className={[
        'rounded-2xl transition-all',
        isAdmin && trendingDropOver ? 'ring-2 ring-orange-400 bg-orange-50/50 p-2 -m-2' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🔥</span>
        <h2 className="text-sm font-bold text-gray-900">มาแรงตอนนี้</h2>
        {trending.length > 0 && (
          <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {trending[0].recent_count}+ ทายใน 24 ชม.
          </span>
        )}
        {isAdmin && (
          <span className={[
            'text-[10px] px-2 py-0.5 rounded-full transition-colors',
            trendingDropOver ? 'text-orange-600 bg-orange-100' : 'text-orange-400 bg-orange-50',
          ].join(' ')}>
            {trendingDropOver ? '↓ วางที่นี่' : '⠿ ลากการ์ดมาวางเพื่อปักหมุด'}
          </span>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-6 px-6">
        {trending.map((q, i) => (
          <div
            key={q.id}
            draggable={isAdmin}
            onDragStart={() => handleTrendingDragStart(i, q)}
            onDragEnter={() => setTrendingOverIndex(i)}
            onDragEnd={handleTrendingDragEnd}
            onDragOver={e => e.preventDefault()}
            className={[
              'flex-shrink-0 w-[260px] animate-fadeInUp relative transition-all',
              isAdmin ? 'cursor-grab active:cursor-grabbing' : '',
              trendingOverIndex === i && trendingDragIndex.current !== i ? 'ring-2 ring-orange-400 rounded-xl scale-[1.02]' : '',
              trendingDragIndex.current === i ? 'opacity-40' : '',
            ].join(' ')}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {isAdmin && (q as Question & { is_pinned_trending?: boolean }).is_pinned_trending && (
              <button
                onClick={() => onUnpin(q.id)}
                className="absolute top-2 right-2 z-30 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none hover:bg-orange-600 transition-colors"
                title="ถอนออกจากมาแรง"
              >
                📌 unpin
              </button>
            )}
            <QuestionCard
              question={q}
              isAdmin={isAdmin}
              isHot
              recentCount={q.recent_count}
              initialSaved={savedIds.has(q.id)}
              isPredicted={predictedIds.has(q.id)}
              onDelete={onDelete}
            />
          </div>
        ))}
        {trending.length === 0 && isAdmin && (
          <div className="flex-shrink-0 w-[260px] h-40 border-2 border-dashed border-orange-300 rounded-xl flex items-center justify-center text-orange-400 text-xs">
            ลากการ์ดมาวางที่นี่
          </div>
        )}
      </div>
    </section>
  )
}

function ReferralCapture() {
  const searchParams = useSearchParams()
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) localStorage.setItem('global_ref', ref)
  }, [searchParams])
  return null
}

export default function FeedPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [trending, setTrending] = useState<TrendingQuestion[]>([])
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [predictedIds, setPredictedIds] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState<{ todayPredictions: number; openCount: number; totalPool: number } | null>(null)
  const [tickKey, setTickKey] = useState(0)
  const [mainGridOrdered, setMainGridOrdered] = useState<Question[]>([])
  const [trendingDropOver, setTrendingDropOver] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const supabase = createClient()

  const pinToTrending = useCallback(async (q: Question) => {
    if (trending.some(t => t.id === q.id)) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('questions').update({ is_pinned_trending: true }).eq('id', q.id)
    setTrending(prev => [{ ...q, recent_count: q.predictions_count, is_pinned_trending: true }, ...prev].slice(0, 4))
    setQuestions(prev => prev.filter(x => x.id !== q.id))
  }, [supabase, trending])

  const saveTrendingOrder = useCallback(async (ordered: TrendingQuestion[]) => {
    setTrending(ordered)
    for (let i = 0; i < ordered.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('questions').update({ trending_sort_order: i }).eq('id', ordered[i].id)
    }
  }, [supabase])

  const unpinFromTrending = useCallback(async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('questions').update({ is_pinned_trending: false }).eq('id', id)
    setTrending(prev => {
      const unpinned = prev.find(t => t.id === id)
      if (unpinned) setQuestions(qs => [unpinned, ...qs.filter(x => x.id !== id)])
      return prev.filter(t => t.id !== id)
    })
  }, [supabase])

  const saveOrder = useCallback(async (ordered: Question[]) => {
    setMainGridOrdered(ordered)
    const updates = ordered.map((q, i) => ({ id: q.id, sort_order: i }))
    for (const u of updates) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('questions').update({ sort_order: u.sort_order }).eq('id', u.id)
    }
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setIsAdmin(user.email === ADMIN_EMAIL)
      const [{ data: savedData }, { data: predData }] = await Promise.all([
        (supabase as any).from('saved_questions').select('question_id').eq('user_id', user.id),
        supabase.from('predictions').select('question_id').eq('user_id', user.id),
      ])
      setSavedIds(new Set((savedData ?? []).map((r: { question_id: string }) => r.question_id)))
      setPredictedIds(new Set((predData ?? []).map((r: { question_id: string }) => r.question_id)))
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
      // pinned first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: pinned } = await (supabase as any)
        .from('questions')
        .select('*, categories(name_th, emoji, slug)')
        .eq('is_pinned_trending', true)
        .eq('status', 'open')
        .order('trending_sort_order', { ascending: true, nullsFirst: false })
      const pinnedList: TrendingQuestion[] = ((pinned ?? []) as Question[]).map(q => ({ ...q, recent_count: q.predictions_count }))
      const pinnedIds = new Set(pinnedList.map(q => q.id))

      const since24h = new Date(Date.now() - 86400000).toISOString()
      const { data: raw } = await supabase
        .from('predictions')
        .select('question_id')
        .gte('placed_at', since24h)

      if (raw && raw.length > 0) {
        const counts: Record<string, number> = {}
        ;(raw as { question_id: string }[]).forEach(r => {
          counts[r.question_id] = (counts[r.question_id] ?? 0) + 1
        })
        const topIds = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .filter(([id]) => !pinnedIds.has(id))
          .slice(0, 4 - pinnedList.length)
          .map(([id]) => id)

        if (topIds.length > 0) {
          const { data: qs } = await supabase
            .from('questions')
            .select('*, categories(name_th, emoji, slug)')
            .in('id', topIds)
          if (qs) {
            const auto = (qs as Question[]).map(q => ({ ...q, recent_count: counts[q.id] ?? 0 })).sort((a, b) => b.recent_count - a.recent_count)
            setTrending([...pinnedList, ...auto])
            return
          }
        }
      }

      if (pinnedList.length > 0) { setTrending(pinnedList); return }

      // fallback: top 4 by total predictions_count
      const { data: fallback } = await supabase
        .from('questions')
        .select('*, categories(name_th, emoji, slug)')
        .eq('status', 'open')
        .order('predictions_count', { ascending: false })
        .limit(4)
      if (fallback) {
        setTrending((fallback as Question[]).map(q => ({ ...q, recent_count: q.predictions_count })))
      }
    }
    loadTrending()
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)

      // fetch hidden category slugs
      const { data: visData } = await supabase
        .from('category_visibility')
        .select('slug')
        .eq('hidden', true)
      const hiddenSlugs = (visData ?? []).map(r => r.slug)

      let query = supabase
        .from('questions')
        .select('*, categories(name_th, emoji, slug)')
        .in('status', ['open', 'closed', 'resolved'])
        .order('sort_order', { ascending: true, nullsFirst: false })
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
      } else if (hiddenSlugs.length > 0) {
        // exclude hidden categories when showing all
        const allHiddenSlugs = hiddenSlugs.flatMap(s => [s, ...(PARENT_SUBS[s] ?? [])])
        const { data: hiddenCats } = await supabase
          .from('categories')
          .select('id')
          .in('slug', allHiddenSlugs)
        const hiddenIds = (hiddenCats ?? []).map((c: { id: number }) => c.id)
        if (hiddenIds.length > 0) {
          query = query.not('category_id', 'in', `(${hiddenIds.join(',')})`)
        }
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

  const active = questions.filter(q => q.status !== 'resolved' && !(q.status === 'open' && new Date(q.closes_at) <= now))
  const expired = questions.filter(q => q.status === 'open' && new Date(q.closes_at) <= now)
  const resolved = questions.filter(q => q.status === 'resolved')
  const hotIds = new Set(trending.map(t => t.id))
  const hotCounts: Record<string, number> = {}
  trending.forEach(t => { hotCounts[t.id] = t.recent_count })

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Sync ordered grid when questions/filter changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setMainGridOrdered([]) }, [category, loading])

  // Hero = active question with most predictions_count (not in trending to avoid dupe)
  const heroCandidates = active.filter(q => !hotIds.has(q.id))
  const heroQuestion = heroCandidates.length > 0
    ? heroCandidates.reduce((a, b) => b.predictions_count > a.predictions_count ? b : a)
    : active[0] ?? null
  const heroId = heroQuestion?.id

  // Main grid = active minus hero; exclude trending only when trending section is visible (all category)
  const mainGrid = active.filter(q => q.id !== heroId && (category !== 'all' || !hotIds.has(q.id)))

  return (
    <div>
      <Suspense fallback={null}><ReferralCapture /></Suspense>
      <CategoryFilter selected={category} onChange={setCategory} />

      {/* Live stats bar */}
      {stats && (
        <div className="mx-6 mt-4 mb-1 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-red-500 bg-red-50 border border-red-100 rounded-full px-2.5 py-1 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
            สด
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

      <div className="px-6 pt-5 pb-6 space-y-8">
        {loading ? (
          <div className="space-y-8">
            <div className="h-52 bg-white rounded-2xl animate-pulse border border-gray-200" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-44 bg-white rounded-xl animate-pulse border border-gray-200" />
              ))}
            </div>
          </div>
        ) : active.length === 0 && resolved.length === 0 ? (
          <div className="text-center text-gray-400 py-16 animate-fadeInUp">
            <p className="text-4xl mb-2">🔮</p>
            <p>ยังไม่มีคำถามในหมวดนี้</p>
          </div>
        ) : (
          <>
            {/* ── Hero Banner ── */}
            {heroQuestion && (
              <section className="animate-fadeInUp">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🌟</span>
                    <h2 className="text-sm font-bold text-gray-900">คำถามประจำวัน</h2>
                  </div>
                  <Link href="/submit" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition-colors">
                    + เสนอคำถาม
                  </Link>
                </div>
                <div className="max-w-sm">
                  <QuestionCard
                    question={heroQuestion}
                    isAdmin={isAdmin}
                    isHot={hotIds.has(heroQuestion.id)}
                    recentCount={hotCounts[heroQuestion.id]}
                    initialSaved={savedIds.has(heroQuestion.id)}
                    isPredicted={predictedIds.has(heroQuestion.id)}
                    onDelete={id => setQuestions(prev => prev.filter(x => x.id !== id))}
                  />
                </div>
              </section>
            )}

            {/* ── 🔥 มาแรงตอนนี้ ── */}
            {(trending.length > 0 || isAdmin) && category === 'all' && (
              <TrendingSection
                trending={trending}
                isAdmin={isAdmin}
                trendingDropOver={trendingDropOver}
                savedIds={savedIds}
                predictedIds={predictedIds}
                hotCounts={hotCounts}
                onDropOver={setTrendingDropOver}
                onDrop={() => {
                  const q = draggedQuestionRef.current
                  if (q) { draggedQuestionRef.current = null; pinToTrending(q) }
                }}
                onUnpin={unpinFromTrending}
                onDelete={id => setTrending(prev => prev.filter(x => x.id !== id))}
                onReorder={saveTrendingOrder}
                onDragStart={q => { draggedQuestionRef.current = q }}
              />
            )}

            {/* ── 👥 คนกำลังทาย ── */}
            {mainGrid.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">👥</span>
                  <h2 className="text-sm font-bold text-gray-900">คนกำลังทาย</h2>
                  <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{mainGrid.length} คำถาม</span>
                  {isAdmin && (
                    <span className="text-[10px] text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full">
                      ⠿ ลาก-วางเพื่อเรียงลำดับ
                    </span>
                  )}
                  <Link href="/submit" className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition-colors">
                    + เสนอคำถาม
                  </Link>
                </div>
                <DraggableGrid
                  items={mainGridOrdered.length > 0 ? mainGridOrdered : mainGrid}
                  isAdmin={isAdmin}
                  savedIds={savedIds}
                  predictedIds={predictedIds}
                  hotIds={hotIds}
                  hotCounts={hotCounts}
                  onDelete={id => setQuestions(prev => prev.filter(x => x.id !== id))}
                  onReorder={saveOrder}
                  onDragStart={q => { draggedQuestionRef.current = q }}
                />
              </section>
            )}

            {/* Expired — waiting for admin to resolve */}
            {expired.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-gray-500">รอเฉลย</h2>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{expired.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 opacity-60">
                  {expired.map((q, i) => (
                    <div key={q.id} className="animate-fadeInUp" style={{ animationDelay: `${i * 40}ms` }}>
                      <QuestionCard
                        question={q}
                        isAdmin={isAdmin}
                        initialSaved={savedIds.has(q.id)}
                        isPredicted={predictedIds.has(q.id)}
                        onDelete={id => setQuestions(prev => prev.filter(x => x.id !== id))}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Resolved questions */}
            {resolved.length > 0 && (
              <section className="space-y-3">
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
                        initialSaved={savedIds.has(q.id)}
                        isPredicted={predictedIds.has(q.id)}
                        onDelete={id => setQuestions(prev => prev.filter(x => x.id !== id))}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
      <TopPredictors category={category} />
    </div>
  )
}
