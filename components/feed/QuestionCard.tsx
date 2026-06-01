'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bookmark, Trash2, Pencil, Clock, MoreVertical, CheckCircle2, XCircle, Lock } from 'lucide-react'
import { useState, useTransition, useRef, useEffect } from 'react'
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

function Countdown({ closesAt }: { closesAt: string }) {
  const diff = new Date(closesAt).getTime() - Date.now()
  if (diff <= 0) return (
    <span className="flex items-center gap-1 text-xs text-gray-400">
      <Clock size={11} /> หมดเวลา
    </span>
  )
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  const label = days > 0 ? `${days} วัน` : `${hours}:${String(mins).padStart(2,'0')}`
  return (
    <span className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
      <Clock size={11} className="text-amber-400" /> {label}
    </span>
  )
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
  const router = useRouter()
  const shares = getPoolShares(question.pool)
  const options = question.options as { id: string; label: string; icon_url?: string | null }[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cardStyle = (question as any).card_style ?? 'auto'
  const isRows = cardStyle === 'rows'
  const isBinary = !isRows && (cardStyle === 'gauge' || (cardStyle === 'auto' && options.length === 2))
  const topPct = shares[options[0]?.id ?? ''] ?? 0

  const [saved, setSaved] = useState(initialSaved)
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirmDelete) { setConfirmDelete(true); setMenuOpen(false); return }
    setDeleting(true)
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.from('questions').delete().eq('id', question.id)
      if (error) {
        toast('ลบไม่ได้: ' + error.message)
        setDeleting(false)
        setConfirmDelete(false)
      } else {
        onDelete?.(question.id)
      }
    })
  }

  async function handleStatusChange(e: React.MouseEvent, status: string) {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen(false)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('questions').update({ status }).eq('id', question.id)
    if (error) toast('เปลี่ยนสถานะไม่ได้: ' + error.message)
    else toast(`เปลี่ยนเป็น "${status}" แล้ว ✓`)
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
  const daysLeft = Math.floor((new Date(question.closes_at).getTime() - Date.now()) / 86400000)
  const isLive = isEffectivelyOpen && daysLeft < 30
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
        {/* admin actions */}
        {isAdmin && (
          <div ref={menuRef} className="absolute top-2 right-2 z-20" onClick={e => e.preventDefault()}>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(false) }}
                  className="px-2 py-0.5 text-[11px] text-gray-500 border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-2 py-0.5 text-[11px] text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting ? '...' : 'ยืนยันลบ'}
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpen(v => !v) }}
                  className="p-1 text-gray-400 hover:text-gray-700 bg-white rounded-lg border border-gray-200 shadow-sm"
                >
                  <MoreVertical size={14} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-7 w-44 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden text-sm">
                    <button
                      onClick={e => { e.preventDefault(); e.stopPropagation(); router.push(`/admin/questions/edit/${question.id}`) }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700"
                    >
                      <Pencil size={13} /> แก้ไขคำถาม
                    </button>
                    {question.status !== 'open' && (
                      <button
                        onClick={e => handleStatusChange(e, 'open')}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-green-50 text-emerald-600"
                      >
                        <CheckCircle2 size={13} /> เปิดรับการทาย
                      </button>
                    )}
                    {question.status === 'open' && (
                      <button
                        onClick={e => handleStatusChange(e, 'closed')}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-amber-50 text-amber-600"
                      >
                        <Lock size={13} /> ปิดรับการทาย
                      </button>
                    )}
                    <button
                      onClick={e => { e.preventDefault(); e.stopPropagation(); router.push(`/admin/questions?resolve=${question.id}`) }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 text-indigo-600"
                    >
                      <CheckCircle2 size={13} /> เฉลยคำถาม
                    </button>
                    <div className="border-t border-gray-100" />
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-500"
                    >
                      <Trash2 size={13} /> ลบคำถาม
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* top: image/icon + title */}
        <div className="flex gap-3">
          {question.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={question.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
              {question.categories.emoji}
            </div>
          )}
          <h2 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-3 flex-1">
            {question.title}
          </h2>
        </div>

        {/* options */}
        <div className="flex-1">
          {isRows ? (
            <div className="space-y-1.5">
              {options.slice(0, 4).map((opt, i) => {
                const bgColors = ['bg-green-400/15', 'bg-blue-400/15', 'bg-orange-400/15', 'bg-purple-400/15']
                const barColors = ['bg-green-400', 'bg-blue-400', 'bg-orange-400', 'bg-purple-400']
                const textColors = ['text-green-700', 'text-blue-700', 'text-orange-700', 'text-purple-700']
                const pct = shares[opt.id] ?? 0
                return (
                  <div key={opt.id} className="relative rounded-lg overflow-hidden">
                    {/* background fill bar */}
                    <div
                      className={`absolute inset-y-0 left-0 ${barColors[i % barColors.length]} opacity-20 transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                    <div className={`relative flex items-center gap-2 px-2 py-1.5 ${bgColors[i % bgColors.length]} rounded-lg`}>
                      {opt.icon_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={opt.icon_url} alt="" className="w-6 h-6 rounded-md object-cover flex-shrink-0 border border-white/60" />
                      ) : (
                        <div className={`w-1.5 h-5 rounded-full flex-shrink-0 ${barColors[i % barColors.length]}`} />
                      )}
                      <span className="text-xs text-gray-700 flex-1 truncate font-medium">{opt.label}</span>
                      <span className={`text-xs font-bold flex-shrink-0 ${textColors[i % textColors.length]}`}>{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : isBinary ? (
            <div className="flex items-center justify-between">
              <ArcGauge pct={topPct} />
              <div className="flex gap-1.5">
                {options.map((opt, i) => (
                  <button key={opt.id} className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    i === 0
                      ? 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'
                      : 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'
                  }`}>
                    {opt.icon_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={opt.icon_url} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />
                    )}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {options.slice(0, 4).map((opt, i) => {
                const colors = ['bg-green-400', 'bg-blue-400', 'bg-orange-400', 'bg-purple-400']
                const pct = shares[opt.id] ?? 0
                return (
                  <div key={opt.id} className="space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                        {opt.icon_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={opt.icon_url} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />
                        )}
                        <span className="text-xs text-gray-600 truncate">{opt.label}</span>
                      </div>
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
            {isEffectivelyOpen ? (
              urgency === 'critical' ? (
                <span className="flex items-center gap-1 text-red-500 font-semibold animate-pulse flex-shrink-0">
                  ⏰ {timeLeft(question.closes_at)}
                </span>
              ) : urgency === 'soon' ? (
                <span className="flex items-center gap-1 text-amber-600 font-medium flex-shrink-0">
                  ⏰ {timeLeft(question.closes_at)}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  {isLive && (
                    <span className="flex items-center gap-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                      สด
                    </span>
                  )}
                  <Countdown closesAt={question.closes_at} />
                </span>
              )
            ) : (
              <span className="flex items-center gap-1 text-gray-400 flex-shrink-0">
                <Clock size={11} /> หมดเวลา
              </span>
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
