'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { LogOut, Trophy, Target, Flame, Coins } from 'lucide-react'

type UserProfile = Database['public']['Tables']['users']['Row']
type Prediction = Database['public']['Tables']['predictions']['Row'] & {
  questions: { title: string; options: { id: string; label: string }[] } | null
}

const RANK_COLOR: Record<string, string> = {
  'มือใหม่': 'text-gray-400 bg-gray-100',
  'นักพยากรณ์': 'text-blue-600 bg-blue-50',
  'โหรมือทอง': 'text-yellow-600 bg-yellow-50',
  'เซียนฟันธง': 'text-purple-600 bg-purple-50',
  'เทพทำนาย': 'text-red-600 bg-red-50',
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: prof }, { data: preds }] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase
          .from('predictions')
          .select('*, questions(title, options)')
          .eq('user_id', user.id)
          .order('placed_at', { ascending: false })
          .limit(20),
      ])
      setProfile(prof as unknown as UserProfile)
      setPredictions((preds ?? []) as Prediction[])
      setLoading(false)
    }
    load()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-6 space-y-4">
        <div className="h-24 bg-white rounded-2xl animate-pulse border border-gray-200" />
        <div className="h-40 bg-white rounded-2xl animate-pulse border border-gray-200" />
      </div>
    )
  }

  if (!profile) return null

  const winRate = profile.total_predictions > 0
    ? Math.round((profile.correct_predictions / profile.total_predictions) * 100)
    : 0

  return (
    <div className="max-w-lg mx-auto p-6 space-y-5">
      {/* Profile card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl font-bold text-green-700">
            {profile.display_name[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-gray-900 font-bold text-lg">{profile.display_name}</h1>
            <p className="text-gray-400 text-sm">@{profile.username}</p>
            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${RANK_COLOR[profile.rank] ?? 'text-gray-500 bg-gray-100'}`}>
              {profile.rank}
            </span>
          </div>
          <button onClick={signOut} className="p-2 text-gray-400 hover:text-gray-700 transition-colors">
            <LogOut size={18} />
          </button>
        </div>

        {/* Coins */}
        <div className="mt-4 bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">เหรียญของฉัน</span>
          <span className="text-xl font-bold text-gray-900">🪙 {profile.coins.toLocaleString()}</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-3">
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
      </div>

      {/* Prediction history */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">ประวัติการทาย</h2>
        {predictions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">🔮</p>
            <p className="text-sm">ยังไม่เคยทายเลย</p>
          </div>
        ) : (
          <div className="space-y-2">
            {predictions.map(p => {
              const optLabel = p.questions?.options?.find(o => o.id === p.option_id)?.label ?? p.option_id
              const statusColor = p.is_correct === null
                ? 'bg-gray-100 text-gray-500'
                : p.is_correct
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-600'
              const statusText = p.is_correct === null ? 'รอผล' : p.is_correct ? 'ถูก ✓' : 'ผิด ✗'

              return (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{p.questions?.title ?? '—'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">ทาย: <span className="text-gray-600 font-medium">{optLabel}</span> · {p.coins_wagered.toLocaleString()} 🪙</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>{statusText}</span>
                    {p.coins_won !== null && p.coins_won > 0 && (
                      <span className="text-xs text-green-600 font-medium">+{p.coins_won.toLocaleString()} 🪙</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
