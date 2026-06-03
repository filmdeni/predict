'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, CheckCircle2, X, Award } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type Question = Database['public']['Tables']['questions']['Row'] & {
  categories: { name_th: string; emoji: string }
  users: { display_name: string; username: string } | null
}

type TabKey = 'all' | 'pending' | 'open' | 'closed' | 'resolved' | 'cancelled'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: 'รออนุมัติ',  color: 'bg-blue-100 text-blue-700' },
  open:      { label: 'อนุมัติแล้ว', color: 'bg-emerald-100 text-emerald-700' },
  closed:    { label: 'ปิดแล้ว',    color: 'bg-amber-100 text-amber-700' },
  resolved:  { label: 'เฉลยแล้ว',  color: 'bg-purple-100 text-purple-700' },
  cancelled: { label: 'ปฏิเสส',    color: 'bg-red-100 text-red-500' },
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',       label: 'ทั้งหมด' },
  { key: 'pending',   label: 'รออนุมัติ' },
  { key: 'open',      label: 'อนุมัติแล้ว' },
  { key: 'closed',    label: 'ปิดแล้ว' },
  { key: 'resolved',  label: 'เฉลยแล้ว' },
  { key: 'cancelled', label: 'ปฏิเสส' },
]

export default function AdminQuestionsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [resolveModal, setResolveModal] = useState<Question | null>(null)
  const [resolveOption, setResolveOption] = useState<string>('')
  const [resolving, setResolving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('questions')
      .select('*, categories(name_th, emoji), users(display_name, username)')
      .order('created_at', { ascending: false })
    setQuestions((data ?? []) as Question[])
    setLoading(false)
  }

  async function approve(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('questions') as any).update({ status: 'open' }).eq('id', id)
    setQuestions(q => q.map(x => x.id === id ? { ...x, status: 'open' } : x))
  }

  async function reject(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('questions') as any).update({ status: 'cancelled' }).eq('id', id)
    setQuestions(q => q.map(x => x.id === id ? { ...x, status: 'cancelled' } : x))
  }

  async function resolve() {
    if (!resolveModal || !resolveOption) return
    setResolving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc('resolve_question', {
      p_question_id: resolveModal.id,
      p_correct_option: resolveOption,
    })
    if (error) { alert('Error: ' + error.message) }
    else {
      setQuestions(q =>
        q.map(x => x.id === resolveModal.id ? { ...x, status: 'resolved', correct_option: resolveOption } : x)
      )
      setResolveModal(null)
      setResolveOption('')
    }
    setResolving(false)
  }

  async function deleteQuestion(id: string) {
    setDeleting(id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc('admin_delete_question', { p_question_id: id })
    if (error) { alert('Error: ' + error.message) }
    else { setQuestions(q => q.filter(x => x.id !== id)) }
    setDeleting(null)
    setConfirmDelete(null)
  }

  const categories = Array.from(
    new Map(questions.map(q => [q.categories.name_th, q.categories])).values()
  ).sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'))

  const filtered = questions
    .filter(q => tab === 'all' || q.status === tab)
    .filter(q => categoryFilter === 'all' || q.categories.name_th === categoryFilter)

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">จัดการคำถาม</h1>
          <p className="text-sm text-gray-400 mt-0.5">อนุมัติ / ปฏิเสส / เฉลย / ลบ</p>
        </div>
        <button
          onClick={() => router.push('/admin/questions/new')}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} /> สร้าง Prediction
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {TABS.map(t => {
          const count = t.key === 'all' ? questions.length : questions.filter(q => q.status === t.key).length
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-400'
              }`}
            >
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-400 font-medium mr-1">หมวด:</span>
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
              categoryFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-400'
            }`}
          >
            ทั้งหมด
          </button>
          {categories.map(cat => (
            <button
              key={cat.name_th}
              onClick={() => setCategoryFilter(cat.name_th)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                categoryFilter === cat.name_th
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-400'
              }`}
            >
              {cat.emoji} {cat.name_th}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="space-y-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-50 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm">ไม่มีคำถามในกลุ่มนี้</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium">
                <th className="text-left px-5 py-3">คำถาม</th>
                <th className="text-left px-4 py-3 w-32">โดย</th>
                <th className="text-center px-4 py-3 w-20">ผู้ร่วม</th>
                <th className="text-center px-4 py-3 w-28">สถานะ</th>
                <th className="text-right px-5 py-3 w-64">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(q => {
                const st = STATUS_LABEL[q.status] ?? STATUS_LABEL.open
                const options = q.options as { id: string; label: string }[]
                const closesDate = new Date(q.closes_at).toLocaleDateString('th-TH', {
                  day: 'numeric', month: 'short', year: '2-digit'
                })
                const createdDate = new Date(q.created_at).toLocaleDateString('th-TH', {
                  day: 'numeric', month: 'short', year: '2-digit'
                })

                return (
                  <tr key={q.id} className="hover:bg-gray-50/60 transition-colors group">
                    {/* คำถาม */}
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900 leading-snug line-clamp-1">{q.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {q.categories.emoji} {q.categories.name_th} · {createdDate} → {closesDate}
                      </p>
                    </td>

                    {/* โดย */}
                    <td className="px-4 py-3">
                      <p className="text-gray-700 truncate max-w-[120px]">
                        {q.users?.display_name ?? '—'}
                      </p>
                    </td>

                    {/* ผู้ร่วม */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-700 font-medium">{q.predictions_count.toLocaleString()}</span>
                    </td>

                    {/* สถานะ */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold ${st.color}`}>
                        {st.label}
                        {q.status === 'resolved' && q.correct_option && (
                          <span className="ml-1">
                            ✓ {options.find(o => o.id === q.correct_option)?.label}
                          </span>
                        )}
                      </span>
                    </td>

                    {/* การดำเนินการ */}
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* แก้ไข */}
                        <button
                          onClick={() => router.push(`/admin/questions/edit/${q.id}`)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <Pencil size={11} /> แก้ไข
                        </button>

                        {/* อนุมัติ (pending only) */}
                        {q.status === 'pending' && (
                          <button
                            onClick={() => approve(q.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                          >
                            <CheckCircle2 size={11} /> อนุมัติ
                          </button>
                        )}

                        {/* ปฏิเสส (pending only) */}
                        {q.status === 'pending' && (
                          <button
                            onClick={() => reject(q.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <X size={11} /> ปฏิเสส
                          </button>
                        )}

                        {/* เฉลย (open or closed) */}
                        {(q.status === 'open' || q.status === 'closed') && (
                          <button
                            onClick={() => { setResolveModal(q); setResolveOption('') }}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                          >
                            <Award size={11} /> เฉลย
                          </button>
                        )}

                        {/* ลบ */}
                        {confirmDelete === q.id ? (
                          <>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              ยกเลิก
                            </button>
                            <button
                              onClick={() => deleteQuestion(q.id)}
                              disabled={deleting === q.id}
                              className="px-2.5 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
                            >
                              {deleting === q.id ? '...' : 'ยืนยันลบ'}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(q.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-400 border border-gray-200 rounded-lg hover:text-red-500 hover:border-red-200 transition-colors"
                          >
                            <Trash2 size={11} /> ลบ
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div>
              <h2 className="font-bold text-gray-900 text-base">เฉลยคำถาม</h2>
              <p className="text-sm text-gray-500 mt-1 leading-snug">{resolveModal.title}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">เลือกคำตอบที่ถูกต้อง</p>
              {(resolveModal.options as { id: string; label: string }[]).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setResolveOption(opt.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    resolveOption === opt.id
                      ? 'bg-gray-900 border-gray-900 text-white'
                      : 'bg-gray-50 border-gray-100 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setResolveModal(null); setResolveOption('') }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={resolve}
                disabled={!resolveOption || resolving}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors"
              >
                {resolving ? 'กำลังเฉลย...' : 'ยืนยันเฉลย'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
