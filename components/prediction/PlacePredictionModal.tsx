'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { estimatePayout } from '@/lib/game/odds'
import type { Database } from '@/lib/supabase/types'
import { X } from 'lucide-react'

type Question = Database['public']['Tables']['questions']['Row']

interface Props {
  question: Question
  optionId: string
  onClose: () => void
  onSuccess: () => void
}

export default function PlacePredictionModal({ question, optionId, onClose, onSuccess }: Props) {
  const [coins, setCoins] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const option = question.options.find(o => o.id === optionId)
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: rpcError } = await (supabase as any).rpc('place_prediction', {
        p_question_id: question.id,
        p_user_id: user.id,
        p_option_id: optionId,
        p_coins: coins,
      })

      if (rpcError) {
        if (rpcError.message.includes('insufficient_coins')) setError('เหรียญไม่พอ')
        else if (rpcError.message.includes('question_not_available')) setError('คำถามนี้ปิดรับแล้ว')
        else if (rpcError.message.includes('unique')) setError('คุณทายคำถามนี้ไปแล้ว')
        else setError('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง')
        setLoading(false)
        return
      }

      onSuccess()
    } catch {
      setError('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl p-6 space-y-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-lg">วางการทาย</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* selected option + price */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">คำตอบที่เลือก</p>
            <p className="text-gray-900 font-semibold">{option?.label}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-0.5">ราคา (โอกาส)</p>
            <p className="text-gray-900 font-bold">{pricePct}%</p>
          </div>
        </div>

        {/* coin slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">จำนวนเหรียญ</span>
            <span className="text-gray-900 font-bold text-lg">{coins.toLocaleString()} 🪙</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={coins}
            onChange={e => setCoins(Number(e.target.value))}
            className="w-full accent-gray-900"
          />
          <div className="flex justify-between gap-2">
            {[5, 10, 50, 100].map(v => (
              <button
                key={v}
                onClick={() => setCoins(v)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  coins === v
                    ? 'bg-gray-900 border-gray-900 text-white'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* payout estimate */}
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">ถ้าถูก ได้รับ</span>
            <span className="text-green-600 font-bold text-lg">{payout.toLocaleString()} 🪙</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">กำไร</span>
            <span className="text-xs font-semibold text-green-600">
              +{(payout - coins).toLocaleString()} 🪙 ({gainPct > 0 ? '+' : ''}{gainPct}%)
            </span>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {/* confirm */}
        <button
          onClick={submit}
          disabled={loading}
          className="w-full py-4 bg-gray-900 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-[0.98]"
        >
          {loading ? 'กำลังส่ง...' : `ยืนยัน — ภาวนา! 🎯`}
        </button>
      </div>
    </div>
  )
}
