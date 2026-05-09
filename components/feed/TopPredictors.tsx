'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type TopUser = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  coins: number
  correct_predictions: number
  total_predictions: number
  rank: string
}

const RANK_COLOR: Record<string, string> = {
  'ตำนาน': 'text-yellow-500',
  'ผู้เชี่ยวชาญ': 'text-purple-500',
  'ขั้นสูง': 'text-blue-500',
  'กลาง': 'text-green-500',
  'มือใหม่': 'text-gray-400',
}

const MEDAL = ['🥇', '🥈', '🥉']

export default function TopPredictors() {
  const [users, setUsers] = useState<TopUser[]>([])
  const [tab, setTab] = useState<'coins' | 'accuracy'>('coins')
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('users')
      .select('id, username, display_name, avatar_url, coins, correct_predictions, total_predictions, rank')
      .order(tab === 'coins' ? 'coins' : 'correct_predictions', { ascending: false })
      .limit(5)
      .then(({ data }) => setUsers((data as TopUser[]) ?? []))
  }, [tab])

  if (users.length === 0) return null

  return (
    <div className="mx-4 mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <span className="font-bold text-gray-900 text-base">นักทายอันดับต้น</span>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-full p-0.5">
          <button
            onClick={() => setTab('coins')}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
              tab === 'coins' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            คะแนนสูงสุด
          </button>
          <button
            onClick={() => setTab('accuracy')}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
              tab === 'accuracy' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            ทายถูกมากสุด
          </button>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-50">
        {users.map((user, i) => {
          const accuracy =
            user.total_predictions > 0
              ? Math.round((user.correct_predictions / user.total_predictions) * 100)
              : 0
          return (
            <div key={user.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-6 text-center text-base">{MEDAL[i] ?? `${i + 1}`}</span>
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.display_name}
                  className="w-9 h-9 rounded-full object-cover border border-gray-100"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
                  {user.display_name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.display_name}</p>
                <p className={`text-xs font-medium ${RANK_COLOR[user.rank] ?? 'text-gray-400'}`}>
                  {user.rank}
                </p>
              </div>
              <div className="text-right">
                {tab === 'coins' ? (
                  <>
                    <p className="text-sm font-bold text-gray-900">
                      {user.coins.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-gray-400">P</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-gray-900">{user.correct_predictions}</p>
                    <p className="text-[11px] text-gray-400">{accuracy}% แม่น</p>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
