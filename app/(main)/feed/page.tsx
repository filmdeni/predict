'use client'

import { useEffect, useState, Suspense, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, Users, ArrowRight, BarChart2, Radio } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getPoolShares } from '@/lib/game/odds'
import QuestionCard from '@/components/feed/QuestionCard'
import CategoryFilter, { PARENT_SUBS, ALL_GROUPS, SUB_TO_PARENT, SIDEBAR_PARENTS } from '@/components/feed/CategoryFilter'
import LiveActivityTicker from '@/components/feed/LiveActivityTicker'
import CommunityTicker from '@/components/feed/CommunityTicker'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import type { Database } from '@/lib/supabase/types'

const ADMIN_EMAIL = 'zwwzww19192@gmail.com'

type Question = Database['public']['Tables']['questions']['Row'] & {
  categories: { name_th: string; emoji: string; slug: string }
}
type TrendingQuestion = Question & { recent_count: number }

// ── Admin drag-to-reorder grid ──────────────────────────────────────────────
function DraggableGrid({
  items, isAdmin, savedIds, predictedIds, hotIds, hotCounts, pinnedHeroId, onDelete, onReorder, onDragStart,
}: {
  items: Question[]
  isAdmin: boolean
  savedIds: Set<string>
  predictedIds: Set<string>
  hotIds: Set<string>
  hotCounts: Record<string, number>
  pinnedHeroId?: string | null
  onDelete: (id: string) => void
  onReorder: (ordered: Question[]) => void
  onDragStart?: (q: Question) => void
}) {
  const dragIndex = useRef<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  function handleDragStart(i: number, q: Question) { dragIndex.current = i; onDragStart?.(q) }
  function handleDragEnter(i: number) { setOverIndex(i) }
  function handleDragEnd() {
    const from = dragIndex.current
    if (from === null || overIndex === null || from === overIndex) { dragIndex.current = null; setOverIndex(null); return }
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(overIndex, 0, moved)
    dragIndex.current = null; setOverIndex(null)
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
            'animate-fadeInUp transition-all relative',
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

// ── Future Radar Card — horizontal layout ────────────────────────────────────
function FutureRadarCard({ question, isHot, recentCount, predictedIds }: {
  question: TrendingQuestion
  isHot?: boolean
  recentCount?: number
  predictedIds: Set<string>
}) {
  const shares = getPoolShares(question.pool)
  const options = question.options as { id: string; label: string }[]
  const yesPct = shares[options[0]?.id ?? ''] ?? 0
  const noPct = options.length >= 2 ? (shares[options[1]?.id ?? ''] ?? 0) : 100 - yesPct

  const daysLeft = Math.floor((new Date(question.closes_at).getTime() - Date.now()) / 86400000)
  const badge = isHot
    ? { label: '🔥 HOT',      cls: 'bg-orange-500' }
    : daysLeft > 14
    ? { label: '✨ NEW',      cls: 'bg-yellow-500' }
    : { label: '📈 TRENDING', cls: 'bg-indigo-500' }

  const [confLabel, confDot, confText] =
    question.predictions_count >= 100
      ? ['เชื่อมั่นสูง',      'bg-emerald-400', 'text-emerald-600']
      : question.predictions_count >= 30
      ? ['เชื่อมั่นปานกลาง', 'bg-amber-400',   'text-amber-600']
      : ['ข้อมูลน้อย',       'bg-gray-300',    'text-gray-400']

  return (
    <Link href={`/question/${question.id}`}>
      <article className="w-80 flex-shrink-0 bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex h-36">

        {/* Left — square thumbnail */}
        <div className="relative w-28 flex-shrink-0 bg-gradient-to-br from-slate-700 to-indigo-900 self-stretch">
          {question.image_url
            ? /* eslint-disable-next-line @next/next/no-img-element */
              <img src={question.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            : <div className="absolute inset-0 flex items-center justify-center text-4xl">{question.categories.emoji}</div>
          }
          <span className={`absolute top-2 left-2 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md ${badge.cls}`}>
            {badge.label}
          </span>
          {predictedIds.has(question.id) && (
            <span className="absolute bottom-2 left-2 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
              ทายแล้ว
            </span>
          )}
        </div>

        {/* Right — content */}
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <p className="text-[12.5px] font-semibold text-gray-900 line-clamp-2 leading-snug">{question.title}</p>

          {/* Probability display */}
          {options.length > 2 ? (
            <div className="space-y-1">
              {options.slice(0, 2).map((opt, i) => {
                const barCls = ['bg-green-400', 'bg-blue-400']
                const txtCls = ['text-green-700', 'text-blue-700']
                const pct = shares[opt.id] ?? 0
                return (
                  <div key={opt.id}>
                    <div className="flex justify-between mb-0.5 text-[10px]">
                      <span className="text-gray-500 truncate max-w-[90px]">{opt.label}</span>
                      <span className={`font-bold ${txtCls[i]}`}>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${barCls[i]} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-green-600">{yesPct.toFixed(0)}% {options[0]?.label ?? 'ใช่'}</span>
                <span className="text-red-500">{noPct.toFixed(0)}% {options[1]?.label ?? 'ไม่'}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-green-400 transition-all" style={{ width: `${yesPct}%` }} />
                <div className="h-full bg-red-400 flex-1" />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400">
              👥 {question.predictions_count.toLocaleString()}
              {recentCount ? ` · 🔥 ${recentCount}` : ''}
            </span>
            <span className={`flex items-center gap-1 text-[10px] font-medium ${confText}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${confDot}`} />
              {confLabel}
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}

// ── Top Predictors mini row ──────────────────────────────────────────────────
type TopUser = { id: string; username: string; display_name: string; avatar_url: string | null; correct_predictions: number; total_predictions: number; rank: string }

function TopPredictorsRow() {
  const [users, setUsers] = useState<TopUser[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('users')
      .select('id, username, display_name, avatar_url, correct_predictions, total_predictions, rank')
      .order('correct_predictions', { ascending: false })
      .limit(5)
      .then(({ data }) => setUsers((data as TopUser[]) ?? []))
  }, [])

  if (users.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🏆</span>
          <h2 className="text-sm font-bold text-gray-900">นักทายอันดับต้น</h2>
          <span className="text-xs text-gray-400">แม่นที่สุดเดือนนี้</span>
        </div>
        <Link href="/leaderboard" className="text-xs text-indigo-600 font-semibold flex items-center gap-0.5 hover:text-indigo-800">
          ดูทั้งหมด <ArrowRight size={12} />
        </Link>
      </div>

      <div className="flex items-end gap-4 overflow-x-auto pb-1 scrollbar-none">
        {users.map((u, i) => {
          const accuracy = u.total_predictions > 0
            ? Math.round((u.correct_predictions / u.total_predictions) * 100)
            : 0
          const MEDAL = ['🥇', '🥈', '🥉']
          return (
            <Link key={u.id} href={`/profile/${u.username}`} className="flex flex-col items-center gap-1.5 flex-shrink-0 hover:opacity-80 transition-opacity">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-700 border-2 border-white shadow-sm">
                  {u.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatar_url} alt={u.display_name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    (u.display_name ?? u.username ?? '?')[0].toUpperCase()
                  )}
                </div>
                <span className="absolute -top-1 -left-1 text-sm">{MEDAL[i] ?? `${i + 1}`}</span>
              </div>
              <p className="text-xs font-semibold text-gray-800 text-center max-w-[60px] truncate">{u.display_name?.split(' ')[0] ?? u.username}</p>
              <p className="text-xs font-bold text-green-600">{accuracy}%</p>
              <p className="text-[10px] text-gray-400">ความแม่น</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── Market Overview chart ────────────────────────────────────────────────────
function MarketOverview({ stats, chartData }: { stats: { todayPredictions: number; openCount: number; totalPool: number } | null; chartData: { d: string; v: number }[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart2 size={16} className="text-indigo-500" />
        <h2 className="text-sm font-bold text-gray-900">ภาพรวมตลาด</h2>
        <span className="text-xs text-gray-400">กิจกรรมการทายทั้งหมด</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-400">คำถามทั้งหมด</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.openCount.toLocaleString() ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">ทายวันนี้</p>
          <div className="flex items-end gap-1.5">
            <p className="text-2xl font-bold text-gray-900">{stats?.todayPredictions.toLocaleString() ?? '—'}</p>
            <p className="text-xs text-emerald-500 font-semibold pb-0.5">▲ สด</p>
          </div>
        </div>
      </div>

      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="d" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [typeof v === 'number' ? v.toLocaleString() : v, 'ทาย']}
            />
            <Line type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


// ── Hero banner ──────────────────────────────────────────────────────────────
function HeroBanner({ stats, tickKey }: {
  stats: { todayPredictions: number; openCount: number; totalPool: number } | null
  tickKey: number
}) {
  return (
    <div className="relative rounded-3xl overflow-hidden p-8 text-white">
      <img
        src="/images/banner-hero.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
      />

      {/* Community ticker — bottom-right overlay */}
      <div className="absolute bottom-4 right-4 z-10 hidden md:block" style={{ width: "calc(25% - 1rem)" }}>
        <CommunityTicker height={100} />
      </div>

      <div className="relative z-10 max-w-xl">
        <h1 className="text-3xl md:text-4xl font-black leading-tight text-slate-800">
          ใครจะ<span className="text-indigo-600">ทายแม่น</span>ที่สุด?
        </h1>
        <p className="text-sm text-slate-600 mt-2">ร่วมลุ้น ทาย และพิสูจน์ว่าคุณอ่านอนาคตออก</p>

        <div className="flex flex-wrap gap-6 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Users size={14} className="text-indigo-600" />
            </div>
            <div>
              <p key={`pred-${tickKey}`} className="text-lg font-black leading-none animate-tickUp text-slate-800">
                {stats ? (stats.todayPredictions >= 1000 ? `${(stats.todayPredictions / 1000).toFixed(1)}K` : stats.todayPredictions.toLocaleString()) : '—'}
              </p>
              <p className="text-[10px] text-slate-500">ทายวันนี้</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Radio size={14} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-black leading-none text-slate-800">{stats?.openCount ?? '—'}</p>
              <p className="text-[10px] text-slate-500">คำถามเปิดอยู่</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <span className="text-amber-600 font-black text-[11px]">P</span>
            </div>
            <div>
              <p key={`pool-${tickKey}`} className="text-lg font-black leading-none animate-tickUp text-slate-800">
                {stats ? (stats.totalPool >= 1000 ? `${(stats.totalPool / 1000).toFixed(1)}K` : stats.totalPool.toLocaleString()) : '—'}
              </p>
              <p className="text-[10px] text-slate-500">คะแนนรวม</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Referral capture ─────────────────────────────────────────────────────────
function ReferralCapture() {
  const searchParams = useSearchParams()
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) localStorage.setItem('global_ref', ref)
  }, [searchParams])
  return null
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FeedPageWrapper() {
  return (
    <Suspense fallback={null}>
      <FeedPage />
    </Suspense>
  )
}

function FeedPage() {
  const searchParamsFeed = useSearchParams()
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [trending, setTrending] = useState<TrendingQuestion[]>([])
  const [category, setCategory] = useState(() => searchParamsFeed.get('category') ?? 'all')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [predictedIds, setPredictedIds] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState<{ todayPredictions: number; openCount: number; totalPool: number } | null>(null)
  const [chartData, setChartData] = useState<{ d: string; v: number }[]>([])
  const [tickKey, setTickKey] = useState(0)
  const [mainGridOrdered, setMainGridOrdered] = useState<Question[]>([])
  const [trendingDropOver, setTrendingDropOver] = useState(false)
  const [pinnedHeroId, setPinnedHeroId] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [liveOnly, setLiveOnly] = useState(false)
  const draggedQuestionRef = useRef<Question | null>(null)
  const supabase = createClient()

  const changeCategory = useCallback((slug: string) => {
    setCategory(slug)
    const params = new URLSearchParams(window.location.search)
    if (slug === 'all') { params.delete('category') } else { params.set('category', slug) }
    router.replace(`/feed${params.size > 0 ? `?${params}` : ''}`, { scroll: false })
  }, [router])

  const adminPin = useCallback(async (action: string, questionId: string) => {
    await fetch('/api/admin/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, questionId }) })
  }, [])

  const pinToTrending = useCallback(async (q: Question) => {
    if (trending.some(t => t.id === q.id)) return
    await adminPin('pin_trending', q.id)
    if (pinnedHeroId === q.id) setPinnedHeroId(null)
    setTrending(prev => [{ ...q, recent_count: q.predictions_count, is_pinned_trending: true }, ...prev].slice(0, 4))
  }, [adminPin, trending, pinnedHeroId])

  const saveTrendingOrder = useCallback(async (ordered: TrendingQuestion[]) => {
    setTrending(ordered)
    for (let i = 0; i < ordered.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from('questions').update({ trending_sort_order: i } as any).eq('id', ordered[i].id)
    }
  }, [supabase])

  const unpinFromTrending = useCallback(async (id: string) => {
    await adminPin('unpin_trending', id)
    setTrending(prev => prev.filter(t => t.id !== id))
  }, [adminPin])

  const pinToHero = useCallback(async (q: Question) => {
    await adminPin('set_hero', q.id)
    setTrending(prev => prev.filter(x => x.id !== q.id))
    setPinnedHeroId(q.id)
  }, [adminPin])

  const unpinHero = useCallback(async () => {
    if (pinnedHeroId) await adminPin('unset_hero', pinnedHeroId)
    setQuestions(prev => prev.map(x => ({ ...x, is_daily_hero: false })))
    setTrending(prev => prev.map(x => ({ ...x, is_daily_hero: false })))
    setPinnedHeroId(null)
  }, [adminPin, pinnedHeroId])

  const saveOrder = useCallback(async (ordered: Question[]) => {
    setMainGridOrdered(ordered)
    for (let i = 0; i < ordered.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from('questions').update({ sort_order: i } as any).eq('id', ordered[i].id)
    }
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setIsAdmin(user.email === ADMIN_EMAIL)
      const [{ data: savedData }, { data: predData }] = await Promise.all([
        supabase.from('saved_questions').select('question_id').eq('user_id', user.id),
        supabase.from('predictions').select('question_id').eq('user_id', user.id),
      ])
      setSavedIds(new Set((savedData ?? []).map((r: { question_id: string }) => r.question_id)))
      setPredictedIds(new Set((predData ?? []).map((r: { question_id: string }) => r.question_id)))
    })
  }, [])

  useEffect(() => {
    async function loadStats() {
      const since24h = new Date(Date.now() - 86400000).toISOString()
      const since7d = new Date(Date.now() - 7 * 86400000).toISOString()
      const [{ count: todayCount }, { data: openQs }, { data: weekPreds }] = await Promise.all([
        supabase.from('predictions').select('*', { count: 'exact', head: true }).gte('placed_at', since24h),
        supabase.from('questions').select('total_pool').eq('status', 'open'),
        supabase.from('predictions').select('placed_at').gte('placed_at', since7d),
      ])
      const totalPool = (openQs ?? []).reduce((s, q) => s + ((q as { total_pool: number }).total_pool ?? 0), 0)
      setStats({ todayPredictions: todayCount ?? 0, openCount: (openQs ?? []).length, totalPool })

      // Build 7-day chart from real prediction data
      const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
      const counts: Record<string, number> = {}
      for (const p of weekPreds ?? []) {
        const d = new Date(p.placed_at)
        const key = `${d.getDate()} ${months[d.getMonth()]}`
        counts[key] = (counts[key] ?? 0) + 1
      }
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(Date.now() - (6 - i) * 86400000)
        const key = `${d.getDate()} ${months[d.getMonth()]}`
        return { d: key, v: counts[key] ?? 0 }
      })
      setChartData(days)
    }
    loadStats()

    const channel = supabase
      .channel('feed-stats-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'predictions' }, (payload) => {
        const amount = (payload.new as { coins_wagered?: number }).coins_wagered ?? 0
        setStats(prev => prev ? { ...prev, todayPredictions: prev.todayPredictions + 1, totalPool: prev.totalPool + amount } : prev)
        setTickKey(k => k + 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    async function loadTrending() {
      const { data: pinned } = await supabase
        .from('questions')
        .select('*, categories(name_th, emoji, slug)')
        .eq('is_pinned_trending', true)
        .eq('status', 'open')
        .order('trending_sort_order', { ascending: true, nullsFirst: false })
      const pinnedIds = new Set(((pinned ?? []) as Question[]).map(q => q.id))

      const since24h = new Date(Date.now() - 86400000).toISOString()
      const { data: raw } = await supabase.from('predictions').select('question_id').gte('placed_at', since24h)

      const counts: Record<string, number> = {}
      ;(raw ?? []).forEach((r: { question_id: string }) => { counts[r.question_id] = (counts[r.question_id] ?? 0) + 1 })

      const pinnedList: TrendingQuestion[] = ((pinned ?? []) as Question[])
        .filter((q: Question & { is_daily_hero?: boolean }) => !q.is_daily_hero)
        .map(q => ({ ...q, recent_count: counts[q.id] ?? 0 }))

      if (raw && raw.length > 0) {
        const topIds = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .filter(([id]) => !pinnedIds.has(id))
          .slice(0, 6 - pinnedList.length)
          .map(([id]) => id)

        if (topIds.length > 0) {
          const { data: qs } = await supabase
            .from('questions')
            .select('*, categories(name_th, emoji, slug)')
            .in('id', topIds)
            .eq('is_daily_hero', false)
          if (qs) {
            const soon = Date.now() + 24 * 3600 * 1000
            const auto = (qs as Question[])
              .map(q => ({ ...q, recent_count: counts[q.id] ?? 0 }))
              .sort((a, b) => {
                const aU = new Date(a.closes_at).getTime() < soon ? 1 : 0
                const bU = new Date(b.closes_at).getTime() < soon ? 1 : 0
                if (bU !== aU) return bU - aU
                return b.recent_count - a.recent_count
              })
            setTrending([...pinnedList, ...auto])
            return
          }
        }
      }

      if (pinnedList.length > 0) { setTrending(pinnedList); return }

      const { data: fallback } = await supabase
        .from('questions')
        .select('*, categories(name_th, emoji, slug)')
        .eq('status', 'open')
        .eq('is_daily_hero', false)
        .order('predictions_count', { ascending: false })
        .limit(6)
      if (fallback) setTrending((fallback as Question[]).map(q => ({ ...q, recent_count: counts[q.id] ?? 0 })))
    }
    loadTrending()
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)

      const { data: visData } = await supabase.from('category_visibility').select('slug').eq('hidden', true)
      const hiddenSlugs = (visData ?? []).map(r => r.slug)

      const now = new Date().toISOString()
      let query = supabase
        .from('questions')
        .select('*, categories(name_th, emoji, slug)')
        .or(`status.in.(closed,resolved),and(status.eq.open,closes_at.gt.${now})`)
        .order('closes_at', { ascending: true })
        .limit(50)

      if (category !== 'all') {
        const slugs = PARENT_SUBS[category] ?? [category]
        const { data: cats } = await supabase.from('categories').select('id').in('slug', slugs)
        const ids = (cats ?? []).map((c: { id: number }) => c.id)
        query = query.in('category_id', ids.length > 0 ? ids : [-1])
      } else if (hiddenSlugs.length > 0) {
        const allHiddenSlugs = hiddenSlugs.flatMap(s => [s, ...(PARENT_SUBS[s] ?? [])])
        const { data: hiddenCats } = await supabase.from('categories').select('id').in('slug', allHiddenSlugs)
        const hiddenIds = (hiddenCats ?? []).map((c: { id: number }) => c.id)
        if (hiddenIds.length > 0) query = query.not('category_id', 'in', `(${hiddenIds.join(',')})`)
      }

      const { data } = await query
      const qs = (data as Question[]) ?? []
      setQuestions(qs)
      const pinned = qs.find(q => (q as Question & { is_daily_hero?: boolean }).is_daily_hero)
      if (pinned) setPinnedHeroId(pinned.id)
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
  }, [category, liveOnly])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setMainGridOrdered([]) }, [category, liveOnly, loading])

  // "สด" = closes_at อีกไม่เกิน 3 วัน + ยังไม่เฉลย
  const isLive = (q: Question) => {
    const msLeft = new Date(q.closes_at).getTime() - now.getTime()
    return msLeft <= 3 * 24 * 60 * 60 * 1000
      && q.status !== 'resolved'
      && q.status !== 'cancelled'
  }

  const active = questions
    .filter(q => q.status !== 'resolved' && !(q.status === 'open' && new Date(q.closes_at) <= now))
    .filter(q => !liveOnly || isLive(q))
  const resolved = questions
    .filter(q => q.status === 'resolved')
    .filter(q => !liveOnly || isLive(q))
  const hotIds = new Set(trending.filter(t => t.id !== pinnedHeroId).map(t => t.id))
  const hotCounts: Record<string, number> = {}
  trending.forEach(t => { hotCounts[t.id] = t.recent_count })

  const pinnedHero = pinnedHeroId ? active.find(q => q.id === pinnedHeroId) ?? null : null
  const heroId = pinnedHero?.id
  const mainGrid = active.filter(q => q.id !== heroId && (category !== 'all' || !hotIds.has(q.id)))

  const hasLiveQuestions = questions.some(q => isLive(q))

  const activeParent = SUB_TO_PARENT[category] ?? category
  const hasSidebar = SIDEBAR_PARENTS.has(activeParent)
  const sidebarGroup = hasSidebar ? ALL_GROUPS.find(g => g.slug === activeParent) : null

  return (
    <div className="max-w-7xl mx-auto">
      <Suspense fallback={null}><ReferralCapture /></Suspense>

      <div className="px-4 md:px-6 pt-4 pb-8 space-y-6">

        {/* ── Hero banner (all category only) ── */}
        {category === 'all' && <HeroBanner stats={stats} tickKey={tickKey} />}

        {/* ── Category filter ── */}
        <div className="-mx-4 md:-mx-6">
          <CategoryFilter selected={category} onChange={changeCategory} liveOnly={liveOnly} onLiveToggle={setLiveOnly} />
        </div>

        <div className={hasSidebar ? 'flex gap-5 -mt-2' : 'contents'}>

        {/* ── Sidebar sub-nav (desktop, esports/sports only) ── */}
        {hasSidebar && sidebarGroup && (
          <aside className="hidden md:block w-44 flex-shrink-0 pt-2">
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden sticky top-4">
              <button
                onClick={() => { changeCategory(activeParent); setLiveOnly(false) }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b border-gray-100 transition-colors ${
                  category === activeParent && !liveOnly ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                ทั้งหมด
              </button>
              {hasLiveQuestions && (
                <button
                  onClick={() => { changeCategory(activeParent); setLiveOnly(v => !v) }}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b border-gray-100 transition-colors ${
                    liveOnly ? 'bg-red-50 text-red-600 font-semibold' : 'text-red-400 hover:text-red-600 hover:bg-red-50'
                  }`}
                >
                  <span className="relative flex items-center justify-center w-3.5 h-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40 bg-red-500" />
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="relative">
                      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>
                  </span>
                  สด
                </button>
              )}
              {sidebarGroup.subs.map(s => (
                <button
                  key={s.slug}
                  onClick={() => { changeCategory(s.slug); setLiveOnly(false) }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium border-b border-gray-100 last:border-0 transition-colors ${
                    category === s.slug && !liveOnly ? 'bg-gray-200 text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {s.image
                    ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.image} alt={s.name} className="w-5 h-5 rounded object-cover flex-shrink-0" />
                    : <span>{s.icon}</span>
                  }
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          </aside>
        )}

        <div className={hasSidebar ? 'flex-1 min-w-0 space-y-6 pt-2' : 'contents'}>

        {loading ? (
          <div className="space-y-6">
            <div className="h-48 bg-white rounded-2xl animate-pulse border border-gray-100" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-44 bg-white rounded-xl animate-pulse border border-gray-100" />
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
            {/* ── Future Radar (horizontal scroll of trending) ── */}
            {(trending.length > 0 || isAdmin) && category === 'all' && (
              <section
                onDragOver={isAdmin ? e => { e.preventDefault(); if (!(e.currentTarget.dataset.dragging)) setTrendingDropOver(true) } : undefined}
                onDragLeave={isAdmin ? () => setTrendingDropOver(false) : undefined}
                onDrop={isAdmin ? e => {
                  e.preventDefault(); setTrendingDropOver(false)
                  const q = draggedQuestionRef.current
                  if (q) { draggedQuestionRef.current = null; pinToTrending(q) }
                } : undefined}
                className={`rounded-2xl transition-all ${isAdmin && trendingDropOver ? 'ring-2 ring-orange-400 bg-orange-50/30 p-2 -m-2' : ''}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                    <h2 className="text-sm font-bold text-gray-900">มาแรง</h2>
                    <span className="text-xs text-gray-400">ทายสดจากชุมชน</span>
                    {isAdmin && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${trendingDropOver ? 'text-orange-600 bg-orange-100' : 'text-orange-400 bg-orange-50'}`}>
                        {trendingDropOver ? '↓ วางที่นี่' : '⠿ ลากมาปักหมุด'}
                      </span>
                    )}
                  </div>
                  <Link href="/leaderboard" className="text-xs text-indigo-600 font-semibold flex items-center gap-0.5 hover:text-indigo-800">
                    ดูทั้งหมด <ArrowRight size={12} />
                  </Link>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none -mx-4 md:-mx-6 px-4 md:px-6">
                  {trending.map((q, i) => (
                    <div
                      key={q.id}
                      draggable={isAdmin}
                      onDragStart={() => { draggedQuestionRef.current = q }}
                      onDragEnd={() => { draggedQuestionRef.current = null }}
                      className="animate-fadeInUp flex-shrink-0"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      {isAdmin && (q as Question & { is_pinned_trending?: boolean }).is_pinned_trending && (
                        <div className="flex justify-end mb-1">
                          <button
                            onClick={() => unpinFromTrending(q.id)}
                            className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full hover:bg-orange-600 transition-colors"
                          >
                            📌 unpin
                          </button>
                        </div>
                      )}
                      <FutureRadarCard
                        question={q}
                        isHot={hotIds.has(q.id)}
                        recentCount={q.recent_count}
                        predictedIds={predictedIds}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Top Predictors + Market Overview (2-col on desktop) ── */}
            {category === 'all' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TopPredictorsRow />
                <MarketOverview stats={stats} chartData={chartData} />
              </div>
            )}

            {/* ── All questions grid ── */}
            {(pinnedHero || mainGrid.length > 0) && (
              <section
                onDragOver={isAdmin ? e => { e.preventDefault() } : undefined}
                onDrop={isAdmin ? e => {
                  e.preventDefault()
                  const q = draggedQuestionRef.current
                  if (q) { draggedQuestionRef.current = null; pinToHero(q) }
                } : undefined}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Users size={16} className="text-gray-500" />
                  <h2 className="text-sm font-bold text-gray-900">
                    {category === 'all' ? 'คนกำลังทาย' : 'ในหมวดนี้'}
                  </h2>
                  <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{active.length} คำถาม</span>
                  {isAdmin && pinnedHeroId && (
                    <button onClick={unpinHero} className="text-[10px] text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full hover:bg-indigo-100 transition-colors">
                      📌 unpin คำถามประจำวัน
                    </button>
                  )}
                  {isAdmin && <span className="text-[10px] text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full">⠿ ลากมาวางเพื่อตั้งเป็นคำถามประจำวัน</span>}
                </div>

                <DraggableGrid
                  items={(() => {
                    const base = (mainGridOrdered.length > 0 ? mainGridOrdered : mainGrid).filter(q => q.id !== heroId)
                    return pinnedHero ? [pinnedHero, ...base] : base
                  })()}
                  isAdmin={isAdmin}
                  savedIds={savedIds}
                  predictedIds={predictedIds}
                  hotIds={hotIds}
                  hotCounts={hotCounts}
                  pinnedHeroId={pinnedHeroId}
                  onDelete={id => setQuestions(prev => prev.filter(x => x.id !== id))}
                  onReorder={ordered => saveOrder(ordered.filter(q => q.id !== heroId))}
                  onDragStart={q => { draggedQuestionRef.current = q }}
                />
              </section>
            )}

            {/* Resolved */}
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

        </div>{/* end flex-1 content */}
        </div>{/* end hasSidebar flex wrapper */}
      </div>

    </div>
  )
}
