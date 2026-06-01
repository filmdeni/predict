'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCheck, Clock, XCircle } from 'lucide-react'

const CATEGORY_LABEL: Record<string, string> = {
  bug: '🐛 บัค',
  ui: '🎨 UI',
  predict: '🔮 ระบบทาย',
  coins: '💰 คะแนน',
  suggestion: '💡 ข้อเสนอแนะ',
  other: '📝 อื่นๆ',
}

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-red-100 text-red-600',
  read: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
}

const STATUS_LABEL: Record<string, string> = {
  new: 'ใหม่',
  read: 'อ่านแล้ว',
  resolved: 'แก้ไขแล้ว',
}

type FeedbackRow = {
  id: string
  user_id: string | null
  category: string
  message: string
  contact: string | null
  status: string
  created_at: string
  users: { display_name: string; username: string } | null
}

export default function AdminFeedbackPage() {
  const supabase = createClient()
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'new' | 'read' | 'resolved'>('all')

  async function load() {
    const { data } = await (supabase as any)
      .from('feedback')
      .select('*, users(display_name, username)')
      .order('created_at', { ascending: false })
    setRows((data ?? []) as FeedbackRow[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function setStatus(id: string, status: string) {
    await (supabase as any).from('feedback').update({ status }).eq('id', id)
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter)
  const counts = {
    new: rows.filter(r => r.status === 'new').length,
    read: rows.filter(r => r.status === 'read').length,
    resolved: rows.filter(r => r.status === 'resolved').length,
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Feedback</h1>
        <p className="text-sm text-gray-500 mt-0.5">ข้อเสนอแนะและรายงานปัญหาจากผู้ใช้</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: 'new', label: 'รายการใหม่', icon: XCircle, color: 'text-red-500' },
          { key: 'read', label: 'อ่านแล้ว', icon: Clock, color: 'text-yellow-600' },
          { key: 'resolved', label: 'แก้ไขแล้ว', icon: CheckCheck, color: 'text-green-600' },
        ].map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <Icon size={20} className={color} />
            <div>
              <p className="text-2xl font-bold text-gray-900">{counts[key as keyof typeof counts]}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'new', 'read', 'resolved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === f ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            {f === 'all' ? 'ทั้งหมด' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-gray-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm">ยังไม่มี feedback</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(row => (
            <div key={row.id} className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-500">{CATEGORY_LABEL[row.category] ?? row.category}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[row.status] ?? ''}`}>
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 leading-relaxed">{row.message}</p>
                  {row.contact && (
                    <p className="text-xs text-blue-600 font-medium">📞 {row.contact}</p>
                  )}
                  <p className="text-[11px] text-gray-400">
                    {row.users ? `@${row.users.username}` : 'ไม่ระบุ'} · {new Date(row.created_at).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1 border-t border-gray-50">
                {(['new', 'read', 'resolved'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatus(row.id, s)}
                    disabled={row.status === s}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-40 ${
                      row.status === s
                        ? `${STATUS_STYLE[s]} font-bold`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
