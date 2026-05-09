'use client'

import Link from 'next/link'
import { Gift, Bookmark, Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
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

interface Props {
  question: Question
  initialSaved?: boolean
  isAdmin?: boolean
  onDelete?: (id: string) => void
}

export default function QuestionCard({ question, initialSaved = false, isAdmin = false, onDelete }: Props) {
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
      setSaved(prev => !prev)
    })
  }

  return (
    <Link href={`/question/${question.id}`}>
      <article className="relative bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col gap-3">
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
              <div>
                <span className="text-2xl font-bold text-gray-900">{topPct.toFixed(0)}%</span>
                <span className="text-xs text-gray-500 ml-1">โอกาส</span>
              </div>
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
              {options.map(opt => (
                <div key={opt.id} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 truncate flex-1 mr-2">{opt.label}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs font-bold text-gray-900">{(shares[opt.id] ?? 0).toFixed(0)}%</span>
                    <button className="px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 text-[11px] font-medium rounded hover:bg-green-100 transition-colors">
                      ใช่
                    </button>
                    <button className="px-2 py-0.5 bg-red-50 border border-red-200 text-red-600 text-[11px] font-medium rounded hover:bg-red-100 transition-colors">
                      ไม่
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* bottom */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {question.status === 'open' && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {timeLeft(question.closes_at)}
              </span>
            )}
            <span className="flex items-center gap-1">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-[9px] leading-none flex-shrink-0">P</span>
                <span>{formatPool(question.total_pool)} คะแนน</span>
                <span className="text-gray-300">·</span>
                <span>👥 {question.predictions_count} คนทาย</span>
              </span>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <button className="hover:text-gray-500 transition-colors" onClick={e => e.preventDefault()}>
              <Gift size={14} />
            </button>
            <button
              onClick={toggleSave}
              disabled={pending}
              className={`transition-colors ${saved ? 'text-indigo-500 hover:text-indigo-700' : 'hover:text-gray-500'}`}
              aria-label={saved ? 'ลบออกจากรายการโปรด' : 'เพิ่มในรายการโปรด'}
            >
              <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </article>
    </Link>
  )
}
