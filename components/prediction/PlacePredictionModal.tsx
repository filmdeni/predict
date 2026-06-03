'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getRank } from '@/lib/game/ranks'
import type { Database } from '@/lib/supabase/types'
import { X, Check, Lock, Zap } from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import { playPredictionSound, triggerBellPing } from '@/components/layout/RewardClaimFX'
import { useCountUp } from '@/lib/hooks/useCountUp'

type Question = Database['public']['Tables']['questions']['Row']

interface Props {
  question: Question
  optionId: string
  onClose: () => void
  onSuccess: (coinsWagered?: number) => void
}

const WAGER_CAPS: Record<string, number> = {
  'ผู้มาใหม่':      100,
  'ผู้ตื่นรู้':    100,
  'นักพยากรณ์':   200,
  'โหรมือทอง':    300,
  'เซียนทำนาย':   500,
  'เทพทำนาย':     700,
  'จักรวาลเลือก': 1000,
}

export default function PlacePredictionModal({ question, optionId, onClose, onSuccess }: Props) {
  const [coins, setCoins] = useState(10)
  const [maxWager, setMaxWager] = useState(100)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [popKey, setPopKey] = useState(0)
  const rippleRef = useRef<HTMLSpanElement>(null)
  const submitBtnRef = useRef<HTMLButtonElement>(null)
  const supabase = createClient()

  const animatedCoins = useCountUp(coins)

  const handleSlider = useCallback((v: number) => {
    setCoins(v)
    setPopKey(k => k + 1)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('users')
        .select('reputation')
        .eq('id', user.id)
        .single()
      if (!data) return
      const rank = getRank((data as { reputation: number }).reputation)
      setMaxWager(WAGER_CAPS[rank.tier] ?? 100)
    })
  }, [])

  const option = (question.options as { id: string; label: string }[]).find(o => o.id === optionId)

  const createdAt = new Date(question.created_at).getTime()
  const closesAt = new Date(question.closes_at).getTime()
  const fraction = (Date.now() - createdAt) / Math.max(closesAt - createdAt, 1)
  const earlyBirdBonus = fraction <= 0.10 ? 1.10 : fraction <= 0.30 ? 1.05 : 1.00
  const earlyBirdLabel = earlyBirdBonus >= 1.10 ? '+10% Early Bird' : earlyBirdBonus >= 1.05 ? '+5% Early Bird' : null

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('กรุณาเข้าสู่ระบบก่อนทายผล')
        setLoading(false)
        return
      }

      const refKey = `ref:${question.id}`
      const referredBy = localStorage.getItem(refKey)

      const { error: rpcError } = await supabase.rpc('place_prediction', {
        p_question_id: question.id,
        p_user_id: user.id,
        p_option_id: optionId,
        p_coins: coins,
        p_referred_by: referredBy ?? undefined,
      })

      if (!rpcError) localStorage.removeItem(refKey)

      if (rpcError) {
        const msg = rpcError.message ?? ''
        if (msg.includes('insufficient_coins')) setError('คะแนนไม่พอ')
        else if (msg.includes('question_not_available')) setError('คำถามนี้ปิดรับแล้ว')
        else if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('already')) setError('คุณทายคำถามนี้ไปแล้ว')
        else setError('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง')
        setLoading(false)
        return
      }

      setSuccess(true)
      playPredictionSound()
      toast(`ทายแล้ว! วาง ${coins.toLocaleString()} คะแนน 🔮`)
      // capture rect now (before modal closes), fire after modal unmounts
      const srcRect = submitBtnRef.current?.getBoundingClientRect() ?? null
      setTimeout(() => onSuccess(coins), 700)
      if (srcRect) setTimeout(() => triggerBellPing(srcRect), 800)
    } catch {
      setError('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง')
      setLoading(false)
    }
  }

  function handleRipple(e: React.MouseEvent<HTMLButtonElement>) {
    const btn = e.currentTarget
    const circle = rippleRef.current
    if (!circle) return
    const rect = btn.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    circle.style.width = circle.style.height = `${size}px`
    circle.style.left = `${e.clientX - rect.left - size / 2}px`
    circle.style.top = `${e.clientY - rect.top - size / 2}px`
    circle.classList.remove('ripple-circle')
    void circle.offsetWidth
    circle.classList.add('ripple-circle')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl p-6 space-y-5 shadow-2xl animate-sheet-up"
        onClick={e => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-lg">ยืนยันการทาย</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* selected option + early bird badge */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">คำทายของคุณ</p>
            <p className="text-gray-900 font-semibold">{option?.label}</p>
          </div>
          {earlyBirdLabel && (
            <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              <Zap size={11} className="fill-amber-500 text-amber-500" /> {earlyBirdLabel}
            </span>
          )}
        </div>

        {/* coin slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">คะแนนที่ใช้ทาย</span>
            <span key={popKey} className="text-gray-900 font-bold text-lg flex items-center gap-1.5 animate-num-pop">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-[10px] leading-none">P</span>
              {animatedCoins.toLocaleString()}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={maxWager}
            step={1}
            value={Math.min(coins, maxWager)}
            onChange={e => handleSlider(Number(e.target.value))}
            className="w-full accent-gray-900"
          />
          <div className="flex justify-between gap-2">
            {[10, 25, 50, 100].map(v => {
              const val = Math.round(maxWager * v / 100)
              return (
                <button
                  key={v}
                  onClick={() => handleSlider(val)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    coins === val
                      ? 'bg-gray-900 border-gray-900 text-white'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {v}%
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-gray-400 text-right">สูงสุด {maxWager.toLocaleString()} P ตามแรงก์ของคุณ</p>
        </div>

        {/* blind payout info */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-600 font-medium">คะแนนที่ได้รับ — เปิดเผยหลังปิดรับทาย</span>
          </div>
          <p className="text-xs text-gray-400">คะแนนคำนวณจาก pool รวมเมื่อปิดรับ ทายเร็วได้โบนัสเพิ่ม</p>
          {earlyBirdLabel && (
            <div className="flex items-center gap-1.5 pt-1 border-t border-gray-200">
              <Zap size={11} className="fill-amber-500 text-amber-500 flex-shrink-0" />
              <span className="text-xs text-amber-600 font-semibold">ได้รับโบนัส {earlyBirdLabel} เพราะทายเร็ว!</span>
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {/* confirm */}
        <button
          ref={submitBtnRef}
          onClick={e => { handleRipple(e); submit() }}
          disabled={loading || success}
          className="relative overflow-hidden w-full py-4 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-[0.97]"
          style={{ background: success ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
        >
          <span ref={rippleRef} className="absolute rounded-full bg-white/30 pointer-events-none" style={{ position: 'absolute' }} />
          {success ? (
            <span className="flex items-center justify-center gap-2 animate-check-in">
              <Check size={20} strokeWidth={3} /> ทายแล้ว!
            </span>
          ) : loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              กำลังส่ง...
            </span>
          ) : 'ยืนยันการทาย'}
        </button>
      </div>
    </div>
  )
}
