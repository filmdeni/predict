'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PlacePredictionModal from '@/components/prediction/PlacePredictionModal'
import CommentSection from '@/components/question/CommentSection'
import type { Database } from '@/lib/supabase/types'
import { getOdds, getPoolShares } from '@/lib/game/odds'
import { ArrowLeft, Share2, Link2, Check } from 'lucide-react'

type Question = Database['public']['Tables']['questions']['Row'] & {
  categories: { name_th: string; emoji: string }
}

function timeLeft(closesAt: string): string {
  const diff = new Date(closesAt).getTime() - Date.now()
  if (diff <= 0) return 'หมดเวลาแล้ว'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (days > 0) return `${days} วัน ${hours} ชม.`
  if (hours > 0) return `${hours} ชม. ${mins} นาที`
  return `${mins} นาที`
}

function urgencyLevel(closesAt: string): 'normal' | 'soon' | 'critical' {
  const diff = new Date(closesAt).getTime() - Date.now()
  if (diff <= 1800000) return 'critical'   // < 30 min
  if (diff <= 7200000) return 'soon'        // < 2 hr
  return 'normal'
}

export default function QuestionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [question, setQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [success, setSuccess] = useState(false)
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null)
  const [trendingOption, setTrendingOption] = useState<{ id: string; label: string; delta: number } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  // store ref param from URL into localStorage so PlacePredictionModal can use it
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) localStorage.setItem(`ref:${id}`, ref)
  }, [id])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('questions')
        .select('*, categories(name_th, emoji)')
        .eq('id', id)
        .single()
      setQuestion(data as unknown as Question)
      setLoading(false)
    }
    load()

    // realtime: subscribe to pool/predictions_count changes
    const channel = supabase
      .channel(`question:${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'questions', filter: `id=eq.${id}` },
        (payload) => {
          setQuestion(prev => {
            if (!prev) return prev
            const oldShares = getPoolShares(prev.pool)
            const newShares = getPoolShares(payload.new.pool as Record<string, number>)
            const opts = prev.options as { id: string; label: string }[]
            let best: { id: string; label: string; delta: number } | null = null
            for (const opt of opts) {
              const delta = (newShares[opt.id] ?? 0) - (oldShares[opt.id] ?? 0)
              if (delta > 0 && (!best || delta > best.delta)) best = { ...opt, delta }
            }
            if (best) setTrendingOption(best)
            return { ...prev, ...payload.new }
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-52 bg-white rounded-2xl animate-pulse border border-gray-200" />
      </div>
    )
  }

  if (!question) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p className="text-4xl mb-2">❓</p>
        <p>ไม่พบคำถามนี้</p>
      </div>
    )
  }

  const isOpen = question.status === 'open' && new Date(question.closes_at) > new Date()
  const options = question.options as { id: string; label: string }[]
  const shares = getPoolShares(question.pool)

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-5">
      {/* back + share */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} /> กลับ
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              const refUrl = user
                ? `${window.location.origin}/question/${id}?ref=${user.id}`
                : window.location.href
              await navigator.clipboard.writeText(refUrl)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Link2 size={16} />}
            {copied ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}
          </button>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={async () => {
                const refUrl = user
                  ? `${window.location.origin}/question/${id}?ref=${user.id}`
                  : window.location.href
                try { await navigator.share({ title: question.title, url: refUrl }) } catch { /* cancelled */ }
              }}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <Share2 size={16} /> แชร์
            </button>
          )}
        </div>
      </div>

      {/* question card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
            {question.categories.emoji} {question.categories.name_th}
          </span>
          {isOpen && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              เหลือ {timeLeft(question.closes_at)}
            </span>
          )}
        </div>

        <h1 className="text-gray-900 font-bold text-lg leading-snug">{question.title}</h1>

        {question.description && (
          <p className="text-gray-500 text-sm leading-relaxed">{question.description}</p>
        )}

        {/* pool bar */}
        <div className="space-y-2">
          <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
            {options.map((opt, i) => {
              const colors = ['bg-green-400', 'bg-red-400', 'bg-blue-400', 'bg-orange-400']
              return (
                <div
                  key={opt.id}
                  className={`${colors[i % colors.length]} transition-all duration-500`}
                  style={{ width: `${shares[opt.id] ?? 0}%` }}
                />
              )
            })}
          </div>
          <div className="flex justify-between flex-wrap gap-2">
            {options.map((opt, i) => {
              const colors = ['bg-green-400', 'bg-red-400', 'bg-blue-400', 'bg-orange-400']
              return (
                <div key={opt.id} className="flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
                  <span className="text-xs text-gray-500">{opt.label}</span>
                  <span className="text-xs font-bold text-gray-900">{(shares[opt.id] ?? 0).toFixed(0)}%</span>
                </div>
              )
            })}
            <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-[9px] leading-none flex-shrink-0">P</span>
                คะแนนรวม {question.total_pool.toLocaleString()}
              </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400 pt-1 border-t border-gray-100">
          <span>👥 {question.predictions_count} คนทาย</span>
          <span className="flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-[9px] leading-none flex-shrink-0">P</span>
            คะแนนรวม {question.total_pool.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Option buttons */}
      {isOpen && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500 font-medium">คุณคิดว่าผลจะเป็นอย่างไร?</p>
          {options.map((opt) => {
            const odds = getOdds(question.pool, opt.id)
            const selected = selectedOption === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => setSelectedOption(opt.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 transition-all ${
                  selected
                    ? 'bg-gray-900 border-gray-900 text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
                }`}
              >
                <span className="font-semibold">{opt.label}</span>
                <span className={`text-sm font-medium ${selected ? 'text-gray-300' : 'text-gray-400'}`}>
                  {odds > 0 ? `${odds.toFixed(2)}x` : `${(100 / options.length).toFixed(0)}%`}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* FOMO strip */}
      {isOpen && (
        <div className="flex flex-wrap gap-2">
          {trendingOption && (
            <span className="flex items-center gap-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2.5 py-1 font-medium">
              🔥 คนกำลังเทไปฝั่ง &ldquo;{trendingOption.label}&rdquo;
              {trendingOption.delta >= 1 && <span className="text-orange-500">+{trendingOption.delta.toFixed(0)}%</span>}
            </span>
          )}
          {(() => {
            const level = urgencyLevel(question.closes_at)
            if (level === 'critical') return (
              <span className="flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded-full px-2.5 py-1 font-medium animate-pulse">
                ⏰ ปิดตลาดใน {timeLeft(question.closes_at)}!
              </span>
            )
            if (level === 'soon') return (
              <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-1 font-medium">
                ⏰ ปิดตลาดใน {timeLeft(question.closes_at)}
              </span>
            )
            return null
          })()}
          {question.predictions_count >= 5 && (
            <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-2.5 py-1 font-medium">
              👥 {question.predictions_count} คนทายแล้ว
            </span>
          )}
        </div>
      )}

      {/* CTA */}
      {isOpen && selectedOption && (
        <button
          onClick={() => user ? setShowModal(true) : router.push(`/login?next=/question/${id}`)}
          className="w-full py-4 active:scale-[0.98] text-white font-bold rounded-xl transition-all"
          style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
        >
          {user ? '🙏 ภาวนา' : 'เข้าสู่ระบบเพื่อทาย →'}
        </button>
      )}

      {/* Success */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-2">
          <div className="text-4xl">🎯</div>
          <p className="text-green-700 font-bold text-lg">ทายแล้ว! ลุ้นได้เลย 🔮</p>
          <p className="text-green-600 text-sm">รอลุ้นผล และรับการแจ้งเตือนเมื่อเฉลย</p>
        </div>
      )}

      {/* Resolved result */}
      {question.status === 'resolved' && question.correct_option && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-green-700 font-semibold">
            ✅ ผลลัพธ์: {options.find(o => o.id === question.correct_option)?.label}
          </p>
        </div>
      )}

      {/* Comments */}
      <CommentSection questionId={id} />

      {/* Modal */}
      {showModal && selectedOption && (
        <PlacePredictionModal
          question={question}
          optionId={selectedOption}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            setSuccess(true)
            setSelectedOption(null)
          }}
        />
      )}
    </div>
  )
}
