'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getRank, getProgressToNext, getNextRank } from '@/lib/game/ranks'
import type { Database } from '@/lib/supabase/types'
import { Target, Trophy, Flame, ArrowLeft } from 'lucide-react'

type UserProfile = Database['public']['Tables']['users']['Row']

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()
      .then(({ data }) => {
        if (!data) setNotFound(true)
        else setProfile(data as unknown as UserProfile)
        setLoading(false)
      })
  }, [username])

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-6 space-y-4">
        <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-40 bg-white rounded-2xl animate-pulse border border-gray-200" />
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center py-24">
        <p className="text-4xl mb-3">🌫️</p>
        <p className="text-gray-500">ไม่พบผู้ใช้ @{username}</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-gray-400 hover:text-gray-700">← กลับ</button>
      </div>
    )
  }

  const rank = getRank(profile.reputation)
  const nextRank = getNextRank(profile.reputation)
  const progress = getProgressToNext(profile.reputation)
  const winRate = profile.total_predictions > 0
    ? Math.round((profile.correct_predictions / profile.total_predictions) * 100)
    : 0

  return (
    <div className="max-w-lg mx-auto p-6 space-y-5">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
        <ArrowLeft size={16} /> กลับ
      </button>

      {/* Profile card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${rank.color}cc, ${rank.color})` }}
          >
            {profile.display_name[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-gray-900 font-bold text-lg">{profile.display_name}</h1>
            <p className="text-gray-400 text-sm">@{profile.username}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-sm font-bold" style={{ color: rank.color }}>
                {rank.emoji} {rank.name}
              </span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400">"{rank.title}"</span>
            </div>
          </div>
        </div>

        {/* Rank progress */}
        {nextRank && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{rank.name}</span>
              <span style={{ color: nextRank.color }}>{nextRank.emoji} {nextRank.name}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, background: rank.color }}
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1 text-right">{progress}% ถึง {nextRank.name}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <Target size={16} className="mx-auto text-gray-400 mb-1" />
            <p className="text-lg font-bold text-gray-900">{profile.total_predictions}</p>
            <p className="text-xs text-gray-400">ทายทั้งหมด</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <Trophy size={16} className="mx-auto text-yellow-500 mb-1" />
            <p className="text-lg font-bold text-gray-900">{winRate}%</p>
            <p className="text-xs text-gray-400">แม่นยำ</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <Flame size={16} className="mx-auto text-orange-400 mb-1" />
            <p className="text-lg font-bold text-gray-900">{profile.win_streak}</p>
            <p className="text-xs text-gray-400">streak</p>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-4 text-sm text-gray-500 border-t border-gray-100 pt-3">{profile.bio}</p>
        )}
      </div>

      {/* Best streak badge */}
      {profile.best_streak >= 3 && (
        <div className="bg-white border border-orange-100 rounded-2xl px-5 py-3.5 flex items-center gap-3 shadow-sm">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-sm font-bold text-gray-900">Best Streak</p>
            <p className="text-xs text-gray-400">ทายถูกติดต่อกันสูงสุด {profile.best_streak} ครั้ง</p>
          </div>
        </div>
      )}
    </div>
  )
}
