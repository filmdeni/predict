'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { Flame, RefreshCw } from 'lucide-react'
import { RANKS } from '@/lib/game/ranks'
import { useCountUp } from '@/lib/hooks/useCountUp'

function CountUpValue({ value, className, style }: { value: number; className?: string; style?: React.CSSProperties }) {
  const animated = useCountUp(value, 800)
  return <span className={className} style={style}>{animated.toLocaleString()}</span>
}

type UserProfile = Database['public']['Tables']['users']['Row']

function getRankDisplay(tier: string) {
  return RANKS.find(r => r.tier === tier) ?? RANKS[0]
}

const PODIUM_ORDER = [1, 0, 2] as const

const AVATAR_COLORS = [
  '#00b373','#6366f1','#f59e0b','#0891b2',
  '#a855f7','#ef4444','#06b6d4','#ec4899',
]
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const color = avatarColor(name)
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: color,
        border: `2.5px solid #fff`,
        boxShadow: `0 2px 8px ${color}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.38, fontWeight: 900, color: '#fff',
        flexShrink: 0,
      }}
    >
      {name[0].toUpperCase()}
    </div>
  )
}

// Each podium slot is one integrated card.
// pt difference (pt-10 > pt-6 > pt-4) + items-end = taller card floats higher.
const SLOT_CFG = {
  0: { pt: 40, pb: 20, width: 154, avatarSize: 64, nameSz: 14, coinSz: 16,
       card: 'bg-white', border: '2px solid rgba(0,179,115,0.3)',
       shadow: '0 8px 28px rgba(0,179,115,0.13), 0 2px 8px rgba(0,0,0,0.06)' },
  1: { pt: 28, pb: 16, width: 128, avatarSize: 52, nameSz: 13, coinSz: 14,
       card: 'bg-white', border: '1px solid #e5e7eb',
       shadow: '0 2px 10px rgba(0,0,0,0.07)' },
  2: { pt: 20, pb: 16, width: 120, avatarSize: 48, nameSz: 12, coinSz: 13,
       card: 'bg-white', border: '1px solid #e5e7eb',
       shadow: '0 2px 10px rgba(0,0,0,0.07)' },
} as const

const MEDALS = ['👑', '🥈', '🥉']

function PodiumSlot({ user, rank }: { user: UserProfile; rank: 0 | 1 | 2 }) {
  const rd = getRankDisplay(user.rank)
  const cfg = SLOT_CFG[rank]
  const isFirst = rank === 0
  const winrate = user.total_predictions > 0
    ? Math.round(user.correct_predictions / user.total_predictions * 100)
    : 0

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center',
        width: cfg.width,
        paddingTop: cfg.pt,
        paddingBottom: cfg.pb,
        paddingLeft: 12, paddingRight: 12,
        borderRadius: 20,
        border: cfg.border,
        boxShadow: cfg.shadow,
        background: '#fff',
      }}
    >
      <span style={{ fontSize: isFirst ? 22 : 17, lineHeight: 1, marginBottom: 10 }}>{MEDALS[rank]}</span>
      <Avatar name={user.display_name} size={cfg.avatarSize} />
      <p style={{ fontWeight: 800, color: '#111', fontSize: cfg.nameSz, marginTop: 10, lineHeight: 1.2, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {user.display_name}
      </p>
      <span style={{ fontSize: 10, fontWeight: 600, color: rd.color, background: `${rd.color}15`, borderRadius: 99, padding: '2px 7px', marginTop: 5, display: 'inline-block' }}>
        {rd.emoji} {rd.name}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', marginTop: 10 }}>
        <CountUpValue value={Number(user.coins)} style={{ fontWeight: 800, color: '#111', fontSize: cfg.coinSz } as React.CSSProperties} />
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: '#f59e0b', color: '#fff', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>P</span>
      </div>
      {winrate > 0 && (
        <p style={{ color: '#00b373', fontSize: 10, fontWeight: 600, marginTop: 4 }}>{winrate}% แม่น</p>
      )}
    </div>
  )
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<'coins' | 'winrate' | 'streak'>('coins')
  const supabase = createClient()

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    if (tab === 'coins') {
      const { data } = await supabase.from('users').select('*').order('coins', { ascending: false }).limit(20)
      setUsers(data ?? [])
    } else if (tab === 'winrate') {
      const { data } = await supabase.from('users').select('*').gte('total_predictions', 5).order('correct_predictions', { ascending: false }).limit(200)
      const sorted = ((data ?? []) as UserProfile[]).sort((a, b) => {
        const ra = a.total_predictions > 0 ? a.correct_predictions / a.total_predictions : 0
        const rb = b.total_predictions > 0 ? b.correct_predictions / b.total_predictions : 0
        return rb - ra
      }).slice(0, 20)
      setUsers(sorted)
    } else {
      const { data } = await supabase.from('users').select('*').order('win_streak', { ascending: false }).limit(20)
      setUsers(data ?? [])
    }
    setLoading(false)
    setRefreshing(false)
  }, [tab])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const onFocus = () => load(true)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])
  useEffect(() => {
    const channel = supabase.channel('leaderboard-users')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, () => load(true))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  const top3 = users.slice(0, 3) as UserProfile[]
  const rest = users.slice(3)

  const TABS = [
    { key: 'coins'   as const, label: 'คะแนน' },
    { key: 'winrate' as const, label: 'ทายถูก' },
    { key: 'streak'  as const, label: 'Streak' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">

      {/* Header */}
      <div className="text-center mb-1">
        <div className="inline-flex items-center gap-2">
          <h1 className="text-2xl font-black text-gray-900">อันดับนักพยากรณ์</h1>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="text-gray-300 hover:text-gray-500 transition-colors"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
        <p className="text-sm text-gray-400 mt-1">ผู้ที่แม่นที่สุดในจักรวาลภาวนา</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mt-5 mb-8">
        <div className="flex gap-1 bg-white border border-gray-200 rounded-full p-1 shadow-sm">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2 rounded-full text-[13px] font-semibold transition-all duration-150 ${
                tab === t.key
                  ? 'bg-[#00b373] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-white rounded-xl animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : (
        <>
          {/* Podium — items-end bottom-aligns all three; taller card = higher slot */}
          {top3.length >= 3 && (
            <div className="flex justify-center items-end gap-3 mb-10">
              {PODIUM_ORDER.map(rankIdx => {
                const u = top3[rankIdx]
                return u ? <PodiumSlot key={rankIdx} user={u} rank={rankIdx} /> : null
              })}
            </div>
          )}

          {/* Section divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs font-semibold text-gray-400 tracking-wide">ตามมาติดๆ</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Table header */}
          <div
            className="grid px-4 py-2 mb-1"
            style={{ gridTemplateColumns: '44px 1fr 88px 72px 56px 72px' }}
          >
            {['#', 'ผู้เล่น', 'คะแนน', 'ทายถูก', 'สตรีค', 'ทาย'].map((h, i) => (
              <span key={h} className={`text-[11px] font-semibold text-gray-400 ${i > 1 ? 'text-right' : ''}`}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          <div className="space-y-1.5">
            {rest.map((u, i) => {
              const rd = getRankDisplay(u.rank)
              const idx = i + 3
              const winrate = u.total_predictions > 0
                ? Math.round(u.correct_predictions / u.total_predictions * 100)
                : 0
              return (
                <div
                  key={u.id}
                  className="grid items-center px-4 py-3 bg-white border border-gray-100 rounded-2xl hover:border-gray-200 hover:shadow-sm transition-all duration-150 animate-fadeInUp"
                  style={{ gridTemplateColumns: '44px 1fr 88px 72px 56px 72px', animationDelay: `${i * 40}ms` }}
                >
                  <span className="text-[13px] font-bold text-gray-300">#{idx + 1}</span>

                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={u.display_name} size={36} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900 truncate leading-tight">{u.display_name}</p>
                      <span
                        className="text-[10px] font-semibold px-1.5 py-px rounded-full inline-block mt-0.5"
                        style={{ color: rd.color, background: `${rd.color}15` }}
                      >
                        {rd.emoji} {rd.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    <CountUpValue value={Number(u.coins)} className="text-[13px] font-bold text-gray-900 tabular-nums" />
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-400 text-white text-[9px] font-bold flex-shrink-0">P</span>
                  </div>

                  <div className="text-right">
                    <span className={`text-[13px] font-bold tabular-nums ${winrate >= 60 ? 'text-[#00b373]' : 'text-gray-700'}`}>
                      {winrate}%
                    </span>
                  </div>

                  <div className="text-right">
                    {u.win_streak > 0
                      ? <span className="text-[13px] font-bold text-orange-400 flex items-center justify-end gap-0.5"><Flame size={11} />{u.win_streak}</span>
                      : <span className="text-gray-300 text-[13px]">—</span>
                    }
                  </div>

                  <div className="text-right">
                    <span className="text-[13px] text-gray-500 tabular-nums">{u.correct_predictions}/{u.total_predictions}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
