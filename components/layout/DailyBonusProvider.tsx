'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getRank } from '@/lib/game/ranks'
import type { RankTier } from '@/lib/supabase/types'

type Toast = { type: 'daily' | 'rankup'; message: string; sub?: string }

export default function DailyBonusProvider() {
  const [toast, setToast] = useState<Toast | null>(null)
  const supabase = createClient()

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Daily bonus
      const { data: bonus } = await supabase.rpc('daily_login_bonus', { p_user_id: user.id })
      if (bonus && bonus > 0) {
        setToast({ type: 'daily', message: `+${bonus} P`, sub: 'โบนัส login รายวัน' })
        setTimeout(() => setToast(null), 3500)
        window.dispatchEvent(new CustomEvent('coins-updated'))
      }

      // Watch for rank-up
      const { data: profile } = await supabase
        .from('users')
        .select('rank, reputation')
        .eq('id', user.id)
        .single()
      if (!profile) return

      let currentRank = (profile as { rank: RankTier }).rank

      channel = supabase
        .channel(`rankwatch:${user.id}:${Date.now()}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}`
        }, (payload) => {
          const newRank = (payload.new as { rank: RankTier }).rank
          if (newRank !== currentRank) {
            const rd = getRank((payload.new as { reputation: number }).reputation)
            setToast({ type: 'rankup', message: `${rd.emoji} ${rd.name}`, sub: `ขึ้นแรงก์แล้ว! "${rd.title}"` })
            setTimeout(() => setToast(null), 5000)
            currentRank = newRank
          }
        })
        .subscribe()
    }

    init()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  if (!toast) return null

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* floating coins */}
      {toast.type === 'daily' && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              className="absolute flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-sm shadow-lg"
              style={{
                left: `${12 + i * 10}%`,
                top: '65%',
                opacity: 0,
                animation: `floatUp ${1.2 + i * 0.1}s ease-out ${i * 0.1}s forwards`,
              }}
            >
              P
            </span>
          ))}
        </div>
      )}

      {/* toast */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <div className={`
          flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-white
          animate-in fade-in slide-in-from-top-4 duration-300
          ${toast.type === 'rankup'
            ? 'bg-gradient-to-r from-purple-600 to-pink-500'
            : 'bg-gradient-to-r from-amber-500 to-orange-500'}
        `}>
          <span className="text-xl">{toast.type === 'rankup' ? '🎉' : '🎁'}</span>
          <div>
            <p className="font-bold text-base leading-tight">{toast.message}</p>
            {toast.sub && <p className="text-xs opacity-80">{toast.sub}</p>}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1);   opacity: 1; }
          80%  { transform: translateY(-180px) scale(1.2); opacity: 0.8; }
          100% { transform: translateY(-240px) scale(0.8); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
