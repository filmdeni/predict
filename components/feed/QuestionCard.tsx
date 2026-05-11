'use client'

import Link from 'next/link'
import { Gift, Bookmark, Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from '@/components/ui/Toast'
import { getPoolShares } from '@/lib/game/odds'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Question = Database['public']['Tables']['questions']['Row'] & {
  categories: { name_th: string; emoji: string; slug: string }
}

function timeLeft(closesAt: string): string {
  const diff = new Date(closesAt).getTime() - Date.now()
  if (diff <= 0) return 'หมดเวลา'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `${days} วัน`
  return `${hours} ชม.`
}

function formatPool(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return `${n}`
}

function ArcGauge({ pct }: { pct: number }) {
  const W = 72
  const H = 72
  const stroke = 7
  const cx = W / 2
  const cy = W / 2
  const r = (W - stroke) / 2

  // 220° arc opening at the bottom: from 140° to 360°+40° (clockwise from top=0°)
  const startDeg = 145
  const endDeg   = 395   // = 145 + 250  … gives a wider horseshoe

  function pt(deg: number) {
    const rad = ((deg - 90) * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }
  function arc(a: number, b: number) {
    const s = pt(a), e = pt(b)
    const large = b - a > 180 ? 1 : 0
    return `M${s.x} ${s.y} A${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
  }

  const fillEnd = startDeg + (endDeg - startDeg) * Math.min(pct / 100, 1)

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <path d={arc(startDeg, endDeg)} fill="none" stroke="#e5e7eb" strokeWidth={stroke} strokeLinecap="round" />
      {pct > 0 && (
        <path d={arc(startDeg, fillEnd)} fill="none" stroke="#f59e0b" strokeWidth={stroke} strokeLinecap="round" />
      )}
      <text x={cx} y={cy - 2}  textAnchor="middle" fontSize="14" fontWeight="700" fill="#111827">{pct.toFixed(0)}%</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="#9ca3af">โอกาส</text>
    </svg>
  )
}

function urgencyLevel(closesAt: string): 'normal' | 'soon' | 'critical' {
  const diff = new Date(closesAt).getTime() - Date.now()
  if (diff <= 1800000) return 'critical'
  if (diff <= 7200000) return 'soon'
  return 'normal'
}

interface Props {
  question: Question
  initialSaved?: boolean
  isPredicted?: boolean
  isAdmin?: boolean
  isHot?: boolean
  recentCount?: number
  onDelete?: (id: string) => void
}

export default function QuestionCard({ question, initialSaved = false, isPredicted = false, isAdmin = false, isHot = false, recentCount, onDelete }: Props) {
  const shares = getPoolShares(question.pool)
  const options = question.options as { id: string; label: string }[]
  const isBinary = options.length === 2
  const topPct = shares[options[0]?.id ?? ''] ?? 0

  const [saved, setSaved] = useState(initialSaved)
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.from('questions').delete().eq('id', question.id)
      if (error) {
        alert('ลบไม่ได้: ' + error.message)
        setDeleting(false)
        setConfirmDelete(false)
      } else {
        onDelete?.(question.id)
      }
    })
  }

  function toggleSave(e: React.MouseEvent) {
    e.preventDefault()
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (saved) {
        await supabase
          .from('saved_questions')
          .delete()
          .eq('user_id', user.id)
          .eq('question_id', question.id)
      } else {
        await supabase
          .from('saved_questions')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert({ user_id: user.id, question_id: question.id } as any)
      }
      const next = !saved
      setSaved(next)
      toast(next ? 'บันทึกแล้ว 🔖' : 'ลบออกจากรายการแล้ว')
    })
  }

  const isEffectivelyOpen = question.status === 'open' && new Date(question.closes_at) > new Date()
  const urgency = isEffectivelyOpen ? urgencyLevel(question.closes_at) : 'normal'
  const borderClass = isHot
    ? 'border-orange-200 shadow-orange-50'
    : urgency === 'critical'
    ? 'border-red-200'
    : urgency === 'soon'
    ? 'border-amber-200'
    : 'border-gray-200'

  return (
    <Link href={`/question/${question.id}`}>
      <article className={`relative bg-white border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col gap-3 ${borderClass}`}>
        {/* HOT badge */}
        {isHot && !isAdmin && !isPredicted && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
            🔥 HOT
          </div>
        )}
        {/* Predicted badge */}
        {isPredicted && !isAdmin && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
            🔮 ทายแล้ว
          </div>
        )}
        {/* admin delete */}
        {isAdmin && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1" onClick={e => e.preventDefault()}>
            {confirmDelete ? (
              <>
                <button
                  onClick={e => { e.preventDefault(); setConfirmDelete(false) }}
                  className="px-2 py-0.5 text-[11px] text-gray-500 border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-2 py-0.5 text-[11px] text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting ? '...' : 'ยืนยัน'}
                </button>
              </>
            ) : (
              <button
                onClick={handleDelete}
                className="p-1 text-gray-300 hover:text-red-400 transition-colors bg-white rounded-lg border border-transparent hover:border-red-100"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}

        {/* top: icon + title */}
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
            {question.categories.emoji}
          </div>
          <h2 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-3 flex-1">
            {question.title}
          </h2>
        </div>

        {/* options */}
        <div className="flex-1">
          {isBinary ? (
            <div className="flex items-center justify-between">
              <ArcGauge pct={topPct} />
              <div className="flex gap-1.5">
                <button className="px-3 py-1 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded-lg hover:bg-green-100 transition-colors">
                  ใช่
                </button>
                <button className="px-3 py-1 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors">
                  ไม่
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {options.slice(0, 4).map((opt, i) => {
                const colors = ['bg-green-400', 'bg-blue-400', 'bg-orange-400', 'bg-purple-400']
                const pct = shares[opt.id] ?? 0
                return (
                  <div key={opt.id} className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 truncate flex-1 mr-2">{opt.label}</span>
                      <span className="text-xs font-bold text-gray-900 flex-shrink-0">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* bottom */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-400 min-w-0">
            {isEffectivelyOpen && (
              urgency === 'critical' ? (
                <span className="flex items-center gap-1 text-red-500 font-semibold animate-pulse flex-shrink-0">
                  ⏰ {timeLeft(question.closes_at)}
                </span>
              ) : urgency === 'soon' ? (
                <span className="flex items-center gap-1 text-amber-600 font-medium flex-shrink-0">
                  ⏰ {timeLeft(question.closes_at)}
                </span>
              ) : (
                <span className="flex items-center gap-1 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  {timeLeft(question.closes_at)}
                </span>
              )
            )}
            {isHot && recentCount ? (
              <span className="text-orange-500 font-medium flex-shrink-0">🔥 {recentCount} ทายใน 24ชม.</span>
            ) : (
              <span className="flex items-center gap-1 truncate">
                <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-[8px] leading-none flex-shrink-0">P</span>
                <span className="truncate">{formatPool(question.total_pool)} · 👥 {question.predictions_count}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-gray-300 flex-shrink-0 ml-2">
            <button className="hover:text-gray-500 transition-colors" onClick={e => e.preventDefault()}>
              <Gift size={13} />
            </button>
            <button
              onClick={toggleSave}
              disabled={pending}
              className={`transition-colors ${saved ? 'text-indigo-500 hover:text-indigo-700' : 'hover:text-gray-500'}`}
              aria-label={saved ? 'ลบออกจากรายการโปรด' : 'เพิ่มในรายการโปรด'}
            >
              <Bookmark size={13} fill={saved ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </article>
    </Link>
  )
}
