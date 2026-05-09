'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, CheckCircle2, Clock, Users } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type Question = Database['public']['Tables']['questions']['Row'] & {
  categories: { name_th: string; emoji: string }
}

const ADMIN_EMAIL = 'zwwzww19192@gmail.com'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  open:     { label: 'เปิดรับ',    color: 'bg-emerald-100 text-emerald-700' },
  closed:   { label: 'ปิดรับแล้ว', color: 'bg-amber-100 text-amber-700' },
  resolved: { label: 'เฉลยแล้ว',  color: 'bg-gray-100 text-gray-500' },
}

export default function AdminQuestionsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'open' | 'closed' | 'resolved'>('open')
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [resolving, setResolving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== ADMIN_EMAIL) { router.replace('/feed'); return }
      load()
    }
    init()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('questions')
      .select('*, categories(name_th, emoji)')
      .order('created_at', { ascending: false })
    setQuestions((data ?? []) as Question[])
    setLoading(false)
  }

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
      setQuestions(q =>
        q.map(x => x.id === questionId ? { ...x, status: 'resolved', correct_option: optionId } : x)
      )
    }
    setResolving(null)
  }

  async function deleteQuestion(questionId: string) {
    setDeleting(questionId)
    const { error } = await supabase.from('questions').delete().eq('id', questionId)
    if (error) {
      alert('Error: ' + error.message)
    } else {
      setQuestions(q => q.filter(x => x.id !== questionId))
    }
    setDeleting(null)
    setConfirmDelete(null)
  }

  const tabs = [
    { key: 'open' as const,     label: 'เปิดรับ' },
    { key: 'closed' as const,   label: 'ปิดแล้ว' },
    { key: 'resolved' as const, label: 'เฉลยแล้ว' },
  ]

  const filtered = questions.filter(q => q.status === tab)

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-400 mt-0.5">จัดการคำถามทั้งหมด</p>
        </div>
        <button
          onClick={() => router.push('/admin/questions/new')}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} /> สร้างคำถาม
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-xl p-3 text-center border transition-all ${
              tab === t.key ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-100 hover:border-gray-300'
            }`}
          >
            <p className={`text-2xl font-bold ${tab === t.key ? 'text-white' : 'text-gray-900'}`}>
              {questions.filter(q => q.status === t.key).length}
            </p>
            <p className={`text-xs mt-0.5 ${tab === t.key ? 'text-gray-300' : 'text-gray-400'}`}>{t.label}</p>
          </button>
        ))}
      </div>

      {/* Question list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 bg-white rounded-xl animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-2">{tab === 'resolved' ? '✅' : '📭'}</p>
          <p className="text-sm">ไม่มีคำถามในกลุ่มนี้</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(q => {
            const options = q.options as { id: string; label: string }[]
            const pool = q.pool as Record<string, number>
            const st = STATUS_LABEL[q.status] ?? STATUS_LABEL.open

            return (
              <div key={q.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                {/* Card header */}
                <div className="p-4 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs text-gray-400">{q.categories.emoji} {q.categories.name_th}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 leading-snug">{q.title}</p>
                    </div>

                    {/* Delete */}
                    {confirmDelete === q.id ? (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          ยกเลิก
                        </button>
                        <button
                          onClick={() => deleteQuestion(q.id)}
                          disabled={deleting === q.id}
                          className="px-2 py-1 text-xs text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
                        >
                          {deleting === q.id ? '...' : 'ยืนยัน'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(q.id)}
                        className="p-1.5 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Users size={11} /> {q.predictions_count}</span>
                    <span className="flex items-center gap-1">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-[9px] leading-none">P</span>
                      {q.total_pool.toLocaleString()} คะแนน
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(q.closes_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Options */}
                <div className="px-4 pb-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {options.map(opt => {
                      const isCorrect = opt.id === q.correct_option
                      const isSelected = selected[q.id] === opt.id
                      const resolved = q.status === 'resolved'

                      return (
                        <button
                          key={opt.id}
                          disabled={resolved}
                          onClick={() => setSelected(s => ({ ...s, [q.id]: opt.id }))}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all text-left ${
                            resolved
                              ? isCorrect
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 cursor-default'
                                : 'bg-gray-50 border-gray-100 text-gray-400 cursor-default'
                              : isSelected
                                ? 'bg-gray-900 border-gray-900 text-white'
                                : 'bg-gray-50 border-gray-100 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <span className="font-medium truncate">{opt.label}</span>
                          <span className="text-xs ml-2 flex-shrink-0 opacity-70 flex items-center gap-1">
                            {resolved && isCorrect ? '✅ ' : ''}{(pool[opt.id] ?? 0).toLocaleString()}
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-[9px] leading-none">P</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {q.status !== 'resolved' && (
                    <button
                      onClick={() => resolve(q.id)}
                      disabled={!selected[q.id] || resolving === q.id}
                      className="w-full py-2.5 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      <CheckCircle2 size={15} />
                      {resolving === q.id
                        ? 'กำลังเฉลย...'
                        : selected[q.id]
                          ? `เฉลย — "${options.find(o => o.id === selected[q.id])?.label}"`
                          : 'เลือกคำตอบที่ถูกก่อน'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
