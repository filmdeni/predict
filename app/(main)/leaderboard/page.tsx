'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { Trophy, Flame } from 'lucide-react'

type UserProfile = Database['public']['Tables']['users']['Row']

const RANK_BADGE: Record<string, string> = {
  'มือใหม่': '🌱',
  'นักพยากรณ์': '🔮',
  'โหรมือทอง': '🥇',
  'เซียนฟันธง': '⚡',
  'เทพทำนาย': '👑',
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
      const orderCol = tab === 'reputation' ? 'coins' : tab === 'winrate' ? 'correct_predictions' : 'win_streak'
      const { data } = await supabase
        .from('users')
        .select('*')
        .order(orderCol, { ascending: false })
        .limit(20)
      setUsers(data ?? [])
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
            const value = tab === 'reputation' ? `${u.coins.toLocaleString()} P`
              : tab === 'winrate' ? `${u.correct_predictions}/${u.total_predictions} ถูก`
              : `${u.win_streak} streak`

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
                  <p className="text-xs text-gray-400">{RANK_BADGE[u.rank]} {u.rank}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{value}</p>
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
