'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { Trophy, Flame } from 'lucide-react'
import { RANKS } from '@/lib/game/ranks'

type UserProfile = Database['public']['Tables']['users']['Row']

function getRankDisplay(tier: string) {
  return RANKS.find(r => r.tier === tier) ?? RANKS[0]
}

const MEDAL = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'reputation' | 'winrate' | 'streak'>('reputation')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      if (tab === 'winrate') {
        // sort client-side by true win rate (min 5 predictions)
        const { data } = await supabase
          .from('users')
          .select('*')
          .gte('total_predictions', 5)
          .order('correct_predictions', { ascending: false })
          .limit(200)
        const sorted = ((data ?? []) as UserProfile[]).sort((a, b) => {
          const ra = a.total_predictions > 0 ? a.correct_predictions / a.total_predictions : 0
          const rb = b.total_predictions > 0 ? b.correct_predictions / b.total_predictions : 0
          return rb - ra
        }).slice(0, 20)
        setUsers(sorted)
      } else {
        const orderCol = tab === 'reputation' ? 'reputation' : 'win_streak'
        const { data } = await supabase
          .from('users')
          .select('*')
          .order(orderCol, { ascending: false })
          .limit(20)
        setUsers(data ?? [])
      }
      setLoading(false)
    }
    load()
  }, [tab])

  return (
    <div className="max-w-lg mx-auto p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Trophy size={20} className="text-yellow-500" />
        <h1 className="text-xl font-bold text-gray-900">อันดับ</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1">
        {([
          { key: 'reputation', label: 'คะแนน' },
          { key: 'winrate', label: 'ทายถูก' },
          { key: 'streak', label: 'Streak' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl animate-pulse border border-gray-200" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u, i) => {
            const coinsValue = u.coins.toLocaleString()

            return (
              <div
                key={u.id}
                className={`bg-white border rounded-xl px-4 py-3 flex items-center gap-3 ${
                  i < 3 ? 'border-yellow-200' : 'border-gray-200'
                }`}
              >
                <span className="w-8 text-center text-lg font-bold">
                  {i < 3 ? MEDAL[i] : <span className="text-gray-400 text-sm">{i + 1}</span>}
                </span>
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-base font-bold text-green-700">
                  {u.display_name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{u.display_name}</p>
                  {(() => {
                    const rd = getRankDisplay(u.rank)
                    return (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-bold" style={{ color: rd.color }}>
                          {rd.emoji} {rd.name}
                        </span>
                        <span className="text-gray-300 text-xs">·</span>
                        <span className="text-[11px] text-gray-400">"{rd.title}"</span>
                      </div>
                    )
                  })()}
                </div>
                <div className="text-right">
                  {tab === 'reputation' ? (
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-sm font-bold text-gray-900">{Number(u.reputation ?? 0).toLocaleString()}</span>
                      <span className="text-xs text-gray-400">rep</span>
                    </div>
                  ) : tab === 'winrate' ? (
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {u.total_predictions > 0 ? Math.round(u.correct_predictions / u.total_predictions * 100) : 0}%
                      </p>
                      <p className="text-[11px] text-gray-400">{u.correct_predictions}/{u.total_predictions}</p>
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-gray-900">{u.win_streak} streak</p>
                  )}
                  {u.win_streak > 2 && tab !== 'streak' && (
                    <p className="text-xs text-orange-400 flex items-center justify-end gap-0.5">
                      <Flame size={10} />{u.win_streak}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
