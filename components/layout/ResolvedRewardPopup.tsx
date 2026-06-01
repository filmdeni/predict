'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getRank, getNextRank } from '@/lib/game/ranks'

interface RewardData {
  predictionId: string
  questionTitle: string
  questionId: string
  imageUrl: string | null
  isCorrect: boolean
  coinsWon: number
  repDelta: number
  winStreak: number
  reputation: number
}

export default function ResolvedRewardPopup() {
  const supabase = createClient()
  const [reward, setReward] = useState<RewardData | null>(null)
  const [flying, setFlying] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let userId: string | null = null

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      userId = data.user.id

      const channel = supabase
        .channel(`reward-popup:${userId}:${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'predictions', filter: `user_id=eq.${userId}` },
          async (payload) => {
            const pred = payload.new
            if (pred.is_correct === null || pred.is_correct === undefined) return

            const [qRes, uRes] = await Promise.all([
              supabase.from('questions').select('title, image_url').eq('id', pred.question_id).single(),
              supabase.from('users').select('win_streak, reputation').eq('id', userId!).single(),
            ])

            setReward({
              predictionId: pred.id,
              questionTitle: (qRes.data as any)?.title ?? '—',
              questionId: pred.question_id,
              imageUrl: (qRes.data as any)?.image_url ?? null,
              isCorrect: pred.is_correct,
              coinsWon: pred.coins_won ?? 0,
              repDelta: pred.rep_delta ?? 0,
              winStreak: (uRes.data as any)?.win_streak ?? 0,
              reputation: (uRes.data as any)?.reputation ?? 0,
            })
          }
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    })
  }, [])

  function handleClaim() {
    const btn = btnRef.current
    const target = document.getElementById('header-coins')
    if (!btn || !target || flying) { setReward(null); return }

    const from = btn.getBoundingClientRect()
    const to = target.getBoundingClientRect()

    const dx = (to.left + to.width / 2) - (from.left + from.width / 2)
    const dy = (to.top + to.height / 2) - (from.top + from.height / 2)

    // inject keyframes once
    const styleId = 'fly-coin-kf'
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style')
      s.id = styleId
      s.textContent = `
        @keyframes fly-coin {
          0%   { transform: translate(0,0) scale(1); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0.4); opacity: 0; }
        }
      `
      document.head.appendChild(s)
    }

    setFlying(true)

    // spawn 6 coins with staggered delays from button center
    const startX = from.left + from.width / 2
    const startY = from.top + from.height / 2

    const coins: HTMLElement[] = Array.from({ length: 6 }, (_, i) => {
      const el = document.createElement('div')
      el.style.cssText = `
        position: fixed;
        left: ${startX - 12}px;
        top: ${startY - 12}px;
        width: 24px; height: 24px;
        border-radius: 50%;
        background: linear-gradient(135deg, #fb923c, #f59e0b);
        color: white; font-weight: 900; font-size: 11px;
        display: flex; align-items: center; justify-content: center;
        pointer-events: none; z-index: 9999;
        --dx: ${dx + (Math.random() * 16 - 8)}px;
        --dy: ${dy + (Math.random() * 16 - 8)}px;
        animation: fly-coin 0.7s cubic-bezier(.4,0,.2,1) ${i * 60}ms forwards;
      `
      el.textContent = 'P'
      document.body.appendChild(el)
      return el
    })

    // flash target
    setTimeout(() => {
      target.classList.add('scale-125', 'brightness-125')
      setTimeout(() => target.classList.remove('scale-125', 'brightness-125'), 300)
    }, 500)

    setTimeout(() => {
      coins.forEach(c => c.remove())
      setFlying(false)
      setReward(null)
      window.dispatchEvent(new Event('coins-updated'))
    }, 800)
  }

  function showMock() {
    setReward({
      predictionId: 'mock',
      questionTitle: 'ทีมไทยจะผ่านเข้ารอบ 16 ทีมสุดท้ายของ World Cup 2026 ได้หรือไม่?',
      questionId: 'mock',
      imageUrl: null,
      isCorrect: true,
      coinsWon: 1_240,
      repDelta: 22,
      winStreak: 5,
      reputation: 420,
    })
  }

  return (
    <>
      {process.env.NODE_ENV === 'development' && !reward && (
        <button
          onClick={showMock}
          className="fixed bottom-24 right-4 z-40 bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg hover:bg-indigo-700 transition-colors"
        >
          🧪 Mock Reward
        </button>
      )}

      {reward && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4" onClick={() => setReward(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <div
            className="relative bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* top gradient strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400" />

            <div className="px-6 pt-6 pb-8 flex flex-col gap-5">
              {/* image + badge + title */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  {reward.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={reward.imageUrl} alt="" className="w-16 h-16 rounded-2xl object-cover shadow-md" />
                  ) : (
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-md ${reward.isCorrect ? 'bg-amber-50' : 'bg-gray-100'}`}>
                      {reward.isCorrect ? '🎉' : '😢'}
                    </div>
                  )}
                  <span className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow ${reward.isCorrect ? 'bg-gray-900' : 'bg-red-500'}`}>
                    {reward.isCorrect ? '✓' : '✗'}
                  </span>
                </div>

                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900 leading-tight">
                    {reward.isCorrect ? 'ทายถูก!' : 'ทายผิด'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-snug max-w-xs">{reward.questionTitle}</p>
                </div>
              </div>

              {reward.isCorrect ? (
                <div className="flex flex-col gap-3">
                  {/* big coins */}
                  <div className="bg-gray-50 rounded-2xl px-5 py-4">
                    <p className="text-xs text-gray-400 font-medium mb-1">คะแนนที่ได้รับ</p>
                    <div className="flex items-center gap-2">
                      <span className="text-4xl font-black text-amber-500 tracking-tight">+{reward.coinsWon.toLocaleString()}</span>
                      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-black text-base shadow-sm">P</span>
                    </div>
                  </div>

                  {/* EXP + streak side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    {reward.repDelta > 0 && (
                      <div className="bg-indigo-50 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[10px]">⭐</span>
                          <span className="text-[11px] text-gray-500 font-medium">ชื่อเสียง (EXP)</span>
                        </div>
                        <p className="text-xl font-black text-indigo-600">+{Math.round(reward.repDelta)}</p>
                      </div>
                    )}
                    {reward.winStreak > 1 && (
                      <div className="bg-orange-50 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-base leading-none">🔥</span>
                          <span className="text-[11px] text-gray-500 font-medium">Win Streak</span>
                        </div>
                        <p className="text-xl font-black text-orange-500">{reward.winStreak} <span className="text-sm font-semibold">ครั้งติด</span></p>
                      </div>
                    )}
                  </div>

                  {/* rank progress */}
                  {(() => {
                    const rep = reward.reputation
                    const current = getRank(rep)
                    const next = getNextRank(rep)
                    if (!next) return (
                      <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                        <span className="text-2xl">{current.emoji}</span>
                        <div>
                          <p className="text-xs text-gray-400">ระดับสูงสุดแล้ว</p>
                          <p className="text-sm font-bold text-gray-900">{current.tier}</p>
                        </div>
                      </div>
                    )
                    const remaining = next.minRep - rep
                    const range = next.minRep - current.minRep
                    const pct = Math.min(100, Math.floor(((rep - current.minRep) / range) * 100))
                    return (
                      <div className="bg-gray-50 rounded-2xl px-4 py-3 space-y-2.5">
                        <div className="flex items-center gap-3">
                          {/* shield icon */}
                          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl flex-shrink-0">
                            {current.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-400 font-medium">ระดับ{current.tier}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs font-bold text-gray-700">{current.tier}</span>
                              <span className="text-gray-300 text-xs">→</span>
                              <span className="text-xs font-bold" style={{ color: next.color }}>{next.tier}</span>
                              <span className="text-sm">{next.emoji}</span>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-gray-500 flex-shrink-0">{pct}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: next.color }}
                          />
                        </div>
                        <p className="text-[11px] text-center text-gray-400">
                          อีก <span className="font-bold text-gray-700">{remaining.toLocaleString()} EXP</span> จะได้ฉายา <span className="font-bold" style={{ color: next.color }}>&ldquo;{next.title}&rdquo;</span>
                        </p>
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-2">เป็นกำลังใจให้ครั้งหน้า — ลุ้นต่อไปนะ!</p>
              )}

              <button
                ref={btnRef}
                onClick={handleClaim}
                disabled={flying}
                className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-700 transition-all text-sm tracking-wide disabled:opacity-70"
              >
                รับรางวัล
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
