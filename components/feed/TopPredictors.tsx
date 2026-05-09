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

type CategoryUser = {
  user_id: string
  display_name: string
  username: string
  avatar_url: string | null
  rank: string
  coins: number
  total: number
  correct: number
}

const RANK_COLOR: Record<string, string> = {
  'ตำนาน': 'text-yellow-500',
  'ผู้เชี่ยวชาญ': 'text-purple-500',
  'ขั้นสูง': 'text-blue-500',
  'กลาง': 'text-green-500',
  'มือใหม่': 'text-gray-400',
}

const MEDAL = ['🥇', '🥈', '🥉']

export default function TopPredictors({ category }: { category: string }) {
  const [users, setUsers] = useState<TopUser[]>([])
  const [catUsers, setCatUsers] = useState<CategoryUser[]>([])
  const [tab, setTab] = useState<'coins' | 'accuracy'>('coins')
  const supabase = createClient()

  // Global leaderboard (for 'all')
  useEffect(() => {
    if (category !== 'all') return
    supabase
      .from('users')
      .select('id, username, display_name, avatar_url, coins, correct_predictions, total_predictions, rank')
      .order(tab === 'coins' ? 'coins' : 'correct_predictions', { ascending: false })
      .limit(5)
      .then(({ data }) => setUsers((data as TopUser[]) ?? []))
  }, [tab, category])

  // Per-category leaderboard
  useEffect(() => {
    if (category === 'all') return

    async function loadCategory() {
      // Get category id from slug
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', category)
        .single()
      if (!cat || !('id' in cat)) return
      const catId = (cat as { id: number }).id

      // Get all predictions for questions in this category
      const { data: preds } = await supabase
        .from('predictions')
        .select('user_id, coins_wagered, coins_won, is_correct, questions!inner(category_id)')
        .eq('questions.category_id', catId)

      if (!preds || preds.length === 0) {
        setCatUsers([])
        return
      }

      // Aggregate per user
      const agg: Record<string, { total: number; correct: number; coins_won: number }> = {}
      for (const p of preds as any[]) {
        if (!agg[p.user_id]) agg[p.user_id] = { total: 0, correct: 0, coins_won: 0 }
        agg[p.user_id].total++
        if (p.is_correct) agg[p.user_id].correct++
        agg[p.user_id].coins_won += p.coins_won ?? 0
      }

      const userIds = Object.keys(agg)
      const { data: userRows } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, rank, coins')
        .in('id', userIds)

      const result: CategoryUser[] = (userRows as any[] ?? []).map(u => ({
        user_id: u.id,
        display_name: u.display_name,
        username: u.username,
        avatar_url: u.avatar_url,
        rank: u.rank,
        coins: agg[u.id].coins_won,
        total: agg[u.id].total,
        correct: agg[u.id].correct,
      }))

      result.sort((a, b) =>
        tab === 'coins' ? b.coins - a.coins : b.correct - a.correct
      )

      setCatUsers(result.slice(0, 5))
    }

    loadCategory()
  }, [tab, category])

  const isAll = category === 'all'
  const displayUsers = isAll ? users : catUsers

  if (displayUsers.length === 0) return null

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
        {displayUsers.map((user, i) => {
          const total = isAll ? (user as TopUser).total_predictions : (user as CategoryUser).total
          const correct = isAll ? (user as TopUser).correct_predictions : (user as CategoryUser).correct
          const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
          const coins = isAll ? (user as TopUser).coins : (user as CategoryUser).coins
          const id = isAll ? (user as TopUser).id : (user as CategoryUser).user_id

          return (
            <div key={id} className="flex items-center gap-3 px-4 py-3">
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
                    <p className="text-sm font-bold text-gray-900">{coins.toLocaleString()}</p>
                    <p className="text-[11px] text-gray-400">P</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-gray-900">{correct}</p>
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
