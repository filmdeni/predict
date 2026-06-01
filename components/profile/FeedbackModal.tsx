'use client'

import { useState } from 'react'
import { X, Send, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = [
  { value: 'bug', label: '🐛 เจอบัค / ใช้งานไม่ได้' },
  { value: 'ui', label: '🎨 หน้าตาแอป' },
  { value: 'predict', label: '🔮 ระบบทาย' },
  { value: 'coins', label: '💰 คะแนน / ระบบคะแนน' },
  { value: 'suggestion', label: '💡 ข้อเสนอแนะ' },
  { value: 'other', label: '📝 อื่นๆ' },
]

interface Props {
  userId: string
  onClose: () => void
}

export default function FeedbackModal({ userId, onClose }: Props) {
  const supabase = createClient()
  const [category, setCategory] = useState('bug')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function submit() {
    if (!message.trim()) return
    setSubmitting(true)
    await supabase.from('feedback' as any).insert({
      user_id: userId,
      category,
      message: message.trim(),
      contact: contact.trim() || null,
    })
    setSubmitting(false)
    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-xl p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">แจ้งปัญหา / ข้อเสนอแนะ</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center py-8 gap-3 text-center">
            <CheckCircle size={40} className="text-green-500" />
            <p className="font-semibold text-gray-900">ส่งเรียบร้อยแล้ว!</p>
            <p className="text-sm text-gray-500">ขอบคุณที่ช่วยพัฒนาภาวนานะครับ 🙏</p>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold"
            >
              ปิด
            </button>
          </div>
        ) : (
          <>
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">หัวข้อ</label>
              <div className="grid grid-cols-2 gap-1.5">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`text-xs py-2 px-3 rounded-xl border text-left transition-all ${
                      category === c.value
                        ? 'border-gray-900 bg-gray-900 text-white font-semibold'
                        : 'border-gray-200 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">รายละเอียด</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="บอกเราว่าเกิดอะไรขึ้น หรืออยากให้ปรับปรุงอะไร..."
                rows={4}
                maxLength={500}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-gray-400 resize-none"
              />
              <p className="text-[11px] text-gray-400 text-right">{message.length}/500</p>
            </div>

            {/* Contact */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                ช่องทางติดต่อกลับ <span className="font-normal text-gray-400">(ไม่บังคับ)</span>
              </label>
              <input
                value={contact}
                onChange={e => setContact(e.target.value)}
                placeholder="Line ID / อีเมล / เบอร์โทร"
                maxLength={100}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-gray-400"
              />
            </div>

            {/* Submit */}
            <button
              onClick={submit}
              disabled={!message.trim() || submitting}
              className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
            >
              <Send size={15} />
              {submitting ? 'กำลังส่ง...' : 'ส่งข้อความ'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
