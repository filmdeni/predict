'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PlacePredictionModal from '@/components/prediction/PlacePredictionModal'
import CommentSection from '@/components/question/CommentSection'
import type { Database } from '@/lib/supabase/types'
import { getOdds, getPoolShares } from '@/lib/game/odds'
import { ArrowLeft, Share2, Link2, Check } from 'lucide-react'
import ProbabilityChart from '@/components/question/ProbabilityChart'

type Question = Database['public']['Tables']['questions']['Row'] & {
  categories: { name_th: string; emoji: string }
  creator?: { display_name: string; username: string } | null
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

function closesLabel(closesAt: string): string {
  const diff = new Date(closesAt).getTime() - Date.now()
  if (diff <= 0) return 'หมดเวลาแล้ว'
  const days = Math.floor(diff / 86400000)
  const date = new Date(closesAt)
  const dateStr = `${date.getDate()} ${['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][date.getMonth()]} ${date.getFullYear() + 543}`
  if (days > 0) return `จบในอีก ${days} วัน (${dateStr})`
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (hours > 0) return `จบในอีก ${hours} ชม. ${mins} นาที (${dateStr})`
  return `จบในอีก ${mins} นาที`
}

function urgencyLevel(closesAt: string): 'normal' | 'soon' | 'critical' {
  const diff = new Date(closesAt).getTime() - Date.now()
  if (diff <= 1800000) return 'critical'   // < 30 min
  if (diff <= 7200000) return 'soon'        // < 2 hr
  return 'normal'
}

export default function QuestionPageClient() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [question, setQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [shareBonus, setShareBonus] = useState<number | null>(null)
  const [shareStatus, setShareStatus] = useState<'idle' | 'waiting' | 'done'>('idle')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [success, setSuccess] = useState(false)
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null)
  const [trendingOption, setTrendingOption] = useState<{ id: string; label: string; delta: number } | null>(null)
  const [myPrediction, setMyPrediction] = useState<{ option_id: string; coins_wagered: number; is_correct: boolean | null; coins_won: number | null } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  // store ref param (from URL or global feed referral) into localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref') ?? localStorage.getItem('global_ref')
    if (ref) localStorage.setItem(`ref:${id}`, ref)
  }, [id])

  useEffect(() => {
    async function load() {
      const [{ data }, { data: { user } }] = await Promise.all([
        supabase.from('questions').select('*, categories(name_th, emoji), creator:created_by(display_name, username)').eq('id', id).single(),
        supabase.auth.getUser(),
      ])
      setQuestion(data as unknown as Question)
      if (user) {
        const { data: pred } = await supabase
          .from('predictions')
          .select('option_id, coins_wagered, is_correct, coins_won')
          .eq('question_id', id)
          .eq('user_id', user.id)
          .maybeSingle()
        if (pred) setMyPrediction(pred as { option_id: string; coins_wagered: number; is_correct: boolean | null; coins_won: number | null })
      }
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
  const isLive = isOpen && (new Date(question.closes_at).getTime() - Date.now()) < 30 * 86400000
  const options = question.options as { id: string; label: string; icon_url?: string | null }[]
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
          <button
            onClick={() => {
              const refUrl = user
                ? `${window.location.origin}/question/${id}?ref=${user.id}`
                : window.location.href
              const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(refUrl)}`
              const popup = window.open(fbUrl, '_blank', 'width=600,height=400')
              if (!user || shareStatus !== 'idle' || !popup) return
              const openedAt = Date.now()
              setShareStatus('waiting')
              const poll = setInterval(async () => {
                if (!popup.closed) return
                clearInterval(poll)
                const elapsed = Date.now() - openedAt
                if (elapsed < 5000) {
                  // closed too fast — user cancelled
                  setShareStatus('idle')
                  return
                }
                const { data } = await supabase.rpc('share_question_reward', {
                  p_user_id: user.id,
                  p_question_id: id,
                })
                setShareStatus('done')
                if (data && data > 0) {
                  setShareBonus(data)
                  setTimeout(() => setShareBonus(null), 4000)
                }
              }, 500)
            }}
            className="relative flex items-center gap-1.5 text-sm text-[#1877F2] hover:text-[#0d65d9] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
            </svg>
            {shareStatus === 'waiting' ? 'กำลังตรวจสอบ...' : 'แชร์ Facebook'}
            {shareBonus && shareBonus > 0 && (
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap animate-bounce">
                +{shareBonus} P 🎉
              </span>
            )}
          </button>
        </div>
      </div>

      {/* question card */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {/* header: category + time */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
              {question.categories.emoji} {question.categories.name_th}
            </span>
            {isLive && (
              <span className="flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                สด
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            {isOpen ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                {closesLabel(question.closes_at)}
              </>
            ) : (
              <span>หมดเวลาแล้ว</span>
            )}
          </span>
        </div>

        {/* body: text + image */}
        <div className="flex gap-3 px-4 pb-3">
          <div className="flex-1 min-w-0 space-y-2">
            <h1 className="text-gray-900 font-bold text-lg leading-snug">{question.title}</h1>
            {question.description && (
              <p className="text-gray-500 text-sm leading-relaxed line-clamp-3">{question.description}</p>
            )}
            {/* creator */}
            {question.creator && (
              <div className="flex items-center gap-1.5 pt-1">
                <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold">
                  {question.creator.display_name?.[0]?.toUpperCase() ?? 'M'}
                </div>
                <span className="text-xs text-gray-400">สร้างโดย <span className="text-gray-600 font-medium">{question.creator.display_name || question.creator.username}</span></span>
              </div>
            )}
          </div>
          {question.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={question.image_url} alt="" className="w-32 h-36 rounded-xl object-cover flex-shrink-0" />
          )}
        </div>

        {/* pool bar */}
        <div className="px-4 pb-4 space-y-2">
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            {options.map((opt, i) => {
              const colors = ['bg-green-400', 'bg-blue-400', 'bg-orange-400', 'bg-purple-400']
              return (
                <div
                  key={opt.id}
                  className={`${colors[i % colors.length]} transition-all duration-500`}
                  style={{ width: `${shares[opt.id] ?? 0}%` }}
                />
              )
            })}
          </div>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
            {options.map((opt, i) => {
              const dotColors = ['bg-green-400', 'bg-blue-400', 'bg-orange-400', 'bg-purple-400']
              return (
                <div key={opt.id} className="flex items-center gap-1">
                  {opt.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={opt.icon_url} alt="" className="w-3 h-3 rounded object-cover flex-shrink-0" />
                  ) : (
                    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${dotColors[i % dotColors.length]}`} />
                  )}
                  <span className="text-xs text-gray-500">{opt.label}</span>
                  <span className="text-xs font-bold text-gray-900">{(shares[opt.id] ?? 0).toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* stats row */}
        <div className="flex items-center gap-3 px-4 pb-4 border-t border-gray-100 pt-3 text-xs text-gray-400">
          <span>👥 {question.predictions_count} คนทาย</span>
          <span className="flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-[8px] leading-none flex-shrink-0">P</span>
            คะแนนรวม {question.total_pool.toLocaleString()}
          </span>
        </div>

        {/* Probability trend chart */}
        {options.length > 3 && (
          <div className="px-4 pb-4">
            <ProbabilityChart
              questionId={id}
              options={options}
              currentPool={question.pool as Record<string, number>}
            />
          </div>
        )}
      </div>

      {/* My existing prediction */}
      {(myPrediction || success) && (() => {
        const pred = myPrediction
        const chosenLabel = pred ? options.find(o => o.id === pred.option_id)?.label : options.find(o => o.id === selectedOption)?.label
        const isResolved = pred && pred.is_correct !== null
        return (
          <div className={`rounded-2xl p-4 border ${
            isResolved
              ? pred!.is_correct
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
              : 'bg-indigo-50 border-indigo-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {isResolved ? (pred!.is_correct ? '✅' : '❌') : '🔮'}
                </span>
                <div>
                  <p className="text-xs text-gray-500 font-medium">การทายของคุณ</p>
                  <p className="text-sm font-bold text-gray-900">{chosenLabel ?? '—'}</p>
                </div>
              </div>
              <div className="text-right">
                {pred && (
                  <p className="text-xs text-gray-500 flex items-center gap-0.5 justify-end">
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-[8px] leading-none">P</span>
                    {pred.coins_wagered.toLocaleString()} คะแนน
                  </p>
                )}
                {isResolved && pred!.is_correct && pred!.coins_won && pred!.coins_won > 0 && (
                  <p className="text-sm font-bold text-green-600 flex items-center gap-0.5 justify-end">
                    +<span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-[8px] leading-none">P</span>
                    {pred!.coins_won.toLocaleString()}
                  </p>
                )}
                {isResolved && !pred!.is_correct && (
                  <p className="text-xs text-red-500 font-medium">ทายผิด</p>
                )}
                {!isResolved && !success && (
                  <p className="text-xs text-indigo-500 font-medium">รอผล</p>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Option buttons — hidden if already predicted */}
      {isOpen && !myPrediction && !success && (
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
                <div className="flex items-center gap-2.5">
                  {opt.icon_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={opt.icon_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <span className="font-semibold">{opt.label}</span>
                </div>
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
      {isOpen && !myPrediction && !success && selectedOption && (
        <button
          onClick={() => user ? setShowModal(true) : router.push(`/login?next=/question/${id}`)}
          className="w-full py-4 active:scale-[0.98] text-white font-bold rounded-xl transition-all"
          style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
        >
          {user ? '🙏 ภาวนา' : 'เข้าสู่ระบบเพื่อทาย →'}
        </button>
      )}

      {/* Success toast */}
      {success && !myPrediction && (
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
          onSuccess={(coinsWagered?: number) => {
            setShowModal(false)
            setSuccess(true)
            setMyPrediction({ option_id: selectedOption!, coins_wagered: coinsWagered ?? 0, is_correct: null, coins_won: null })
            setSelectedOption(null)
          }}
        />
      )}
    </div>
  )
}
