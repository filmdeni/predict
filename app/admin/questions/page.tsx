'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Question = Database['public']['Tables']['questions']['Row'] & {
  categories: { name_th: string; emoji: string }
}

const ADMIN_EMAIL = 'zwwzww19192@gmail.com'

export default function AdminQuestionsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, string>>({})

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== ADMIN_EMAIL) {
        router.replace('/feed')
        return
      }
      const { data } = await supabase
        .from('questions')
        .select('*, categories(name_th, emoji)')
        .in('status', ['open', 'closed'])
        .order('created_at', { ascending: false })
      setQuestions((data ?? []) as Question[])
      setLoading(false)
    }
    init()
  }, [])

  async function resolve(questionId: string) {
    const optionId = selected[questionId]
    if (!optionId) return
    setResolving(questionId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc('resolve_question', {
      p_question_id: questionId,
      p_correct_option: optionId,
    })
    if (error) {
      alert('Error: ' + error.message)
    } else {
      setQuestions(q => q.filter(x => x.id !== questionId))
    }
    setResolving(null)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-8 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-white rounded-xl animate-pulse border border-gray-200" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin — เฉลยคำถาม</h1>
          <p className="text-sm text-gray-400 mt-0.5">{questions.length} คำถามรอเฉลย</p>
        </div>
        <button
          onClick={() => router.push('/admin/questions/new')}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-colors"
        >
          + สร้างคำถาม
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-2">✅</p>
          <p>ไม่มีคำถามรอเฉลย</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map(q => {
            const options = q.options as { id: string; label: string }[]
            const pool = q.pool as Record<string, number>
            return (
              <div key={q.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs text-gray-400">{q.categories.emoji} {q.categories.name_th}</span>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{q.title}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    👥 {q.predictions_count} · 🪙 {q.total_pool.toLocaleString()}
                  </span>
                </div>

                {/* Option selector */}
                <div className="grid grid-cols-2 gap-2">
                  {options.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSelected(s => ({ ...s, [q.id]: opt.id }))}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${
                        selected[q.id] === opt.id
                          ? 'bg-gray-900 border-gray-900 text-white'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <span className="font-medium">{opt.label}</span>
                      <span className={`text-xs ${selected[q.id] === opt.id ? 'text-gray-300' : 'text-gray-400'}`}>
                        {pool[opt.id]?.toLocaleString() ?? 0} 🪙
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => resolve(q.id)}
                  disabled={!selected[q.id] || resolving === q.id}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors"
                >
                  {resolving === q.id ? 'กำลังเฉลย...' : `✅ เฉลย${selected[q.id] ? ` — "${options.find(o => o.id === selected[q.id])?.label}"` : ''}`}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
