'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { estimatePayout } from '@/lib/game/odds'
import { getRank } from '@/lib/game/ranks'
import type { Database } from '@/lib/supabase/types'
import { X, Check } from 'lucide-react'
import { toast } from '@/components/ui/Toast'
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
  const supabase = createClient()

  const animatedPayout = useCountUp(estimatePayout(question.pool, optionId, coins))
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
  const payout = estimatePayout(question.pool, optionId, coins)
  const pool = question.pool as Record<string, number>
  const totalPool = Object.values(pool).reduce((s, v) => s + v, 0)
  const optionPool = pool[optionId] ?? 0
  const pricePct = totalPool > 0 ? Math.round((optionPool / totalPool) * 100) : 50
  const gainPct = coins > 0 ? Math.round(((payout - coins) / coins) * 100) : 0

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
      toast(`ทายแล้ว! วาง ${coins.toLocaleString()} คะแนน 🔮`)
      setTimeout(() => onSuccess(coins), 700)
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

        {/* selected option + price */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">คำทายของคุณ</p>
            <p className="text-gray-900 font-semibold">{option?.label}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-0.5">โอกาสชนะ</p>
            <p className="text-gray-900 font-bold">{pricePct}%</p>
          </div>
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

        {/* payout estimate */}
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">คะแนนที่จะได้รับ <span className="text-gray-400 font-normal">(ประมาณ)</span></span>
            <span key={`pay-${popKey}`} className="text-green-600 font-bold text-lg flex items-center gap-1.5 animate-num-pop">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-[10px] leading-none">P</span>
              ~{animatedPayout.toLocaleString()} คะแนน
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">คะแนนที่เพิ่มขึ้น</span>
            <span key={`gain-${popKey}`} className="text-xs font-semibold text-green-600 animate-tickUp">
              ~+{(animatedPayout - coins).toLocaleString()} คะแนน ({gainPct > 0 ? '+' : ''}{gainPct}%)
            </span>
          </div>
          <p className="text-xs text-gray-400 pt-1 border-t border-green-100">คะแนนที่ได้รับขึ้นอยู่กับจำนวนผู้ร่วมทายทั้งหมด</p>
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {/* confirm */}
        <button
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
