'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, CheckCircle, XCircle, Gift, MessageSquare, UserPlus, Share2, Loader2 } from 'lucide-react'

type NotifType = 'correct' | 'wrong' | 'referral' | 'reply' | 'question_approved' | 'question_rejected' | 'share' | 'prediction_placed'

interface Result {
  type: NotifType
  ok: boolean
  error?: string
}

const NOTIF_CONFIGS: { type: NotifType; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
  {
    type: 'correct',
    label: 'ทายถูก',
    icon: <CheckCircle size={18} />,
    color: 'bg-green-500 hover:bg-green-600',
    desc: 'simulation: resolve question → is_correct = true',
  },
  {
    type: 'wrong',
    label: 'ทายผิด',
    icon: <XCircle size={18} />,
    color: 'bg-red-400 hover:bg-red-500',
    desc: 'simulation: resolve question → is_correct = false',
  },
  {
    type: 'prediction_placed',
    label: 'วางการทายแล้ว',
    icon: <span className="text-base">🔮</span>,
    color: 'bg-indigo-500 hover:bg-indigo-600',
    desc: 'notification type: prediction_placed',
  },
  {
    type: 'referral',
    label: 'Referral',
    icon: <UserPlus size={18} />,
    color: 'bg-amber-500 hover:bg-amber-600',
    desc: 'notification type: referral',
  },
  {
    type: 'reply',
    label: 'มีคนตอบกลับ',
    icon: <MessageSquare size={18} />,
    color: 'bg-blue-500 hover:bg-blue-600',
    desc: 'notification type: reply (ต้องมี comment อยู่แล้ว)',
  },
  {
    type: 'question_approved',
    label: 'คำถามผ่านแล้ว',
    icon: <span className="text-base">🎉</span>,
    color: 'bg-purple-500 hover:bg-purple-600',
    desc: 'notification type: question_approved',
  },
  {
    type: 'question_rejected',
    label: 'คำถามไม่ผ่าน',
    icon: <span className="text-base">⛔</span>,
    color: 'bg-gray-500 hover:bg-gray-600',
    desc: 'notification type: question_rejected',
  },
  {
    type: 'share',
    label: 'แชร์แล้วได้คะแนน',
    icon: <Share2 size={18} />,
    color: 'bg-pink-500 hover:bg-pink-600',
    desc: 'notification type: share',
  },
]

export default function TestNotifPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState<NotifType | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [targetEmail, setTargetEmail] = useState('')

  async function getTargetUserId(): Promise<string | null> {
    if (targetEmail.trim()) {
      // lookup by email via users table
      // look up via auth admin is server-only; fall back to display_name match
      const { data } = await supabase.from('users').select('id, display_name').ilike('display_name', targetEmail.trim()).single()
      return (data as { id: string } | null)?.id ?? null
    }
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  }

  async function send(type: NotifType) {
    setLoading(type)
    try {
      const userId = await getTargetUserId()
      if (!userId) {
        setResults(r => [{ type, ok: false, error: 'ไม่พบ user' }, ...r])
        return
      }

      if (type === 'correct' || type === 'wrong') {
        // simulate via predictions table update — find a resolved prediction or create a fake notif directly
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'prediction_resolved',
          question_id: null,
          is_correct: type === 'correct',
          coins_won: type === 'correct' ? 1234 : 0,
          rep_delta: type === 'correct' ? 8.5 : -3,
          message: type === 'correct'
            ? 'ทายถูก! Manchester City ชนะ — ได้รับ 1,234 คะแนน'
            : 'ทายพลาด Manchester City คือผู้ชนะ',
        })
        // also trigger realtime via predictions update if possible
        const { data: pred } = await supabase
          .from('predictions')
          .select('id')
          .eq('user_id', userId)
          .is('resolved_at', null)
          .limit(1)
          .single()
        if (pred) {
          await supabase.from('predictions').update({
            is_correct: type === 'correct',
            coins_won: type === 'correct' ? 1234 : 0,
            rep_delta: type === 'correct' ? 8.5 : -3,
            resolved_at: new Date().toISOString(),
          }).eq('id', (pred as { id: string }).id)
        }
      } else if (type === 'prediction_placed') {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'prediction_placed',
          question_id: null,
          message: 'วางการทาย "ใครจะชนะ EPL 2025?" เรียบร้อยแล้ว',
        })
      } else if (type === 'referral') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('notifications') as any).insert({
          user_id: userId,
          type: 'referral',
          message: 'มีคนมาทายจากลิงก์ของคุณ!',
          coins_gained: 100,
        })
      } else if (type === 'question_approved') {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'question_approved',
          question_id: null,
          message: 'คำถามของคุณ "ใครจะชนะ EPL 2025?" ผ่านการอนุมัติแล้ว!',
        })
      } else if (type === 'question_rejected') {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'question_rejected',
          question_id: null,
          message: 'คำถามของคุณไม่ผ่านการอนุมัติ เนื่องจากเนื้อหาไม่เหมาะสม',
        })
      } else if (type === 'share') {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'share',
          question_id: null,
          message: 'มีคนคลิกลิงก์แชร์ของคุณ — ได้รับ 500 คะแนน!',
          coins_won: 500,
        })
      } else if (type === 'reply') {
        // reply requires a comment_id — insert dummy approach via message field fallback
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'reply',
          message: '[mock] สมชาย ตอบกลับ: "เห็นด้วยเลย ทีมนี้แน่นมาก"',
        })
      }

      setResults(r => [{ type, ok: true }, ...r])
    } catch (err) {
      setResults(r => [{ type, ok: false, error: String(err) }, ...r])
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Bell size={22} className="text-gray-700" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Test Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">ส่ง mock notification ให้ user เพื่อทดสอบ bell & popup</p>
        </div>
      </div>

      {/* Target user */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          ส่งหา display_name (ว่างไว้ = ส่งหาตัวเอง)
        </label>
        <input
          type="text"
          placeholder="display_name ของ user ที่ต้องการทดสอบ"
          value={targetEmail}
          onChange={e => setTargetEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {NOTIF_CONFIGS.map(({ type, label, icon, color, desc }) => (
          <button
            key={type}
            disabled={loading !== null}
            onClick={() => send(type)}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-white font-medium text-sm transition-all shadow-sm disabled:opacity-50 ${color}`}
          >
            {loading === type ? <Loader2 size={18} className="animate-spin" /> : icon}
            <div className="text-left">
              <div>{label}</div>
              <div className="text-[10px] opacity-70 font-normal mt-0.5">{desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Results log */}
      {results.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Log</p>
          </div>
          <div className="divide-y divide-gray-50">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                {r.ok
                  ? <CheckCircle size={14} className="text-green-500 shrink-0" />
                  : <XCircle size={14} className="text-red-400 shrink-0" />}
                <span className="text-xs text-gray-700">
                  <span className="font-mono font-semibold">{r.type}</span>
                  {r.ok ? ' — ส่งแล้ว' : ` — ${r.error}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
