'use client'

import { useState, useEffect, useRef } from 'react'
import { Shield, ScrollText, ChevronDown, CheckCircle2 } from 'lucide-react'

const STORAGE_KEY = 'bawana_terms_accepted_at'
const RENEW_DAYS = 30

function hasAccepted(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const ts = parseInt(raw, 10)
    if (isNaN(ts)) return false
    const msElapsed = Date.now() - ts
    return msElapsed < RENEW_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

const SECTIONS = [
  {
    emoji: '🎯',
    title: 'แพลตฟอร์มทายผล ไม่ใช่การพนัน',
    body: 'ภาวนาเป็นแพลตฟอร์มทายผลเหตุการณ์เพื่อความบันเทิงล้วน ๆ คะแนน (P) ที่ใช้ในระบบไม่มีมูลค่าทางการเงิน ไม่สามารถแลกเปลี่ยนเป็นเงินสดหรือสิ่งของจริงได้',
  },
  {
    emoji: '🔞',
    title: 'อายุ 18 ปีขึ้นไป',
    body: 'ผู้ใช้ต้องมีอายุ 18 ปีบริบูรณ์ขึ้นไปจึงจะสามารถสมัครและใช้งานแพลตฟอร์มได้ การสมัครใช้งานถือว่าคุณรับรองว่าบรรลุนิติภาวะแล้ว',
  },
  {
    emoji: '🤝',
    title: 'ความรับผิดชอบของผู้ใช้',
    body: 'คุณรับผิดชอบต่อการกระทำของตนเองในแพลตฟอร์ม ห้ามใช้บัญชีหลายบัญชีเพื่อแสวงหาประโยชน์ที่ไม่เป็นธรรม ห้ามโพสต์เนื้อหาที่ผิดกฎหมายหรือสร้างความเกลียดชัง',
  },
  {
    emoji: '🔒',
    title: 'ความเป็นส่วนตัวและข้อมูล',
    body: 'เราเก็บข้อมูลที่จำเป็นเท่านั้นเพื่อให้บริการ ข้อมูลของคุณจะไม่ถูกขายให้บุคคลที่สาม คุณสามารถขอลบข้อมูลส่วนตัวได้ทุกเมื่อผ่านการติดต่อทีมงาน',
  },
  {
    emoji: '⚠️',
    title: 'การระงับ / ยกเลิกบัญชี',
    body: 'ทีมงานสงวนสิทธิ์ระงับหรือยกเลิกบัญชีที่ละเมิดข้อกำหนดโดยไม่ต้องแจ้งล่วงหน้า การตัดสินใจของทีมงานถือเป็นที่สุด',
  },
  {
    emoji: '📝',
    title: 'การปรับปรุงข้อกำหนด',
    body: 'เราอาจปรับปรุงข้อกำหนดการใช้งานเป็นครั้งคราว การแจ้งเตือนจะส่งผ่านแอปและระบบจะขอการยืนยันใหม่ทุก 30 วัน',
  },
]

export default function TermsModal() {
  const [open, setOpen] = useState(false)
  const [scrolledToBottom, setScrolledToBottom] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [animOut, setAnimOut] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hasAccepted()) {
      setOpen(true)
    }
  }, [])

  function handleScroll() {
    const el = bodyRef.current
    if (!el) return
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20
    if (atBottom) setScrolledToBottom(true)
  }

  function handleAccept() {
    if (!accepted) return
    setAnimOut(true)
    setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, String(Date.now()))
      } catch {}
      setOpen(false)
    }, 260)
  }

  if (!open) return null

  return (
    <>
      <style>{`
        @keyframes termsIn {
          from { opacity: 0; transform: scale(0.93) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes termsOut {
          from { opacity: 1; transform: scale(1)    translateY(0); }
          to   { opacity: 0; transform: scale(0.93) translateY(16px); }
        }
        .terms-in  { animation: termsIn  0.30s cubic-bezier(0.34,1.15,0.64,1) forwards; }
        .terms-out { animation: termsOut 0.24s ease forwards; }
        .fade-mask {
          -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
          mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
        }
      `}</style>

      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
        {/* Card */}
        <div
          className={`w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col ${animOut ? 'terms-out' : 'terms-in'}`}
          style={{ maxHeight: '90dvh' }}
        >
          {/* ─── Hero header ─── */}
          <div className="bg-gradient-to-br from-violet-600 to-purple-700 px-5 pt-6 pb-5 text-white flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center">
                <ScrollText size={18} />
              </div>
              <div>
                <p className="text-xs font-medium opacity-75">ก่อนเริ่มใช้งาน</p>
                <h1 className="text-base font-bold leading-tight">ข้อกำหนดการใช้งาน</h1>
              </div>
            </div>
            <p className="text-sm text-white/80 leading-relaxed">
              โปรดอ่านและยอมรับข้อกำหนดก่อนเข้าใช้งาน ภาวนา — แพลตฟอร์มทายผลเพื่อความบันเทิง
            </p>
          </div>

          {/* ─── Scrollable body ─── */}
          <div className="bg-[#f5f5f5] flex-1 overflow-hidden relative">
            <div
              ref={bodyRef}
              onScroll={handleScroll}
              className="overflow-y-auto h-full px-4 py-4 space-y-3 scrollbar-none"
              style={{ maxHeight: '42vh' }}
            >
              {SECTIONS.map((s) => (
                <div key={s.title} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0 mt-0.5">{s.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 leading-snug">{s.title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed mt-1">{s.body}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Bottom spacer + scroll hint */}
              <div className="flex flex-col items-center gap-1.5 py-2">
                <ChevronDown
                  size={18}
                  className={`transition-opacity duration-500 ${scrolledToBottom ? 'opacity-0' : 'opacity-40 animate-bounce'}`}
                />
                {scrolledToBottom && (
                  <p className="text-xs text-violet-500 font-medium">อ่านครบแล้ว ✓</p>
                )}
              </div>
            </div>

            {/* Fade mask when not at bottom */}
            {!scrolledToBottom && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#f5f5f5] to-transparent pointer-events-none" />
            )}
          </div>

          {/* ─── Footer ─── */}
          <div className="bg-[#f5f5f5] px-4 pt-2 pb-5 flex-shrink-0 space-y-3 border-t border-gray-100">
            {/* Checkbox */}
            <button
              onClick={() => setAccepted((v) => !v)}
              className="w-full flex items-start gap-3 text-left group"
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  accepted
                    ? 'bg-violet-600 border-violet-600'
                    : 'border-gray-300 group-hover:border-violet-400'
                }`}
              >
                {accepted && <CheckCircle2 size={13} className="text-white" strokeWidth={3} />}
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                ฉันได้อ่านและยอมรับ{' '}
                <span className="text-violet-600 font-medium">ข้อกำหนดการใช้งาน</span>{' '}
                และ{' '}
                <span className="text-violet-600 font-medium">นโยบายความเป็นส่วนตัว</span>{' '}
                ของภาวนาแล้ว
              </p>
            </button>

            {/* CTA */}
            <button
              onClick={handleAccept}
              disabled={!accepted || !scrolledToBottom}
              className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                accepted && scrolledToBottom
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-200 hover:opacity-90 active:scale-95'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Shield size={15} />
              {!scrolledToBottom
                ? 'เลื่อนอ่านให้ครบก่อนกด'
                : !accepted
                ? 'ติ๊กยืนยันก่อนกดยอมรับ'
                : 'ยอมรับและเข้าใช้งาน'}
            </button>

            <p className="text-center text-[10px] text-gray-400">
              ข้อกำหนดจะถูกขอยืนยันใหม่ทุก {RENEW_DAYS} วัน
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
